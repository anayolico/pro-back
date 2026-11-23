const express = require('express');
const { getTableData, insertItem, updateItem, deleteItem, getCvData, updateCvData } = require('../db');
const { authenticateToken } = require('./auth');
const { broadcastUpdate: rawBroadcastUpdate } = require('../sse');
const { invalidateKnowledgeCache } = require('../services/portfolioKnowledge');

// Refresh both connected frontends (SSE) and the AI portfolio knowledge cache on any content change
const broadcastUpdate = (payload) => {
  invalidateKnowledgeCache();
  rawBroadcastUpdate(payload);
};

const router = express.Router();

// Helper to wrap route handlers
const handleGet = (table) => async (req, res) => {
  try {
    const data = await getTableData(table);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: `Error fetching ${table}` });
  }
};

// --- PUBLIC READ ENDPOINTS ---
router.get('/projects', handleGet('projects'));
router.get('/skills', handleGet('skills'));
router.get('/experiences', handleGet('experiences'));
router.get('/strengths', handleGet('strengths'));

router.get('/cv', async (req, res) => {
  try {
    const data = await getCvData();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching CV data' });
  }
});

router.put('/cv', authenticateToken, async (req, res) => {
  try {
    const updated = await updateCvData(req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating CV data' });
  }
});

// --- PROTECTED ADMIN CRUD ENDPOINTS ---

// Projects CRUD
router.post('/projects', authenticateToken, async (req, res) => {
  try {
    const isFeat = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : (req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : false);
    if (isFeat) {
      const allProjects = await getTableData('projects');
      const activeFeatured = allProjects.filter(p => Boolean(p.is_featured || p.isFeatured));
      if (activeFeatured.length >= 3) {
        return res.status(400).json({
          error: 'Limit reached: A maximum of 3 projects can be active on the homepage at once. Please turn off another project first.'
        });
      }
    }
    const item = await insertItem('projects', req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating project' });
  }
});

router.put('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const isFeat = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : (req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : undefined);
    if (isFeat === true) {
      const allProjects = await getTableData('projects');
      const activeFeatured = allProjects.filter(p => Boolean(p.is_featured || p.isFeatured) && String(p.id) !== String(req.params.id));
      if (activeFeatured.length >= 3) {
        return res.status(400).json({
          error: 'Limit reached: A maximum of 3 projects can be active on the homepage at once. Please turn off another project first.'
        });
      }
    }
    const updated = await updateItem('projects', req.params.id, req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating project' });
  }
});

// Dedicated endpoint to toggle featured homepage status
router.patch('/projects/:id/feature', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_featured, isFeatured } = req.body;
    const targetState = is_featured !== undefined ? Boolean(is_featured) : Boolean(isFeatured);

    const allProjects = await getTableData('projects');
    const project = allProjects.find(p => String(p.id) === String(id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (targetState) {
      const activeFeatured = allProjects.filter(p => Boolean(p.is_featured || p.isFeatured) && String(p.id) !== String(id));
      if (activeFeatured.length >= 3) {
        return res.status(400).json({
          error: 'Limit reached: A maximum of 3 projects can be active on the homepage at once. Please turn off another project first.'
        });
      }
    }

    const updated = await updateItem('projects', id, { is_featured: targetState, isFeatured: targetState });
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated, is_featured: targetState, isFeatured: targetState });
  } catch (err) {
    console.error('[Error toggling project feature]', err);
    return res.status(500).json({ error: 'Error updating project featured status' });
  }
});

router.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('projects', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting project' });
  }
});

// Skills CRUD
router.post('/skills', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('skills', req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating skill' });
  }
});

router.put('/skills/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('skills', req.params.id, req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating skill' });
  }
});

router.delete('/skills/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('skills', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting skill' });
  }
});

// Experiences CRUD
router.post('/experiences', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('experiences', req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating experience' });
  }
});

router.put('/experiences/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('experiences', req.params.id, req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating experience' });
  }
});

router.delete('/experiences/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('experiences', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting experience' });
  }
});

// Strengths CRUD
router.post('/strengths', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('strengths', req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating strength' });
  }
});

router.put('/strengths/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('strengths', req.params.id, req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating strength' });
  }
});

