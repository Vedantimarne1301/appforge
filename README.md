# AppForge — Dynamic App Platform

A production-oriented MVP that generates full CRUD applications from JSON configuration. Define a schema once; get a form, table, API, and data layer instantly — with graceful handling of every malformed input.

---

## Architecture Overview

```
JSON Config
    │
    ▼
┌─────────────────────────────────────┐
│         Config Validator            │  ← sanitizes ALL input, never throws
│  lib/validators/config-validator.ts │
└──────────────┬──────────────────────┘
               │ sanitized AppConfigSchema
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌──────────────────┐
│  Frontend   │  │   Backend CRUD   │
│  Renderer   │  │   API Engine     │
│             │  │                  │
│ DynamicForm │  │ /api/records/:id │
│ DynamicTable│  │ /api/configs/:id │
│ ComponentReg│  │ /api/uploads/:id │
└─────────────┘  └──────────────────┘
       │                │
       └───────┬────────┘
               ▼
        PostgreSQL (Neon)
        via Prisma ORM
```

---

## Project Structure

```
appforge/
├── app/
│   ├── (auth)/                    # Auth pages (no nav)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/               # Protected pages
│   │   └── dashboard/
│   │       ├── page.tsx           # Stats dashboard
│   │       └── configs/
│   │           ├── page.tsx       # Config list
│   │           ├── [configId]/
│   │           │   ├── page.tsx         # Config detail (SSR)
│   │           │   ├── ConfigRuntime.tsx # Dynamic app engine (CSR)
│   │           │   └── edit/page.tsx    # Edit config
│   │           └── NewConfigButton.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── register/route.ts
│   │   ├── configs/
│   │   │   ├── route.ts           # GET list, POST create
│   │   │   ├── [configId]/route.ts # GET, PUT, DELETE
│   │   │   └── validate/route.ts  # Stateless validation
│   │   ├── records/
│   │   │   └── [configId]/
│   │   │       ├── route.ts       # GET list, POST create
│   │   │       └── [recordId]/route.ts # GET, PUT, DELETE
│   │   └── uploads/
│   │       └── [configId]/route.ts # CSV import
│   ├── error.tsx                  # Global error boundary
│   ├── not-found.tsx
│   └── layout.tsx
├── components/
│   └── dynamic/
│       ├── component-registry.tsx # Maps names → React components
│       ├── DynamicForm.tsx        # Config-driven form renderer
│       ├── DynamicTable.tsx       # Config-driven table renderer
│       ├── ConfigEditor.tsx       # JSON editor with live validation
│       └── CsvImporter.tsx        # CSV import with row validation
├── hooks/
│   └── useRecords.ts              # Data fetching hook
├── lib/
│   ├── validators/
│   │   └── config-validator.ts   # Core safety layer
│   ├── auth/
│   │   ├── auth.ts               # NextAuth config (Google + credentials)
│   │   └── middleware.ts         # withAuth() wrapper
│   ├── api-response.ts           # Typed response helpers
│   ├── prisma.ts                 # Prisma singleton
│   └── store.ts                  # Zustand client state
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── types/
│   └── index.ts                  # All shared TypeScript types
└── middleware.ts                  # Route protection
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, and optionally GOOGLE_CLIENT_ID/SECRET
```

### 3. Set up database

```bash
# Push schema to Neon (or any Postgres)
npm run db:push

# Optional: seed with demo data
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deployment (Vercel + Neon)

### Neon PostgreSQL

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`

### Vercel

```bash
vercel deploy
```

Set these environment variables in the Vercel dashboard:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your production URL e.g. `https://appforge.vercel.app` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (optional) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console (optional) |

### Post-deployment

```bash
# Run migrations against production DB
npx prisma db push --schema=./prisma/schema.prisma
```

---

## Core Design Decisions

### 1. Config Validator as Safety Boundary

Every config passes through `lib/validators/config-validator.ts` before touching the database or renderer. It:
- Never throws — always returns `{ valid, errors, warnings, sanitized }`
- Sanitizes field names, resource names, and option arrays
- Produces a clean `AppConfigSchema` even from partial/broken input
- Stores the sanitized config in DB, not the raw user input

### 2. Component Registry Pattern

```ts
// Adding a new field type = one line:
const COMPONENT_REGISTRY = {
  input: InputField,
  select: SelectField,
  myCustomWidget: MyCustomWidget,  // ← just add here
};
```

