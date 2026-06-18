# Hosting & Database Setup Guide

Follow this guide to host your LinkedIn-themed Claim Dashboard for **100% free** using **Supabase** (Database) and **Render** (Hosting).

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
   - **service_role key** (Click **Reveal** next to it and copy it. **Do not share this key publicly**; it gives full read/write bypass to the database, which is required for our backend CLI and server).

---

## Part 3: Local Configuration (For Generating Codes)

1. Inside your local `linkedin-claim` directory, create a file named `.env` (copying `.env.example`).
2. Populate the fields with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-service-role-key-here
   TARGET_URL=https://www.linkedin.com/premium/redeem-v3/?_ed=...
   ```
3. Test generating your first batch of codes locally using the CLI manager:
   ```bash
   node manage-codes.js generate 10
   ```
4. If successful, you will see the generated codes in the console, and if you check your Supabase **Table Editor**, you will see those codes loaded in the cloud.

---

## Part 4: Host for FREE on Render.com

Render is a modern hosting platform that can run our Node.js Express server directly from GitHub.

### 1. Push Your Code to GitHub
1. Create a **private** repository on GitHub (e.g., `linkedin-claim-dashboard`).
2. Push the files in this directory to your repository.
   * *Note:* Ensure your `.env` file is in your `.gitignore` so your private Supabase key is **never** uploaded to GitHub.

### 2. Deploy to Render
1. Go to [Render.com](https://render.com/) and log in/sign up.
2. Click **New +** in the top right and select **Web Service**.
3. Connect your GitHub account and select your repository.
4. Set the following configuration values:
   - **Name:** `linkedin-claim` (or any name you prefer)
   - **Region:** Choose a region close to your buyers.
   - **Branch:** `main` (or whatever branch you pushed to)
   - **Root Directory:** (leave blank, it defaults to the root of the repository)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Select **Free** ($0/month).

### 3. Add Environment Variables on Render
Before clicking deploy, scroll down and click **Advanced** -> **Add Environment Variable**. Add the following variables:
1. `SUPABASE_URL` = (your Supabase URL)
2. `SUPABASE_KEY` = (your Supabase Service Role Key)
3. `TARGET_URL` = (your LinkedIn Premium coupon URL)

### 4. Deploy!
Click **Create Web Service**. Render will install Node.js, install dependencies, start your server, and give you a public URL (e.g., `https://linkedin-claim.onrender.com`).

Your buyers can now go to this public URL, enter their code, and activate their premium!
