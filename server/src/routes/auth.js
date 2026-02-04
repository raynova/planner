import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../db/index.js';

const router = Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

// Request magic link
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    await pool.query(
      'INSERT INTO auth_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), token, expiresAt]
    );

    // Build verification URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyUrl = `${clientUrl}/auth/verify?token=${token}`;

    // Send email
    if (process.env.SENDGRID_API_KEY) {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@example.com',
        to: email,
        subject: 'Sign in to Timeline Planner',
        html: `
          <h2>Sign in to Timeline Planner</h2>
          <p>Click the link below to sign in. This link expires in 15 minutes.</p>
          <p><a href="${verifyUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In</a></p>
          <p>Or copy this link: ${verifyUrl}</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `
      });

      res.json({ message: 'Magic link sent! Check your email.' });
    } else {
      // Development mode - return token directly
      console.log('Dev mode - Magic link:', verifyUrl);
      res.json({
        message: 'Magic link sent! (Dev mode - check console)',
        devToken: token,
        devUrl: verifyUrl
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Verify magic link token
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find and validate token
    const result = await pool.query(
      'SELECT * FROM auth_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const authToken = result.rows[0];

    // Mark token as used
    await pool.query('UPDATE auth_tokens SET used = true WHERE id = $1', [authToken.id]);

    // Find or create user
    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [authToken.email]
    );

    if (userResult.rows.length === 0) {
      // Create new user
      userResult = await pool.query(
        'INSERT INTO users (email) VALUES ($1) RETURNING *',
        [authToken.email]
      );
    }

    const user = userResult.rows[0];

    // Create JWT session token
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

export default router;
