import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { supabase } from "@/lib/supabase";
import { storeMessage, searchMemories, searchKnowledgeBase, getRecentMessages } from "@/lib/vectordb";

/**
 * POST /api/chat
 * Chat with an agent using RAG (Retrieval Augmented Generation)
 * 
 * Body: {
 *   agentId: string (UUID),
 *   message: string,
 *   sessionId?: string,
 *   userAddress: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, message, sessionId = "default", userAddress } = body;

    if (!agentId || !message || !userAddress) {
      return NextResponse.json(
        { error: "agentId, message, and userAddress are required" },
        { status: 400 }
      );
    }

    // Get agent from Supabase
    const { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("*")
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

    let context = "";

    try {
      const knowledgeResults = await searchKnowledgeBase(agent.onchain_id, message, 3);
      if (knowledgeResults.length > 0) {
        context += "Relevant knowledge:\n" + knowledgeResults.join("\n---\n") + "\n\n";
      }

      // Get recent chat history
      const recentMessages = await getRecentMessages(
        agent.onchain_id,
        userAddress,
        10,
        sessionId
      );
      
      if (recentMessages.length > 0) {
        context += "Recent conversation:\n";
        recentMessages.forEach((msg) => {
          context += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
        });
        context += "\n";
      }

      // Search for semantically similar past conversations
      const memories = await searchMemories(agent.onchain_id, userAddress, message, 3);
      if (memories.length > 0) {
        context += "Related past conversations:\n";
        memories.forEach((mem) => {
          context += `${mem.role === "user" ? "User" : "Assistant"}: ${mem.content}\n`;
        });
      }
    } catch (vectorError) {
      console.warn("Vector DB unavailable, proceeding without RAG:", vectorError);
    }

    const systemPrompt = `${agent.system_prompt || "You are a helpful AI assistant."}

${context ? `\n---\nContext:\n${context}\n---\n` : ""}

Respond to the user's message.`;

    const { text: response } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: message,
    });

    try {
      await storeMessage(agent.onchain_id, userAddress, "user", message, sessionId);
      await storeMessage(agent.onchain_id, userAddress, "assistant", response, sessionId);
    } catch (storeError) {
      console.warn("Failed to store messages:", storeError);
    }

    return NextResponse.json({
      response,
      agentId,
      sessionId,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
