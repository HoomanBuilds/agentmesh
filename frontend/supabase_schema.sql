-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onchain_id INTEGER,
  owner_address TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  price_per_call TEXT NOT NULL,
  image_url TEXT,
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  -- Ranking/Rating columns
  total_jobs_served INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs table (payment history for agent-to-agent routing)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,           -- On-chain job ID
  
  -- Agent info
  caller_agent_id UUID REFERENCES agents(id),
  provider_agent_id UUID REFERENCES agents(id),
  caller_onchain_id INTEGER,
  provider_onchain_id INTEGER,
  
  -- Address info  
  user_address TEXT NOT NULL,            -- Who initiated the chat (human user)
  caller_address TEXT,                   -- Agent wallet that made the payment
  
  -- Payment info
  amount TEXT NOT NULL,                  -- MNEE amount paid
  tx_hash TEXT,                          -- Transaction hash
  
  -- Request/Response
  input TEXT,                            -- User's message
  output TEXT,                           -- Agent's response
  
  -- Status tracking
  status TEXT DEFAULT 'pending',         -- pending, completed, failed, stuck, expired
  error_message TEXT,                    -- Error details if failed/stuck
  retry_count INTEGER DEFAULT 0,         -- Number of retry attempts
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ                 -- When job timed out (if applicable)
);

-- Agent ratings table (user ratings after routing)
CREATE TABLE agent_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,  -- Can be UUID job id or custom string for free consultations
  user_address TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, user_address) -- One rating per job per user
);

-- Indexes for performance
CREATE INDEX idx_agents_owner ON agents(owner_address);
CREATE INDEX idx_agents_active ON agents(active);
CREATE INDEX idx_agents_jobs ON agents(total_jobs_served DESC);
CREATE INDEX idx_agents_rating ON agents(average_rating DESC);
CREATE INDEX idx_jobs_provider ON jobs(provider_agent_id);
CREATE INDEX idx_jobs_caller ON jobs(caller_agent_id);
CREATE INDEX idx_jobs_user ON jobs(user_address);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX idx_jobs_status ON jobs(status);              
CREATE INDEX idx_ratings_agent ON agent_ratings(agent_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_ratings ENABLE ROW LEVEL SECURITY;

-- Allow public read for agents (for discovery)
CREATE POLICY "Anyone can view active agents" ON agents
  FOR SELECT USING (active = true);

-- Allow insert for authenticated or anon users
CREATE POLICY "Anyone can create agents" ON agents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can create jobs" ON jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view jobs" ON jobs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update jobs" ON jobs
  FOR UPDATE USING (true) WITH CHECK (true);

-- RLS allows updates but API checks agent.owner_address matches request
CREATE POLICY "Anyone can update agents" ON agents
  FOR UPDATE USING (true) WITH CHECK (true);

-- Rating policies
CREATE POLICY "Anyone can create ratings" ON agent_ratings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view ratings" ON agent_ratings
  FOR SELECT USING (true);