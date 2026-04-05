# VyaparFlow Billing SaaS Platform

Multi-tenant billing, GST, restaurant POS, CRM, inventory, reporting, and analytics platform for India SMB workflows, built with Next.js, MongoDB, and Tailwind CSS.

This repository is an existing full-stack project that has been upgraded into a restaurant-first billing workflow while keeping multi-tenant SaaS structure for additional industries such as medical stores, grocery shops, salons, retail outlets, and general stores.

## Highlights

- Multi-tenant SaaS with tenant-aware auth and strict tenant filtering in APIs
- Next.js App Router frontend and route-handler backend in one codebase
- Restaurant table-first POS workflow with draft bills per table
- Customer capture during billing with CRM persistence
- GST-ready invoice totals, printable invoice view, PDF generation, and table closure
- Product CRUD with MongoDB persistence
- Excel-based product import using a fixed template
- Auto-generated unique SKU and barcode for new products when blank
- Duplicate product prevention using a normalized branch-level product key
- Reports with filters, pagination, and export to PDF, CSV, and Excel
- Vendor settings reused in invoices, exports, and print flows
- Demo tenant seed data for local testing

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- MongoDB Atlas or local MongoDB
- Mongoose
- NextAuth credentials auth with JWT-backed sessions
- Tailwind CSS v4
- Recharts
- `pdf-lib` and `jsPDF`
- Zod
- `xlsx`
- Vercel-compatible deployment

## Core Functionality

### 1. Multi-tenant architecture

- Every business is treated as a separate tenant
- Session user carries tenant context into dashboard and API flows
- Core collections include tenant-aware metadata such as `tenantId`, `businessId`, `branchId`, and `createdBy`
- Product, invoice, customer, settings, payment, loyalty, inventory, and table flows are filtered by tenant
- `src/proxy.ts` protects authenticated routes while route handlers re-check authorization server-side

### 2. Authentication and roles

Supported roles:

- `super-admin`
- `business-admin`
- `billing-staff`

Current behavior:

- Sign-in accepts tenant code or raw tenant ID
- Dashboard and APIs are session-protected
- Admin-only areas such as product management, table setup, and settings are restricted in route handlers

### 3. Restaurant table workflow

Restaurant billing is the deepest workflow in the current app.

- Cashier lands on a restaurant table grid
- Tables show status: `available`, `occupied`, `billed`, `reserved`
- Clicking a table opens the billing workspace for that table
- Each table keeps its own draft bill
- Drafts persist by `tableId`, `sessionId`, and `invoiceDraftId`
- Reopening a table restores the exact in-progress order
- Billed tables reopen the exact original invoice

### 4. Table-wise draft billing

Each live table bill supports:

- menu item selection
- product search
- category filtering
- quantity increase/decrease
- discount entry
- order notes
- draft auto-save
- manual draft save
- cash, UPI, and card settlement

### 5. Product management

Business admins can:

- create products from the UI
- edit existing products
- delete products
- manage price, stock, GST, reorder level, HSN/SAC, availability, and veg/non-veg status

Product creation rules:

- SKU auto-populates for new products if left blank
- barcode auto-populates for new products if left blank
- SKU remains editable
- barcode remains editable
- same product cannot be added twice in the same branch when `productName + category` matches

### 6. Excel product import

Products can also be imported from Excel or CSV.

Import behavior:

- user downloads the fixed template from the products page
- file is filled in the same standard format
- uploaded sheet is validated against required template headers
- no manual column mapping is required
- valid rows import even if some rows fail
- duplicate products are rejected row-by-row
- blank SKU and barcode fields are auto-generated uniquely

Standard template columns:

- `productName`
- `category`
- `price`
- `costPrice`
- `stock`
- `GST`
- `description`
- `imageUrl`
- `foodType`
- `reorderLevel`
- `HSN_SAC`
- `SKU`
- `barcode`
- `activeStatus`
- `isAvailable`

### 7. Inventory behavior

- Stock is validated before invoice finalization
- On billing, stock is reduced automatically
- When stock reaches zero, product becomes unavailable for billing
- Inventory movement entries are written for outgoing sale quantities
- Products page shows in-stock, low-stock, and out-of-stock counts

### 8. Customer CRM during billing

