// test/server.test.js — Backend Core Validation & Security Logic Tests
const request = require('supertest');
const { app, db, isRoomMember } = require('../server');

describe('Pulse Chat Application - Server Unit Tests', () => {

  test('1. Membership Guard Block Non-Members From Rooms', () => {
    // Charlie (user-3) is NOT in Core Engineering (room-2)
    const hasAccess = isRoomMember('user-3', 'room-2');
    expect(hasAccess).toBe(false);
  });

  test('2. Membership Guard Grants Access to Authorized Members', () => {
    // Alice (user-1) IS in General Hub (room-1)
    const hasAccess = isRoomMember('user-1', 'room-1');
    expect(hasAccess).toBe(true);
  });

  test('3. REST API Guard Rejects Unauthenticated Message Fetching', async () => {
    const response = await request(app)
      .get('/api/rooms/room-2/messages')
      .set('x-user-id', 'user-3'); // Unauthorized Charlie

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toMatch(/Access Denied/i);
  });

  test('4. Server Rejects Invalid Credentials During Auth', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'wrongpassword' });

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  test('5. Server Validates Minimum Input Requirements for Registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: '123', full_name: 'Short Handle' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/at least 3 characters/i);
  });

  test('6. Room Creation Input Validation', async () => {
    const response = await request(app)
      .post('/api/rooms')
      .set('x-user-id', 'user-1')
      .send({ name: '  ' }); // Empty room name

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/cannot be empty/i);
  });

});