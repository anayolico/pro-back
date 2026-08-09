let clients = [];

function sseHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Flush headers right away
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // Send a heartbeat to establish connection
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  clients.push(res);
  console.log(`[SSE] New client connected. Total clients: ${clients.length}`);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log(`[SSE] Client disconnected. Total clients: ${clients.length}`);
  });
}

function broadcastUpdate(message = { type: 'refresh' }) {
  if (clients.length === 0) return;
  const dataString = `data: ${JSON.stringify(message)}\n\n`;
  console.log(`[SSE] Broadcasting event to ${clients.length} clients...`);
  clients.forEach(client => {
    try {
      client.write(dataString);
    } catch (err) {
      console.error('[SSE Error] Failed to write to client:', err.message);
    }
  });
}

// Keep-alive heartbeat every 30 seconds to prevent Heroku/Render from dropping the connection
setInterval(() => {
  if (clients.length > 0) {
    const ping = `data: ${JSON.stringify({ type: 'ping' })}\n\n`;
    clients.forEach(client => {
      try { client.write(ping); } catch (e) {}
    });
  }
}, 30000);

module.exports = { sseHandler, broadcastUpdate };