Primary billing flow supports adding a new customer directly at checkout.

Customer fields supported:

- customer name
- mobile number
- email
- number of guests
- special notes

Customer behavior:

- customer is attached to the draft/invoice snapshot
- repeat customers can be reused quickly
- total spend and loyalty points update when invoice is settled

### 9. Invoice, PDF, and print

Invoice flow includes:

- exact invoice reconstruction from invoice history
- invoice detail page with original customer, table, items, taxes, and payment mode
- PDF download route
- print view route
- print action that downloads the PDF, opens it, and opens a print-friendly tab
- billed table can be closed later from the invoice actions panel

### 10. Reports and exports

The reports module supports:

- daily sales
- weekly sales
- monthly sales
- yearly sales
- item-wise sales
- table-wise revenue
- customer-wise revenue
- profit report
- tax report

Report UI includes:

- report type filter
- date range filter
- paginated table output
- totals row
- export buttons for PDF, CSV, and Excel

### 11. Vendor settings

The settings module lets admins manage:

- vendor name
- GSTIN
- address
- phone
- email
- logo URL
- invoice prefix
- default GST
- footer message
- thank you note

This information flows into:

- invoices
- PDF bills
- print view
- exported reports

### 12. Dashboard and analytics

Dashboard and analytics pages include:

- tenant-aware workspace header
- revenue and sales trend cards
- charts for sales and payment modes
- best sellers and customer insight blocks
- template-aware workspace summaries

## Current Industry Coverage

This codebase is multi-tenant and seeded for multiple industries. The most complete operational flow today is the restaurant workflow.

Seeded tenant types:

- restaurant
- medical store
- grocery
- salon

The dashboard, products, reports, settings, and auth architecture are tenant-generic, while table-based billing is restaurant-specific.

## Project Structure

```text
src/
  app/
    api/
      auth/
      customers/
      invoices/
      products/
      reports/
      settings/
      tables/
    auth/signin/
    dashboard/
      analytics/
      customers/
      invoices/
      payments/
      pos/
      products/
      reports/
      settings/
      templates/
  components/
    dashboard-layout.tsx
    invoice-actions.tsx
    invoice-receipt.tsx
    product-importer.tsx
    product-manager.tsx
    reports-center.tsx
    restaurant-billing-workspace.tsx
    restaurant-table-grid.tsx
    settings-form.tsx
  lib/
    auth.ts
    api-auth.ts
    dashboard-data.ts
    invoice-pdf.ts
    product-code-utils.ts
    product-identifiers.ts
    product-identity.ts
    product-key.ts
    reporting.ts
    report-export.ts
    restaurant-data.ts
    restaurant-utils.ts
  models/
    Customer.ts
    Inventory.ts
    Invoice.ts
    Loyalty.ts
    Offer.ts
    Payment.ts
    Product.ts
    Report.ts
    RestaurantTable.ts
    Settings.ts
    Tenant.ts
    User.ts
  scripts/
    seed.ts
```

## Environment Variables

Copy `.env.example` to `.env.local`.

```env
# Database
MONGODB_URI=mongodb://localhost:27017/BillingCRM

# NextAuth
NEXTAUTH_SECRET=replace-with-your-own-secret
NEXTAUTH_URL=http://localhost:3000
```

Required:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Create your local env file

```bash
cp .env.example .env.local
```

3. Update `.env.local` with your database connection and auth secret

4. Seed demo data

```bash
npm run seed
```

5. Start the app

```bash
npm run dev
```

6. Run lint + production build verification anytime

```bash
npm run verify
```