router.delete('/strengths/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('strengths', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting strength' });
  }
});

// Helper to enforce max active homepage items for source_codes / free_source_codes
async function checkSourceCodeFeatureLimit(table, excludeId, label) {
  const allItems = await getTableData(table);
  const activeFeatured = allItems.filter(
    item => Boolean(item.is_featured || item.isFeatured) && (!excludeId || String(item.id) !== String(excludeId))
  );
  if (activeFeatured.length >= 2) {
    return `Limit reached: A maximum of 2 ${label} can be active on the homepage at once. Please turn off another one first.`;
  }
  return null;
}

router.get('/source-codes', handleGet('source_codes'));

// Source Codes CRUD
router.post('/source-codes', authenticateToken, async (req, res) => {
  try {
    const isFeat = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : (req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : false);
    if (isFeat) {
      const limitErr = await checkSourceCodeFeatureLimit('source_codes', null, 'premium source codes');
      if (limitErr) return res.status(400).json({ error: limitErr });
    }
    const item = await insertItem('source_codes', req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating source code item' });
  }
});

router.put('/source-codes/:id', authenticateToken, async (req, res) => {
  try {
    const isFeat = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : (req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : undefined);
    if (isFeat === true) {
      const limitErr = await checkSourceCodeFeatureLimit('source_codes', req.params.id, 'premium source codes');
      if (limitErr) return res.status(400).json({ error: limitErr });
    }
    const updated = await updateItem('source_codes', req.params.id, req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating source code item' });
  }
});

router.patch('/source-codes/:id/feature', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const targetState = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : Boolean(req.body.isFeatured);
    if (targetState) {
      const limitErr = await checkSourceCodeFeatureLimit('source_codes', id, 'premium source codes');
      if (limitErr) return res.status(400).json({ error: limitErr });
    }
    const updated = await updateItem('source_codes', id, { is_featured: targetState, isFeatured: targetState });
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated, is_featured: targetState, isFeatured: targetState });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating source code featured status' });
  }
});

router.delete('/source-codes/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('source_codes', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting source code item' });
  }
});

// Free Source Codes CRUD
router.get('/free-source-codes', handleGet('free_source_codes'));

router.post('/free-source-codes', authenticateToken, async (req, res) => {
  try {
    const isFeat = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : (req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : false);
    if (isFeat) {
      const limitErr = await checkSourceCodeFeatureLimit('free_source_codes', null, 'free source codes');
      if (limitErr) return res.status(400).json({ error: limitErr });
    }
    const item = await insertItem('free_source_codes', req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating free source code item' });
  }
});

router.put('/free-source-codes/:id', authenticateToken, async (req, res) => {
  try {
    const isFeat = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : (req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : undefined);
    if (isFeat === true) {
      const limitErr = await checkSourceCodeFeatureLimit('free_source_codes', req.params.id, 'free source codes');
      if (limitErr) return res.status(400).json({ error: limitErr });
    }
    const updated = await updateItem('free_source_codes', req.params.id, req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating free source code item' });
  }
});

router.patch('/free-source-codes/:id/feature', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const targetState = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : Boolean(req.body.isFeatured);
    if (targetState) {
      const limitErr = await checkSourceCodeFeatureLimit('free_source_codes', id, 'free source codes');
      if (limitErr) return res.status(400).json({ error: limitErr });
    }
    const updated = await updateItem('free_source_codes', id, { is_featured: targetState, isFeatured: targetState });
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated, is_featured: targetState, isFeatured: targetState });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating free source code featured status' });
  }
});

router.delete('/free-source-codes/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('free_source_codes', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting free source code item' });
  }
});

// Background Music Playlist CRUD
router.get('/music', handleGet('music'));

router.post('/music', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('music', req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating music track' });
  }
});

router.put('/music/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('music', req.params.id, req.body);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating music track' });
  }
});

router.delete('/music/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('music', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting music track' });
  }
});

// Contacts Admin Inbox
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const data = await getTableData('contacts');
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching contacts inbox' });
  }
});

router.delete('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('contacts', req.params.id);
    broadcastUpdate({ type: 'refresh' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting contact message' });
  }
});

module.exports = router;
