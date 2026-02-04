import { Router } from 'express';
import pool from '../db/index.js';

const router = Router();

// Get all timelines (public - no auth)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, start_date, created_at, updated_at FROM timelines ORDER BY updated_at DESC'
    );
    res.json({ timelines: result.rows });
  } catch (error) {
    console.error('Get timelines error:', error);
    res.status(500).json({ error: 'Failed to fetch timelines' });
  }
});

// Create new timeline (public - no auth)
router.post('/', async (req, res) => {
  try {
    const { name, startDate, tasks, nodePositions } = req.body;

    const result = await pool.query(
      `INSERT INTO timelines (name, start_date, tasks, node_positions)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        name || 'My Timeline',
        startDate || new Date().toISOString().split('T')[0],
        JSON.stringify(tasks || []),
        JSON.stringify(nodePositions || {})
      ]
    );

    res.status(201).json({ timeline: result.rows[0] });
  } catch (error) {
    console.error('Create timeline error:', error);
    res.status(500).json({ error: 'Failed to create timeline' });
  }
});

// Get single timeline (public - no auth)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM timelines WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    res.json({ timeline: result.rows[0] });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Update timeline (public - no auth)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, tasks, nodePositions } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (startDate !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(startDate);
    }
    if (tasks !== undefined) {
      updates.push(`tasks = $${paramCount++}`);
      values.push(JSON.stringify(tasks));
    }
    if (nodePositions !== undefined) {
      updates.push(`node_positions = $${paramCount++}`);
      values.push(JSON.stringify(nodePositions));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE timelines SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    res.json({ timeline: result.rows[0] });
  } catch (error) {
    console.error('Update timeline error:', error);
    res.status(500).json({ error: 'Failed to update timeline' });
  }
});

// Delete timeline (public - no auth)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM timelines WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete timeline error:', error);
    res.status(500).json({ error: 'Failed to delete timeline' });
  }
});

export default router;
