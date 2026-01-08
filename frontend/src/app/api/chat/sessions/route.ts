import { NextRequest, NextResponse } from "next/server";
import { getAgentMemoryCollection } from "@/lib/vectordb";

/**
 * GET /api/chat/sessions - Get chat sessions for user/agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const userAddress = searchParams.get("userAddress");

    if (!agentId || !userAddress) {
      return NextResponse.json(
        { error: "agentId and userAddress required" },
        { status: 400 }
      );
    }

    const collection = await getAgentMemoryCollection();

    // Get all messages for this agent/user
    const results = await collection.get({
      where: {
        $and: [
          { agentId: agentId.toString() },
          { userAddress },
        ],
      },
    });

    if (!results.metadatas || results.metadatas.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    // Group by sessionId and get latest message for each
    const sessionMap = new Map<string, {
      sessionId: string;
      lastMessage: string;
      timestamp: number;
      messageCount: number;
    }>();

    results.metadatas.forEach((meta: any, idx: number) => {
      const sessionId = meta.sessionId || "default";
      const timestamp = parseInt(meta.timestamp || "0");
      const content = results.documents?.[idx] || "";

      const existing = sessionMap.get(sessionId);
      if (!existing || timestamp > existing.timestamp) {
        sessionMap.set(sessionId, {
          sessionId,
          lastMessage: content.slice(0, 100),
          timestamp,
          messageCount: (existing?.messageCount || 0) + 1,
        });
      } else {
        sessionMap.set(sessionId, {
          ...existing,
          messageCount: existing.messageCount + 1,
        });
      }
    });

    // Sort by most recent first
    const sessions = Array.from(sessionMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
