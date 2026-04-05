# VyaparFlow Billing SaaS Platform

Production-ready multi-tenant SaaS starter for India SMB billing, GST, POS, CRM, inventory, and analytics workflows.

## What changed in this refinement

- Stronger UI system with a warmer, more intentional palette and consistent layout rhythm
- Tenant-aware dashboard shell with cleaner navigation and module hierarchy
- Faster POS billing flow with keyboard shortcuts and offer/customer guidance
- Simpler local testing with stable tenant codes instead of requiring raw Mongo tenant IDs
- Demo seed data for multiple industries with admin and cashier logins

## Stack

- Next.js App Router + TypeScript
- MongoDB Atlas + Mongoose
- NextAuth credentials + JWT sessions
- Tailwind CSS
- Recharts
- jsPDF / pdf-lib
- Zod-ready validation foundation
- Vercel-compatible deployment

## Getting started

1. Install dependencies

```bash
npm install
```

2. Create local env file

```bash
cp .env.example .env.local
```

3. Fill `.env.local`

```env
MONGODB_URI=your-mongodb-uri
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

4. Seed demo tenants

```bash
npm run seed
```

5. Start the app

```bash
npm run dev
```

6. Optional verification

```bash
npm run verify
```

## Local demo tenants

Use the tenant code in the sign-in screen. You no longer need the raw tenant ID for basic local testing.

### Medical store

- Tenant code: `demo-pharmacy`
- Business admin: `admin@sanjeevanimedico.in` / `Admin@123`
- Billing staff: `cashier@sanjeevanimedico.in` / `Staff@123`

### Restaurant

- Tenant code: `demo-restaurant`
- Business admin: `admin@masalatable.in` / `Admin@123`
- Billing staff: `cashier@masalatable.in` / `Staff@123`

### Grocery

- Tenant code: `demo-grocery`
- Business admin: `admin@dailybasketmart.in` / `Admin@123`
- Billing staff: `cashier@dailybasketmart.in` / `Staff@123`

### Salon

- Tenant code: `demo-salon`
- Business admin: `admin@blushbloom.in` / `Admin@123`
- Billing staff: `cashier@blushbloom.in` / `Staff@123`

## Suggested local test flow

1. Run `npm run seed`
2. Start the app with `npm run dev`
3. Sign in with `demo-pharmacy` and the pharmacy admin account
4. Review `/dashboard` for seeded metrics and invoice activity
5. Open `/dashboard/pos`
6. Add products, choose a customer, apply an offer, and bill with cash or UPI
7. Reopen `/dashboard/products` to confirm stock changed
8. Reopen `/dashboard/invoices` and `/dashboard/analytics` to confirm the new invoice affected downstream views
9. Repeat with another tenant code like `demo-restaurant` to verify tenant isolation

## Notes

- All route handlers now use the authenticated tenant from the session instead of trusting a query-string tenant override.
- The sign-in page accepts either a tenant code or a raw tenant ID.
- `npm run verify` runs lint and production build together.
