// Supabase Database Types
// Auto-generated from schema, can be replaced with `supabase gen types typescript`

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          onchain_id: number | null;
          owner_address: string;
          name: string;
          description: string | null;
          system_prompt: string;
          price_per_call: string;
          input_schema: Record<string, unknown>;
          output_schema: Record<string, unknown>;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          onchain_id?: number | null;
          owner_address: string;
          name: string;
          description?: string | null;
          system_prompt: string;
          price_per_call: string;
          input_schema?: Record<string, unknown>;
          output_schema?: Record<string, unknown>;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          onchain_id?: number | null;
          owner_address?: string;
          name?: string;
          description?: string | null;
          system_prompt?: string;
          price_per_call?: string;
          input_schema?: Record<string, unknown>;
          output_schema?: Record<string, unknown>;
          active?: boolean;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          job_id: string;
          agent_uuid: string;
          caller_address: string;
          input: Record<string, unknown> | null;
          output: Record<string, unknown> | null;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          agent_uuid: string;
          caller_address: string;
          input?: Record<string, unknown> | null;
          output?: Record<string, unknown> | null;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          agent_uuid?: string;
          caller_address?: string;
          input?: Record<string, unknown> | null;
          output?: Record<string, unknown> | null;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
      };
    };
  };
}
