# Render Deployment Guide - Step by Step

Complete guide to deploy your PC Builder to Render.

---

## Why Render?

✅ **Free tier available** (with limitations)
✅ **Automatic HTTPS/SSL**
✅ **Auto-deploys from GitHub**
✅ **Simpler than Railway**
✅ **Great for Node.js apps**

**Free Tier Limitations:**
- Service spins down after 15 minutes of inactivity
- 30-second cold start on first request after sleep
- 750 hours/month free (plenty for testing)

---

## Step-by-Step Deployment

### Step 1: Create Render Account

1. Go to: **https://render.com**
2. Click **"Get Started"** or **"Sign Up"**
3. Choose **"Sign in with GitHub"** (easiest)
4. Authorize Render to access your GitHub

---

### Step 2: Create Web Service

1. Once logged in, click **"New +"** (top right)
2. Select **"Web Service"**
3. You'll see a list of your GitHub repositories

---

### Step 3: Connect Repository

1. Find **`ezpcnew`** in the repository list
   - If you don't see it, click **"Configure account"** and grant access
2. Click **"Connect"** next to `ezpcnew`

---

### Step 4: Configure Service

Fill out the configuration form:

**Basic Settings:**
```
Name: ezpc-builder
(or any name you want - this will be in your URL)

Region: Oregon (US West)
(or choose closest to you)

Branch: main
(should auto-select)

Root Directory: (leave blank)

Runtime: Node
(should auto-detect)
```

**Build & Deploy:**
```
Build Command: npm install

Start Command: npm start
```

**Instance Type:**
```
Select: Free
(you can upgrade later)
```

---

### Step 5: Add Environment Variables

Scroll down to **"Environment Variables"** section.

Click **"Add Environment Variable"** for each one:

**Add these 8 variables:**

1. **MONGODB_URI**
   ```
   mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder?appName=Cluster0
   ```

2. **DB_NAME**
   ```
   pcbuilder
   ```

3. **NODE_ENV**
   ```
   production
   ```

4. **AMAZON_ACCESS_KEY_ID**
   ```
   AKPAZQZEQT1756001416
   ```

5. **AMAZON_SECRET_ACCESS_KEY**
   ```
   kLC/dPqat9+TZnWWqJFlfe7mUouotXkYNB4Evh7T
   ```

6. **AMAZON_ASSOCIATE_TAG**
   ```
   qhezpc-20
   ```

7. **AMAZON_REGION**
   ```
   us-east-1
   ```

8. **AMAZON_HOST**
   ```
   webservices.amazon.com
   ```

**⚠️ IMPORTANT:** Make sure to copy these exactly, no extra spaces!

---

### Step 6: Create Web Service

1. Scroll to the bottom
2. Click **"Create Web Service"**
3. Render will start deploying immediately!

---

## What Happens Next

### Build Process (3-5 minutes)

You'll see logs like:
```
==> Cloning from https://github.com/qhbud/ezpcnew...
==> Checking out commit 96fa21a
==> Running build command: npm install
==> Installing dependencies...
==> Build successful
```

### Deploy Process (30 seconds)

```
==> Starting service with: npm start
Connected to MongoDB successfully
Server running on http://...
==> Your service is live!
```

### Your Live URL

Once deployed, your app will be available at:
```
https://ezpc-builder.onrender.com
```
(or whatever name you chose)

---

## After Deployment

### 1. Test Your App

Visit your URL: `https://ezpc-builder.onrender.com`

You should see your PC Builder interface!

### 2. Check MongoDB Connection

Look for this in the logs:
```
✅ Connected to MongoDB database
```

### 3. Test Functionality

- Browse components (CPUs, GPUs, etc.)
- Build a PC
- Check that prices load

---

## Important Notes

### Free Tier Behavior

**Service Spins Down:**
- After 15 minutes of no traffic, Render puts your app to sleep
- First request after sleep takes ~30 seconds to wake up
- Subsequent requests are fast