## NPM Scripts

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run seed` - seed demo tenants, products, tables, invoices, and users
- `npm run verify` - run lint and build together

## Demo Tenant Credentials

Use the tenant code on the sign-in screen.

### Restaurant

- Tenant code: `demo-restaurant`
- Business admin: `admin@masalatable.in` / `Admin@123`
- Billing staff: `cashier@masalatable.in` / `Staff@123`

### Medical store

- Tenant code: `demo-pharmacy`
- Business admin: `admin@sanjeevanimedico.in` / `Admin@123`
- Billing staff: `cashier@sanjeevanimedico.in` / `Staff@123`

### Grocery

- Tenant code: `demo-grocery`
- Business admin: `admin@dailybasketmart.in` / `Admin@123`
- Billing staff: `cashier@dailybasketmart.in` / `Staff@123`

### Salon

- Tenant code: `demo-salon`
- Business admin: `admin@blushbloom.in` / `Admin@123`
- Billing staff: `cashier@blushbloom.in` / `Staff@123`

## Seeded Restaurant Test State

After `npm run seed`, the restaurant tenant includes ready-made table states for quick testing.

- `Table 3` has an active draft order
- `Table 4` is billed and ready for invoice reopen/print testing
- `Table 5` is reserved
- other restaurant tables are available

## Recommended Local Testing Flow

### Restaurant cashier flow

1. Run `npm run seed`
2. Run `npm run dev`
3. Open `http://localhost:3000/auth/signin`
4. Sign in with tenant code `demo-restaurant`
5. Use `cashier@masalatable.in` / `Staff@123`
6. Confirm the first screen is the table grid
7. Open `Table 3` to verify draft restore
8. Open `Table 4` to verify billed invoice reopen
9. Create a fresh bill from an available table
10. Add a new customer in the billing form
11. Settle with cash, UPI, or card
12. Open the generated invoice and use print/download
13. Close the table from invoice actions if needed

### Product management flow

1. Sign in as `admin@masalatable.in` / `Admin@123`
2. Open `/dashboard/products`
3. Create a new item manually
4. Verify SKU and barcode auto-populate
5. Try creating the same `productName + category` again and confirm it is blocked
6. Download the Excel template
7. Fill a few rows and import them
8. Confirm imported products appear immediately in the saved items list

### Reports flow

1. Open `/dashboard/reports`
2. Switch between report types
3. Apply date filters
4. Load report
5. Export PDF, CSV, and Excel versions

## Main Application Routes

### Auth and shell

- `/auth/signin`
- `/dashboard`

### Operations

- `/dashboard/pos`
- `/dashboard/pos/[tableId]`
- `/dashboard/products`
- `/dashboard/invoices`
- `/dashboard/invoices/[invoiceId]`
- `/dashboard/invoices/[invoiceId]/print`
- `/dashboard/customers`
- `/dashboard/payments`
- `/dashboard/reports`
- `/dashboard/analytics`
- `/dashboard/settings`
- `/dashboard/templates`

## API Routes

### Authentication

- `GET/POST /api/auth/[...nextauth]`

### Products

- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/[id]`
- `DELETE /api/products/[id]`
- `POST /api/products/import`

### Tables and drafts

- `GET /api/tables`
- `POST /api/tables`
- `PATCH /api/tables/[id]`
- `DELETE /api/tables/[id]`
- `GET /api/tables/[id]/draft`
- `PUT /api/tables/[id]/draft`

### Invoices

- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/invoices/[id]`
- `POST /api/invoices/[id]/close`
- `GET /api/invoices/[id]/pdf`

### Customers

- `GET /api/customers`
- `POST /api/customers`

### Reports

- `GET /api/reports`
- `GET /api/reports/export`

### Settings

- `GET /api/settings`
- `PUT /api/settings`

## Product Identity Rules

Current product uniqueness rules are:

- `SKU` must be unique per tenant when provided
- `barcode` must be unique per tenant when provided
- `productName + category` must be unique per tenant/business/branch

The app stores a normalized `productKey` internally to enforce this rule.

Examples:

- `Paneer Tikka` + `Starters` cannot be added twice in the same branch
- `Paneer Tikka` + `Main Course` is treated as a different product
- the same product name can exist in another tenant because tenant isolation still applies

## Deployment Notes

- Built with Next.js App Router and route handlers, so it is Vercel-ready
- Uses `proxy.ts` with NextAuth middleware to protect app routes
- MongoDB Atlas is recommended for hosted environments
- Set `NEXTAUTH_URL` to your deployed domain in production
- Replace the demo `NEXTAUTH_SECRET` before deployment

## Verification

Recent local verification for this repository:

- `npm run build` passes
- `npm run verify` passes

## Notes

- The app is multi-tenant across several industries, but the most complete workflow today is restaurant table billing
- Product import is strict-template based by design, so users do not have to manually map spreadsheet columns
- The products page layout has been constrained to match the rest of the dashboard and avoid sideways drift
