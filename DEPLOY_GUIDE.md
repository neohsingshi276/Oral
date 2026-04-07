# 🦷 DentalQuest — Deployment Guide

## Overview
- **Backend** → Railway (1 service)
- **Student Frontend** → Vercel (dentalquest-student)
- **Admin Frontend** → Vercel (dentalquest-admin)

---

## STEP 1: Deploy Backend to Railway

### Push backend to GitHub
Create a new GitHub repo called `dentalquest-backend` and push only the `backend/` folder contents (not the folder itself).

### Railway Setup
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your `dentalquest-backend` repo
3. Go to **Variables** tab and add ALL of these:

```
PORT=5000
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=dental_health_app
DB_PORT=3306
JWT_SECRET=any_long_random_string_here
EMAIL_USER=dquest217@gmail.com
EMAIL_PASS=vzum jfeh bzbx pshu
STUDENT_URL=https://dentalquest-student.vercel.app
ADMIN_URL=https://dentalquest-admin.vercel.app
```

4. Settings → Deploy → **Start Command**: leave EMPTY (uses package.json automatically)
5. Deploy!

After deploy, copy your Railway URL e.g. `https://dentalquest-backend-production.up.railway.app`

---

## STEP 2: Deploy Student Frontend to Vercel

### Push frontend to GitHub
Create a new GitHub repo called `dentalquest-student` and push the `frontend/` folder contents.

### Vercel Setup
1. Go to [vercel.com](https://vercel.com) → New Project → Import `dentalquest-student` repo
2. Framework: **Vite**
3. Go to **Environment Variables** and add:

```
VITE_APP_MODE=student
VITE_API_URL=https://your-railway-url.up.railway.app/api
```

4. Deploy!

---

## STEP 3: Deploy Admin Frontend to Vercel

Same frontend code, different Vercel project!

1. Go to [vercel.com](https://vercel.com) → New Project → Import **same** `dentalquest-student` repo
2. OR create a new repo `dentalquest-admin` with the same frontend code
3. Go to **Environment Variables** and add:

```
VITE_APP_MODE=admin
VITE_API_URL=https://your-railway-url.up.railway.app/api
```

4. Deploy!

---

## STEP 4: Update Railway Backend URLs

Go back to Railway → Variables and update:
```
STUDENT_URL=https://dentalquest-student.vercel.app   ← your actual student URL
ADMIN_URL=https://dentalquest-admin.vercel.app        ← your actual admin URL
```

Redeploy backend.

---

## ✅ Checklist

- [ ] Backend deployed on Railway
- [ ] All Railway env variables set (especially EMAIL_USER, EMAIL_PASS, DB_*)
- [ ] Student frontend deployed on Vercel with VITE_APP_MODE=student
- [ ] Admin frontend deployed on Vercel with VITE_APP_MODE=admin
- [ ] STUDENT_URL and ADMIN_URL set correctly in Railway
- [ ] Test: visit student URL → see student homepage
- [ ] Test: visit admin URL → see admin login page
- [ ] Test: visit Railway URL/api/health → see {"status":"ok"}

---

## Common Issues

| Error | Fix |
|-------|-----|
| `Cannot find module 'axios'` | package.json now includes axios ✅ fixed |
| CORS error | Make sure STUDENT_URL and ADMIN_URL in Railway match exactly |
| Page refreshes give 404 | vercel.json handles this ✅ fixed |
| Email not sending | Check EMAIL_USER and EMAIL_PASS in Railway vars |
