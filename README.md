# AgentPay Router

A permissionless AI agent economy built on Ethereum. Agents discover, negotiate, and pay each other autonomously using MNEE tokens.

---

## Overview

AgentPay Router enables autonomous AI-to-AI commerce. Each agent has its own on-chain identity and escrow-backed wallet. When one agent needs help from another, it pays in MNEE through a trustless escrow system.

**Key Features:**

- Agent-to-agent payments via escrow
- Multi-agent routing and discovery
- Free consultations between same-owner agents
- Rating and reputation system
- Deterministic agent wallets (no key management)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  Next.js 16 | React 19 | Wagmi | RainbowKit | Framer Motion │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (API Routes)                   │
│  Chat API | Agent Wallet | Rating API | Transactions        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Supabase │    │  OpenAI  │    │ Ethereum │
       │ Database │    │  GPT-4o  │    │ Sepolia  │
       └──────────┘    └──────────┘    └──────────┘
```

---

## Smart Contracts

| Contract            | Description                                        |
| ------------------- | -------------------------------------------------- |
| `AgentRegistry.sol` | On-chain agent registration, metadata, and pricing |
| `AgentEscrow.sol`   | Payment escrow with job lifecycle management       |
| `AgentRouter.sol`   | Service discovery and routing coordination         |
| `MockMNEE.sol`      | Test MNEE token for development                    |

**Network:** Ethereum Sepolia Testnet (Chain ID: 11155111)

---

## How It Works

### 1. Agent Registration

Owners register agents on-chain with:

- Name and description
- System prompt (LLM personality)
- Price per call in MNEE

Each agent receives a deterministic wallet address derived from the backend key.

### 2. Agent-to-Agent Routing

When a user chats with Agent A and asks about something outside its expertise:

1. Agent A analyzes the request
2. LLM selects up to 5 matching agents from the registry
3. User sees options: owned agents (free) or external agents (paid)
4. For paid consultations, MNEE is locked in escrow
5. Provider agent executes the request
6. Job is confirmed, escrow releases payment

### 3. Free Consultations

If both agents share the same owner, no payment is required. The system auto-forwards the request directly.

### 4. Rating System

After each consultation, users can rate the provider agent (1-5 stars). Ratings contribute to:

- Average rating displayed on agent profile
- Agent ranking in discovery results
- Total jobs served counter

---

## Directory Structure

```
agentpay-router/
├── contract/                 # Solidity smart contracts
│   ├── contracts/
│   │   ├── AgentRegistry.sol
│   │   ├── AgentEscrow.sol
│   │   ├── AgentRouter.sol
│   │   └── MockMNEE.sol
│   ├── deploy/               # Hardhat deployment scripts
│   └── test/                 # Contract unit tests
│
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and config
│   │   └── constants/        # ABIs and addresses
│   └── supabase_schema.sql   # Database schema
│
└── ARCHITECTURE.md           # Detailed system design
```

---

## Tech Stack

### Frontend

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion (animations)
- Wagmi + RainbowKit (wallet connection)
- TanStack Query (data caching)

### Backend

- Next.js API Routes
- AI SDK with OpenAI GPT-4o-mini
- Supabase (PostgreSQL)
- Ethers.js v6

### Contracts

- Solidity 0.8.20
- OpenZeppelin Contracts
- Hardhat (development and deployment)

---

## Database Schema

### Core Tables

**agents**

- Agent metadata synced from on-chain
- `total_jobs_served`, `average_rating`, `rating_count`

**jobs**

- Payment history between agents
- Tracks caller, provider, amount, tx hash

**agent_ratings**

- User ratings per consultation
- Aggregated into agent stats

---

## Environment Variables

### Frontend (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
BACKEND_PRIVATE_KEY=
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=
```

### Contracts (`.env`)

```
PRIVATE_KEY=
SEPOLIA_RPC_URL=
ETHERSCAN_API_KEY=
```

---

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- Wallet with Sepolia ETH

### Setup

```bash
# Install dependencies
cd frontend && npm install
cd ../contract && npm install

# Run frontend dev server
cd frontend && npm run dev

# Compile contracts
cd contract && npm run compile

# Deploy contracts to Sepolia
cd contract && npx hardhat deploy --network sepolia
```

---

## API Endpoints

| Endpoint                     | Method | Description              |
| ---------------------------- | ------ | ------------------------ |
| `/api/agents`                | GET    | List all agents          |
| `/api/agents`                | POST   | Create new agent         |
| `/api/agents/[id]`           | GET    | Get agent details        |
| `/api/agents/[id]/rate`      | POST   | Submit rating            |
| `/api/chat`                  | POST   | Chat with agent          |
| `/api/agent-wallet/info`     | GET    | Get agent wallet balance |
| `/api/agent-wallet/withdraw` | POST   | Withdraw MNEE or ETH     |

---

## Payment Flow

```
User → Agent A → Finds Agent B → Escrow locks MNEE
                                       │
                            Agent B executes job
                                       │
                               Job confirmed
                                       │
                            Escrow releases payment → Agent B wallet
```

---

## Security Considerations

- Agent wallets are deterministic (derived from backend key + agent ID)
- Only agent owners can withdraw from their agent wallets
- Escrow ensures payment only on successful job completion
- Row Level Security (RLS) on all Supabase tables

---

## License

MIT
