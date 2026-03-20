# ConQuote Connect — Smart Construction Quotation Platform

> A full-stack web application connecting **Builders** and **Contractors** with AI-powered quoting, BIM 3D visualization, and blockchain-secured milestone-based escrow payments.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-cyan) ![Supabase](https://img.shields.io/badge/Supabase-Backend-green) ![Solidity](https://img.shields.io/badge/Solidity-0.8.20-gray) ![Ethereum](https://img.shields.io/badge/Sepolia-Testnet-orange)

---

## 📋 Problem Statement

In the construction industry, the quotation and procurement process is fragmented, opaque, and prone to disputes:
- **Builders** struggle to compare contractor quotes objectively
- **Contractors** lack a centralized platform to discover and bid on projects
- **Payment disputes** arise due to lack of milestone verification
- **No transparency** in fund flow between parties
- **Manual processes** lead to errors in risk assessment and contract drafting

## 💡 Solution

**ConQuote Connect** is a smart construction quotation platform that digitizes the entire builder-contractor workflow:

1. **Builders** post projects with budgets, timelines, and optional BIM/3D model files
2. **Contractors** browse open projects and submit structured quotes
3. **AI Tools** analyze quotes, assess project risks, and auto-generate contract drafts
4. **BIM Viewer** enables 3D model visualization with milestone tagging
5. **Blockchain Escrow** locks funds on-chain and releases them per approved milestone
6. **NFT Certificates** provide immutable proof of project completion

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui     │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Landing  │ │ Builder  │ │Contractor│ │ Shared Pages     │ │
│  │ Page     │ │ Panel    │ │ Panel    │ │ (AI, BIM, Escrow)│ │
│  └─────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Three.js/R3F │  │ Ethers.js    │  │ React Query       │  │
│  │ BIM Viewer   │  │ Wallet/Escrow│  │ Data Fetching     │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                     BACKEND (Supabase)                        │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Auth     │  │ PostgreSQL   │  │ Edge Functions           │ │
│  │ (Email)  │  │ + RLS        │  │ (AI Tools via Lovable AI)│ │
│  └──────────┘  └──────────────┘  └─────────────────────────┘ │
│  ┌──────────┐  ┌──────────────┐                              │
│  │ Storage  │  │ Realtime     │                              │
│  │ (Files)  │  │ (Messages)   │                              │
│  └──────────┘  └──────────────┘                              │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    BLOCKCHAIN (Sepolia)                        │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ MilestoneEscrow.sol (Solidity 0.8.20)                 │   │
│  │ • deposit() → lock ETH per milestone                  │   │
│  │ • releaseFunds() → pay contractor on approval         │   │
│  │ • dispute() / resolveDispute() → conflict resolution  │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔐 Authentication & Role-Based Access
- Email/password signup & login
- Role selection: **Builder** or **Contractor**
- Role-based routing and dashboards
- Row-Level Security (RLS) on all database tables

### 🏢 Builder Panel
- Create projects with title, description, location, budget range, timeline
- Upload BIM/IFC files for 3D visualization
- View and compare contractor quotes side-by-side
- Award projects to winning contractors
- Track milestones and approve completed work

### 🔨 Contractor Panel
- Browse open projects with search and filters
- Submit structured quotes (pricing, materials, timeline, notes)
- Track awarded projects and milestones
- Submit milestones for builder review
- View earned NFT completion certificates

### 🤖 AI-Powered Tools (Edge Functions)
- **Quote Analysis** — AI compares quotes highlighting pros, cons, and value
- **Risk Assessment** — evaluates project risk based on scope, budget, timeline
- **Contract Draft Generator** — auto-generates contract from project + quote details

### 🏗️ BIM 3D Viewer
- Upload and display IFC/3D model files (Three.js + React Three Fiber)
- Pan, zoom, rotate controls
- Milestone tagging on 3D model geometry
- Annotations with position markers

### ⛓️ Blockchain Escrow (Sepolia Testnet)
- MetaMask wallet connection
- Milestone-based ETH deposits into smart contract
- Fund release upon milestone approval
- Dispute mechanism with owner resolution
- NFT completion certificates for contractors

### 💬 Real-Time Messaging
- Project-based chat between builder and contractor
- File attachments in messages
- Real-time updates via Supabase Realtime

### 🔔 Notifications
- In-app notifications for key events
- New quote, milestone approved, payment released alerts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **UI** | Tailwind CSS 3, shadcn/ui, Radix UI, Framer Motion |
| **3D Rendering** | Three.js, React Three Fiber, web-ifc |
| **State Management** | TanStack React Query, React Context |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Blockchain** | Solidity 0.8.20, Ethers.js 6, Sepolia Testnet |
| **AI** | Lovable AI Gateway (GPT models via Edge Functions) |
| **Routing** | React Router DOM v6 |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |

---

## 📁 Folder Structure

```
conquote-connect/
├── contracts/
│   └── MilestoneEscrow.sol          # Solidity escrow smart contract
├── public/
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── AppHeader.tsx            # Navigation header
│   │   ├── AppSidebar.tsx           # Dashboard sidebar
│   │   ├── BimViewer.tsx            # 3D BIM model viewer
│   │   ├── BimAnnotations.tsx       # 3D model annotations
│   │   ├── BimCompareView.tsx       # BIM model comparison
│   │   ├── DashboardLayout.tsx      # Protected layout wrapper
│   │   ├── DropZone.tsx             # File upload component
│   │   ├── NFTCertificateDisplay.tsx# NFT certificate viewer
│   │   ├── OnChainEscrow.tsx        # Blockchain escrow UI
│   │   ├── ProjectChat.tsx          # Real-time messaging
│   │   ├── ProjectFileGallery.tsx   # Project file management
│   │   ├── ProtectedRoute.tsx       # Auth route guard
│   │   ├── TransactionHistory.tsx   # Escrow transaction log
│   │   └── WalletConnect.tsx        # MetaMask connection
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth + role context
│   ├── hooks/
│   ├── integrations/
│   │   └── supabase/                # Auto-generated client & types
│   ├── lib/
│   │   ├── escrowContract.ts        # Smart contract ABI & address
│   │   ├── notifications.ts         # Notification helpers
│   │   └── utils.ts                 # Utility functions
│   ├── pages/
│   │   ├── Landing.tsx              # Public landing page
│   │   ├── Auth.tsx                 # Login / Signup
│   │   ├── SelectRole.tsx           # Role selection
│   │   ├── BuilderDashboard.tsx     # Builder overview
│   │   ├── ContractorDashboard.tsx  # Contractor overview
│   │   ├── CreateProject.tsx        # New project form
│   │   ├── ProjectDetail.tsx        # Full project view
│   │   ├── BrowseProjects.tsx       # Contractor project search
│   │   ├── SubmitQuote.tsx          # Quote submission form
│   │   ├── Milestones.tsx           # Milestone tracker
│   │   ├── EscrowDashboard.tsx      # Blockchain escrow UI
│   │   ├── AITools.tsx              # AI analysis tools
│   │   ├── Profile.tsx              # User profile settings
│   │   ├── Messages.tsx             # Chat interface
│   │   └── Notifications.tsx        # Notification center
│   ├── App.tsx                      # Route configuration
│   └── main.tsx                     # Entry point
├── supabase/
│   ├── functions/
│   │   ├── ai-tools/index.ts        # AI edge function
│   │   └── escrow-notify/index.ts   # Escrow notification function
│   └── migrations/                  # Database migrations
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User profile info (company, contact, avatar, wallet) |
| `user_roles` | Role assignment (builder / contractor) |
| `projects` | Project listings with details and BIM files |
| `quotes` | Contractor quote submissions |
| `milestones` | Project milestones with status tracking |
| `messages` | Real-time project chat messages |
| `project_files` | Uploaded project documents |
| `model_annotations` | 3D model annotation markers |
| `notifications` | In-app notification records |
| `reviews` | Post-project ratings and reviews |

All tables use **Row-Level Security (RLS)** policies to ensure data access control.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (install via [nvm](https://github.com/nvm-sh/nvm))
- **npm** or **bun** package manager
- **MetaMask** browser extension (for blockchain features)
- **Supabase** project (or Lovable Cloud)

### Installation

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd conquote-connect

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file with:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Smart Contract Deployment (Optional)

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file, paste `contracts/MilestoneEscrow.sol`
3. Compile with Solidity 0.8.20+
4. Deploy to Sepolia testnet (select "Injected Provider - MetaMask")
5. Copy the deployed contract address to `src/lib/escrowContract.ts`
6. Get free test ETH from [sepoliafaucet.com](https://sepoliafaucet.com)

---

## 🧪 Running Tests

```bash
npm run test
```

---

## 🌐 Live Demo

🔗 [https://bim-build-trust.lovable.app](https://bim-build-trust.lovable.app)

---

## 🧑‍💻 How It Works — End to End

1. **Sign up** → choose your role (Builder or Contractor)
2. **Builder** creates a project with budget, timeline, location, and optional BIM files
3. **Contractors** browse open projects and submit structured quotes
4. **Builder** reviews quotes, uses AI tools for analysis, and awards the project
5. **Milestones** are tracked — contractors submit work, builders approve
6. **Escrow** — ETH is locked on-chain per milestone and released on approval
7. **Reviews** — both parties rate each other after project completion
8. **NFT Certificate** — immutable proof of completed work on the blockchain
