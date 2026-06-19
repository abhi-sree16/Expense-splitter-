# SplitSmart — Expense Splitter API

A creative expense splitter backend API that helps groups track shared expenses, compute balances, and minimize debt settlements.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/db/src/schema/` — Drizzle table definitions: groups, members, expenses, expense_splits, settlements
- `artifacts/api-server/src/routes/` — Express route handlers (groups, members, expenses, settlements)
- `artifacts/api-server/src/lib/settlement-optimizer.ts` — Smart debt minimization algorithm
- `lib/api-zod/src/generated/` — Generated Zod schemas (server-side validation)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (frontend use)

## Architecture decisions

- **OpenAPI-first**: All contracts defined in YAML → Orval generates type-safe Zod schemas + React Query hooks automatically
- **Settlement optimizer**: Greedy algorithm that minimizes transaction count — n members settled in at most n-1 transactions
- **Split types**: Three splitting modes — `equal` (auto-computed), `percentage`, `exact` — stored per-member in `expense_splits` table
- **Numeric precision**: `numeric(12,2)` columns for all money; amounts stored as strings in Postgres, parsed on the server
- **Avatar color cycling**: Members auto-assigned colors from a curated 10-color palette on creation

## Product

- **Groups**: Create expense groups with category, emoji, and currency (trips, roommates, events, etc.)
- **Members**: Add members with auto-assigned avatar colors; optional email field
- **Expenses**: Add expenses paid by any member; split equally, by percentage, or exact amounts; tagged by category
- **Analytics**: Group summary with total spent, category breakdown, top spender
- **Balances**: Per-member net balance (paid − owes − settlements)
- **Settlement optimizer**: Computes the minimum-transaction plan to settle all debts using a greedy debt-reduction algorithm
- **Settlements**: Record actual payments to track progress toward zero balances

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before `typecheck`
- Query parameter names that match operation IDs can cause TS2308 collision — avoid or handle in route handler with `req.query`
- Money columns use `numeric` in Drizzle → values come back as strings from the DB; use `parseFloat()` when doing arithmetic
- `pnpm --filter @workspace/db run push-force` if column conflicts arise during schema changes

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups` | List all groups |
| POST | `/api/groups` | Create a group |
| GET | `/api/groups/:id` | Get group |
| PATCH | `/api/groups/:id` | Update group |
| DELETE | `/api/groups/:id` | Delete group |
| GET | `/api/groups/:id/summary` | Spending summary + category breakdown |
| GET | `/api/groups/:id/balances` | Net balance per member |
| GET | `/api/groups/:id/optimal-settlements` | Minimum-transaction settlement plan |
| GET | `/api/groups/:groupId/members` | List members |
| POST | `/api/groups/:groupId/members` | Add member |
| PATCH | `/api/groups/:groupId/members/:id` | Update member |
| DELETE | `/api/groups/:groupId/members/:id` | Remove member |
| GET | `/api/groups/:groupId/expenses` | List expenses |
| POST | `/api/groups/:groupId/expenses` | Add expense |
| GET | `/api/groups/:groupId/expenses/:id` | Get expense with splits |
| PATCH | `/api/groups/:groupId/expenses/:id` | Update expense |
| DELETE | `/api/groups/:groupId/expenses/:id` | Delete expense |
| GET | `/api/groups/:groupId/settlements` | List settlements |
| POST | `/api/groups/:groupId/settlements` | Record a settlement |
| DELETE | `/api/groups/:groupId/settlements/:id` | Remove settlement |

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
