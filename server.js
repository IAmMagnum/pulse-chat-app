// server.js — Pulse Backend Server (PostgreSQL Persistent Database Edition)
const http = require('http');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL Database Connection Pool
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

// Fallback in-memory database if no Postgres URL is supplied
let inMemoryDb = {
  users: [
    { id: 'user-1', username: 'alice', password: 'demo123', full_name: 'Alice Vance', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', is_online: true },
    { id: 'user-2', username: 'bob', password: 'demo123', full_name: 'Bob Smith', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', is_online: true },
    { id: 'user-3', username: 'charlie', password: 'demo123', full_name: 'Charlie Day', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', is_online: false }
  ],
  rooms: [
    { id: 'room-1', name: 'general-hub', type: 'public', description: 'Public lounge for open conversations' }
  ],
  messages: [
    { id: 'msg-1', room_id: 'room-1', sender_id: 'user-3', content: 'Welcome to Pulse live backend server!', created_at: new Date().toISOString() }
  ]
};

const clients = new Map();

// Helper: Query Messages persistently or fallback
async function getRoomMessages(roomId) {
  if (pool) {
    const res = await pool.query(
      'SELECT id, room_id, sender_id, content, attachment_url, created_at FROM messages WHERE room_id = $1 ORDER BY created_at ASC',
      [roomId]
    );
    return res.rows;
  }
  return inMemoryDb.messages.filter(m => m.room_id === roomId);
}

// Helper: Save Message persistently or fallback
async function saveMessage(roomId, senderId, content, attachmentUrl) {
  const newMsg = {
    id: 'msg-' + Date.now(),
    room_id: roomId,
    sender_id: senderId,
    content: content || '',
    attachment_url: attachmentUrl || null,
    created_at: new Date().toISOString()
  };

  if (pool) {
    const res = await pool.query(
      'INSERT INTO messages (room_id, sender_id, content, attachment_url, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [roomId, senderId, content || '', attachmentUrl || null, newMsg.created_at]
    );
    return res.rows[0];
  }

  inMemoryDb.messages.push(newMsg);
  return newMsg;
}

// Fetch Room Messages Endpoint
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const messages = await getRoomMessages(req.params.roomId);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// WebSocket Handler
wss.on('connection', (ws) => {
  clients.set(ws, { userId: null, username: null, rooms: new Set() });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);

      if (data.type === 'AUTH_CONNECT') {
        client.userId = data.userId;
        client.username = data.username;
        ws.send(JSON.stringify({ type: 'CONNECTED', status: 'OK' }));
      } else if (data.type === 'SEND_MESSAGE') {
        const savedMsg = await saveMessage(data.roomId, client.userId, data.content, data.attachmentUrl);
        
        // Broadcast to connected WebSocket clients
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(JSON.stringify({ type: 'NEW_MESSAGE', message: savedMsg }));
          }
        });
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Payload processing error' }));
    }
  });

  ws.on('close', () => { clients.delete(ws); });
});

// Register Endpoint in server.js
app.post('/api/auth/register', (req, res) => {
  const { username, password, full_name } = req.body;

  // Validation Guards
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'All fields (Full Name, Username, Password) are required.' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  // Check for duplicate username
  const existingUser = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'Username handle is already taken.' });
  }

  // Create & Save New User
  const newUser = {
    id: 'user-' + Date.now(),
    username: username.trim().toLowerCase(),
    password: password,
    full_name: full_name.trim(),
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    is_online: true
  };

  db.users.push(newUser);

  // Auto-join default public channel (room-1)
  if (db.rooms && db.rooms.length > 0) {
    db.rooms[0].members.push(newUser.id);
  }

  res.status(201).json({ 
    user: { 
      id: newUser.id, 
      username: newUser.username, 
      full_name: newUser.full_name, 
      avatar_url: newUser.avatar_url 
    } 
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Pulse Server running on port http://localhost:${PORT}`);
});