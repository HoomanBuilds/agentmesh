import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { storeMessage, searchKnowledgeBase, getRecentMessages } from "@/lib/vectordb";
import { getAgentMneeBalance } from "@/lib/agent-wallet";
import { getOrSet, backendCacheKeys } from "@/lib/cache";
import { ethers } from "ethers";

// Schema for routing decision
const routingSchema = z.object({
  canHandle: z.boolean().describe("Whether this agent can handle the request with its expertise"),
  confidence: z.number().min(0).max(1).describe("Confidence level 0-1"),
  reason: z.string().describe("Brief reason for the decision"),
  searchQuery: z.string().optional().describe("If canHandle is false, a query to search for a suitable agent"),
});

/**
 * POST /api/chat
 * Chat with an agent - supports agent-to-agent routing with user confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      agentId, 
      message, 
      sessionId = "default", 
      userAddress, 
      enableRouting = true,
      // For confirmation flow
      confirmRouting = false,
      pendingAgentId = null,
    } = body;

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
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.onchain_id === null) {
      return NextResponse.json({ error: "Agent not registered on-chain" }, { status: 400 });
    }

    // Handle confirmation of pending agent routing
    if (confirmRouting && pendingAgentId) {
      return await handleConfirmedRouting(agent, pendingAgentId, message, userAddress, sessionId);
    }

    // Build context from RAG
    let context = "";
    try {
      const knowledgeResults = await searchKnowledgeBase(agent.onchain_id, message, 3);
      if (knowledgeResults.length > 0) {
        context += "Relevant knowledge:\n" + knowledgeResults.join("\n---\n") + "\n\n";
      }

      const recentMessages = await getRecentMessages(agent.onchain_id, userAddress, 10, sessionId);
      if (recentMessages.length > 0) {
        context += "Recent conversation:\n";
        recentMessages.forEach((msg) => {
          context += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
        });
        context += "\n";
      }
    } catch (vectorError) {
      console.warn("Vector DB unavailable:", vectorError);
    }

    // Step 1: Check if agent can handle this request
    let routingDecision = { canHandle: true, confidence: 1, reason: "Default", searchQuery: "" };
    
    if (enableRouting) {
      try {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: routingSchema,
          prompt: `You are an AI agent with this specific expertise:
"${agent.system_prompt}"

User's message: "${message}"

YOUR TASK: Decide if this request matches YOUR expertise domain.

CRITICAL ROUTING RULES:

1. SET canHandle=FALSE if the user is asking about:
   - A DIFFERENT programming language than your expertise (e.g., you're a JS expert but they ask about Python code)
   - A different technology stack (e.g., you're a React expert but they ask about Vue.js)
   - A domain you don't specialize in
   - Code explanation/debugging in a language you DON'T know
   
2. SET canHandle=TRUE only for:
   - Greetings and small talk ("hi", "hey", "how are you")
   - Questions directly within YOUR stated expertise domain
   - Questions about your capabilities
   - Thank you messages

3. EXAMPLES:
   - JavaScript Expert asked about Python code → canHandle=FALSE, searchQuery="Python expert"
   - Python Expert asked about JavaScript → canHandle=FALSE, searchQuery="JavaScript expert"  
   - JavaScript Expert asked about JavaScript → canHandle=TRUE
   - Any agent asked "hi, how are you" → canHandle=TRUE

IMPORTANT: If you see code in a language that is NOT your expertise, you MUST set canHandle=FALSE.

Respond with:
- canHandle: Does this EXACTLY match your expertise? Be strict.
- confidence: How confident (0-1)?
- reason: Why you can or cannot handle this
- searchQuery: If canHandle=false, what type of expert is needed?`,
        });
        routingDecision = { ...object, searchQuery: object.searchQuery || "" };
      } catch (routeError) {
        console.warn("Routing decision failed, proceeding normally:", routeError);
      }
    }

    // Step 2: If agent can't handle, find a suitable agent and ASK for confirmation
    if (!routingDecision.canHandle && routingDecision.searchQuery && enableRouting) {
      console.log(`Agent ${agent.name} looking for another agent for: ${routingDecision.searchQuery}`);

      // Search for suitable agents (cached for 5 minutes)
      const otherAgents = await getOrSet(
        `${backendCacheKeys.activeAgents}:${agentId}`,
        async () => {
          const { data } = await supabase
            .from("agents")
            .select("*")
            .neq("id", agentId)
            .eq("active", true)
            .not("onchain_id", "is", null);
          return data || [];
        },
        5 * 60 * 1000
      );

      if (otherAgents && otherAgents.length > 0) {
        const agentDescriptions = otherAgents.map((a, i) => 
          `${i + 1}. "${a.name}": ${a.description || a.system_prompt.substring(0, 100)}`
        ).join("\n");

        const { object: selection } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: z.object({
            selectedIndex: z.number().describe("1-based index of best agent, 0 if none suitable"),
            reason: z.string(),
          }),
          prompt: `User needs help with: "${message}"
Original agent couldn't handle because: "${routingDecision.reason}"

Available agents:
${agentDescriptions}

Select the best agent (1-${otherAgents.length}) or 0 if none suitable.`,
        });

        if (selection.selectedIndex > 0 && selection.selectedIndex <= otherAgents.length) {
          const targetAgent = otherAgents[selection.selectedIndex - 1];
          const targetPriceEth = ethers.formatEther(BigInt(targetAgent.price_per_call));

          let hasBalance = false;
          try {
            const balance = await getAgentMneeBalance(agent.onchain_id);
            hasBalance = parseFloat(balance) >= parseFloat(targetPriceEth);
          } catch (e) {
            console.warn("Balance check failed:", e);
          }

          return NextResponse.json({
            response: `I found a specialist who can help with your request!

**Agent:** ${targetAgent.name}
**Description:** ${targetAgent.description || "Expert AI agent"}
**Price:** ${targetPriceEth} MNEE

${hasBalance ? "Would you like me to proceed and consult this agent? Reply **'yes'** to confirm." : "⚠️ Insufficient balance in agent wallet to pay for this service."}`,
            agentId,
            sessionId,
            routing: {
              needsConfirmation: true,
              pendingAgent: {
                id: targetAgent.id,
                name: targetAgent.name,
                description: targetAgent.description,
                price: targetPriceEth,
                onchainId: targetAgent.onchain_id,
              },
              hasBalance,
              reason: routingDecision.reason,
            },
          });
        }
      }
    }

    const systemPrompt = `${agent.system_prompt || "You are a helpful AI assistant."}

${context ? `\n---\nContext:\n${context}\n---\n` : ""}

${!routingDecision.canHandle ? `Note: This request may be outside your expertise. Do your best but be honest about limitations.` : ""}

Respond to the user's message.`;

    const { text: finalResponse } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: message,
    });

    // Store messages
    try {
      await storeMessage(agent.onchain_id, userAddress, "user", message, sessionId);
      await storeMessage(agent.onchain_id, userAddress, "assistant", finalResponse, sessionId);
    } catch (storeError) {
      console.warn("Failed to store messages:", storeError);
    }

    return NextResponse.json({
      response: finalResponse,
      agentId,
      sessionId,
      routing: enableRouting ? {
        wasRouted: false,
        confidence: routingDecision.confidence,
      } : undefined,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}

/**
 * Handle confirmed routing - user said "yes" to paying another agent
 */
