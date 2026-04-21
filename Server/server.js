// server.js - Edu-Smart Backend Entry Point
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes         = require('./routes/authRoutes');
const studentRoutes      = require('./routes/studentRoutes');
const attendanceRoutes   = require('./routes/attendanceRoutes');
const aiRoutes           = require('./routes/aiRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const { setSocketIO }    = require('./socket');

const app  = express();
const PORT = process.env.PORT || 5001;

// ✅ CORS: Accept Vercel frontend, localhost, 127.0.0.1, and LAN IPs
// This lets you open the app from your phone or another PC on the same WiFi.
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow non-browser requests (curl, Postman)
  if (origin === 'https://smart-edu-lms.vercel.app') return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Edu-Smart API is running',
    version: '1.0.0',
    endpoints: {
      auth:          '/api/auth',
      students:      '/api/students',
      attendance:    '/api/attendance',
      ai:            '/api/ai',
      announcements: '/api/announcements',
    },
  });
});

app.use('/api/auth',          authRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/syllabus',      require('./routes/syllabusRoutes'));
// serve uploaded syllabus PDFs as static files (for direct download links)
app.use('/uploads/syllabus',  require('express').static(require('path').join(__dirname, 'uploads/syllabus')));

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error(`Socket CORS blocked: ${origin}`));
    },
    credentials: true,
  },
});

setSocketIO(io);

// In-memory room message store (resets on restart)
const roomMessages = {};

io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Socket connected: ${socket.id}`);
  }

  // ─── Study Rooms ───────────────────────────────────────────────────────
  socket.on('join-room', ({ room, user }) => {
    socket.join(room);
    socket.data.room = room;
    socket.data.user = user;
    const history = (roomMessages[room] || []).slice(-50);
    socket.emit('room-history', history);
    socket.to(room).emit('user-joined', { user, room });
  });

  socket.on('send-message', ({ room, message, user, avatar }) => {
    const msg = { id: Date.now(), room, message, user, avatar, timestamp: new Date().toISOString() };
    if (!roomMessages[room]) roomMessages[room] = [];
    roomMessages[room].push(msg);
    if (roomMessages[room].length > 200) roomMessages[room].shift();
    io.to(room).emit('receive-message', msg);
  });

  socket.on('leave-room', ({ room, user }) => {
    socket.leave(room);
    socket.to(room).emit('user-left', { user, room });
  });
  // ──────────────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Socket disconnected: ${socket.id}`);
    }
  });
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB Atlas connected successfully using MONGODB_URI');
    server.listen(PORT, () => {
      console.log(`🚀 Edu-Smart server running on http://localhost:${PORT}`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS: accepting localhost, 127.0.0.1, and any 192.168.x.x / 10.x.x.x`);
    });
  } catch (err) {
    console.error('❌ MongoDB Atlas connection failed:', err.message);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});
