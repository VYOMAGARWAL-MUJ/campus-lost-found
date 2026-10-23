# CampusKind — Campus Lost & Found

A responsive React + TypeScript + Vite application with a Supabase backend, college-email magic-link authentication, lost/found reports, searchable listings, category filters, dark/light theme, and WhatsApp click-to-chat.

## What's included

- College email sign-in using Supabase magic links (no password stored by this app).
- User name and optional phone number collected on the login screen.
- Separate **I lost something** and **I found something** reporting modes.
- Item name, category, description, campus location, date, contact phone, optional image URL.
- Search, status filters, category filters, all listings, and a personal listings view.
- WhatsApp contact button with a prefilled message.
- Responsive dark/light themes, persisted in the browser.
- Supabase SQL schema with row-level security policies and server-side email-domain checks.
- Demo listing cards are included to make the UI previewable while configuring the backend.

## 1. Requirements

- Node.js 20+
- A Supabase account/project
- Your college's email domain (for example `university.edu`)

## 2. Install

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your project values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_COLLEGE_EMAIL_DOMAIN=muj.manipal.edu
```

Use the Supabase **publishable/anon key only** in the frontend. Never put the service-role key in `.env` for this app.

## 3. Configure the database and email domain

1. Open your Supabase project → **SQL Editor**.
2. Open `supabase/schema.sql`.
3. The SQL in this project is already configured for `muj.manipal.edu`.
4. Run the SQL.
5. In Supabase → **Authentication → URL Configuration**, set your local URL (e.g. `http://localhost:5173`) and add your deployed site URL to the redirect allow-list.
6. In Supabase → **Authentication → Providers → Email**, enable email sign-in/magic links and configure email delivery/SMTP appropriate for your launch.
7. For production, consider disabling open signups and allow only the domain your institution controls. Verify the domain and email delivery settings before sharing the site.

The SQL trigger rejects signups whose email does not match the configured domain. The RLS policies enforce the same domain for listing access. If your institution changes its email domain, update both the SQL and `.env` domain values together.

## 4. Run locally

```bash
npm run dev
```

Open the local URL Vite prints. Once `.env` has valid Supabase keys, enter your name, college email, and optional phone number. Open the emailed magic link to authenticate.

### Demo mode

Without Supabase configuration, the login screen is intentionally not bypassed and will explain that setup is needed. The sample cards are placeholders for preview/design and are **not** saved to a real database. Configure Supabase to use real accounts and shared persistent listings.

## 5. Deploy to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, import the repository.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_COLLEGE_EMAIL_DOMAIN` in Project Settings → Environment Variables.
4. Deploy.
5. Add the production domain in Supabase Authentication → URL Configuration.
6. Redeploy after changing environment variables.

Build command: `npm run build`  
Output directory: `dist`

## WhatsApp phone format

The app strips spaces and punctuation from the phone field and creates a `wa.me` link. Enter a country code for reliable international contact (e.g. `919876543210` for an Indian number). The user should have WhatsApp registered to that number.

## Before launching on a real campus

- Decide whether the exact phone number should be visible on every listing. This starter intentionally displays it only through a WhatsApp link, not as plain text, but the link still includes the number.
- Ask students to meet in a public campus location and verify item ownership before handing over items.
- Do not post ID numbers, addresses, passwords, financial details, or other sensitive information in item descriptions/photos.
- Add moderation/reporting and a retention policy if this will be used by a large campus.
- Optional next steps: Supabase Storage for direct photo uploads, email-domain allow-list UI, admin moderation, item resolution/closed status, and contact requests that do not reveal phone numbers.
