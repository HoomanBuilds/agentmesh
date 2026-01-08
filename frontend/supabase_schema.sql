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
  
  -- User info  
  user_address TEXT NOT NULL,            -- Who initiated the chat
  
  -- Payment info
  amount TEXT NOT NULL,                  -- MNEE amount paid
  tx_hash TEXT,                          -- Transaction hash
  
  -- Request/Response
  input TEXT,                            -- User's message
  output TEXT,                           -- Agent's response
  
  -- Status
  status TEXT DEFAULT 'pending',         -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_agents_owner ON agents(owner_address);
CREATE INDEX idx_agents_active ON agents(active);
CREATE INDEX idx_jobs_provider ON jobs(provider_agent_id);
CREATE INDEX idx_jobs_caller ON jobs(caller_agent_id);
CREATE INDEX idx_jobs_user ON jobs(user_address);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

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

-- RLS allows updates but API checks agent.owner_address matches request
CREATE POLICY "Anyone can update agents" ON agents
  FOR UPDATE USING (true) WITH CHECK (true);