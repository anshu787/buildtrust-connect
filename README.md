# ConQuote Connect — Smart Construction Quotation Platform

> A full-stack web application connecting **Builders** and **Contractors** with AI-powered quoting, BIM 3D visualization, and blockchain-secured milestone-based escrow payments.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-cyan) ![Supabase](https://img.shields.io/badge/Supabase-Backend-green) ![Solidity](https://img.shields.io/badge/Solidity-0.8.20-gray) ![Ethereum](https://img.shields.io/badge/Sepolia-Testnet-orange)

🔗 **Live Demo:** [https://bim-build-trust.lovable.app](https://bim-build-trust.lovable.app)

---

## 📋 Problem Statement

In the construction industry, the quotation and procurement process is fragmented, opaque, and prone to disputes:

- **Builders** struggle to compare contractor quotes objectively
- **Contractors** lack a centralized platform to discover and bid on projects
- **Payment disputes** arise due to lack of milestone verification
- **No transparency** in fund flow between parties
- **Manual processes** lead to errors in risk assessment and contract drafting
- **No immutable proof** of project completion or contractor reputation

## 💡 Solution Approach

**ConQuote Connect** is a smart construction quotation platform that digitizes the entire builder-contractor workflow:

1. **Builders** post projects with budgets, timelines, and optional BIM/3D model files
2. **Contractors** browse open projects and submit structured quotes
3. **AI Tools** analyze quotes, assess project risks, and auto-generate contract drafts
4. **BIM Viewer** enables 3D model visualization with milestone tagging and annotations
5. **Blockchain Escrow** locks funds on-chain and releases them per approved milestone
6. **NFT Certificates** provide immutable proof of project completion
7. **Reviews & Ratings** build verifiable contractor/builder reputation
8. **Real-time Chat** enables project-scoped communication with file sharing

---

## 🏗️ Solution Architecture

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
│  ┌───────────────────────────────────────────────────────┐   │
│  │ MilestoneCertificateNFT.sol (ERC-721)                 │   │
│  │ • mintCertificate() → immutable completion proof      │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔐 Authentication & Role-Based Access
- Email/password signup & login with email verification
- Role selection: **Builder** or **Contractor**
- Role-based routing and dashboards
- Row-Level Security (RLS) on all database tables
- Protected routes with auth guards

### 🏢 Builder Panel
- Create projects with title, description, location, budget range, timeline
- Upload BIM/IFC files for 3D visualization
- View and compare contractor quotes side-by-side
- Award projects to winning contractors
- Track milestones and approve/reject completed work
- Leave reviews and ratings for contractors

### 🔨 Contractor Panel
- Browse open projects with search and filters
- Submit structured quotes (pricing, materials, timeline, notes, PDF upload)
- Track awarded projects and milestones
- Submit milestones for builder review
- View earned NFT completion certificates
- Leave reviews and ratings for builders

### 🤖 AI-Powered Tools (Edge Functions)
- **Quote Analysis** — AI compares quotes highlighting pros, cons, and value
- **Risk Assessment** — evaluates project risk based on scope, budget, timeline
- **Contract Draft Generator** — auto-generates contract from project + quote details

### 🏗️ BIM 3D Viewer
- Upload and display IFC/3D model files (Three.js + React Three Fiber)
- Pan, zoom, rotate controls
- Milestone tagging on 3D model geometry
- Annotations with position markers
- Model comparison view

### ⛓️ Blockchain Escrow (Sepolia Testnet)
- MetaMask wallet connection with address persistence
- Milestone-based ETH deposits into smart contract
- Fund release upon milestone approval
- Dispute mechanism with owner resolution
- Transaction history with Etherscan links
- NFT completion certificates (ERC-721) viewable on Etherscan

### 💬 Real-Time Messaging
- Project-based chat between builder and contractor
- File attachments in messages
- Real-time updates via Supabase Realtime

### ⭐ Reviews & Reputation
- Post-project ratings (1–5 stars) with comments
- Verified badge for users with ≥4.0 avg rating
- Public profile pages with review history

### 👥 User Directory
- Browse all builders and contractors
- Filter by role (Builder / Contractor)
- Search by company name
- View ratings and verified status

### 🔔 Notifications
- In-app notifications for key events
- New quote, milestone approved, payment released alerts
- Bell icon with unread count

---

## 🛠️ Tools & Technologies

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **UI** | Tailwind CSS 3, shadcn/ui, Radix UI, Framer Motion |
| **3D Rendering** | Three.js, React Three Fiber, web-ifc |
| **State Management** | TanStack React Query, React Context |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| **Blockchain** | Solidity 0.8.20, Ethers.js 6, Sepolia Testnet |
| **AI** | Lovable AI Gateway (GPT/Gemini models via Edge Functions) |
| **Routing** | React Router DOM v6 |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit (milestone reordering) |

---

## 📁 Folder Structure

```
conquote-connect/
├── contracts/
│   ├── MilestoneEscrow.sol              # Solidity escrow smart contract
│   └── MilestoneCertificateNFT.sol      # ERC-721 NFT certificate contract
├── public/
├── src/
│   ├── components/
│   │   ├── ui/                          # shadcn/ui components (40+ components)
│   │   ├── AppHeader.tsx                # Navigation header with theme toggle
│   │   ├── AppSidebar.tsx               # Dashboard sidebar navigation
│   │   ├── BimViewer.tsx                # 3D BIM model viewer (Three.js)
│   │   ├── BimAnnotations.tsx           # 3D model annotations
│   │   ├── BimCompareView.tsx           # BIM model comparison
│   │   ├── DashboardLayout.tsx          # Protected layout wrapper
│   │   ├── DropZone.tsx                 # Drag-and-drop file upload
│   │   ├── NFTCertificateDisplay.tsx    # NFT certificate viewer
│   │   ├── OnChainEscrow.tsx            # Blockchain escrow UI
│   │   ├── ProjectChat.tsx              # Real-time messaging
│   │   ├── ProjectFileGallery.tsx       # Project file management
│   │   ├── ProtectedRoute.tsx           # Auth route guard
│   │   ├── TransactionHistory.tsx       # Escrow transaction log
│   │   ├── WalletConnect.tsx            # MetaMask wallet connection
│   │   ├── NotificationBell.tsx         # Notification bell with badge
│   │   ├── ThemeProvider.tsx            # Dark/light theme provider
│   │   └── ThemeToggle.tsx              # Theme toggle button
│   ├── contexts/
│   │   └── AuthContext.tsx              # Auth + role context provider
│   ├── hooks/
│   │   └── use-mobile.tsx               # Responsive breakpoint hook
│   ├── integrations/
│   │   └── supabase/                    # Auto-generated client & types
│   ├── lib/
│   │   ├── escrowContract.ts            # Smart contract ABI & address
│   │   ├── nftContract.ts               # NFT contract ABI & address
│   │   ├── notifications.ts             # Notification helper functions
│   │   └── utils.ts                     # Utility functions (cn, etc.)
│   ├── pages/
│   │   ├── Landing.tsx                  # Public landing page (3D globe)
│   │   ├── Auth.tsx                     # Login / Signup page
│   │   ├── SelectRole.tsx               # Role selection (Builder/Contractor)
│   │   ├── BuilderDashboard.tsx         # Builder overview dashboard
│   │   ├── ContractorDashboard.tsx      # Contractor overview dashboard
│   │   ├── CreateProject.tsx            # New project creation form
│   │   ├── ProjectDetail.tsx            # Full project view with tabs
│   │   ├── BrowseProjects.tsx           # Contractor project search
│   │   ├── SubmitQuote.tsx              # Quote submission form
│   │   ├── Milestones.tsx               # Milestone tracker (drag & drop)
│   │   ├── EscrowDashboard.tsx          # Blockchain escrow management
│   │   ├── AITools.tsx                  # AI analysis tools
│   │   ├── Profile.tsx                  # User profile settings
│   │   ├── PublicProfile.tsx            # Public user profile with reviews
│   │   ├── UserDirectory.tsx            # Browse all users
│   │   ├── Messages.tsx                 # Chat interface
│   │   └── Notifications.tsx            # Notification center
│   ├── App.tsx                          # Route configuration
│   └── main.tsx                         # Entry point
├── supabase/
│   ├── functions/
│   │   ├── ai-tools/index.ts            # AI edge function (quote/risk/contract)
│   │   └── escrow-notify/index.ts       # Escrow notification function
│   ├── migrations/                      # Database migration files
│   └── config.toml                      # Supabase configuration
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User profile info (company, contact, avatar, wallet address) |
| `user_roles` | Role assignment (builder / contractor) — enum-based |
| `projects` | Project listings with budget, timeline, BIM files |
| `quotes` | Contractor quote submissions with pricing & materials |
| `milestones` | Project milestones with status tracking & amounts |
| `messages` | Real-time project chat messages with file attachments |
| `project_files` | Uploaded project documents and attachments |
| `model_annotations` | 3D model annotation markers (x, y, z positions) |
| `notifications` | In-app notification records with read status |
| `reviews` | Post-project ratings (1–5) and comments |
| `escrow_transactions` | On-chain escrow deposit/release transaction records |
| `nft_certificates` | Minted NFT certificate records with token IDs |

All tables use **Row-Level Security (RLS)** policies to ensure data access control. Security-definer functions (`has_role`, `is_accepted_contractor`) prevent RLS recursion.

---

## 📄 Pages & Navigation

| Page | Route | Access |
|------|-------|--------|
| Landing Page | `/` | Public |
| Login / Sign Up | `/auth` | Public |
| Role Selection | `/select-role` | Authenticated |
| Builder Dashboard | `/builder` | Builder only |
| Create Project | `/builder/create-project` | Builder only |
| Contractor Dashboard | `/contractor` | Contractor only |
| Browse Projects | `/contractor/browse` | Contractor only |
| Project Detail | `/projects/:id` | Authenticated |
| Submit Quote | `/projects/:id/submit-quote` | Contractor only |
| Milestone Tracker | `/milestones` | Authenticated |
| Escrow Dashboard | `/escrow` | Authenticated |
| AI Tools | `/ai-tools` | Authenticated |
| Profile Settings | `/profile` | Authenticated |
| Public Profile | `/user/:userId` | Authenticated |
| User Directory | `/directory` | Authenticated |
| Messages | `/messages` | Authenticated |
| Notifications | `/notifications` | Authenticated |
| BIM Test | `/bim-test` | Public |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (install via [nvm](https://github.com/nvm-sh/nvm))
- **npm** or **bun** package manager
- **MetaMask** browser extension (for blockchain features)
- **Git** for version control

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

### Dependencies

Key dependencies installed automatically via `npm install`:
- `react`, `react-dom` — UI framework
- `react-router-dom` — Client-side routing
- `@supabase/supabase-js` — Backend client
- `@tanstack/react-query` — Server state management
- `three`, `@react-three/fiber`, `@react-three/drei` — 3D rendering
- `ethers` — Ethereum blockchain interaction
- `framer-motion` — Animations
- `recharts` — Charts and data visualization
- `react-hook-form`, `zod` — Form handling and validation
- `@dnd-kit/core`, `@dnd-kit/sortable` — Drag and drop
- Full list in `package.json`

### Smart Contract Deployment (Optional)

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create new files, paste `contracts/MilestoneEscrow.sol` and `contracts/MilestoneCertificateNFT.sol`
3. Compile with Solidity 0.8.20+
4. Deploy to Sepolia testnet (select "Injected Provider - MetaMask")
5. Copy the deployed contract addresses to `src/lib/escrowContract.ts` and `src/lib/nftContract.ts`
6. Get free test ETH from [sepoliafaucet.com](https://sepoliafaucet.com)

---

## 🧪 Running Tests

```bash
npm run test
```

---

## 🧑‍💻 How It Works — End-to-End Workflow

1. **Sign up** → verify email → choose your role (Builder or Contractor)
2. **Builder** creates a project with budget, timeline, location, and optional BIM files
3. **Contractors** browse open projects and submit structured quotes with pricing breakdown
4. **Builder** reviews quotes, uses **AI tools** for analysis/risk/contract generation
5. **Builder** awards the project to a contractor
6. **Milestones** are created — contractors submit work, builders approve or reject with comments
7. **Escrow** — Builder connects MetaMask, deposits ETH per milestone into the smart contract
8. **Fund Release** — Upon milestone approval, builder releases locked ETH to contractor
9. **Reviews** — Both parties rate each other after project completion
10. **NFT Certificate** — Contractor and builder mint ERC-721 certificates as immutable proof of completion
11. **Reputation** — Verified badges appear for users with strong review history

---

## 🎓 Workshop Delivery

This project is structured as a **workshop-ready, sellable learning experience**:
- **Target Audience:** CS/IT students, web dev learners, blockchain beginners
- **Duration:** 4–6 hour hands-on workshop
- **Modules:** React setup → Supabase backend → CRUD panels → AI integration → BIM viewer → Blockchain escrow
- See `Workshop_Outline.md` for the complete workshop structure

---

## 📎 Links

- **Live Demo:** [https://bim-build-trust.lovable.app](https://bim-build-trust.lovable.app)
- **Demo Video:** [Your Google Drive Links]