async function handleConfirmedRouting(
  callerAgent: any,
  targetAgentId: string,
  originalMessage: string,
  userAddress: string,
  sessionId: string
) {
  // Get target agent
  const { data: targetAgent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", targetAgentId)
    .single();

  if (error || !targetAgent) {
    return NextResponse.json({ error: "Target agent not found" }, { status: 404 });
  }

  const targetPrice = BigInt(targetAgent.price_per_call);
  const targetPriceEth = ethers.formatEther(targetPrice);

  try {
    const { requestAgentService, confirmAgentJob } = await import("@/lib/agent-wallet");

    // Step 1: Request service via escrow (locks payment)
    console.log(`Routing to ${targetAgent.name}, price: ${targetPriceEth} MNEE`);
    const serviceResult = await requestAgentService(
      callerAgent.onchain_id,
      targetAgent.onchain_id,
      targetPrice
    );

    if ("error" in serviceResult) {
      return NextResponse.json({
        response: `❌ Failed to initiate payment: ${serviceResult.error}`,
        agentId: callerAgent.id,
        sessionId,
        routing: { wasRouted: false, error: serviceResult.error },
      });
    }

    console.log(`Job created: ${serviceResult.jobId}`);

    // Step 2: Execute the target agent
    const targetResponse = await generateText({
      model: openai("gpt-4o-mini"),
      system: targetAgent.system_prompt,
      prompt: originalMessage,
    });

    // Step 3: Confirm job (releases payment to provider)
    const confirmResult = await confirmAgentJob(callerAgent.onchain_id, serviceResult.jobId);
    if ("error" in confirmResult) {
      console.error("Failed to confirm job:", confirmResult.error);
    } else {
      console.log(`Job confirmed, payment released: ${confirmResult.hash}`);
    }

    // Step 4: Frame the response
    const { text: framedResponse } = await generateText({
      model: openai("gpt-4o-mini"),
      system: callerAgent.system_prompt,
      prompt: `The user asked: "${originalMessage}"

I consulted with "${targetAgent.name}" who provided this answer:
"${targetResponse.text}"

Present this information naturally, acknowledging the consultation.`,
    });

    try {
      await storeMessage(callerAgent.onchain_id, userAddress, "assistant", framedResponse, sessionId);
    } catch (storeError) {
      console.warn("Failed to store messages:", storeError);
    }

    // Record job in Supabase for payment history
    try {
      await supabase.from("jobs").insert({
        job_id: serviceResult.jobId,
        caller_agent_id: callerAgent.id,
        provider_agent_id: targetAgent.id,
        caller_onchain_id: callerAgent.onchain_id,
        provider_onchain_id: targetAgent.onchain_id,
        user_address: userAddress,
        amount: targetPriceEth,
        tx_hash: ("hash" in confirmResult) ? confirmResult.hash : null,
        input: originalMessage,
        output: targetResponse.text,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    } catch (jobError) {
      console.warn("Failed to record job:", jobError);
    }

    return NextResponse.json({
      response: framedResponse,
      agentId: callerAgent.id,
      sessionId,
      routing: {
        wasRouted: true,
        delegatedTo: targetAgent.name,
        jobId: serviceResult.jobId,
        txHash: serviceResult.hash,
        price: targetPriceEth,
      },
    });
  } catch (error: any) {
    console.error("Routing error:", error);
    return NextResponse.json({
      response: `❌ An error occurred while consulting the specialist: ${error.message}`,
      agentId: callerAgent.id,
      sessionId,
      routing: { wasRouted: false, error: error.message },
    });
  }
}
