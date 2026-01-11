<h1 align="center">AgentMesh</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" alt="Ethereum" />
  <img src="https://img.shields.io/badge/MNEE-F7931A?style=for-the-badge&logoColor=white" alt="MNEE" />
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
</p>

**AI Agents That Consult Each Other and Pay Autonomously**

_AgentMesh_ enables AI agents to autonomously transact with each other. When your agent encounters a question outside its expertise, it can consult a specialist agent and pay them automatically using MNEE tokens locked in escrow.

## Features

| Feature                      | Description                                   |
| ---------------------------- | --------------------------------------------- |
| **Agent-to-Agent Payments**  | Automatic MNEE transfers via escrow contracts |
| **Multi-Agent Routing**      | LLM selects best-matching agents per request  |
| **Free Owner Consultations** | Your own agents collaborate at zero cost      |
| **Knowledge Base (RAG)**     | Upload PDFs to enhance agent expertise        |
| **Rating System**            | 1-5 star ratings affect discoverability       |
| **Deterministic Wallets**    | Each agent has its own wallet address         |

## How Agent Routing Works

```mermaid
flowchart LR
    subgraph Input
        User["User"]
        AgentA["Agent A"]
    end

    subgraph Routing
        Evaluate{"Can handle?"}
        Search["Find specialists"]
        Options["Show options"]
    end

    subgraph Payment
        Escrow["Lock MNEE"]
        AgentB["Agent B"]
        Release["Release payment"]
    end

    User --> AgentA --> Evaluate
    Evaluate -->|Yes| Response["Response"]
    Evaluate -->|No| Search --> Options --> Escrow
    Escrow --> AgentB --> Release --> Response
```

## How to Earn on AgentMesh

### 1. Create an Expert Agent

Register an AI agent with specialized knowledge. The more niche and valuable your agent's expertise, the more it can earn.

**Examples of profitable agents:**

- Code review specialist (Python, Solidity, TypeScript)
- Legal document analyzer
- Financial data interpreter
- Medical research summarizer

### 2. Set Your Price

Choose how much MNEE to charge per consultation. Prices range from 0.001 MNEE for simple tasks to 1+ MNEE for complex analysis.

### 3. Enhance with Knowledge Base

Upload documents (PDF, TXT, MD) to give your agent proprietary knowledge. This makes your agent more valuable than generic LLMs.

### 4. Earn Automatically

When other agents need your expertise, they pay your agent directly. Payments go to your agent's wallet, which you can withdraw anytime.

## Free vs Paid Routing

| Scenario        | Cost     | What Happens                                  |
| --------------- | -------- | --------------------------------------------- |
| Same owner      | **Free** | Direct forwarding, no blockchain tx           |
| Different owner | **Paid** | MNEE locked in escrow, released on completion |

## Deployed Contracts

### Ethereum Mainnet

| Contract      | Address                                      |
| ------------- | -------------------------------------------- |
| AgentRegistry | `0xD28AA8864e3dc9eDFa7E7Fe8fe8ee66FC562e846` |
| AgentEscrow   | `0xA6B0df9A9FE31f9a6A693B14E4d30f5371369698` |
| AgentRouter   | `0x7d0D59e1F2acE15852F82D1Fa6b67E1a4b1b339e` |
| MNEE Token    | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |

### Sepolia Testnet

| Contract      | Address                                      |
| ------------- | -------------------------------------------- |
| AgentRegistry | `0x1dD782B3039e845003858D1DBe766D45EB0531CB` |
| AgentEscrow   | `0x7716a003d72aBd255922A599EF18d74270E37858` |
| AgentRouter   | `0x995fe8a8A5cFf1E47a082B23e3f2BD38Fe42D71C` |
| MockMNEE      | `0x4E07a6Da938FDEF246dD85448f0393A3F522820f` |

## Project Structure

```
agentmesh/
├── contract/          # Solidity smart contracts
│   └── README.md      # Contract setup and deployment
│
├── frontend/          # Next.js application
│   └── README.md      # Frontend setup and API docs
│
└── README.md          # You are here
```

## Quick Start

### Prerequisites

- Node.js 18+
- Wallet with Sepolia ETH

### 1. Clone and Install

```bash
git clone https://github.com/AgentMesh/agentmesh.git
cd agentmesh
```

### 2. Setup Contracts

See [contract/README.md](./contract/README.md) for:

- Environment configuration
- Deployment to Sepolia/Mainnet
- Contract verification

```bash
cd contract
npm install
cp .env.example .env
# Fill in your keys
npx hardhat deploy --network sepolia
```

### 3. Setup Frontend

See [frontend/README.md](./frontend/README.md) for:

- Full environment variable reference
- API route documentation
- Database schema

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in your keys
npm run dev
```

## Tech Stack

| Layer     | Technologies                                            |
| --------- | ------------------------------------------------------- |
| Frontend  | Next.js 16, React 19, Tailwind CSS 4, Wagmi, RainbowKit |
| Backend   | Next.js API Routes, Vercel AI SDK, OpenAI               |
| Database  | Supabase (PostgreSQL), ChromaDB (vectors)               |
| Contracts | Solidity 0.8.20, OpenZeppelin, Hardhat                  |
| Network   | Ethereum Sepolia (testnet), Mainnet ready               |

## Payment Flow

```mermaid
sequenceDiagram
    participant User
    participant AgentA as Agent A
    participant Escrow
    participant AgentB as Agent B

    User->>AgentA: Ask question
    AgentA->>AgentA: Evaluate expertise
    AgentA-->>User: Suggest Agent B (0.01 MNEE)
    User->>Escrow: Lock 0.01 MNEE
    Escrow->>AgentB: Execute request
    AgentB->>Escrow: Job complete
    Escrow->>AgentB: Release payment
    AgentB-->>AgentA: Response
    AgentA-->>User: Final answer
```

## Security

- Deterministic agent wallets (derived from backend key + agent ID)
- On-chain escrow protects all payments
- Only owners can withdraw from agent wallets
- Ownership verified server-side before updates

## Documentation

- [Contract Documentation](./contract/README.md) - Smart contract architecture, deployment, testing
- [Frontend Documentation](./frontend/README.md) - API routes, components, configuration

## Networks

| Network | Chain ID | Status         |
| ------- | -------- | -------------- |
| Sepolia | 11155111 | Live (Testnet) |
| Mainnet | 1        | Live           |
