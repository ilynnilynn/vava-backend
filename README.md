# Vava — Backend

**Stack:** Next.js 15 · Supabase · TypeScript · Tailwind CSS · Vercel

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# → Fill in your Supabase keys (see below)

# 3. Run locally
npm run dev
# → Open http://localhost:3000
```

---

## Environment Variables

Get your keys from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |

---

## Folder Structure

```
src/
├── app/
│   ├── api/          ← API routes (your backend endpoints)
│   │   └── health/   ← GET /api/health (test it's working)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/           ← Reusable UI components (buttons, inputs, etc.)
│   └── layout/       ← Page-level layout components (nav, footer, etc.)
├── lib/
│   └── supabase/
│       ├── client.ts     ← Use in Client Components (browser)
│       ├── server.ts     ← Use in Server Components & API routes
│       └── middleware.ts ← Auth session refresh (don't touch)
└── types/
    └── index.ts      ← Shared TypeScript types
middleware.ts          ← Runs on every request (auth refresh)
```

---

## Adding an API Route

Create a file at `src/app/api/[your-route]/route.ts`:

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Hello!' })
}
```

Test it at: `http://localhost:3000/api/your-route`

---

## Deploying to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add your environment variables in Vercel → Settings → Environment Variables
4. Deploy ✓
