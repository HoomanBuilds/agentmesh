import { NextRequest, NextResponse } from "next/server";
import { sendMneeFromAgent, getAgentMneeBalance } from "@/lib/agent-wallet";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/agent-wallet/withdraw
 * Withdraw MNEE from agent wallet to owner's wallet
 * 
 * Body: { agentId: number, ownerAddress: string, amount?: string }
 * ownerAddress is REQUIRED for ownership verification
 * If amount is not provided, withdraws entire balance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, amount, toAddress, ownerAddress } = body;

    if (agentId === undefined || agentId === null) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // SECURITY: Require ownerAddress for verification
    if (!ownerAddress) {
      return NextResponse.json(
        { error: "ownerAddress is required for verification" },
        { status: 400 }
      );
    }

    // Get agent from Supabase
    const { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("*")
      .eq("onchain_id", agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // SECURITY: Verify ownership - caller must be the agent owner
    if (agent.owner_address.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Not authorized - only the agent owner can withdraw" },
        { status: 403 }
      );
    }

    // Determine recipient address (defaults to owner if not specified)
    const recipient = toAddress || agent.owner_address;
    if (!recipient) {
      return NextResponse.json(
        { error: "No recipient address available" },
        { status: 400 }
      );
    }

    // Get current balance
    let withdrawAmount = amount;
    if (!withdrawAmount) {
      const balance = await getAgentMneeBalance(agentId);
      withdrawAmount = balance;
    }

    if (parseFloat(withdrawAmount) <= 0) {
      return NextResponse.json(
        { error: "No balance to withdraw" },
        { status: 400 }
      );
    }

    // Send MNEE to recipient
    const result = await sendMneeFromAgent(agentId, recipient, withdrawAmount);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        hash: result.hash,
        amount: withdrawAmount,
        recipient,
      },
    });
  } catch (error: any) {
    console.error("Withdraw error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to withdraw" },
      { status: 500 }
    );
  }
}
