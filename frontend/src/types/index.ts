// ==========================================
// Agent Types
// ==========================================

export interface Agent {
  id: string; // UUID from Supabase
  onchain_id: number | null; // ID from smart contract
  owner_address: string;
  name: string;
  description: string | null;
  system_prompt: string;
  price_per_call: string; // In wei
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  system_prompt: string;
  price_per_call: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  owner_address: string;
}

// ==========================================
// Job Types
// ==========================================

export type JobStatus = "pending" | "completed" | "disputed" | "expired";

export interface Job {
  id: string; // UUID from Supabase
  job_id: string; // bytes32 from contract
  agent_uuid: string;
  caller_address: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  status: JobStatus;
  created_at: string;
  completed_at: string | null;
}

export interface CreateJobInput {
  job_id: string;
  agent_uuid: string;
  caller_address: string;
  input?: Record<string, unknown>;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
