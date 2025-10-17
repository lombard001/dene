const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // frontend için

const WS_TXT_URL = 'https://raw.githubusercontent.com/palacejs/deneme/refs/heads/main/ws.txt';
const MSP_TOKEN_URL = 'https://eu-secure.mspapis.com/loginidentity/connect/token';
const SAVE_TOKEN_URL = 'https://testo-6qbd.onrender.com/save-token';

const MSP_PAYLOAD_BASE = {
  client_id: 'unity.client',
  client_secret: 'secret',
  grant_type: 'password',
  scope: 'openid nebula offline_access',
  acr_values: 'gameId:j68d'
};

let index = 0;
let intervalId = null;

// Kullanıcı satırlarını çek
async function getLines() {
  const res = await fetch(WS_TXT_URL);
  const text = await res.text();
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

// Line parse
function parseLine(line) {
  if (!line) return null;
  const parts = line.split(':');
  if (parts.length < 3) return null;
  const country = parts.pop();
  const password = parts.pop();
  const username = parts.join(':');
  return { username, password, country };
}

// MSP token al
async function getAccessToken(user) {
  const payload = {
    ...MSP_PAYLOAD_BASE,
    username: `${user.country}|${user.username}`,
    password: user.password
  };
  const res = await fetch(MSP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(payload)
  });

  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw new Error(`MSP token hatası ${res.status}: ${txt}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error('access_token yok');
  return data.access_token;
}

// save-token
async function saveToken(jwt) {
  const res = await fetch(SAVE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt })
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw new Error(`save-token hatası ${res.status}: ${txt}`);
  }
}

// Döngü
async function processNext() {
  try {
    const lines = await getLines();
    if (!lines.length) return;
    if (index >= lines.length) index = 0;

    const user = parseLine(lines[index]);
    if (!user) {
      console.log('⚠️ Satır parse edilemedi:', lines[index]);
      index++;
      return;
    }

    console.log(`➡️ ${user.username}@${user.country} için MSP token alınıyor...`);
    try {
      const token = await getAccessToken(user);
      await saveToken(token);
      console.log('✅ Token kaydedildi:', token.slice(0,24)+'...');
    } catch(err) {
      console.log('❌ Hata:', err.message);
    }

    index++;
  } catch(err) {
    console.log('🔥 Genel hata:', err.message);
  }
}

// Başlat / durdur
app.post('/start', (req,res)=>{
  if(intervalId) return res.json({status:'already running'});
  intervalId = setInterval(processNext, 10000);
  res.json({status:'started'});
});

app.post('/stop', (req,res)=>{
  if(intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    return res.json({status:'stopped'});
  }
  res.json({status:'not running'});
});

app.get('/status', (req,res)=>{
  res.json({running: !!intervalId});
});

// Basit frontend
app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname,'public/index.html'));
});

app.listen(3000, ()=>console.log('🚀 Sunucu 3000 portta çalışıyor...'));
