# MongoDB Atlas Setup Guide

Step-by-step guide to set up your free cloud MongoDB database.

---

## Step 1: Create MongoDB Atlas Account

1. Go to: **https://www.mongodb.com/cloud/atlas/register**

2. Sign up with one of these options:
   - Google account (fastest)
   - GitHub account
   - Email address

3. Fill out the welcome form (optional fields, click "Finish" at the bottom)

---

## Step 2: Create a Free Cluster

1. **Choose deployment option:**
   - Click **"Create"** on the free M0 cluster card
   - Or click **"Build a Database"** → **"M0 FREE"**

2. **Configure your cluster:**

   **Cloud Provider & Region:**
   - Provider: **AWS** (recommended) or Google Cloud/Azure
   - Region: Choose closest to you (e.g., **us-east-1** for East Coast USA)
   - ⚠️ Make sure it says **"FREE TIER AVAILABLE"**

   **Cluster Name:**
   - Name: `pcbuilder-cluster` (or keep default `Cluster0`)

3. Click **"Create Cluster"** (takes 3-5 minutes to provision)

---

## Step 3: Set Up Database Access (Create User)

While the cluster is being created:

1. Look for **"Security Quickstart"** or click **"Database Access"** in the left sidebar

2. Click **"Add New Database User"** (or it may appear automatically)

3. **Authentication Method:** Password (default)

4. **Username:** `pcbuilder_admin` (or your choice)

5. **Password:**
   - Click **"Autogenerate Secure Password"**
   - **⚠️ COPY AND SAVE THIS PASSWORD SOMEWHERE SAFE!**
   - Or create your own strong password

6. **Database User Privileges:**
   - Select **"Read and write to any database"**
   - (Or select "Atlas admin" for full access)

7. Click **"Add User"**

---

## Step 4: Set Up Network Access (IP Whitelist)

1. Click **"Network Access"** in left sidebar (or it may appear in Security Quickstart)

2. Click **"Add IP Address"**

3. **For development/testing:**
   - Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` to the IP whitelist
   - Click **"Confirm"**

   **For production (optional):**
   - You can add specific IPs later
   - Railway/Render will need `0.0.0.0/0` or their specific IPs

---

## Step 5: Get Your Connection String

1. Click **"Database"** in the left sidebar

2. Find your cluster and click **"Connect"** button

3. Choose **"Connect your application"**

4. **Driver:** Node.js
   **Version:** 6.7 or later (or latest)

5. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://pcbuilder_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **⚠️ IMPORTANT: Modify the connection string:**

   **Replace `<password>`** with your actual password (the one you saved in Step 3)

   **Add database name** before the `?`:
   ```
   mongodb+srv://pcbuilder_admin:YOUR_ACTUAL_PASSWORD@cluster0.xxxxx.mongodb.net/pcbuilder?retryWrites=true&w=majority
   ```

7. **Save this complete connection string** - you'll need it next!

---

## Step 6: Update Your .env File

You now have your MongoDB Atlas connection string. Let's configure it for local testing.

**Your connection string should look like:**
```
mongodb+srv://pcbuilder_admin:MyP@ssw0rd123@cluster0.abc123.mongodb.net/pcbuilder?retryWrites=true&w=majority
```

**Keep this connection string handy** - tell me when you have it, and I'll help you:
1. Test the connection locally
2. Configure it for your deployment platform

---

## Quick Checklist

- [ ] Created MongoDB Atlas account
- [ ] Created free M0 cluster
- [ ] Created database user with password
- [ ] Added `0.0.0.0/0` to IP whitelist
- [ ] Got connection string
- [ ] Replaced `<password>` with actual password
- [ ] Added `/pcbuilder` database name before the `?`

---

## Troubleshooting

### "Could not connect to server"
- Check that IP whitelist includes `0.0.0.0/0`
- Verify password is correct (no `<` or `>` symbols)
- Wait 2-3 minutes after creating cluster

### "Authentication failed"
- Double-check username and password
- Make sure password doesn't contain special characters that need URL encoding
- Try recreating the database user

### Special Characters in Password
If your password has special characters like `@`, `#`, `$`, etc., you need to URL encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- etc.

Or regenerate a password without special characters.

---

## Next Steps

Once you have your connection string, I'll help you:
1. ✅ Test it locally
2. ✅ Migrate your data to Atlas
3. ✅ Configure deployment platform

**Just let me know when you have your connection string ready!**
