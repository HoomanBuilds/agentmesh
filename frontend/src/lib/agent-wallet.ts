import { ethers } from "ethers";
import { REGISTRY_ADDRESS, MNEE_ADDRESS, getRpcUrl } from "./contracts";

/**
 * Derives a deterministic wallet for an agent.
 * Formula: keccak256(BACKEND_PRIVATE_KEY + REGISTRY_ADDRESS + AgentId)
 */
export function getAgentWallet(agentId: number): ethers.Wallet {
  const backendPrivateKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendPrivateKey) {
    throw new Error("BACKEND_PRIVATE_KEY not configured");
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
  const backendPrivateKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendPrivateKey) {
    throw new Error("BACKEND_PRIVATE_KEY not configured");
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
