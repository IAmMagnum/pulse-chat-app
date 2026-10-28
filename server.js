// server.js — Pulse Backend Server (Express + WebSockets + Server Authorization)
const http = require('http');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database Fallback if PostgreSQL URL is not provided
let db = {
  users: [
    { id: 'user-1', username: 'alice', password: 'demo123', full_name: 'Alice Vance', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', is_online: true },
    { id: 'user-2', username: 'bob', password: 'demo123', full_name: 'Bob Smith', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', is_online: true },
    { id: 'user-3', username: 'charlie', password: 'demo123', full_name: 'Charlie Day', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', is_online: false }
  ],
  rooms: [
    { id: 'room-1', name: 'General Hub', type: 'public', description: 'Public lounge for open conversations', members: ['user-1', 'user-2', 'user-3'] },
    { id: 'room-2', name: 'Core Engineering', type: 'private', description: 'Private developer topics & API specs', members: ['user-1', 'user-2'] }
  ],
  messages: [
    { id: 'msg-1', room_id: 'room-1', sender_id: 'user-3', content: 'Welcome to Pulse live backend server!', created_at: new Date().toISOString() }
  ]
};

// WebSocket Room Client Manager
const clients = new Map(); // socket -> { userId, username, rooms: Set }

// SERVER-SIDE VALIDATION & AUTHORIZATION HELPERS
function isRoomMember(userId, roomId) {
  const room = db.rooms.find(r => r.id === roomId);
  return room ? room.members.includes(userId) : false;
}

// REST API ENDPOINTS

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username handle or password' });
  }

  user.is_online = true;
  res.json({ user: { id: user.id, username: user.username, full_name: user.full_name, avatar_url: user.avatar_url } });
});

// Register Endpoint
app.post('/api/auth/register', (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'All fields (username, password, full name) are required' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username handle is already taken' });
  }

  const newUser = {
    id: 'user-' + Date.now(),
    username: username.toLowerCase(),
    password,
    full_name,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    is_online: true
  };

  db.users.push(newUser);
  // Auto add new user to public room-1
  db.rooms[0].members.push(newUser.id);

  res.status(201).json({ user: { id: newUser.id, username: newUser.username, full_name: newUser.full_name, avatar_url: newUser.avatar_url } });
});

// Fetch Rooms
app.get('/api/rooms', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized header missing' });

  const userRooms = db.rooms.filter(r => r.members.includes(userId));
  res.json({ rooms: userRooms });
});

// Fetch Messages with Authorization Check
app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const userId = req.headers['x-user-id'];

  if (!userId || !isRoomMember(userId, roomId)) {
    return res.status(403).json({ error: 'Access Denied: You are not a member of this room' });
  }

  const messages = db.messages.filter(m => m.room_id === roomId);
  res.json({ messages });
});

// Create Room Endpoint
app.post('/api/rooms', (req, res) => {
  const { name, type, description } = req.body;
  const userId = req.headers['x-user-id'];

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Room name cannot be empty' });
  }

  const newRoom = {
    id: 'room-' + Date.now(),
    name: name.toLowerCase().replace(/\s+/g, '-'),
    type: type || 'public',
    description: description || 'Custom user created hub',
    members: [userId]
  };

  db.rooms.push(newRoom);
  res.status(201).json({ room: newRoom });
});

// WEBSOCKET REAL-TIME SERVER LOGIC
wss.on('connection', (ws) => {
  clients.set(ws, { userId: null, username: null, rooms: new Set() });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);

      switch (data.type) {
        case 'AUTH_CONNECT': {
          client.userId = data.userId;
          client.username = data.username;
          
          // Auto-subscribe to all authorized rooms
          db.rooms.forEach(room => {
            if (room.members.includes(data.userId)) {
              client.rooms.add(room.id);
            }
          });

          ws.send(JSON.stringify({ type: 'CONNECTED', status: 'OK' }));
          broadcastUserOnlineStatus(data.userId, true);
          break;
        }

        case 'SEND_MESSAGE': {
          const { roomId, content, attachmentUrl } = data;

          // SERVER AUTHORIZATION CHECK
          if (!client.userId || !isRoomMember(client.userId, roomId)) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Forbidden: You are not authorized to send messages in this hub' }));
            return;
          }

          const newMsg = {
            id: 'msg-' + Date.now(),
            room_id: roomId,
            sender_id: client.userId,
            content: content || '',
            attachment_url: attachmentUrl || null,
            created_at: new Date().toISOString()
          };

          db.messages.push(newMsg);

          // BROADCAST ONLY TO SUBSCRIBED AUTHORIZED ROOM MEMBERS
          wss.clients.forEach((c) => {
            const meta = clients.get(c);
            if (c.readyState === WebSocket.OPEN && meta && meta.rooms.has(roomId)) {
              c.send(JSON.stringify({ type: 'NEW_MESSAGE', message: newMsg }));
            }
          });
          break;
        }

        case 'TYPING': {
          const { roomId, isTyping } = data;
          wss.clients.forEach((c) => {
            const meta = clients.get(c);
            if (c !== ws && c.readyState === WebSocket.OPEN && meta && meta.rooms.has(roomId)) {
              c.send(JSON.stringify({ type: 'USER_TYPING', roomId, userId: client.userId, username: client.username, isTyping }));
            }
          });
          break;
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Malformed JSON payload' }));
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client && client.userId) {
      broadcastUserOnlineStatus(client.userId, false);
    }
    clients.delete(ws);
  });
});

function broadcastUserOnlineStatus(userId, isOnline) {
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify({ type: 'USER_PRESENCE', userId, isOnline }));
    }
  });
}

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Pulse Chat Server running on port http://localhost:${PORT}`);
  });
}

module.exports = { app, server, db, isRoomMember };