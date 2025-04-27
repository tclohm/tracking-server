CREATE TABLE IF NOT EXIST user_events {
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  session_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  url TEXT NOT NULL,
  target_data JSONB,
  position_data JSONB,
  device_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
}

CREATE INDEX idx_user_events_timestamp ON user_events(timestamp);
CREATE INDEX idx_user_events_user_session ON user_events(user_id, session_id);
CREATE INDEX idx_user_events_url ON user_events(url);
CREATE INDEX idx_user_events_event_type ON user_events(event_type);
