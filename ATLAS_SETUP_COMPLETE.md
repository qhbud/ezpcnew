# MongoDB Atlas Setup - COMPLETE! ✅

Your MongoDB Atlas cloud database is now set up and tested successfully!

---

## Your Atlas Configuration

**Connection String:**
```
mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder?appName=Cluster0
```

**Database Name:** `pcbuilder`

**Username:** `easypcworlddev_db_user`

**Password:** `2gD9bDhq9s09A4pd`

**Status:** ✅ Tested and working!

---

## Environment Files Created

### `.env` (Local Development - Current)
- Uses: `mongodb://localhost:27017/pcbuilder`
- Your local MongoDB database
- For testing and development on your PC

### `.env.atlas` (Cloud Production - New)
- Uses: MongoDB Atlas cloud connection
- For production deployment
- Your cloud database

---

## How to Use Both Databases

### Option 1: Keep Separate (Recommended)

**For local development:**
```bash
# Keep using .env (local database)
npm start
```

**To test with Atlas locally:**
```bash
# Temporarily rename files
mv .env .env.local.backup
mv .env.atlas .env
npm start
# Switch back when done
mv .env .env.atlas
mv .env.local.backup .env
```

### Option 2: Switch Environment Variable

You can also set which database to use via command line:
```bash
# Use Atlas
MONGODB_URI=mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder npm start
```

---

## Next Steps

### 1. Migrate Data to Atlas (Optional)

Your Atlas database is currently empty. If you want to copy data from your local database:

**Option A: Export/Import**
```bash
# Export from local
mongoexport --db=pcbuilder --collection=gpus --out=gpus.json
mongoexport --db=pcbuilder --collection=cpus --out=cpus.json
mongoexport --db=pcbuilder --collection=motherboards --out=motherboards.json
mongoexport --db=pcbuilder --collection=ram --out=ram.json
mongoexport --db=pcbuilder --collection=storage --out=storage.json
mongoexport --db=pcbuilder --collection=psus --out=psus.json
mongoexport --db=pcbuilder --collection=coolers --out=coolers.json
mongoexport --db=pcbuilder --collection=cases --out=cases.json

# Import to Atlas
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=gpus --file=gpus.json
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=cpus --file=cpus.json
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=motherboards --file=motherboards.json
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=ram --file=ram.json
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=storage --file=storage.json
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=psus --file=psus.json
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=coolers --file=coolers.json
mongoimport --uri="mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder" --collection=cases --file=cases.json
```

**Option B: Re-run import scripts** (if you want fresh data)
- Temporarily use Atlas connection in .env
- Run your import scripts again

### 2. Deploy to Railway/Render

Now that you have:
- ✅ GitHub repository
- ✅ MongoDB Atlas connection

You're ready to deploy!

**For Railway:**
1. Go to https://railway.app
2. Login with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Select `ezpcnew` repository
5. Add environment variables from `.env.atlas`
6. Done! Your app will be live

**For Render:**
1. Go to https://render.com
2. Login with GitHub
3. "New +" → "Web Service"
4. Select `ezpcnew` repository
5. Add environment variables from `.env.atlas`
6. Done! Your app will be live

---

## Environment Variables for Deployment

When deploying to Railway/Render, add these variables:

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

---

## Summary

✅ MongoDB Atlas cluster created
✅ Database user configured
✅ Network access enabled
✅ Connection tested successfully
✅ Environment files created
✅ Ready for deployment!

**Your PC Builder app can now be deployed to the web!**

Would you like help with:
1. Migrating data to Atlas?
2. Deploying to Railway/Render?
3. Both?
