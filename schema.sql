-- Pulse Real-Time Chat Application Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms / Hubs Table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('public', 'private', 'dm')) DEFAULT 'public',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Room Membership (Junction Table)
CREATE TABLE IF NOT EXISTS room_members (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    is_edited BOOLEAN DEFAULT false,
    sequence_id BIGSERIAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for optimized message history retrieval
CREATE INDEX IF NOT EXISTS idx_messages_room_sequence ON messages(room_id, sequence_id DESC);

-- Seed Initial Demo Data
INSERT INTO users (id, username, password_hash, full_name, is_online) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'alice', 'demo123', 'Alice Vance', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'bob', 'demo123', 'Bob Smith', true),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'charlie', 'demo123', 'Charlie Day', false)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rooms (id, name, type, description) VALUES
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'general-hub', 'public', 'Public lounge for open conversations'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'core-engineering', 'private', 'Private developer topics & API specs')
ON CONFLICT (name) DO NOTHING;

INSERT INTO room_members (room_id, user_id) VALUES
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22')
ON CONFLICT DO NOTHING;