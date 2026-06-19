# 💸 SplitSmart — Expense Splitter API

> A creative and production-ready backend API to track shared expenses, compute balances, and settle debts with minimum transactions.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-black?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-blue?logo=postgresql)](https://www.postgresql.org/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-green?logo=openapi-initiative)](https://www.openapis.org/)

---

## ✨ Features

- 🏖️ **Groups** — Create expense groups for trips, roommates, events with emoji & category
- 👥 **Members** — Add members with auto-assigned avatar colors
- 💰 **Smart Splitting** — Split expenses equally, by percentage, or exact amounts
- 📊 **Analytics** — Group summary, category breakdown, top spender tracking
- ⚖️ **Balance Tracking** — Real-time net balance per member (paid − owes)
- 🧠 **Settlement Optimizer** — Greedy algorithm that settles all debts in minimum transactions
- ✅ **Settlements** — Record actual payments to track progress toward zero balances

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 24 + TypeScript 5.9 |
| Framework | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (v4) + drizzle-zod |
| API Contract | OpenAPI 3.1 (spec-first) |
| Code Generation | Orval → Zod schemas + React Query hooks |
| Package Manager | pnpm workspaces |
| Logging | Pino (structured JSON) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL database

### Installation

```bash
# Clone the repo
git clone https://github.com/abhi-sree16/Expense-splitter-.git
cd Expense-splitter-

# Install dependencies
pnpm install

# Set up environment variables
echo "DATABASE_URL=postgresql://user:password@localhost:5432/splitsmart" > .env
echo "SESSION_SECRET=your-secret-key" >> .env

# Push database schema
pnpm --filter @workspace/db run push

# Start the API server
pnpm --filter @workspace/api-server run dev
```

The server starts at `http://localhost:5000`

---

## 📡 API Endpoints

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups` | List all groups |
| `POST` | `/api/groups` | Create a new group |
| `GET` | `/api/groups/:id` | Get group details |
| `PATCH` | `/api/groups/:id` | Update group |
| `DELETE` | `/api/groups/:id` | Delete group |
| `GET` | `/api/groups/:id/summary` | Spending summary & category breakdown |
| `GET` | `/api/groups/:id/balances` | Net balance per member |
| `GET` | `/api/groups/:id/optimal-settlements` | **Minimum-transaction settlement plan** |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups/:groupId/members` | List members |
| `POST` | `/api/groups/:groupId/members` | Add a member |
| `PATCH` | `/api/groups/:groupId/members/:id` | Update member |
| `DELETE` | `/api/groups/:groupId/members/:id` | Remove member |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups/:groupId/expenses` | List expenses |
| `POST` | `/api/groups/:groupId/expenses` | Add an expense |
| `GET` | `/api/groups/:groupId/expenses/:id` | Get expense with splits |
| `PATCH` | `/api/groups/:groupId/expenses/:id` | Update expense |
| `DELETE` | `/api/groups/:groupId/expenses/:id` | Delete expense |

### Settlements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups/:groupId/settlements` | List settlements |
| `POST` | `/api/groups/:groupId/settlements` | Record a payment |
| `DELETE` | `/api/groups/:groupId/settlements/:id` | Remove settlement |

---

## 💡 Usage Examples

### Create a group

```bash
curl -X POST http://localhost:5000/api/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Goa Trip 2026",
    "description": "Beach vacation with friends",
    "currency": "INR",
    "category": "travel",
    "emoji": "🏖️"
  }'
```

### Add members

```bash
curl -X POST http://localhost:5000/api/groups/1/members \
  -H "Content-Type: application/json" \
  -d '{"name": "Arjun", "email": "arjun@gmail.com"}'
```

### Add an expense (equal split)

```bash
curl -X POST http://localhost:5000/api/groups/1/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "paidById": 1,
    "title": "Hotel booking",
    "amount": 6000,
    "category": "accommodation",
    "splitType": "equal",
    "date": "2026-06-19"
  }'
```

### Get settlement plan

```bash
curl http://localhost:5000/api/groups/1/optimal-settlements
```

**Response:**
```json
[
  {
    "fromMemberId": 2,
    "fromMemberName": "Priya",
    "toMemberId": 1,
    "toMemberName": "Arjun",
    "amount": 2000
  }
]
```

---

## 🧠 Settlement Optimizer Algorithm

The settlement optimizer uses a **greedy algorithm** to minimize the number of transactions needed to clear all debts:

```
Example: 3 friends, hotel bill ₹6000 paid by Arjun

Net balances:
  Arjun  → +₹4000 (gets back)
  Priya  → -₹2000 (owes)
  Karthik → -₹2000 (owes)

Optimal settlements (only 2 transactions):
  Priya  → Arjun   ₹2000
  Karthik → Arjun  ₹2000
```

For **n members**, the algorithm produces at most **n-1 transactions** — the mathematical minimum.

---

## 📁 Project Structure

```
Expense-splitter-/
├── artifacts/
│   └── api-server/
│       └── src/
│           ├── routes/          # Express route handlers
│           │   ├── groups.ts    # Groups + summary + balances
│           │   ├── members.ts   # Member management
│           │   ├── expenses.ts  # Expense + split logic
│           │   └── settlements.ts
│           └── lib/
│               └── settlement-optimizer.ts  # Debt minimization
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml         # OpenAPI contract (source of truth)
│   ├── db/src/schema/           # Drizzle table definitions
│   │   ├── groups.ts
│   │   ├── members.ts
│   │   ├── expenses.ts
│   │   └── settlements.ts
│   ├── api-zod/                 # Auto-generated Zod validators
│   └── api-client-react/        # Auto-generated React Query hooks
└── scripts/                     # Utility scripts
```

---

## 🔄 Development Workflow

```bash
# After changing the OpenAPI spec, regenerate validators + hooks
pnpm --filter @workspace/api-spec run codegen

# Full typecheck
pnpm run typecheck

# Push DB schema changes
pnpm --filter @workspace/db run push
```

---

## 🌐 Split Types

| Type | Description | Example |
|------|-------------|---------|
| `equal` | Auto-divided equally among all members | ₹900 ÷ 3 = ₹300 each |
| `percentage` | Each member pays a given % | 50% + 30% + 20% |
| `exact` | Specify exact amount per member | ₹500, ₹250, ₹150 |

---

## 👤 Author

**Abhinaya Sree** — [@abhi-sree16](https://github.com/abhi-sree16)

---

## 📄 License

MIT License — free to use, modify, and distribute.