**To Keep It Awake:**
- Upgrade to paid ($7/month)
- Use a service like UptimeRobot to ping it every 10 minutes

### Auto-Deploy from GitHub

**Every time you push to GitHub:**
1. Render detects the new commit
2. Automatically builds and deploys
3. Takes 3-5 minutes
4. Your changes go live

**To disable auto-deploy:**
1. Go to service settings
2. Toggle "Auto-Deploy" off

### Viewing Logs

**To see live logs:**
1. Go to your Render dashboard
2. Click on your service
3. Click "Logs" tab
4. See real-time output

---

## Troubleshooting

### Build Failed

**Check:**
1. Build command is `npm install`
2. Start command is `npm start`
3. Branch is set to `main`
4. `package.json` exists in repository

**Common Issues:**
- Wrong branch selected
- Missing package.json
- Syntax error in package.json

### App Won't Start

**Check:**
1. All 8 environment variables are set
2. MongoDB Atlas connection string is correct
3. No typos in environment variable names

**View Logs:**
- Click "Logs" tab to see error messages

### "Cannot connect to database"

**Fix:**
1. Verify MONGODB_URI is correct
2. Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
3. Verify database user credentials are correct

### Puppeteer Issues

If you see Puppeteer errors:

**Option 1: Render will use the Dockerfile**
- Should work automatically with the Dockerfile we created

**Option 2: Add Puppeteer config**
If needed, we can add environment variable:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

---

## Render vs Railway Comparison

| Feature | Render (Free) | Railway |
|---------|--------------|---------|
| Price | Free | $5 trial, then ~$5-10/mo |
| Build Time | 3-5 min | 2-3 min |
| Sleep Policy | After 15 min | No sleep on paid |
| SSL | Free | Free |
| Auto-Deploy | Yes | Yes |
| Custom Domain | Yes (paid) | Yes |

---

## Managing Your Deployment

### Update Environment Variables

1. Click on your service
2. Go to "Environment" tab
3. Edit or add variables
4. Click "Save Changes"
5. Service will automatically redeploy

### View Deployment History

1. Click "Events" tab
2. See all deployments
3. Click any deployment to see logs

### Manual Deploy

1. Click "Manual Deploy"
2. Select "Deploy latest commit"
3. Choose branch
4. Click "Deploy"

---

## Upgrading to Paid (Optional)

**Benefits of Starter Plan ($7/month):**
- ✅ No sleep - always on
- ✅ Faster deploys
- ✅ More resources
- ✅ Custom domain support

**To upgrade:**
1. Click on your service
2. Scroll to "Instance Type"
3. Select "Starter"
4. Add payment method

---

## Next Steps After Deployment

1. ✅ **Test your app** at the Render URL
2. ✅ **Share the URL** with others
3. ✅ **Set up custom domain** (optional, paid)
4. ✅ **Monitor usage** in Render dashboard
5. ✅ **Continue developing** - push to GitHub to deploy

---

## Quick Reference

**Your Render Dashboard:**
```
https://dashboard.render.com
```

**Your App URL (example):**
```
https://ezpc-builder.onrender.com
```

**Environment Variables:**
```
MONGODB_URI = [Atlas connection string]
DB_NAME = pcbuilder
NODE_ENV = production
[+ 5 Amazon API variables]
```

---

## Need Help?

**Render Documentation:**
- https://render.com/docs

**Common Issues:**
- Check "Logs" tab first
- Verify environment variables
- Check MongoDB Atlas connection
- Review build logs for errors

---

## Summary

✅ **Step 1:** Create Render account (sign in with GitHub)
✅ **Step 2:** Create Web Service
✅ **Step 3:** Connect `ezpcnew` repository
✅ **Step 4:** Configure (Name, Build/Start commands)
✅ **Step 5:** Add 8 environment variables
✅ **Step 6:** Click "Create Web Service"
✅ **Step 7:** Wait 3-5 minutes for build
✅ **Step 8:** Access your live app!

**Your PC Builder will be live on the web!** 🎉

---

Good luck with your deployment! Let me know if you run into any issues.
