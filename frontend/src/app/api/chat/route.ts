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
      confirmRouting = false,
      pendingAgentId = null,
      autoForward = false,
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

    if (autoForward && pendingAgentId) {
      return await handleAutoForward(agent, pendingAgentId, message, userAddress, sessionId);
    }

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

    // Step 2: If agent can't handle, find suitable agents and ASK for confirmation
    if (!routingDecision.canHandle && routingDecision.searchQuery && enableRouting) {
      console.log(`Agent ${agent.name} looking for other agents for: ${routingDecision.searchQuery}`);

      const { data: otherAgents } = await supabase
        .from("agents")
        .select("*")
        .neq("id", agentId)
        .eq("active", true)
        .not("onchain_id", "is", null);

      console.log("[MULTI-AGENT] Found", otherAgents?.length || 0, "other agents for routing");

      if (otherAgents && otherAgents.length > 0) {
        const agentDescriptions = otherAgents.map((a, i) => 
          `${i + 1}. "${a.name}": ${a.description || a.system_prompt.substring(0, 100)} (Jobs: ${a.total_jobs_served || 0}, Rating: ${a.average_rating || 0})`
        ).join("\n");

        const { object: selection } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: z.object({
            selectedAgents: z.array(z.object({
              index: z.number().describe("1-based index of agent"),
              matchScore: z.number().min(0).max(100).describe("How well this agent matches the request (0-100)"),
              reason: z.string().describe("Brief reason why this agent is suitable"),
            })).max(5).describe("Top 1-5 matching agents, ordered by relevance"),
          }),
          prompt: `User needs help with: "${message}"
Original agent couldn't handle because: "${routingDecision.reason}"

Available agents:
${agentDescriptions}

Select up to 5 best-matching agents (1-${otherAgents.length}), ordered by how well they can help.
Only include agents that can actually help with this request.`,
        });

        console.log("[MULTI-AGENT] LLM selected agents:", JSON.stringify(selection.selectedAgents, null, 2));

        if (selection.selectedAgents && selection.selectedAgents.length > 0) {
          const currentAgentOwner = agent.owner_address?.toLowerCase();
          console.log("[MULTI-AGENT] Current agent owner:", currentAgentOwner);
          
          const matchedAgents = selection.selectedAgents
            .filter(sel => sel.index > 0 && sel.index <= otherAgents.length)
            .map(sel => {
              const targetAgent = otherAgents[sel.index - 1];
              const isSameOwner = targetAgent.owner_address?.toLowerCase() === currentAgentOwner;
              
              return {
                id: targetAgent.id,
                name: targetAgent.name,
                description: targetAgent.description,
                price: ethers.formatEther(BigInt(targetAgent.price_per_call)),
                onchainId: targetAgent.onchain_id,
                totalJobs: targetAgent.total_jobs_served || 0,
                averageRating: parseFloat(targetAgent.average_rating) || 0,
                ratingCount: targetAgent.rating_count || 0,
                matchScore: sel.matchScore,
                matchReason: sel.reason,
                isSameOwner,
              };
            });

          console.log("[MULTI-AGENT] Matched agents:", matchedAgents.map(a => ({ name: a.name, isSameOwner: a.isSameOwner, jobs: a.totalJobs, rating: a.averageRating })));

          const ownedAgents = matchedAgents.filter(a => a.isSameOwner);
          const externalAgents = matchedAgents.filter(a => !a.isSameOwner);
          
          console.log("[MULTI-AGENT] Owned agents:", ownedAgents.length, "External agents:", externalAgents.length);

          let walletBalance = "0";
          try {
            walletBalance = await getAgentMneeBalance(agent.onchain_id);
          } catch (e) {
            console.warn("Balance check failed:", e);
          }

          let confirmationResponse = "";
          if (ownedAgents.length > 0 && externalAgents.length > 0) {
            confirmationResponse = `I found ${matchedAgents.length} specialists who can help! You own ${ownedAgents.length} of them (free to use).`;
          } else if (ownedAgents.length > 0) {
            confirmationResponse = `I found ${ownedAgents.length} of your own agents that can help with this - you can consult them for free!`;
          } else {
            confirmationResponse = `I found ${externalAgents.length} specialist${externalAgents.length > 1 ? 's' : ''} who can help with your request!`;
          }

          try {
            await storeMessage(agent.onchain_id, userAddress, "user", message, sessionId);
            await storeMessage(agent.onchain_id, userAddress, "assistant", confirmationResponse, sessionId);
          } catch (storeError) {
            console.warn("Failed to store routing messages:", storeError);
          }

          return NextResponse.json({
            response: confirmationResponse,
            agentId,
            sessionId,
            routing: {
              needsConfirmation: true,
              multipleAgents: true,
              ownedAgents,
              externalAgents,
              walletBalance,
              reason: routingDecision.reason,
              pendingAgent: externalAgents.length === 1 && ownedAgents.length === 0 
                ? externalAgents[0] 
                : null,
              hasBalance: externalAgents.length > 0 
                ? parseFloat(walletBalance) >= parseFloat(externalAgents[0].price)
                : true,
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
  
  // Helper to record failed/stuck job in Supabase
  const recordFailedJob = async (jobId: string | null, errorMessage: string, status: "failed" | "stuck") => {
    try {
      const { getAgentWalletAddress } = await import("@/lib/agent-wallet");
      const callerWalletAddress = getAgentWalletAddress(callerAgent.onchain_id);
      
      const jobData = {
        job_id: jobId || `failed_${Date.now()}`,
        caller_agent_id: callerAgent.id,
        provider_agent_id: targetAgent.id,
        caller_onchain_id: callerAgent.onchain_id,
        provider_onchain_id: targetAgent.onchain_id,
        user_address: userAddress,
        caller_address: callerWalletAddress,
        amount: targetPriceEth,
        input: JSON.stringify({ message: originalMessage }),
        status,
        error_message: errorMessage,
      };
      
      // If job exists, update it; otherwise insert
      if (jobId) {
        const { error: upsertError } = await supabase
          .from("jobs")
          .upsert(jobData, { onConflict: "job_id" });
        if (upsertError) console.error("[ERROR] Failed to upsert failed job:", upsertError);
      } else {
        const { error: insertError } = await supabase.from("jobs").insert(jobData);
        if (insertError) console.error("[ERROR] Failed to insert failed job:", insertError);
      }
    } catch (e) {
      console.error("[ERROR] Exception recording failed job:", e);
    }
  };

  try {
    const { requestAgentService, confirmAgentJob, getAgentMneeBalance, getAgentEthBalance } = await import("@/lib/agent-wallet");

    const mneeBalance = await getAgentMneeBalance(callerAgent.onchain_id);
    const ethBalance = await getAgentEthBalance(callerAgent.onchain_id);
    
    console.log(`[BALANCE CHECK] Agent ${callerAgent.name}: MNEE=${mneeBalance}, ETH=${ethBalance}, Required=${targetPriceEth}`);
    
    if (parseFloat(mneeBalance) < parseFloat(targetPriceEth)) {
      await recordFailedJob(null, `Insufficient MNEE: ${mneeBalance} < ${targetPriceEth}`, "failed");
      return NextResponse.json({
        response: `❌ Insufficient MNEE balance. You have ${parseFloat(mneeBalance).toFixed(4)} MNEE but need ${targetPriceEth} MNEE. Please fund your agent wallet.`,
        agentId: callerAgent.id,
        sessionId,
        routing: { 
          needsConfirmation: false, 
          error: "insufficient_mnee",
          currentBalance: mneeBalance,
          required: targetPriceEth
        },
      });
    }
    
    const MIN_ETH_FOR_GAS = 0.001;
    if (parseFloat(ethBalance) < MIN_ETH_FOR_GAS) {
      await recordFailedJob(null, `Insufficient ETH for gas: ${ethBalance} < ${MIN_ETH_FOR_GAS}`, "failed");
      return NextResponse.json({
        response: `❌ Insufficient ETH for gas fees. You have ${parseFloat(ethBalance).toFixed(6)} ETH but need at least ${MIN_ETH_FOR_GAS} ETH. Please send some ETH to your agent wallet.`,
        agentId: callerAgent.id,
        sessionId,
        routing: { 
          needsConfirmation: false, 
          error: "insufficient_eth",
          currentBalance: ethBalance,
          required: MIN_ETH_FOR_GAS.toString()
        },
      });
    }

    // Step 1: Request service via escrow (locks payment)
    console.log(`Routing to ${targetAgent.name}, price: ${targetPriceEth} MNEE`);
    const serviceResult = await requestAgentService(
      callerAgent.onchain_id,
      targetAgent.onchain_id,
      targetPrice
    );

    if ("error" in serviceResult) {
      await recordFailedJob(null, `Service request failed: ${serviceResult.error}`, "failed");
      return NextResponse.json({
        response: `❌ Failed to initiate payment: ${serviceResult.error}`,
        agentId: callerAgent.id,
        sessionId,
        routing: { wasRouted: false, error: serviceResult.error },
      });
    }

    console.log(`Job created: ${serviceResult.jobId}`);

    // Step 2: Execute the target agent
    let targetResponse;
    try {
      targetResponse = await generateText({
        model: openai("gpt-4o-mini"),
        system: targetAgent.system_prompt,
        prompt: originalMessage,
      });
    } catch (aiError: any) {
      // Job is now STUCK - payment locked but AI execution failed
      await recordFailedJob(serviceResult.jobId, `AI execution failed: ${aiError.message}`, "stuck");
      return NextResponse.json({
        response: `❌ Job stuck: AI execution failed after payment was locked. JobId: ${serviceResult.jobId}. Error: ${aiError.message}`,
        agentId: callerAgent.id,
        sessionId,
        routing: { wasRouted: false, error: aiError.message, stuckJobId: serviceResult.jobId },
      });
    }

    // Step 3: Confirm job (releases payment to provider)
    const confirmResult = await confirmAgentJob(callerAgent.onchain_id, serviceResult.jobId);
    if ("error" in confirmResult) {
      // Job is STUCK executed but confirmation failed
      await recordFailedJob(serviceResult.jobId, `Job confirmation failed: ${confirmResult.error}`, "stuck");
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
      await storeMessage(callerAgent.onchain_id, userAddress, "user", "yes", sessionId);
      await storeMessage(callerAgent.onchain_id, userAddress, "assistant", framedResponse, sessionId);
    } catch (storeError) {
      console.warn("Failed to store messages:", storeError);
    }

    // Record successful job in Supabase
    try {
      const { getAgentWalletAddress } = await import("@/lib/agent-wallet");
      const callerWalletAddress = getAgentWalletAddress(callerAgent.onchain_id);
      
      const jobData = {
        job_id: serviceResult.jobId,
        caller_agent_id: callerAgent.id,
        provider_agent_id: targetAgent.id,
        caller_onchain_id: callerAgent.onchain_id,
        provider_onchain_id: targetAgent.onchain_id,
        user_address: userAddress,
        caller_address: callerWalletAddress, 
        amount: targetPriceEth,
        tx_hash: ("hash" in confirmResult) ? confirmResult.hash : null,
        input: JSON.stringify({ message: originalMessage }), 
        output: JSON.stringify({ response: targetResponse.text }),
        status: "completed",
        completed_at: new Date().toISOString(),
      };
      
      console.log("[DEBUG] Inserting job:", jobData);
      
      const { error: insertError } = await supabase.from("jobs").insert(jobData);
      
      if (insertError) {
        console.error("[ERROR] Failed to insert job:", insertError);
      } else {
        console.log("[SUCCESS] Job recorded in database");
        
        const { error: updateError } = await supabase
          .from("agents")
          .update({ total_jobs_served: (targetAgent.total_jobs_served || 0) + 1 })
          .eq("id", targetAgent.id);
        
        if (updateError) {
          console.warn("[WARN] Failed to increment total_jobs_served:", updateError);
        } else {
          console.log("[SUCCESS] Incremented total_jobs_served for", targetAgent.name);
        }
      }
    } catch (jobError) {
      console.error("[ERROR] Job insert exception:", jobError);
    }

    return NextResponse.json({
      response: framedResponse,
      agentId: callerAgent.id,
      sessionId,
      routing: {
        wasRouted: true,
        delegatedTo: targetAgent.name,
        targetAgentId: targetAgent.id,
        jobId: serviceResult.jobId,
        txHash: serviceResult.hash,
        price: targetPriceEth,
      },
    });
  } catch (error: any) {
    console.error("Routing error:", error);
    await recordFailedJob(null, `Unexpected error: ${error.message}`, "failed");
    return NextResponse.json({
      response: `❌ An error occurred while consulting the specialist: ${error.message}`,
      agentId: callerAgent.id,
      sessionId,
      routing: { wasRouted: false, error: error.message },
    });
  }
}

/**
 * Handle auto-forward for same-owner agents (FREE consultation, no blockchain tx)
 */
async function handleAutoForward(
  callerAgent: any,
  targetAgentId: string,
  originalMessage: string,
  userAddress: string,
  sessionId: string
) {
  const { data: targetAgent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", targetAgentId)
    .single();

  if (error || !targetAgent) {
    return NextResponse.json({ error: "Target agent not found" }, { status: 404 });
  }

  console.log("[AUTO-FORWARD] Checking ownership - Caller:", callerAgent.owner_address?.toLowerCase(), "Target:", targetAgent.owner_address?.toLowerCase());
  
  if (targetAgent.owner_address?.toLowerCase() !== callerAgent.owner_address?.toLowerCase()) {
    console.log("[AUTO-FORWARD] REJECTED - Different owners");
    return NextResponse.json(
      { error: "Auto-forward only allowed for same-owner agents" },
      { status: 403 }
    );
  }
  
  console.log("[AUTO-FORWARD] APPROVED - Same owner, proceeding with free consultation");

  try {
    console.log(`[FREE] Auto-forwarding to same-owner agent: ${targetAgent.name}`);

    const targetResponse = await generateText({
      model: openai("gpt-4o-mini"),
      system: targetAgent.system_prompt,
      prompt: originalMessage,
    });

    const { text: framedResponse } = await generateText({
      model: openai("gpt-4o-mini"),
      system: callerAgent.system_prompt,
      prompt: `The user asked: "${originalMessage}"

I consulted with my sibling agent "${targetAgent.name}" (same owner, free consultation) who provided this answer:
"${targetResponse.text}"

Present this information naturally, acknowledging the consultation.`,
    });

    // Store messages
    try {
      await storeMessage(callerAgent.onchain_id, userAddress, "user", originalMessage, sessionId);
      await storeMessage(callerAgent.onchain_id, userAddress, "assistant", framedResponse, sessionId);
    } catch (storeError) {
      console.warn("Failed to store messages:", storeError);
    }

    try {
      await supabase
        .from("agents")
        .update({ total_jobs_served: (targetAgent.total_jobs_served || 0) + 1 })
        .eq("id", targetAgentId);
    } catch (updateError) {
      console.warn("Failed to update jobs count:", updateError);
    }

    return NextResponse.json({
      response: framedResponse,
      agentId: callerAgent.id,
      sessionId,
      routing: {
        wasRouted: true,
        delegatedTo: targetAgent.name,
        isFreeConsultation: true,
        targetAgentId: targetAgent.id,
      },
    });
  } catch (error: any) {
    console.error("Auto-forward error:", error);
    return NextResponse.json({
      response: `❌ An error occurred while consulting your agent: ${error.message}`,
      agentId: callerAgent.id,
      sessionId,
      routing: { wasRouted: false, error: error.message },
    });
  }
}
