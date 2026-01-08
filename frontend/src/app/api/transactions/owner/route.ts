import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/transactions/owner
 * Fetch combined transaction history for all agents owned by a user
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ownerAddress = searchParams.get("ownerAddress");

  if (!ownerAddress) {
    return NextResponse.json({ error: "Owner address required" }, { status: 400 });
  }

  try {
    // Normalize address to lowercase for comparison
    const normalizedAddress = ownerAddress.toLowerCase();
    
    // First get all agents owned by this user
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("id, name, onchain_id")
      .ilike("owner_address", normalizedAddress);
    
    console.log(`[DEBUG] Querying agents for owner: ${normalizedAddress}, found: ${agents?.length || 0}`);

    if (agentsError) {
      console.error("Error fetching agents:", agentsError);
      return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        transactions: [],
        stats: { totalJobs: 0, totalEarned: "0", totalSpent: "0" }
      });
    }

    const agentIds = agents.map(a => a.id);
    const agentMap = new Map(agents.map(a => [a.id, a.name]));

    console.log(`[DEBUG] Owner ${ownerAddress}: Found ${agentIds.length} agents:`, agentIds);

    // Fetch all jobs where any owned agent is caller or provider
    // Use separate queries and combine results for reliability
    const { data: earnedJobs, error: earnedError } = await supabase
      .from("jobs")
      .select(`
        id,
        job_id,
        caller_agent_id,
        provider_agent_id,
        user_address,
        amount,
        tx_hash,
        status,
        created_at,
        completed_at
      `)
      .in("provider_agent_id", agentIds)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: spentJobs, error: spentError } = await supabase
      .from("jobs")
      .select(`
        id,
        job_id,
        caller_agent_id,
        provider_agent_id,
        user_address,
        amount,
        tx_hash,
        status,
        created_at,
        completed_at
      `)
      .in("caller_agent_id", agentIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (earnedError || spentError) {
      console.error("Error fetching jobs:", earnedError || spentError);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    // Combine and deduplicate jobs
    const allJobs = [...(earnedJobs || []), ...(spentJobs || [])];
    const uniqueJobs = Array.from(new Map(allJobs.map(j => [j.id, j])).values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    console.log(`[DEBUG] Found ${uniqueJobs.length} total jobs`);


    // Get all unique agent IDs from jobs for counterparty lookup
    const counterpartyIds = new Set<string>();
    uniqueJobs.forEach(job => {
      if (job.caller_agent_id && !agentMap.has(job.caller_agent_id)) {
        counterpartyIds.add(job.caller_agent_id);
      }
      if (job.provider_agent_id && !agentMap.has(job.provider_agent_id)) {
        counterpartyIds.add(job.provider_agent_id);
      }
    });

    // Fetch counterparty agent names
    if (counterpartyIds.size > 0) {
      const { data: counterparties } = await supabase
        .from("agents")
        .select("id, name")
        .in("id", Array.from(counterpartyIds));

      counterparties?.forEach(cp => agentMap.set(cp.id, cp.name));
    }

    // Transform jobs into transaction format
    const transactions = uniqueJobs.map(job => {
      // Determine if this is earned or spent from the owner's perspective
      const isEarned = agentIds.includes(job.provider_agent_id);
      const ownedAgentId = isEarned ? job.provider_agent_id : job.caller_agent_id;
      const counterpartyId = isEarned ? job.caller_agent_id : job.provider_agent_id;

      return {
        id: job.id,
        jobId: job.job_id,
        type: isEarned ? "earned" : "spent",
        amount: job.amount,
        ownedAgent: {
          id: ownedAgentId,
          name: agentMap.get(ownedAgentId) || "Unknown Agent",
        },
        counterparty: {
          id: counterpartyId,
          name: agentMap.get(counterpartyId) || "Unknown Agent",
        },
        status: job.status,
        txHash: job.tx_hash,
        createdAt: job.created_at,
        completedAt: job.completed_at,
      };
    });

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
        totalJobs: uniqueJobs.length,
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
