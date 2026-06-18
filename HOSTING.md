# Hosting & Database Setup Guide

Follow this guide to host your LinkedIn-themed Claim Dashboard for **100% free** using **Supabase** (Database) and **Vercel** (Hosting).

---

## Part 1: Create Your Free Supabase Database

1. Go to [Supabase.com](https://supabase.com/) and sign up for a free account.
2. Click **New Project** and choose a name (e.g., `linkedin-claim`), set a database password, and choose a region close to your target buyers.
3. Wait about 1–2 minutes for the database to provision.

### Create the Database Table
1. In the left sidebar of your Supabase Dashboard, click on the **SQL Editor** (the `>_` icon).
2. Click **New Query**.
3. Copy and paste the following SQL script:

```sql
CREATE TABLE claim_codes (
    code TEXT PRIMARY KEY,
    used BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    redeemed_at TIMESTAMPTZ,
    ip TEXT
);
```

4. Click **Run** in the top right. You should see a success message: `Success. No rows returned.`
5. You can verify the table by clicking on the **Table Editor** (spreadsheet icon) in the sidebar; you will see the `claim_codes` table ready.

---

## Part 2: Copy API Credentials

1. In the left sidebar of Supabase, click **Project Settings** (the gear icon).
2. Go to **API**.
3. Copy the following credentials:
   - **Project URL** (under Project API keys)
   - **service_role key** (Click **Reveal** next to the `default` key under **Secret keys** at the bottom, or select the **Legacy anon, service_role API keys** tab and copy `service_role`).

---

## Part 3: Local Configuration (For Generating Codes)

1. Inside your local `linkedin-claim` directory, create a file named `.env` (copying `.env.example`).
2. Populate the fields with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-service-role-key-here
   TARGET_URL=https://www.linkedin.com/premium/redeem-v3/?_ed=...
   ```
3. Test generating your first batch of codes locally using the CLI manager:
   ```bash
   node manage-codes.js generate 10
   ```
4. If successful, you will see the generated codes in the console, and if you check your Supabase **Table Editor**, you will see those codes loaded in the cloud.

---

## Part 4: Host for FREE on Vercel

Vercel is a modern serverless hosting platform that can host our Node.js application for free.

### 1. Push the updated code to GitHub
Run the following commands in your local terminal inside `linkedin-claim` directory:
```bash
git add .
git commit -m "Add Vercel configuration"
git push
```

### 2. Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com/) and sign up for a free Hobby account (you can log in using your GitHub account).
2. Click **Add New** -> **Project**.
3. Import your `linkedin-claim` GitHub repository.
4. On the **Configure Project** screen:
   - **Framework Preset:** Select **Other**.
   - **Root Directory:** (leave blank, it defaults to the root of the repo)
5. Expand the **Environment Variables** section and add the following keys and values:
   - `SUPABASE_URL` = (your Supabase URL)
   - `SUPABASE_KEY` = (your Supabase Service Role Key)
   - `TARGET_URL` = (your LinkedIn Premium coupon URL)
6. Click **Deploy**.

Vercel will build and deploy your app in seconds and give you a public URL (e.g., `https://linkedin-claim.vercel.app`).

### 3. Add Custom Domain (Optional)
1. Go to your Vercel Project dashboard.
2. Navigate to **Settings** -> **Domains**.
3. Enter your custom domain/subdomain (e.g., `claim.yourdomain.com`) and click **Add**.
4. Configure your domain registrar (GoDaddy, Namecheap, etc.) with the CNAME record Vercel provides.
