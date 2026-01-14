# 📝 Add City Park North Course - Manual Entry Guide

Since the automated scripts are having database connection issues, here's how to add City Park North manually using Prisma Studio.

## 🌐 Open Prisma Studio

Prisma Studio is already running at: **http://localhost:5212**

---

## Step 1: Add the Course

1. Open Prisma Studio: http://localhost:5212
2. Click on **"Course"** in the left sidebar
3. Click **"Add record"** button
4. Fill in:
   - **name**: `City Park North`
5. Click **"Save 1 change"**
6. **Copy the course ID** (you'll need it for the next steps)

---

## Step 2: Add Tee Boxes

Click on **"TeeBox"** in the left sidebar, then add these 4 tee boxes:

### White Tees
- Click **"Add record"**
- **courseId**: [paste the course ID from step 1]
- **name**: `White`
- **rating**: `63.8`
- **slope**: `100`
- **par**: `68`
- Click **"Save 1 change"**

### Gold Tees
- Click **"Add record"**
- **courseId**: [paste the course ID]
- **name**: `Gold`
- **rating**: `61.3`
- **slope**: `92`
- **par**: `68`
- Click **"Save 1 change"**

### Blue Tees
- Click **"Add record"**
- **courseId**: [paste the course ID]
- **name**: `Blue`
- **rating**: `65.9`
- **slope**: `109`
- **par**: `68`
- Click **"Save 1 change"**

### Black Tees
- Click **"Add record"**
- **courseId**: [paste the course ID]
- **name**: `Black`
- **rating**: `67.1`
- **slope**: `111`
- **par**: `68`
- Click **"Save 1 change"**

---

## Step 3: Add Holes

Click on **"Hole"** in the left sidebar, then add all 18 holes:

### Front 9
| Hole | Par |
|------|-----|
| 1    | 4   |
| 2    | 3   |
| 3    | 5   |
| 4    | 4   |
| 5    | 4   |
| 6    | 4   |
| 7    | 4   |
| 8    | 4   |
| 9    | 4   |

### Back 9
| Hole | Par |
|------|-----|
| 10   | 4   |
| 11   | 3   |
| 12   | 3   |
| 13   | 4   |
| 14   | 4   |
| 15   | 3   |
| 16   | 3   |
| 17   | 4   |
| 18   | 4   |

For each hole:
1. Click **"Add record"**
2. **courseId**: [paste the course ID]
3. **holeNumber**: [1-18]
4. **par**: [see table above]
5. Click **"Save 1 change"**

**Tip**: You can add multiple holes before saving by clicking "Add record" multiple times, then "Save X changes" at the end.

---

## ✅ Verification

After adding all data, you should have:
- **1 Course**: City Park North
- **4 Tee Boxes**: White, Gold, Blue, Black
- **18 Holes**: Total Par 68 (Front 9: Par 36, Back 9: Par 32)

---

## 🚀 Alternative: Use the API Endpoint

If you prefer, you can also visit this URL in your browser:

**http://localhost:3000/api/seed-city-park**

Just open that URL and it will automatically add City Park North to your database!

---

## 📸 Need More Courses?

If you have screenshots of other courses, share them and I'll create similar guides or API endpoints for each one!
