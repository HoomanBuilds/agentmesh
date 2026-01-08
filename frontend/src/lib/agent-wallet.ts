import { ethers } from "ethers";
import { REGISTRY_ADDRESS, MNEE_ADDRESS, getRpcUrl } from "./contracts";

/**
 * Derives a deterministic wallet for an agent.
 * Formula: keccak256(BACKEND_PRIVATE_KEY + REGISTRY_ADDRESS + AgentId)
 */
export function getAgentWallet(agentId: number): ethers.Wallet {
  let backendPrivateKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendPrivateKey) {
    throw new Error("BACKEND_PRIVATE_KEY not configured");
  }
  
  if (!backendPrivateKey.startsWith("0x")) {
    backendPrivateKey = `0x${backendPrivateKey}`;
  }

  const rpcUrl = getRpcUrl();
  if (!rpcUrl) {
    throw new Error("RPC URL not configured");
  }

  const agentPrivateKey = ethers.solidityPackedKeccak256(
    ["bytes32", "address", "uint256"],
    [backendPrivateKey, REGISTRY_ADDRESS, agentId]
  );

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(agentPrivateKey, provider);
}

/**
 * Get the public address of an agent's wallet
 */
export function getAgentWalletAddress(agentId: number): string {
  let backendPrivateKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendPrivateKey) {
    throw new Error("BACKEND_PRIVATE_KEY not configured");
  }
  
  if (!backendPrivateKey.startsWith("0x")) {
    backendPrivateKey = `0x${backendPrivateKey}`;
  }

  const agentPrivateKey = ethers.solidityPackedKeccak256(
    ["bytes32", "address", "uint256"],
    [backendPrivateKey, REGISTRY_ADDRESS, agentId]
  );

  const wallet = new ethers.Wallet(agentPrivateKey);
  return wallet.address;
}

/**
 * Check agent wallet MNEE balance
 */
export async function getAgentMneeBalance(agentId: number): Promise<string> {
  const wallet = getAgentWallet(agentId);

  const mneeAbi = ["function balanceOf(address) view returns (uint256)"];
  const mnee = new ethers.Contract(MNEE_ADDRESS, mneeAbi, wallet.provider);
  
  const balance = await mnee.balanceOf(wallet.address);
  return ethers.formatEther(balance);
}

/**
 * Check agent wallet ETH balance (for gas)
 */
export async function getAgentEthBalance(agentId: number): Promise<string> {
  const wallet = getAgentWallet(agentId);
  if (!wallet.provider) return "0";
  
  const balance = await wallet.provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

/**
 * Send MNEE from agent wallet to another address
 */
export async function sendMneeFromAgent(
  agentId: number,
  to: string,
  amount: string
): Promise<{ hash: string } | { error: string }> {
  try {
    const wallet = getAgentWallet(agentId);

    const mneeAbi = [
      "function transfer(address to, uint256 amount) returns (bool)",
    ];
    const mnee = new ethers.Contract(MNEE_ADDRESS, mneeAbi, wallet);
    
    const tx = await mnee.transfer(to, ethers.parseEther(amount));
    await tx.wait();
    
    return { hash: tx.hash };
  } catch (error: any) {
    console.error("Error sending MNEE from agent:", error);
    return { error: error.message };
  }
}

/**
 * Request service from another agent using escrow
 * This is the agent-to-agent payment flow:
 * 1. Approve MNEE to Router
 * 2. Call requestService on Router
 * 3. Router creates job in Escrow with locked payment
 */
export async function requestAgentService(
  callerAgentId: number,
  providerAgentId: number,
  amount: bigint
): Promise<{ jobId: string; hash: string } | { error: string }> {
  try {
    const wallet = getAgentWallet(callerAgentId);
    
    const { ROUTER_ADDRESS } = await import("./contracts");
    const routerData = await import("@/constants/AgentRouter.json");
    
    // Step 1: Approve MNEE to ESCROW (not Router - the contract checks escrow allowance)
    const { ESCROW_ADDRESS } = await import("./contracts");
    const mneeAbi = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
    ];
    const mnee = new ethers.Contract(MNEE_ADDRESS, mneeAbi, wallet);
    
    const currentAllowance = await mnee.allowance(wallet.address, ESCROW_ADDRESS);
    
    if (currentAllowance < amount) {
      console.log(`Approving ${ethers.formatEther(amount)} MNEE to Escrow...`);
      const approveTx = await mnee.approve(ESCROW_ADDRESS, amount);
      await approveTx.wait();
      console.log("Approval confirmed");
    }
    
    // Step 2: Request service via Router
    const router = new ethers.Contract(ROUTER_ADDRESS, routerData.abi, wallet);
    
    // Debug: Check on-chain owner of provider agent
    const { REGISTRY_ADDRESS } = await import("./contracts");
    const registryAbi = ["function getAgentOwner(uint256) view returns (address)"];
    const registry = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, wallet.provider);
    const providerOwner = await registry.getAgentOwner(providerAgentId);
    
    console.log(`[DEBUG] Caller wallet (msg.sender): ${wallet.address}`);
    console.log(`[DEBUG] Provider agent ${providerAgentId} on-chain owner: ${providerOwner}`);
    console.log(`[DEBUG] Are they equal? ${wallet.address.toLowerCase() === providerOwner.toLowerCase()}`);
    
    console.log(`Requesting service: caller=${callerAgentId}, provider=${providerAgentId}`);
    const tx = await router.requestService(providerAgentId, callerAgentId);
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = router.interface.parseLog(log);
        return parsed?.name === "ServiceRequested";
      } catch {
        return false;
      }
    });
    
    let jobId = "";
    if (event) {
      const parsed = router.interface.parseLog(event);
      jobId = parsed?.args?.jobId || "";
    }
    
    console.log(`Service requested, jobId: ${jobId}`);
    return { jobId, hash: tx.hash };
  } catch (error: any) {
    console.error("Error requesting agent service:", error);
    return { error: error.message };
  }
}

/**
 * Confirm a job was completed successfully (releases payment to provider)
 */
export async function confirmAgentJob(
  callerAgentId: number,
  jobId: string
): Promise<{ hash: string } | { error: string }> {
  try {
    const wallet = getAgentWallet(callerAgentId);
    
    const { ROUTER_ADDRESS } = await import("./contracts");
    const routerData = await import("@/constants/AgentRouter.json");
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerData.abi, wallet);
    
    const tx = await router.confirmJob(jobId);
    await tx.wait();
    
    console.log(`Job ${jobId} confirmed`);
    return { hash: tx.hash };
  } catch (error: any) {
    console.error("Error confirming job:", error);
    return { error: error.message };
  }
}

