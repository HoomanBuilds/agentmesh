import { NextRequest, NextResponse } from "next/server";
import { getAgentWalletAddress, getAgentMneeBalance, getAgentEthBalance } from "@/lib/agent-wallet";

/**
 * GET /api/agent-wallet/info?agentId=X
 * Returns the agent's wallet address and balances
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentIdParam = searchParams.get("agentId");

    if (!agentIdParam) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    const agentId = parseInt(agentIdParam);
    if (isNaN(agentId) || agentId < 0) {
      return NextResponse.json(
        { error: "Invalid agentId" },
        { status: 400 }
      );
    }

    const address = getAgentWalletAddress(agentId);

    let mneeBalance = "0";
    let ethBalance = "0";
    
    try {
      mneeBalance = await getAgentMneeBalance(agentId);
      ethBalance = await getAgentEthBalance(agentId);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }

    return NextResponse.json({
      data: {
        address,
        mneeBalance,
        ethBalance,
        agentId,
      },
    });
  } catch (error: any) {
    console.error("Agent wallet info error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get agent wallet info" },
      { status: 500 }
    );
  }
}
