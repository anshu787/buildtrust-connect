

# ConQuote Connect — MVP Plan

## Overview
A smart construction quotation platform where **builders** post projects and **contractors** submit quotes. Includes AI-powered tools, BIM visualization, and blockchain/escrow UI — all built with React + Vite + Supabase.

---

## 1. Authentication & Role-Based Access
- Sign up / login with email & password (Supabase Auth)
- Role selection during onboarding: **Builder** or **Contractor**
- Role-based routing — each role sees their own dashboard
- User profiles with company name, contact info, and avatar

## 2. Builder Panel
- **Post a Project**: title, description, location, budget range, timeline, optional BIM file upload
- **View Submitted Quotes**: see all contractor quotes for a project side-by-side
- **Compare Quotes**: structured comparison table (price, timeline, materials, contractor rating)
- **Award Project**: select a winning quote and initiate escrow
- **Milestone Tracker**: view project milestones, approve completed milestones to release funds

## 3. Contractor Panel
- **Browse Open Projects**: searchable/filterable list of available projects
- **Submit Quote**: detailed pricing breakdown, materials list, timeline, and notes
- **My Projects**: track awarded projects, milestones, and payment status
- **Portfolio / Reputation**: view earned NFT certificates and completed project history

## 4. AI-Powered Tools (via Lovable AI Gateway)
- **Quote Analysis**: AI compares submitted quotes highlighting pros/cons, value, and risks
- **Risk Assessment**: AI evaluates project risk based on scope, budget, and timeline
- **Contract Draft Generator**: AI generates a basic contract draft from project + winning quote details

## 5. BIM Viewer (Frontend Integration)
- Upload and display IFC/3D model files for projects
- Visual milestone tagging on the model (e.g., "Foundation Complete", "1st Floor Complete")
- Progress visualization — show completed vs. pending milestones on the model

## 6. Blockchain / Escrow UI
- **Escrow Dashboard**: visual representation of locked funds per project
- **Milestone-Based Releases**: UI to show fund release tied to approved milestones
- **NFT Certificates**: display area for contractor completion certificates
- **Wallet Connection**: MetaMask connect button and wallet status display
- *Note: Smart contract execution happens on-chain via user's wallet; the app provides the UI and transaction preparation*

## 7. Shared Features
- **Project Detail Page**: full project info, BIM viewer, milestones, quotes, and escrow status
- **Notifications**: toast notifications for key events (new quote, milestone approved, payment released)
- **Dashboard**: role-specific overview with stats, active projects, and pending actions
- **Responsive Design**: mobile-friendly layout throughout

---

## Pages & Navigation

| Page | Access |
|------|--------|
| Landing / Home | Public |
| Login / Sign Up | Public |
| Builder Dashboard | Builder |
| Create Project | Builder |
| Project Detail | Builder & Contractor |
| Quote Comparison | Builder |
| Contractor Dashboard | Contractor |
| Submit Quote | Contractor |
| AI Tools (Analysis, Risk, Contract) | Both roles |
| BIM Viewer | Both roles |
| Escrow Dashboard | Both roles |
| Profile / Settings | Both roles |

---

## Backend (Supabase)

- **Tables**: profiles, user_roles, projects, quotes, milestones, escrow_records, nft_certificates, notifications
- **Storage**: BIM/IFC files, project attachments, avatars
- **Edge Functions**: AI quote analysis, risk assessment, contract generation (via Lovable AI)
- **RLS Policies**: builders see their own projects; contractors see open projects and their own quotes

---

## Implementation Order

1. **Auth + roles + profiles** — foundation for everything
2. **Builder panel** — post projects, view quotes
3. **Contractor panel** — browse projects, submit quotes
4. **Quote comparison + AI tools** — analysis, risk, contracts
5. **Milestone tracking + escrow UI** — payment flow visualization
6. **BIM viewer integration** — 3D model display and milestone tagging
7. **Blockchain wallet connection + NFT display** — on-chain features UI

