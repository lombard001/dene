const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const MSP_TOKEN_URL = 'https://eu-secure.mspapis.com/loginidentity/connect/token';
const CLIENT_ID = process.env.CLIENT_ID || 'unity.client';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'secret';

// POST /token
// Body: { username, password, country }
app.post('/token', async (req, res) => {
  const { username, password, country } = req.body || {};
  if (!username || !password || !country) {
    return res.status(400).json({ error: 'username,password,country required' });
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'password');
    params.append('scope', 'openid nebula offline_access');
    params.append('acr_values', 'gameId:j68d');
    params.append('username', `${country}|${username}`);
    params.append('password', password);

    const mspRes = await fetch(MSP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const text = await mspRes.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = null; }

    if (!mspRes.ok || !data || !data.access_token) {
      return res.status(502).json({ error: 'MSP token error', status: mspRes.status, body: text });
    }

    return res.json({ access_token: data.access_token });
  } catch (err) {
    return res.status(500).json({ error: 'internal', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MSP Proxy running on http://0.0.0.0:${PORT}`);
});
