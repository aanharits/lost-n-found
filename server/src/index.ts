import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { Server as SocketIOServer } from 'socket.io';
import os from 'os';
import { setupSocketHandlers } from './socket/handlers.js';
import api from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat variabel lingkungan dari .env baik dari folder server maupun root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PORT = parseInt(process.env.PORT || '3001', 10);

// Inisialisasi web framework Hono
const app = new Hono();

// Tangani error global pada request HTTP
app.onError((err, c) => {
  console.error('[Server] HTTP Error:', err.message);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Konfigurasi CORS agar frontend localhost dan LAN dapat mengakses API
app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return origin;
    }
    return '*';
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Route health check server
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'Lost & Found Kampus AI - Backend' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Registrasi endpoint REST API
app.route('/api', api);

// Jalankan HTTP server Hono pada port yang ditentukan
const httpServer = serve({
  fetch: app.fetch,
  port: PORT,
  hostname: '0.0.0.0',
}, (info) => {
  const localIP = getLocalIP();
  console.log(`[Server] Lost & Found Backend aktif`);
  console.log(`[Server] Local: http://localhost:${info.port}`);
  console.log(`[Server] Network: http://${localIP}:${info.port}`);
  console.log(`[Server] WebSocket: ws://localhost:${info.port}`);
});

// Tangani error jika port sudah digunakan (EADDRINUSE)
httpServer.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Gagal: Port ${PORT} sedang digunakan oleh proses lain.`);
    console.error(`[Server] Matikan proses pada port ${PORT} dengan: lsof -ti :${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error(`[Server] Server error:`, err.message);
    process.exit(1);
  }
});

// Inisialisasi Socket.IO dan pasang pada HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Hubungkan semua listener event Socket.IO
setupSocketHandlers(io);

// Tutup server secara bersih saat menerima sinyal terminasi
const handleShutdown = () => {
  io.close();
  httpServer.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Ambil alamat IPv4 lokal server untuk akses jaringan lokal
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
