# 🏌️ Golf Courses - Quick Add Guide

## Courses Ready to Add

I've created API endpoints for the following courses based on your screenshots:

### 1. ✅ City Park North (ADDED)
- **Status**: ✅ Already in database
- **Tee Boxes**: White, Gold, Blue, Black
- **Par**: 68

### 2. 🆕 Audubon Golf
- **API Endpoint**: http://localhost:3000/api/seed-audubon
- **Tee Boxes**: White (56.6/92), Gold (59.7/105), Blue (58.2/101), Tees (0.0/0)
- **Par**: 62

### 3. 🆕 Bartholomew
- **API Endpoint**: http://localhost:3000/api/seed-bartholomew
- **Tee Boxes**: White (70.5/119), Red (65.3/108), Gold (67.2/112), Blue (72.8/128)
- **Par**: 72

---

## 🚀 How to Add Courses

### Method 1: Click the Links (Easiest)
Just click on the API endpoint URLs above in your browser, and the course will be added automatically!

### Method 2: Use Browser Console
1. Open http://localhost:3000
2. Open browser console (F12)
3. Run this code:

```javascript
// Add Audubon Golf
fetch('/api/seed-audubon', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));

// Add Bartholomew
fetch('/api/seed-bartholomew', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));
```

### Method 3: Add All At Once
```javascript
// Add all courses in sequence
async function addAllCourses() {
  const courses = ['audubon', 'bartholomew'];
  
  for (const course of courses) {
    const res = await fetch(`/api/seed-${course}`, { method: 'POST' });
    const data = await res.json();
    console.log(`${course}:`, data);
  }
}

addAllCourses();
```

---

## 📊 Verify in Prisma Studio

After adding courses, view them at:
**http://localhost:51212**

Click on "courses" table to see all added courses.

---

## 🎯 Next Steps

1. **Add Audubon Golf**: Visit http://localhost:3000/api/seed-audubon
2. **Add Bartholomew**: Visit http://localhost:3000/api/seed-bartholomew
3. **Verify**: Check Prisma Studio at http://localhost:51212

---

## 📸 Have More Courses?

Share screenshots of other courses and I'll create API endpoints for them too!

Each course needs:
- Course name
- Tee box names with ratings/slopes
- Hole-by-hole par values
