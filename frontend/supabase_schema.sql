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

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,
  agent_uuid UUID REFERENCES agents(id),
  caller_address TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_agents_owner ON agents(owner_address);
CREATE INDEX idx_agents_active ON agents(active);
CREATE INDEX idx_jobs_agent ON jobs(agent_uuid);
CREATE INDEX idx_jobs_status ON jobs(status);

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