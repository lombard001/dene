const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const MSP_TOKEN_URL =
  'https://eu-secure.mspapis.com/loginidentity/connect/token';

const CLIENT_ID = 'unity.client';
const CLIENT_SECRET = 'secret';

// sabit deviceId (istersen dinamik yaparız)
const DEVICE_ID =
  '6463D7756BAF77AFDA8E44B052E788CCA4E4F8C06AEAB268D7A0ED2C7F9549D8';

app.post('/token', async (req, res) => {
  const { username, password, country } = req.body || {};

  if (!username || !password || !country) {
    return res.status(400).json({
      error: 'username, password, country required'
    });
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'password');
    params.append('scope', 'openid nebula offline_access');
    params.append(
      'acr_values',
      `gameId:j68d deviceId:${DEVICE_ID}`
    );
    params.append('username', `${country}|${username}`);
    params.append('password', password);

    const mspRes = await fetch(MSP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // CloudFront bot filtresine takılmamak için önemli
        'User-Agent': 'UnityPlayer/2021.3.0f1',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    const text = await mspRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!mspRes.ok || !data?.access_token) {
      return res.status(502).json({
        error: 'MSP token error',
        status: mspRes.status,
        body: text
      });
    }

    res.json(data); // bire bir response
  } catch (err) {
    res.status(500).json({
      error: 'internal',
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MSP Proxy running on ${PORT}`);
});
