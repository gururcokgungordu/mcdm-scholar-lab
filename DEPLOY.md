# MCDM Scholar Lab - Deployment Guide

## Prerequisites
- Supabase account (free tier available)
- Vercel account (free tier available)
- GitHub repository
- Gemini API key from Google AI Studio

---

## Step 1: Supabase Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose a name and password
4. Select a region close to your users

### 1.2 Create Database Tables
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase_schema.sql`
3. Paste and run the SQL

### 1.3 Get Credentials
From your Supabase project settings:
- **SUPABASE_URL**: Settings → API → Project URL
- **SUPABASE_SERVICE_KEY**: Settings → API → service_role key (secret!)

---

## Step 2: GitHub Setup

### 2.1 Initialize Repository
```bash
cd mcdmAI
git init
git add .
git commit -m "Initial commit"
```

### 2.2 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/mcdmAI.git
git branch -M main
git push -u origin main
```

---

## Step 3: Vercel Deployment

### 3.1 Import Project
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository

### 3.2 Configure Build Settings
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

### 3.3 Add Environment Variables
In Vercel project settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |
| `GEMINI_API_KEY` | Your Gemini API key |

### 3.4 Deploy
Click "Deploy" and wait for the build to complete.

---

## Step 4: Post-Deployment

### 4.1 Test the Application
1. Open your Vercel deployment URL
2. Register a new account
3. Upload a PDF and test the analysis

### 4.2 Create Admin User
Run this SQL in Supabase:
```sql
UPDATE users 
SET role = 'ADMIN', is_pro = TRUE 
WHERE email = 'your-email@example.com';
```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |

---

## Troubleshooting

### "Failed to analyze paper"
- Check Gemini API key is valid
- Ensure PDF is not too large (< 10MB)

### "Invalid credentials"
- Make sure Supabase tables are created
- Check SUPABASE_SERVICE_KEY is correct

### API Routes Not Working
- Verify `/api/*.js` files exist
- Check Vercel function logs

---

## Local Development

```bash
# Install dependencies
npm install

# Run frontend
npm run dev

# Run backend (separate terminal)
cd server
npm install
npm run dev
```

Create `.env` file with your credentials for local testing.
