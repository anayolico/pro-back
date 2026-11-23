const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { getPortfolioSystemInstruction } = require('../services/portfolioKnowledge');

const router = express.Router();

const DEFAULT_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-4-hydrogen';
const DEFAULT_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
const DEFAULT_LIVE_VOICE = process.env.GEMINI_LIVE_VOICE || 'Aoede';
const MAX_CALL_SECONDS = Math.max(60, Math.min(600, parseInt(process.env.GEMINI_MAX_CALL_SECONDS || '240', 10) || 240));

// Simple in-memory sliding-window rate limiter per IP
const rateBuckets = new Map();

function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const timestamps = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    const retryAfterSec = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  rateBuckets.set(key, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getApiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

// GET /api/ai/status — Lets frontend know if AI is configured & call limits
router.get('/status', (req, res) => {
  const configured = Boolean(getApiKey());
  res.json({
    configured,
    chatModel: DEFAULT_CHAT_MODEL,
    liveModel: DEFAULT_LIVE_MODEL,
    maxCallSeconds: MAX_CALL_SECONDS,
    voice: DEFAULT_LIVE_VOICE
  });
});

// POST /api/ai/chat — Text-only streaming chat backed by live portfolio DB knowledge
router.post('/chat', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error: 'CaleByte AI is not configured yet. Please add GEMINI_API_KEY on the backend server.'
    });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`chat:${ip}`, 35, 15 * 60 * 1000); // 35 messages per 15 min
  if (!limit.allowed) {
    return res.status(429).json({
      error: `Too many messages. Please wait about ${limit.retryAfterSec}s before sending another question.`
    });
  }

  const { message, history, previousInteractionId } = req.body || {};
  const userMessage = typeof message === 'string' ? message.trim() : '';

  if (!userMessage) {
    return res.status(400).json({ error: 'Please enter a message.' });
  }
  if (userMessage.length > 1500) {
    return res.status(400).json({ error: 'Message is too long. Please keep questions under 1,500 characters.' });
  }

  // Setup Server-Sent Events streaming response
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (payload) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  try {
    const systemInstruction = await getPortfolioSystemInstruction('chat');
    const ai = new GoogleGenAI({ apiKey });

    let interactionId = null;
    let streamedAnyText = false;

    // Primary path: Gemini Interactions API (streaming, stateful via previous_interaction_id)
    try {
      const requestParams = {
        model: DEFAULT_CHAT_MODEL,
        system_instruction: systemInstruction,
        input: userMessage,
        stream: true,
        store: true
      };
      if (typeof previousInteractionId === 'string' && previousInteractionId.trim()) {
        requestParams.previous_interaction_id = previousInteractionId.trim();
      }

      const stream = await ai.interactions.create(requestParams);
      for await (const event of stream) {
        if (event?.interaction?.id) {
          interactionId = event.interaction.id;
        }
        if (event?.event_type === 'step.delta' && event?.delta?.type === 'text' && event?.delta?.text) {
          streamedAnyText = true;
          sendEvent({ type: 'delta', text: event.delta.text });
        }
      }
    } catch (interactionsErr) {
      // Graceful fallback to models.generateContentStream if Interactions API or previous_interaction_id fails
      console.warn('[AI Chat] Interactions API fallback triggered:', interactionsErr?.message || interactionsErr);

      const safeHistory = Array.isArray(history)
        ? history
            .slice(-10)
            .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
            .map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content.trim().slice(0, 1500) }]
            }))
        : [];

      const contents = [
        ...safeHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      const fallbackStream = await ai.models.generateContentStream({
        model: DEFAULT_CHAT_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.6,
          maxOutputTokens: 700
        }
      });

      for await (const chunk of fallbackStream) {
        const text = chunk?.text;
        if (text) {
          streamedAnyText = true;
          sendEvent({ type: 'delta', text });
        }
      }
    }

    if (!streamedAnyText) {
      sendEvent({
        type: 'delta',
        text: "I'm here to help with anything about Caleb's portfolio, projects, skills, source code store, or how to get in touch. What would you like to know?"
      });
    }

    sendEvent({ type: 'done', interactionId });
    res.end();
  } catch (err) {
    console.error('[AI Chat Error]', err?.message || err);
    sendEvent({
      type: 'error',
      error: 'Unable to reach CaleByte AI right now. Please try again in a moment.'
    });
    res.end();
  }
});

// POST /api/ai/live-token — Mints a short-lived, single-use Gemini Live ephemeral token
router.post('/live-token', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error: 'Live Call is not configured yet. Please add GEMINI_API_KEY on the backend server.'
    });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`live:${ip}`, 8, 60 * 60 * 1000); // 8 live call sessions per hour per IP
  if (!limit.allowed) {
    return res.status(429).json({
      error: `Live Call limit reached for now. Please try Text Chat or try calling again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`
    });
  }

  try {
    const voiceInstruction = await getPortfolioSystemInstruction('voice');
    const expireTime = new Date(Date.now() + (MAX_CALL_SECONDS + 120) * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 90 * 1000).toISOString();

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });

    const tokenResp = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: DEFAULT_LIVE_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            systemInstruction: {
              parts: [{ text: voiceInstruction }]
            },
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: DEFAULT_LIVE_VOICE
                }
              }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {}
          }
        }
      }
    });

    if (!tokenResp?.name) {
      throw new Error('Failed to obtain ephemeral token from Gemini API.');
    }

    return res.json({
      token: tokenResp.name,
      model: DEFAULT_LIVE_MODEL,
      voice: DEFAULT_LIVE_VOICE,
      maxCallSeconds: MAX_CALL_SECONDS,
      expiresAt: expireTime
    });
  } catch (err) {
    console.error('[AI Live Token Error]', err?.message || err);
    return res.status(500).json({
      error: 'Could not start Live Call session right now. Please try again or use Text Chat.'
    });
  }
});

module.exports = router;
