const express = require('express');
const { getTableData, insertItem, updateItem, deleteItem, getCvData, updateCvData } = require('../db');
const { authenticateToken } = require('./auth');

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
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating CV data' });
  }
});

// --- PROTECTED ADMIN CRUD ENDPOINTS ---

// Projects CRUD
router.post('/projects', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('projects', req.body);
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating project' });
  }
});

router.put('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('projects', req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating project' });
  }
});

router.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('projects', req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting project' });
  }
});

// Skills CRUD
router.post('/skills', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('skills', req.body);
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating skill' });
  }
});

router.put('/skills/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('skills', req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating skill' });
  }
});

router.delete('/skills/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('skills', req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting skill' });
  }
});

// Experiences CRUD
router.post('/experiences', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('experiences', req.body);
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating experience' });
  }
});

router.put('/experiences/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('experiences', req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating experience' });
  }
});

router.delete('/experiences/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('experiences', req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting experience' });
  }
});

// Strengths CRUD
router.post('/strengths', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('strengths', req.body);
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating strength' });
  }
});

router.put('/strengths/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('strengths', req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating strength' });
  }
});

router.delete('/strengths/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('strengths', req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting strength' });
  }
});

router.get('/source-codes', handleGet('source_codes'));

// Source Codes CRUD
router.post('/source-codes', authenticateToken, async (req, res) => {
  try {
    const item = await insertItem('source_codes', req.body);
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error creating source code item' });
  }
});

router.put('/source-codes/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await updateItem('source_codes', req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating source code item' });
  }
});

router.delete('/source-codes/:id', authenticateToken, async (req, res) => {
  try {
    await deleteItem('source_codes', req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting source code item' });
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
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting contact message' });
  }
});

module.exports = router;
