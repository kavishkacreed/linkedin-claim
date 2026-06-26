require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Verify required env variables
const hasRequiredEnv = process.env.SUPABASE_URL && process.env.SUPABASE_KEY && process.env.TARGET_URL;
if (!hasRequiredEnv) {
  console.warn('WARNING: Missing required environment variables (SUPABASE_URL, SUPABASE_KEY, or TARGET_URL). Ensure they are set in your environment or .env file.');
}

// Initialize Supabase client conditionally
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to log attempts to Supabase
async function logAttempt(code, status, ip, userAgent) {
  if (!supabase) return;
  try {
    await supabase
      .from('redemption_logs')
      .insert({
        code: code || null,
        status: status,
        ip: ip || null,
        user_agent: userAgent || null
      });
  } catch (err) {
    console.error('Error logging redemption attempt:', err);
  }
}

// Endpoint to claim a coupon
app.post('/api/claim', async (req, res) => {
  const { code } = req.body;
  const clientIp = req.headers['x-real-ip'] || 
                   (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || 
                   req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!code) {
    await logAttempt(null, 'INVALID_CODE', clientIp, userAgent);
    return res.status(400).json({ success: false, error: 'Claim code is required.' });
  }

  if (!supabase) {
    console.error('API Error: Supabase client is not initialized due to missing environment variables.');
    return res.status(500).json({ success: false, error: 'Database is not configured. Please set SUPABASE_URL and SUPABASE_KEY.' });
  }

  // Normalize code (uppercase, trim spaces)
  const normalizedCode = code.trim().toUpperCase();

  try {
    // 1. Fetch the code from Supabase
    const { data: claim, error } = await supabase
      .from('claim_codes')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle(); // Avoids throwing error if no rows found

    if (error) {
      console.error('Supabase fetch error:', error);
      await logAttempt(normalizedCode, 'SYSTEM_ERROR', clientIp, userAgent);
      return res.status(500).json({ success: false, error: 'Database connection error.' });
    }

    if (!claim) {
      await logAttempt(normalizedCode, 'INVALID_CODE', clientIp, userAgent);
      return res.status(400).json({ success: false, error: 'This claim code is invalid.' });
    }

    if (claim.used) {
      await logAttempt(normalizedCode, 'ALREADY_REDEEMED', clientIp, userAgent);
      return res.status(400).json({ 
        success: false, 
        error: 'This claim code has already been redeemed.' 
      });
    }

    // 2. Mark code as used in Supabase
    const { error: updateError } = await supabase
      .from('claim_codes')
      .update({
        used: true,
        redeemed_at: new Date().toISOString(),
        ip: clientIp
      })
      .eq('code', normalizedCode);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      await logAttempt(normalizedCode, 'SYSTEM_ERROR', clientIp, userAgent);
      return res.status(500).json({ success: false, error: 'Failed to redeem claim code. Please try again.' });
    }

    // Log successful attempt
    await logAttempt(normalizedCode, 'SUCCESS', clientIp, userAgent);

    // 3. Return success and the redirect URL
    return res.json({ 
      success: true, 
      redirectUrl: process.env.TARGET_URL 
    });

  } catch (err) {
    console.error('Unexpected server error:', err);
    await logAttempt(normalizedCode, 'SYSTEM_ERROR', clientIp, userAgent);
    return res.status(500).json({ success: false, error: 'Server error. Please try again later.' });
  }
});

// Admin Route to serve dashboard page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin API to fetch attempts log
app.get('/api/admin/logs', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const password = authHeader.replace('Bearer ', '').trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Default fallback

  if (password !== adminPassword) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Database is not configured.' });
  }

  try {
    const { data: logs, error } = await supabase
      .from('redemption_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
      return res.status(500).json({ success: false, error: 'Database query failed.' });
    }

    return res.json({ success: true, logs });
  } catch (err) {
    console.error('Unexpected admin query error:', err);
    return res.status(500).json({ success: false, error: 'Server query error.' });
  }
});

// Fallback to serve landing page for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;