Unknown component names automatically render `FallbackField` (amber warning UI) — the page never crashes.

### 3. Generic CRUD Engine

All record operations share the same pattern:
1. Resolve config → validate ownership
2. Sanitize record data against config field list (unknown keys stripped)
3. Validate required fields, types, constraints
4. Persist as `Json` column in `app_records.data`

No migration needed when the config changes — the schema lives in JSON.

### 4. User-Scoped Data

All queries include `userId` in the WHERE clause. Users can only see and modify their own configs and records. This is enforced at the API layer via `withAuth()`, not just the UI.

### 5. Never Crash Philosophy

- Invalid JSON body → 400 with error message
- Unknown component in config → fallback UI rendered
- Missing required fields → validation errors shown, not thrown
- DB errors → caught, logged, 500 returned (never stack traces to client)
- Async errors in React → caught by Next.js error boundaries

---

## Example Config

```json
{
  "resource": "invoices",
  "layout": "both",
  "name": "Invoice Tracker",
  "fields": [
    { "name": "client", "label": "Client Name", "component": "input", "type": "text", "required": true },
    { "name": "amount", "label": "Amount ($)", "component": "number", "validation": { "min": 0 } },
    { "name": "status", "label": "Status", "component": "select", "options": ["Draft", "Sent", "Paid", "Overdue"] },
    { "name": "due_date", "label": "Due Date", "component": "date" },
    { "name": "notes", "label": "Notes", "component": "textarea" }
  ],
  "settings": {
    "allowCreate": true,
    "allowEdit": true,
    "allowDelete": true,
    "allowCsvImport": true,
    "pageSize": 25
  }
}
```

---

## Supported Field Components

| Component | Description |
|---|---|
| `input` | Single-line text input |
| `textarea` | Multi-line text |
| `number` | Numeric input with min/max validation |
| `email` | Email input with format validation |
| `url` | URL input |
| `select` | Dropdown from options array |
| `radio` | Radio buttons from options array |
| `checkbox` | Boolean toggle |
| `date` | Date picker |
| `file` | File picker (UI only in MVP) |
| *unknown* | ⚠️ Fallback UI — never crashes |

---

## API Reference

### Configs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/configs` | List user's configs |
| `POST` | `/api/configs` | Create config from JSON |
| `GET` | `/api/configs/:id` | Get config by ID |
| `PUT` | `/api/configs/:id` | Update config |
| `DELETE` | `/api/configs/:id` | Delete config + all records |
| `POST` | `/api/configs/validate` | Validate without saving |

### Records

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/records/:configId` | List records (paginated) |
| `POST` | `/api/records/:configId` | Create record |
| `GET` | `/api/records/:configId/:id` | Get record |
| `PUT` | `/api/records/:configId/:id` | Update record |
| `DELETE` | `/api/records/:configId/:id` | Delete record |

### Uploads

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/uploads/:configId` | Import CSV |

---

## Additional Features Implemented

### Multi-auth Login (Google + Email)
- Google OAuth via NextAuth v5
- Email/password with bcrypt hashing
- JWT sessions with role support
- Auto sign-in after registration

### CSV Import
- Drag-and-drop or file picker
- Header matching against field names
- Row-level validation (same rules as form)
- Partial import: valid rows saved, errors reported per-row
- Max 5MB, upload logged to `uploads` table

### PWA / Mobile Support
- `manifest.json` for installability
- Responsive layouts (Tailwind `sm:`, `lg:` breakpoints)
- Touch-friendly inputs and buttons
- Safe area insets for notched phones
- `display: standalone` styling

---

## Extending the Platform

### Add a new field component

```tsx
// 1. Implement the component
const RatingField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => (
  <div>{/* star rating UI */}</div>
);

// 2. Register it
const COMPONENT_REGISTRY = {
  ...existing,
  rating: RatingField,
};
```

### Add a new layout type

```ts
// In config-validator.ts
const SUPPORTED_LAYOUTS = new Set(['form', 'table', 'both', 'kanban']);

// In ConfigRuntime.tsx
if (layout === 'kanban') return <KanbanView config={config} records={records} />;
```

### Add config-level permissions

The `settings` object is extensible — add fields to `AppConfigSchema.settings` and check them in API handlers.
