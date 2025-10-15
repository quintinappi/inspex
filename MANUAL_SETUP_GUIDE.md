# Manual Firebase Setup Guide

Since the seed scripts require authentication, you can set up the required data manually through the Firebase Console or run these scripts after logging into the app.

## Option 1: Firebase Console (Recommended for First-Time Setup)

### Add Inspection Points Collection

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **inspex001**
3. Navigate to **Firestore Database**
4. Click **Start Collection**
5. Collection ID: `inspection_points`
6. Add 13 documents with the following data:

**Document 1:**
```
name: "Drawing Number Confirmation"
description: "Confirm Drawing Number used by Fabricator"
order_index: 1
```

**Document 2:**
```
name: "Overall Dimensions"
description: "Confirm Over-All Dimensions"
order_index: 2
```

**Document 3:**
```
name: "Member Sizes"
description: "Confirm Member Sizes as per Drawing"
order_index: 3
```

**Document 4:**
```
name: "Welds"
description: "Confirm Welds are of acceptable quality (IE No Undercuts, Porosity, Lack of Fusion etc.)"
order_index: 4
```

**Document 5:**
```
name: "Paint Finish"
description: "Paint/Powder Coat Finish Acceptable"
order_index: 5
```

**Document 6:**
```
name: "Hardware Assembly"
description: "All Hardware Assembled and in Working Order"
order_index: 6
```

**Document 7:**
```
name: "Pressure Testing"
description: "Test Door to Specified Pressure and Hold for 5 Minutes"
order_index: 7
```

**Document 8:**
```
name: "Leakage Check"
description: "No Leakage During or After Pressure Test"
order_index: 8
```

**Document 9:**
```
name: "Structural Integrity"
description: "No Structural Deformation Under Pressure"
order_index: 9
```

**Document 10:**
```
name: "Seal Inspection"
description: "Door Seal in Good Condition and Properly Fitted"
order_index: 10
```

**Document 11:**
```
name: "Hinge Mechanism"
description: "Hinge Mechanism Functions Smoothly"
order_index: 11
```

**Document 12:**
```
name: "Locking Mechanism"
description: "Locking Mechanism Engages and Disengages Properly"
order_index: 12
```

**Document 13:**
```
name: "Safety Features"
description: "All Safety Features Present and Functional"
order_index: 13
```

### Update Existing Doors with Status Fields

For each document in the **doors** collection, add these fields:

```
inspection_status: "pending"
certification_status: "pending"
```

To do this:
1. Open each door document
2. Click **Add field**
3. Field: `inspection_status`, Value: `pending`
4. Click **Add field**
5. Field: `certification_status`, Value: `pending`
6. Click **Update**

---

## Option 2: Run Scripts From Logged-In Browser Console

Since you need authentication, you can run the seeding code directly from the browser console while logged into the app:

### 1. Seed Inspection Points

1. Log into the INSPEX app (http://localhost:3000)
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run this code:

```javascript
const { collection, addDoc } = await import('firebase/firestore');
const { db } = await import('./firebase');

const inspectionPoints = [
  { name: 'Drawing Number Confirmation', description: 'Confirm Drawing Number used by Fabricator', order_index: 1 },
  { name: 'Overall Dimensions', description: 'Confirm Over-All Dimensions', order_index: 2 },
  { name: 'Member Sizes', description: 'Confirm Member Sizes as per Drawing', order_index: 3 },
  { name: 'Welds', description: 'Confirm Welds are of acceptable quality (IE No Undercuts, Porosity, Lack of Fusion etc.)', order_index: 4 },
  { name: 'Paint Finish', description: 'Paint/Powder Coat Finish Acceptable', order_index: 5 },
  { name: 'Hardware Assembly', description: 'All Hardware Assembled and in Working Order', order_index: 6 },
  { name: 'Pressure Testing', description: 'Test Door to Specified Pressure and Hold for 5 Minutes', order_index: 7 },
  { name: 'Leakage Check', description: 'No Leakage During or After Pressure Test', order_index: 8 },
  { name: 'Structural Integrity', description: 'No Structural Deformation Under Pressure', order_index: 9 },
  { name: 'Seal Inspection', description: 'Door Seal in Good Condition and Properly Fitted', order_index: 10 },
  { name: 'Hinge Mechanism', description: 'Hinge Mechanism Functions Smoothly', order_index: 11 },
  { name: 'Locking Mechanism', description: 'Locking Mechanism Engages and Disengages Properly', order_index: 12 },
  { name: 'Safety Features', description: 'All Safety Features Present and Functional', order_index: 13 }
];

for (const point of inspectionPoints) {
  await addDoc(collection(db, 'inspection_points'), point);
  console.log('Added:', point.name);
}
console.log('Done! Seeded', inspectionPoints.length, 'inspection points');
```

### 2. Update Door Statuses

While still logged in, run this in the console:

```javascript
const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
const { db } = await import('./firebase');

const doorsSnapshot = await getDocs(collection(db, 'doors'));
let count = 0;

for (const doorDoc of doorsSnapshot.docs) {
  await updateDoc(doc(db, 'doors', doorDoc.id), {
    inspection_status: 'pending',
    certification_status: 'pending'
  });
  count++;
  console.log('Updated door:', doorDoc.id);
}

console.log('Done! Updated', count, 'doors');
```

---

## Option 3: Quick CLI Script with Auth

If you have a test user account, you can modify the scripts to login first:

Add this to the top of `seed-inspection-points.js`:

```javascript
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const auth = getAuth(app);

// Login first
await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'Admin@2025');
console.log('✅ Authenticated as admin\n');
```

Then run:
```bash
node seed-inspection-points.js
node update-door-statuses.js
```

---

## Verification

After setting up the data, verify in Firebase Console:

1. **inspection_points** collection should have 13 documents
2. Each **doors** document should have:
   - `inspection_status: "pending"`
   - `certification_status: "pending"`

Then test the app:
- Go to **Inspections** page - should show doors with "pending" status
- Click **Start Inspection** - should create inspection and navigate to detail page
- Go to **Certifications** page - should be empty (no completed inspections yet)
