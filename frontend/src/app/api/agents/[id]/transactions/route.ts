import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/agents/[id]/transactions
 * Fetch transaction history (jobs) for a specific agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  try {
    // First get the agent to find its onchain_id
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, onchain_id, name")
      .eq("id", id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Fetch jobs where this agent is either the caller or provider
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id,
        job_id,
        caller_agent_id,
        provider_agent_id,
        caller_onchain_id,
        provider_onchain_id,
        user_address,
        amount,
        tx_hash,
        input,
        output,
        status,
        created_at,
        completed_at
      `)
      .or(`caller_agent_id.eq.${id},provider_agent_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    console.log(`[DEBUG] Agent ${id}: Found ${jobs?.length || 0} jobs`);
    if (jobs && jobs.length > 0) {
      console.log(`[DEBUG] First job:`, jobs[0]);
    }

    // Transform jobs into transaction format
    const transactions = await Promise.all(
      (jobs || []).map(async (job) => {
        const isEarned = job.provider_agent_id === id;
        
        // Get the other agent's name
        const otherAgentId = isEarned ? job.caller_agent_id : job.provider_agent_id;
        let otherAgentName = "Unknown Agent";
        
        if (otherAgentId) {
          const { data: otherAgent } = await supabase
            .from("agents")
            .select("name")
            .eq("id", otherAgentId)
            .single();
          
          if (otherAgent) {
            otherAgentName = otherAgent.name;
          }
        }

        return {
          id: job.id,
          jobId: job.job_id,
          type: isEarned ? "earned" : "spent",
          amount: job.amount,
          counterparty: isEarned 
            ? { id: job.caller_agent_id, name: otherAgentName, address: job.user_address }
            : { id: job.provider_agent_id, name: otherAgentName },
          description: (typeof job.input === 'object' && job.input?.message) 
            ? job.input.message.substring(0, 100) 
            : "Agent service",
          status: job.status,
          txHash: job.tx_hash,
          createdAt: job.created_at,
          completedAt: job.completed_at,
        };
      })
    );

    // Calculate totals
    const totalEarned = transactions
      .filter(t => t.type === "earned" && t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

    const totalSpent = transactions
      .filter(t => t.type === "spent" && t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

    return NextResponse.json({
      transactions,
      stats: {
        totalJobs: jobs?.length || 0,
        totalEarned: totalEarned.toFixed(4),
        totalSpent: totalSpent.toFixed(4),
      }
    });
  } catch (error: any) {
    console.error("Transaction history error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
