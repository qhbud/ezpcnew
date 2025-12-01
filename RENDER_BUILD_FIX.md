# Render Build Timeout Fix

If you're experiencing build timeouts on Render, here are solutions:

---

## Solution 1: Use Docker Build (RECOMMENDED)

I've updated `render.yaml` to use Docker instead of native buildpacks.

### If you're creating a NEW service:

1. Delete the old/failed service on Render
2. Create a new Web Service
3. Connect the `ezpcnew` repository
4. **Render will auto-detect `render.yaml`** and use Docker
5. Add your environment variables
6. Deploy!

### If you're updating an EXISTING service:

You need to delete and recreate because you can't change from Node to Docker on an existing service.

---

## Solution 2: Skip Puppeteer (FASTER, but no price scraping)

If Docker is still slow, we can make Puppeteer optional.

### Manual Configuration on Render:

1. **Build Command:**
   ```
   npm install --omit=optional
   ```

2. **Start Command:**
   ```
   npm start
   ```

3. **Add Environment Variable:**
   ```
   PUPPETEER_SKIP_DOWNLOAD=true
   ```

**What this does:**
- ✅ Web app works perfectly
- ✅ Browse products, build PCs
- ⚠️ Price scraping scripts won't work (but you don't need them in production)

---

## Solution 3: Use a Different Service Type

### If free tier keeps timing out:

Render's free tier has limited build time. Consider:

**Option A: Upgrade to Starter ($7/month)**
- Longer build times allowed
- Faster builds
- No sleep

**Option B: Use Vercel (Free, but for frontend only)**
- If you only need the frontend
- Won't work for full-stack (needs separate API)

**Option C: Use Fly.io (Free tier)**
- Good Docker support
- 3 small VMs free
- Better for Docker builds

---

## Recommended Path Forward

### Best Option: Fresh Start with Docker

1. **Delete current Render service**
   - Go to service settings
   - Click "Delete Service"

2. **Create new service**
   - New + → Web Service
   - Connect `ezpcnew` repository

3. **Render will detect render.yaml**
   - Automatically uses Docker
   - Should build successfully

4. **Add 8 environment variables**
   ```
   MONGODB_URI=mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder?appName=Cluster0
   DB_NAME=pcbuilder
   NODE_ENV=production
   AMAZON_ACCESS_KEY_ID=AKPAZQZEQT1756001416
   AMAZON_SECRET_ACCESS_KEY=kLC/dPqat9+TZnWWqJFlfe7mUouotXkYNB4Evh7T
   AMAZON_ASSOCIATE_TAG=qhezpc-20
   AMAZON_REGION=us-east-1
   AMAZON_HOST=webservices.amazon.com
   ```

5. **Deploy and wait**
   - Docker build takes 5-8 minutes
   - But should complete successfully

---

## Alternative Platform: Fly.io

If Render continues to have issues, Fly.io is excellent for Docker:

### Quick Fly.io Deploy:

1. **Install flyctl:**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Launch app:**
   ```bash
   fly launch
   ```
   - Follow prompts
   - It will detect your Dockerfile
   - Set region
   - Create app

4. **Set environment variables:**
   ```bash
   fly secrets set MONGODB_URI="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder?appName=Cluster0"
   fly secrets set DB_NAME="pcbuilder"
   fly secrets set NODE_ENV="production"
   fly secrets set AMAZON_ACCESS_KEY_ID="AKPAZQZEQT1756001416"
   fly secrets set AMAZON_SECRET_ACCESS_KEY="kLC/dPqat9+TZnWWqJFlfe7mUouotXkYNB4Evh7T"
   fly secrets set AMAZON_ASSOCIATE_TAG="qhezpc-20"
   fly secrets set AMAZON_REGION="us-east-1"
   fly secrets set AMAZON_HOST="webservices.amazon.com"
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

**Your app will be at:** `https://your-app-name.fly.dev`

---

## What's Causing the Timeout?

**The issue:** Puppeteer needs many system dependencies (Chromium, etc.)

**On Render's free tier:**
- Limited build time
- Installing all Puppeteer deps takes too long
- Build times out

**Solutions:**
1. Use Docker (pre-configured, should work)
2. Skip Puppeteer (faster, but no scraping)
3. Upgrade to paid tier (longer build time)
4. Use different platform (Fly.io)

---

## Current Status

✅ **render.yaml updated** to use Docker
✅ **Dockerfile ready** with all dependencies
✅ **Code pushed to GitHub**

**Next step:**
- Delete old Render service
- Create new one (will auto-use Docker)
- Should deploy successfully!

---

## Need Me to Help?

Tell me which option you want:
1. **Try Render with Docker again** (delete & recreate)
2. **Skip Puppeteer** (make it optional)
3. **Deploy to Fly.io instead** (I'll create the config)
4. **Try something else**

Let me know and I'll guide you through it!
