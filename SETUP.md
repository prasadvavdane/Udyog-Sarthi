# Setup and production verification

## Prerequisites

- Node.js 20.9 or later (Node.js 22 LTS is recommended)
- npm (the repository uses `package-lock.json`)
- A reachable MongoDB deployment
- Gmail SMTP credentials if invoice email delivery is enabled

## Install

```powershell
npm ci
```

## Environment configuration

Create `.env.local`. It is ignored by Git. Configure these names only:

```env
MONGODB_URI=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GMAIL_SMTP_USER=
GMAIL_SMTP_APP_PASSWORD=
GMAIL_SMTP_HOST=
GMAIL_SMTP_PORT=
GMAIL_SMTP_SECURE=
GMAIL_SMTP_FROM_NAME=
INVOICE_DELIVERY_EMAIL=
```

Required for the application: `MONGODB_URI`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.

Required to use the invoice email endpoint: `GMAIL_SMTP_USER` and `GMAIL_SMTP_APP_PASSWORD`.

`GMAIL_SMTP_HOST`, `GMAIL_SMTP_PORT`, and `GMAIL_SMTP_SECURE` are optional Gmail SMTP overrides. `GMAIL_SMTP_FROM_NAME` is an optional sender display name. `INVOICE_DELIVERY_EMAIL` is the default recipient for invoice email delivery; additional recipients can be set through tenant settings.

## Run and verify locally

```powershell
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

`npm run seed` writes demo tenants and billing data to the configured MongoDB database. Run it only against a disposable development database.

## Deployment

Vercel detects this as a Next.js application. Set the required environment variables for the appropriate Vercel environments, then deploy with the normal Vercel Git integration or:

```powershell
npm ci
npm run build
```

Set `NEXTAUTH_URL` to the canonical deployed HTTPS URL. Ensure the MongoDB network access rules permit Vercel's outbound connections and that Gmail SMTP authentication is allowed for the configured account.

## Remaining manual checks

- Confirm the MongoDB database contains the intended tenant and user records; do not use demo seeding in production.
- Sign in through the deployed domain and verify a protected dashboard route.
- Send a test invoice only after confirming the configured recipient and Gmail app-password policy.
