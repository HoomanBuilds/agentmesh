import { NextRequest, NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/vectordb";

/**
 * GET /api/chat/history - Get messages for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const userAddress = searchParams.get("userAddress");
    const sessionId = searchParams.get("sessionId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!agentId || !userAddress || !sessionId) {
      return NextResponse.json(
        { error: "agentId, userAddress, and sessionId required" },
        { status: 400 }
      );
    }

    const messages = await getRecentMessages(
      parseInt(agentId),
      userAddress,
      limit,
      sessionId
    );

    // Format for frontend
    const formattedMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
      timestamp: msg.timestamp,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: any) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}
