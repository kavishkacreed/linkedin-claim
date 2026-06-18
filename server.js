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

// Endpoint to claim a coupon
app.post('/api/claim', async (req, res) => {
  const { code } = req.body;

  if (!code) {
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
      return res.status(500).json({ success: false, error: 'Database connection error.' });
    }

    if (!claim) {
      return res.status(400).json({ success: false, error: 'This claim code is invalid.' });
    }

    if (claim.used) {
      return res.status(400).json({ 
        success: false, 
        error: 'This claim code has already been redeemed.' 
      });
    }

    // 2. Mark code as used in Supabase
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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
      return res.status(500).json({ success: false, error: 'Failed to redeem claim code. Please try again.' });
    }

    // 3. Return success and the redirect URL
    return res.json({ 
      success: true, 
      redirectUrl: process.env.TARGET_URL 
    });

  } catch (err) {
    console.error('Unexpected server error:', err);
    return res.status(500).json({ success: false, error: 'Server error. Please try again later.' });
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
