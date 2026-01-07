import { NextRequest, NextResponse } from "next/server";
import { addToKnowledgeBase } from "@/lib/vectordb";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/knowledge-base/upload
 * Upload documents to agent's knowledge base
 * 
 * Body: {
 *   agentId: string (UUID),
 *   documents: string[] (text chunks)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, documents } = body;

    if (!agentId || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "agentId and documents array are required" },
        { status: 400 }
      );
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "No documents provided" },
        { status: 400 }
      );
    }

    // Get agent to verify it exists and get onchain_id
    const { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("onchain_id")
      .eq("id", agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (agent.onchain_id === null) {
      return NextResponse.json(
        { error: "Agent not registered on-chain" },
        { status: 400 }
      );
    }

    // Add documents to knowledge base
    const result = await addToKnowledgeBase(agent.onchain_id, documents);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to upload documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        uploaded: documents.length,
        agentId,
      },
    });
  } catch (error: any) {
    console.error("Knowledge base upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload documents" },
      { status: 500 }
    );
  }
}
