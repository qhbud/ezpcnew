# PC Builder Deployment Guide

Complete guide to deploy your PC Builder application to the web while maintaining local development with Claude Code.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Set Up Git Version Control](#step-1-set-up-git-version-control)
- [Step 2: Set Up MongoDB Atlas (Cloud Database)](#step-2-set-up-mongodb-atlas-cloud-database)
- [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
- [Step 4: Deploy to Web (Choose Platform)](#step-4-deploy-to-web-choose-platform)
  - [Option A: Railway (Recommended)](#option-a-railway-recommended)
  - [Option B: Render](#option-b-render)
  - [Option C: DigitalOcean](#option-c-digitalocean)
- [Step 5: Development Workflow](#step-5-development-workflow)
- [Troubleshooting](#troubleshooting)

---

## Overview

**What we're setting up:**
- Local development environment (your PC)
- Cloud database (MongoDB Atlas)
- Web hosting (Railway/Render/etc.)
- Git version control (GitHub)

**The workflow:**
```
Edit locally with Claude Code
        ↓
    Commit to Git
        ↓
   Push to GitHub
        ↓
   Auto-deploy to web
```

---

## Prerequisites

- [ ] Node.js installed (you already have this)
- [ ] Git installed ([download here](https://git-scm.com/downloads))
- [ ] GitHub account ([sign up here](https://github.com))
- [ ] MongoDB Atlas account ([sign up here](https://www.mongodb.com/cloud/atlas/register))

---

## Step 1: Set Up Git Version Control

### 1.1 Initialize Git Repository

Open terminal in your project folder:

```bash
cd C:\Users\Quinn\Desktop\pcbuilder2
git init
```

### 1.2 Create .gitignore file

Create a `.gitignore` file to exclude sensitive files:

```bash
echo node_modules/ > .gitignore
echo .env >> .gitignore
echo npm-debug.log >> .gitignore
echo .DS_Store >> .gitignore
echo debug_screenshots/ >> .gitignore
```

### 1.3 Make Initial Commit

```bash
git add .
git commit -m "Initial commit - PC Builder application"
```

### 1.4 Create GitHub Repository

1. Go to https://github.com/new
2. Name: `pcbuilder2` (or your preferred name)
3. Keep it **Public** or **Private** (your choice)
4. **DO NOT** initialize with README (we already have code)
5. Click "Create repository"

### 1.5 Connect Local to GitHub

GitHub will show you commands. Run these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pcbuilder2.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Set Up MongoDB Atlas (Cloud Database)

### 2.1 Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free tier available)
3. Create a new cluster (select **FREE** tier - M0)
4. Choose a cloud provider (AWS, Google Cloud, or Azure)
5. Select a region close to you
6. Click "Create Cluster" (takes 3-5 minutes)

### 2.2 Configure Database Access

1. Click "Database Access" in left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `pcbuilder_admin` (or your choice)
5. Password: Click "Autogenerate Secure Password" and **SAVE IT**
6. User Privileges: Select "Atlas admin"
7. Click "Add User"

### 2.3 Configure Network Access

1. Click "Network Access" in left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for now)
   - This adds `0.0.0.0/0` to allowlist
4. Click "Confirm"

### 2.4 Get Connection String

1. Click "Database" in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: **Node.js**, Version: **6.7 or later**
5. Copy the connection string (looks like):
   ```
   mongodb+srv://pcbuilder_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password
7. Add database name before the `?`:
   ```
   mongodb+srv://pcbuilder_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/pcbuilder?retryWrites=true&w=majority
   ```

**SAVE THIS CONNECTION STRING** - you'll need it for deployment.

---

## Step 3: Configure Environment Variables

### 3.1 Create .env.example

Create a template file that can be committed to Git (without secrets):

**Create `.env.example`:**
```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/pcbuilder

# Database Name
DB_NAME=pcbuilder

# Environment
NODE_ENV=development

# Amazon Product Advertising API Configuration
AMAZON_ACCESS_KEY_ID=your_access_key_here
AMAZON_SECRET_ACCESS_KEY=your_secret_key_here
AMAZON_ASSOCIATE_TAG=your_associate_tag_here
AMAZON_REGION=us-east-1
AMAZON_HOST=webservices.amazon.com

# Server Port (optional)
PORT=3000
```

### 3.2 Keep Your Local .env

Your existing `.env` file stays as-is for local development.

### 3.3 Update server.js for PORT

Make sure your server uses `process.env.PORT`:

Check `server.js` around line 116-120 (or wherever the port is defined):
```javascript
const PORT = process.env.PORT || 3000;
```

This allows cloud platforms to assign their own port.

---

## Step 4: Deploy to Web (Choose Platform)

### Option A: Railway (Recommended)

**Why Railway:**
- Easiest setup
- $5 free trial credit
- Auto-deploys from GitHub
- Great Node.js support

**Steps:**

1. **Sign up for Railway**
   - Go to https://railway.app
   - Click "Login with GitHub"
   - Authorize Railway

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `pcbuilder2` repository
   - Railway will detect it's a Node.js app

3. **Add Environment Variables**
   - Click on your deployed service
   - Go to "Variables" tab
   - Add these variables:
     ```
     MONGODB_URI = [paste your MongoDB Atlas connection string]
     DB_NAME = pcbuilder
     NODE_ENV = production
     AMAZON_ACCESS_KEY_ID = [your key]
     AMAZON_SECRET_ACCESS_KEY = [your secret]
     AMAZON_ASSOCIATE_TAG = [your tag]
     AMAZON_REGION = us-east-1
     AMAZON_HOST = webservices.amazon.com
     ```

4. **Deploy**
   - Railway auto-deploys on every Git push
   - Click "Deployments" to see status
   - Once deployed, click "Settings" → "Generate Domain"
   - Your app will be live at: `your-app-name.up.railway.app`

5. **Initial Data Migration (if needed)**
   - Your cloud app starts with empty MongoDB Atlas database
   - You'll need to re-run your data import scripts pointing to cloud DB
   - Or export from local and import to Atlas

---

### Option B: Render

**Why Render:**
- Free tier available
- Simple setup
- Good documentation

**Steps:**

1. **Sign up for Render**
   - Go to https://render.com
   - Click "Get Started" → "Sign in with GitHub"

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `pcbuilder2`

3. **Configure Service**
   - Name: `pcbuilder2`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free** (or paid for better performance)

4. **Add Environment Variables**
   - Scroll to "Environment Variables"
   - Add all the same variables as Railway (above)

5. **Create Web Service**
   - Click "Create Web Service"
   - Render will build and deploy
   - Your app will be at: `your-app-name.onrender.com`

**Note:** Free tier spins down after inactivity (30-second cold start on first request).

---

### Option C: DigitalOcean App Platform

**Why DigitalOcean:**
- More control
- Good performance
- $5/month (no free tier)

**Steps:**

1. **Sign up for DigitalOcean**
   - Go to https://www.digitalocean.com
   - Create account (may get $200 free credit)

2. **Create App**
   - Click "Create" → "Apps"
   - Choose GitHub as source
   - Select your repository

3. **Configure App**
   - Name: `pcbuilder2`
   - Environment Variables: Add all variables
   - Plan: Basic ($5/month)

4. **Deploy**
   - Click "Create Resources"
   - App will be at: `your-app-name.ondigitalocean.app`

---

## Step 5: Development Workflow

### Daily Workflow

1. **Work Locally**
   ```bash
   # Make sure local server is running
   npm start

   # Edit files with Claude Code
   # Test at http://localhost:3000
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add new feature: XYZ"
   ```

3. **Push to Deploy**
   ```bash
   git push origin main
   ```

   Your cloud platform will automatically:
   - Detect the push
   - Build the app
   - Deploy to production
   - Show you deployment logs

4. **Verify Deployment**
   - Check your live URL
   - Verify changes are live

### Managing Two Databases

**Local Database (Development):**
- URL: `mongodb://localhost:27017/pcbuilder`
- Used when: `.env` has local connection
- Data: Test data, can be reset/modified freely

**Cloud Database (Production):**
- URL: Your MongoDB Atlas connection string
- Used when: Deployed app uses cloud env variables
- Data: Real data, be careful with changes

### Branch Strategy (Optional but Recommended)

```bash
# Create a development branch
git checkout -b development

# Make changes and test
# ... edit files ...

# Commit to development
git add .
git commit -m "Testing new feature"
git push origin development

# When ready for production
git checkout main
git merge development
git push origin main  # This triggers deployment
```

---

## Troubleshooting

### App won't start on cloud platform

**Check:**
1. Logs in your platform's dashboard
2. Environment variables are set correctly
3. MongoDB Atlas connection string is correct
4. IP allowlist includes `0.0.0.0/0`

### Database connection fails

**Common issues:**
1. Wrong password in connection string
2. Database user not created in Atlas
3. IP not whitelisted (add `0.0.0.0/0`)
4. Wrong database name in connection string

### Changes don't appear after git push

**Solutions:**
1. Check deployment logs for errors
2. Verify git push succeeded: `git log --oneline`
3. Force redeploy from platform dashboard
4. Clear browser cache (Ctrl+F5)

### Port errors

**Fix:**
Make sure `server.js` uses:
```javascript
const PORT = process.env.PORT || 3000;
```

Not hardcoded to `3000`.

---

## Migrating Data to Cloud

### Option 1: Export/Import

**Export from local:**
```bash
mongoexport --db=pcbuilder --collection=gpus --out=gpus.json
mongoexport --db=pcbuilder --collection=cpus --out=cpus.json
mongoexport --db=pcbuilder --collection=motherboards --out=motherboards.json
# ... repeat for all collections
```

**Import to Atlas:**
```bash
mongoimport --uri="your_atlas_connection_string" --collection=gpus --file=gpus.json
mongoimport --uri="your_atlas_connection_string" --collection=cpus --file=cpus.json
# ... repeat for all collections
```

### Option 2: Re-run Import Scripts

Point your import scripts to cloud database temporarily:
1. Update `.env` with Atlas connection string
2. Run import scripts: `npm run import-all-gpus`, etc.
3. Restore `.env` to local connection

---

## Cost Breakdown

### Free Tier Setup
- MongoDB Atlas: **Free** (512MB)
- Railway: **$5 trial credit** (then ~$5-10/month)
- Render: **Free** (with limitations)
- GitHub: **Free**

### Recommended Paid Setup ($10/month)
- MongoDB Atlas: **Free** (512MB sufficient)
- Railway: **$5-10/month** (better than Render free tier)
- GitHub: **Free**

---

## Next Steps

1. Choose your deployment platform (Railway recommended)
2. Set up MongoDB Atlas
3. Initialize Git and push to GitHub
4. Deploy to your chosen platform
5. Migrate data to cloud database
6. Start using the workflow!

---

## Questions?

If you run into issues:
1. Check the platform's documentation
2. Review deployment logs in platform dashboard
3. Verify environment variables match exactly
4. Test MongoDB connection string locally first

Happy deploying!
