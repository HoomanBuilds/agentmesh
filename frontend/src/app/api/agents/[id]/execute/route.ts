import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia, mainnet } from "viem/chains";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { supabase } from "@/lib/supabase";
import { ROUTER_ADDRESS } from "@/lib/contracts";
import AgentRouterJSON from "@/constants/AgentRouter.json";

const AgentRouterABI = AgentRouterJSON.abi;

interface RouteParams {
  params: Promise<{ id: string }>;
}

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
const chain = chainId === 1 ? mainnet : sepolia;

const publicClient = createPublicClient({
  chain,
  transport: http(),
});

// POST /api/agents/[id]/execute - Execute agent with jobId validation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: agentUuid } = await params;
    const body = await request.json();
    const { jobId, input } = body;

    console.log("=== Execute API Called ===");
    console.log("Agent UUID:", agentUuid);
    console.log("Job ID:", jobId);
    console.log("Router Address:", ROUTER_ADDRESS);

    // 1. Validate jobId is provided
    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    // 2. Fetch agent from Supabase
    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentUuid)
      .single();

    if (agentError || !agentData) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Type assertion for the agent
    const agent = agentData as {
      id: string;
      onchain_id: number | null;
      system_prompt: string;
      [key: string]: unknown;
    };

    // 3. Verify job on-chain
    try {
      console.log("Calling getJob with jobId:", jobId);
      const job = await publicClient.readContract({
        address: ROUTER_ADDRESS,
        abi: AgentRouterABI,
        functionName: "getJob",
        args: [jobId as `0x${string}`],
      }) as {
        callerAgentId: bigint;
        providerAgentId: bigint;
        callerWallet: `0x${string}`;
        amount: bigint;
        createdAt: bigint;
        status: number;
      };

      console.log("Job response:", JSON.stringify(job, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      // Check job exists (callerWallet is not zero address)
      if (job.callerWallet === "0x0000000000000000000000000000000000000000") {
        console.log("Job caller wallet is zero - job not found");
        return NextResponse.json(
          { error: "Job not found on-chain" },
          { status: 403 }
        );
      }

      // Check job is pending (status = 0)
      if (job.status !== 0) {
        return NextResponse.json(
          { error: "Job is not pending" },
          { status: 403 }
        );
      }

      // Check job is for this agent (if agent has onchain_id)
      if (agent.onchain_id !== null && Number(job.providerAgentId) !== agent.onchain_id) {
        return NextResponse.json(
          { error: "Job is not for this agent" },
          { status: 403 }
        );
      }
    } catch (contractError) {
      console.error("Contract read error:", contractError);
      return NextResponse.json(
        { error: "Failed to verify job on-chain" },
        { status: 500 }
      );
    }

    // 4. Execute with OpenAI
    const { text: output } = await generateText({
      model: openai("gpt-4o-mini"),
      system: agent.system_prompt,
      prompt: typeof input === "string" ? input : JSON.stringify(input),
    });

    // 5. Log the job in Supabase
    await supabase.from("jobs").insert({
      job_id: jobId,
      agent_uuid: agentUuid,
      caller_address: "0x",
      input: typeof input === "object" ? input : { prompt: input },
      output: { result: output },
      status: "completed",
    });

    return NextResponse.json({
      jobId,
      output,
    });
  } catch (error) {
    console.error("Error executing agent:", error);
    return NextResponse.json(
      { error: "Failed to execute agent" },
      { status: 500 }
    );
  }
}
