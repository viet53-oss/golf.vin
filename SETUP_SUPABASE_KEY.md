# 🔧 Quick Fix: Get Your Supabase Anon Key

## The Error You Saw
```
DATABASE_URL is not defined
```

This happened because the real-time features need your Supabase anon key.

---

## ✅ How to Fix (2 minutes)

### Step 1: Get Your Supabase Anon Key

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/murcnbooxfuosrpdgyyb/settings/api

2. **Copy the "anon" / "public" key**
   - Look for the section labeled "Project API keys"
   - Find the key labeled "anon" or "public"
   - Click the copy button

### Step 2: Add to `.env` File

Open `.env` and replace `YOUR_ANON_KEY_HERE` with your actual key:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 3: Restart Dev Server

```bash
# Press Ctrl+C to stop the server
# Then restart:
npm run dev
```

---

## ✅ What I Fixed

1. **Updated `lib/supabase-client.ts`**
   - Now uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Won't crash if keys are missing (graceful degradation)
   - Better error messages

2. **Updated `.env`**
   - Added `NEXT_PUBLIC_SUPABASE_URL` (already filled in)
   - Added `NEXT_PUBLIC_SUPABASE_ANON_KEY` (you need to fill this)

---

## 🧪 Test After Setup

1. Restart dev server
2. Go to http://localhost:3000
3. Click "Live Score" button
4. You should see the live scores page without errors!

---

## 🎯 What Works Now

### Without Anon Key (Current State):
- ✅ Live Score button appears on home page
- ✅ Live Score page loads
- ⚠️ Real-time updates disabled (warning in console)
- ⚠️ Connection shows as offline

### With Anon Key (After Setup):
- ✅ Live Score button appears on home page
- ✅ Live Score page loads
- ✅ Real-time updates enabled
- ✅ Connection shows as online (green dot)
- ✅ Scores update automatically across browsers

---

## 📸 Where to Find the Anon Key

When you visit the Supabase dashboard link, you'll see:

```
Project API keys
├── anon / public    ← Copy this one!
│   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
│
└── service_role     ← Don't use this (it's secret!)
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** Use the "anon" key, NOT the "service_role" key!

---

## 🚀 You're Almost There!

The Live Score button is created and working! Just add your Supabase anon key to enable the real-time magic. 🎉
