-- Timelines (shared by all users - no auth required)
CREATE TABLE IF NOT EXISTS timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) DEFAULT 'My Timeline',
  start_date DATE DEFAULT CURRENT_DATE,
  tasks JSONB DEFAULT '[]',
  node_positions JSONB DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
