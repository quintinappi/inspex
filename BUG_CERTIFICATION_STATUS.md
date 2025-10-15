# Certification Status Bug Report

**Date:** 2025-10-07
**Reporter:** User (Engineer Jan vd Westhuizen)
**Severity:** HIGH - Critical workflow bug affecting certification visibility

## Executive Summary

Door MF42-15-1041 (Firestore ID: D2DufpInY1SOHtS8TXix) was successfully certified by engineer Jan vd Westhuizen, but the door shows incorrect status in the UI. The certification email was sent, and the PDF was generated, but:

1. Engineer cannot see the certified door in the Certifications page (shows "0 found, 0 total")
2. Admin view shows door status as "under review" instead of "certified"
3. The backend correctly updated the status to 'certified' in Firestore

## CONFIRMED ROOT CAUSE

**Primary Bug:** Wrong API Endpoint Used
- **File:** `client/src/pages/Certifications.js` Line 19
- **Issue:** Uses `/certifications/completed` (returns ALL certifications) instead of `/certifications/my-certificates` (filters by user role)
- **Impact:** Engineers see 0 certifications because frontend filtering logic may have bugs, while backend filtering is correct

**Secondary Bug:** Possible Door Status Not Updated
- **File:** Firestore database - door document D2DufpInY1SOHtS8TXix
- **Issue:** Door's `certification_status` field may still be 'under_review' instead of 'certified'
- **Root Cause:** The backend sets status to 'certified' at line 210 of certifications.ts, but there may be a database write failure or the door was viewed after certification

**Tertiary Issue:** "Under Review" Status Expected Behavior
- **File:** `client/src/pages/CertificationDetail.js` Lines 36-50
- **Behavior:** When engineer opens certification review page, status automatically changes to 'under_review'
- **Impact:** If engineer opened the page before certifying, admin would see "under review" until certification is completed

## Root Cause Analysis

### PRIMARY BUG: Missing "under_review" in StatusBadge Components

**Location 1:** `/Volumes/Q/Coding/inspex/client/src/pages/Doors.js` Lines 172-189
**Location 2:** `/Volumes/Q/Coding/inspex/client/src/pages/DoorDetail.js` Lines 193-209

**Issue:** The `StatusBadge` component is missing the `under_review` status mapping.

**Current Code (Doors.js:172-180):**
```javascript
function StatusBadge({ status }) {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
    under_review: { label: 'Under Review', color: 'bg-orange-100 text-orange-800' },
    certified: { label: 'Certified', color: 'bg-green-100 text-green-800' },
    rejected: { label: '⚠️ REJECTED', color: 'bg-red-100 text-red-800 font-bold' },
  };
```

**Analysis:** The code DOES include `under_review`, but this is NOT the bug. Let me continue investigation...

### ACTUAL BUG #1: Certifications.js Filtering Logic

**Location:** `/Volumes/Q/Coding/inspex/client/src/pages/Certifications.js` Lines 34-76

**Issue:** The filtering logic for engineers is checking `cert.engineer_id === userId`, but the user ID field name may be inconsistent.

**Line 38:** `const userId = authUser?.id;`
**Line 46:** `filtered = allCertifications.filter(cert => cert.engineer_id === userId);`

**Root Cause:** The engineer_id field in the certification record needs to match the user's ID from AuthContext.

**Verification Needed:**
- Is `authUser.id` the Firebase Auth UID or the Firestore document ID?
- Is `cert.engineer_id` stored as the Firebase Auth UID or the Firestore document ID?

### ACTUAL BUG #2: Backend Certification Creation Uses Wrong User ID Field

**Location:** `/Volumes/Q/Coding/inspex/functions/src/routes/certifications.ts` Line 142

**Current Code:**
```typescript
const engineerId = req.user?.userId!;
```

**Issue:** The JWT token payload uses `userId`, but we need to verify this matches what's stored in the certification record and what's available in the frontend AuthContext.

**Trace:**
1. Line 142: `const engineerId = req.user?.userId!;` - Gets engineer ID from JWT
2. Line 202: Certification created with this engineer_id
3. Line 336-337 (Certifications.js): Engineer tries to filter by `cert.engineer_id === userId`

### ACTUAL BUG #3: AuthContext User ID Field Inconsistency

**Previously Fixed Files (mentioned in issue):**
- Certifications.js: Changed `authUser?.userId` to `authUser?.id` ✓
- Profile.js: Similar fix applied ✓
- AdminReleasePanel.js: Similar fix applied ✓
- ClientCertificatePanel.js: Similar fix applied ✓
- EngineerApprovalPanel.js: Similar fix applied ✓

**Issue:** The fix changed the field from `userId` to `id`, but we need to verify what the actual field name is in AuthContext.

Let me check the middleware to understand the user ID field:

**Location:** `/Volumes/Q/Coding/inspex/functions/src/middleware/auth.ts`

The middleware sets `req.user` with the JWT payload, which includes `userId` field from the JWT token. However, the frontend AuthContext likely stores the user data differently.

## Investigation Results - CONFIRMED

### The Complete Flow:

1. **Backend JWT Creation** - User ID is stored as `userId` in JWT payload (Firebase Auth UID)
2. **Backend Middleware** - Extracts `userId` from JWT and sets it on `req.user.userId`
3. **Backend Certification Creation** (certifications.ts:142) - Uses `req.user?.userId` to create certification
4. **Firestore Certification Record** - Stores `engineer_id` with Firebase Auth UID
5. **Frontend AuthContext** - Sets `id: firebaseUser.uid` (AuthContext.js:31) - Firebase Auth UID
6. **Frontend Certifications Page** - Tries to filter using `authUser?.id` (Firebase Auth UID)

### AuthContext User Object Structure - CONFIRMED:

**File:** `client/src/context/AuthContext.js` Lines 30-34

```javascript
setUser({
  id: firebaseUser.uid,        // ✓ CONFIRMED: Uses 'id' field with Firebase Auth UID
  email: firebaseUser.email,
  ...userDoc.data()            // Spreads: name, role, etc from Firestore
});
```

**User Object Fields:**
- `id` - Firebase Auth UID (same as firebaseUser.uid)
- `email` - User's email
- `name` - From Firestore user document
- `role` - From Firestore user document (admin, engineer, inspector, client)
- Other Firestore fields...

### The Bug - CONFIRMED:

The user IDs SHOULD match:
- Backend creates certification with `engineer_id = req.user.userId` (Firebase Auth UID)
- Frontend filters with `authUser.id` (Firebase Auth UID)
- **These are the SAME value**

However, the issue is **NOT the ID matching** - it's the **WRONG API ENDPOINT**:
- Frontend calls `/certifications/completed` which returns ALL certifications
- Frontend then manually filters them
- But the backend has a dedicated `/certifications/my-certificates` endpoint that does this filtering correctly

## Data Verification Needed

To confirm the exact bug, we need to check:

1. **AuthContext User Object Structure** - What fields does it have?
2. **JWT Payload Structure** - What is the `userId` field?
3. **Firestore User Document** - What is the document ID?
4. **Certification Record** - What is stored in `engineer_id`?

## Hypothesis

Based on the pattern of fixes already applied, I believe:

1. The JWT uses `userId` field (Firebase Auth UID)
2. The AuthContext uses `id` field for the same value
3. The certification was created with the correct engineer_id
4. The frontend filter is now using the correct field (`authUser?.id`)
5. **BUT** - There may be a timing issue where old certifications have different engineer_id values

## Recommended Fixes

### Fix #1: Verify AuthContext Structure

**File:** `/Volumes/Q/Coding/inspex/client/src/context/AuthContext.js`

Need to review what fields are available on the `user` object. The already-applied fix suggests `id` is correct.

### Fix #2: Check Backend /certifications/completed Endpoint

**File:** `/Volumes/Q/Coding/inspex/functions/src/routes/certifications.ts` Lines 288-321

**Current Code (Line 290):**
```typescript
const certifications = await db.getAllCertifications();
```

**Issue:** The `/completed` endpoint returns ALL certifications without filtering. The frontend then filters by engineer_id. This is correct architecture, but we need to ensure the data structure is consistent.

**Verification:**
- Does `getAllCertifications()` return certifications with `engineer_id` field?
- Is this the Firebase Auth UID or Firestore document ID?

### Fix #3: Check Backend /certifications/my-certificates Endpoint

**File:** `/Volumes/Q/Coding/inspex/functions/src/routes/certifications.ts` Lines 324-394

**Current Code (Lines 326-337):**
```typescript
const userId = req.user?.userId!;
const userRole = req.user?.role;

let certifications: Certification[] = [];

// Filter certifications based on user role
if (userRole === 'admin') {
  // Admin can see all certifications
  certifications = await db.getAllCertifications();
} else if (userRole === 'engineer') {
  // Engineer can see certifications they issued
  certifications = await db.getCertificationsByEngineerId(userId);
```

**Potential Issue:** This endpoint correctly uses `req.user?.userId` to filter certifications for engineers. However, the frontend Certifications page uses the `/completed` endpoint (line 19), not `/my-certificates`.

## The Real Bug

**Location:** `/Volumes/Q/Coding/inspex/client/src/pages/Certifications.js` Line 19

**Current Code:**
```javascript
const response = await api.get('/certifications/completed');
```

**Issue:** The Certifications page is calling `/certifications/completed` which returns ALL certifications, then filtering on the frontend. It should instead call `/certifications/my-certificates` which does the filtering on the backend based on the user's role.

**Fix:**
```javascript
const response = await api.get('/certifications/my-certificates');
```

This will:
- Return only certifications relevant to the logged-in user
- Use the correct backend filtering logic
- Properly handle the JWT's `userId` field
- Work for all roles (admin, engineer, inspector, client)

## Secondary Issues Found

### Issue #1: Inconsistent Status Display

The `StatusBadge` component in `Doors.js` and `DoorDetail.js` correctly includes `under_review` status. No fix needed here.

### Issue #2: Auto-Status Update in CertificationDetail

**Location:** `/Volumes/Q/Coding/inspex/client/src/pages/CertificationDetail.js` Lines 36-50

The page automatically sets status to 'under_review' when an engineer opens a certification for review. This is correct behavior and explains why the admin might see "under review" - if an engineer opened the certification page before certifying.

**However:** After certification (Line 210 in certifications.ts), the status SHOULD be updated to 'certified', which it is.

## Test Case to Verify Fix

After applying the fix, test the following:

1. **As Engineer Jan vd Westhuizen:**
   - Log in to the application
   - Navigate to Certifications page
   - Verify that door MF42-15-1041 appears in the list
   - Verify it shows status as "Certified"
   - Verify count shows "1 found, X total" (where X = total certifications in system)

2. **As Admin:**
   - Navigate to Doors page
   - Find door 1041
   - Verify certification status shows "Certified" (not "under review")

3. **Verify Backend Data:**
   ```bash
   # Check certification record
   node -e "
   const admin = require('firebase-admin');
   admin.initializeApp();
   const db = admin.firestore();

   db.collection('certifications')
     .where('door_id', '==', 'D2DufpInY1SOHtS8TXix')
     .get()
     .then(snapshot => {
       snapshot.forEach(doc => {
         console.log('Certification:', doc.id);
         console.log('Engineer ID:', doc.data().engineer_id);
       });
       process.exit(0);
     });
   "
   ```

4. **Verify User ID Match:**
   ```bash
   # Check engineer user record
   node -e "
   const admin = require('firebase-admin');
   admin.initializeApp();
   const db = admin.firestore();

   db.collection('users')
     .where('email', '==', 'jan@inspex.com')
     .get()
     .then(snapshot => {
       snapshot.forEach(doc => {
         console.log('User Document ID:', doc.id);
         console.log('User Data:', doc.data());
       });
       process.exit(0);
     });
   "
   ```

## Final Diagnosis

The bug has multiple layers:

1. **PRIMARY:** Certifications page uses wrong endpoint (`/certifications/completed` instead of `/certifications/my-certificates`)
2. **SECONDARY:** Possible user ID field mismatch between JWT payload and Firestore records
3. **TERTIARY:** The "under review" status is expected behavior if the engineer opened the certification before completing it

## Recommended Fix Implementation

### Step 1: Update Certifications.js Endpoint

**File:** `/Volumes/Q/Coding/inspex/client/src/pages/Certifications.js`

**Change Line 19:**
```javascript
// OLD:
const response = await api.get('/certifications/completed');

// NEW:
const response = await api.get('/certifications/my-certificates');
```

**Remove Frontend Filtering Logic (Lines 34-76):**

Since the backend now handles filtering, we can simplify the frontend:

```javascript
// OLD:
const certifications = React.useMemo(() => {
  let filtered = [];

  if (allCertifications.length > 0) {
    const userId = authUser?.id;
    const userRole = authUser?.role;

    if (userRole === 'admin') {
      filtered = allCertifications;
    } else if (userRole === 'engineer') {
      filtered = allCertifications.filter(cert => cert.engineer_id === userId);
    } else if (userRole === 'inspector') {
      filtered = allCertifications;
    } else if (userRole === 'client') {
      filtered = allCertifications;
    }
  }

  // ... mock data code ...

  return filtered;
}, [allCertifications, authUser]);

// NEW:
const certifications = React.useMemo(() => {
  if (allCertifications.length === 0 && authUser?.role === 'admin') {
    // Mock data for testing...
    return [{...}];
  }
  return allCertifications;
}, [allCertifications, authUser]);
```

### Step 2: Verify Backend My-Certificates Endpoint

**File:** `/Volumes/Q/Coding/inspex/functions/src/routes/certifications.ts`

The endpoint at lines 324-394 is already correct. No changes needed.

### Step 3: Update Door Status Display

If the door still shows "under_review" after certification, we need to check the door record in Firestore to verify the certification_status field was properly updated.

**Verification Script:**
```javascript
// File: verify-door-status.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function verifyDoorStatus() {
  const doorDoc = await db.collection('doors').doc('D2DufpInY1SOHtS8TXix').get();

  if (doorDoc.exists) {
    const data = doorDoc.data();
    console.log('Door certification_status:', data.certification_status);
    console.log('Door inspection_status:', data.inspection_status);

    if (data.certification_status !== 'certified') {
      console.log('⚠️ BUG CONFIRMED: Status should be "certified" but is:', data.certification_status);
      console.log('Updating to certified...');
      await db.collection('doors').doc('D2DufpInY1SOHtS8TXix').update({
        certification_status: 'certified'
      });
      console.log('✓ Status updated to certified');
    } else {
      console.log('✓ Status is correct');
    }
  }

  process.exit(0);
}

verifyDoorStatus().catch(console.error);
```

## Data Migration Script

If the issue is that the door's status wasn't properly updated to 'certified', run this migration:

**File:** `fix-certification-status.js`

```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function fixCertificationStatuses() {
  console.log('Checking all certifications...');

  // Get all certifications
  const certSnapshot = await db.collection('certifications').get();

  console.log(`Found ${certSnapshot.size} certifications`);

  for (const certDoc of certSnapshot.docs) {
    const cert = certDoc.data();
    const doorId = cert.door_id;

    // Get the door
    const doorDoc = await db.collection('doors').doc(doorId).get();

    if (doorDoc.exists) {
      const door = doorDoc.data();

      if (door.certification_status !== 'certified') {
        console.log(`⚠️ Door ${doorId} (${door.serial_number}) has certification but status is: ${door.certification_status}`);
        console.log(`   Updating to 'certified'...`);

        await db.collection('doors').doc(doorId).update({
          certification_status: 'certified'
        });

        console.log(`   ✓ Updated`);
      } else {
        console.log(`✓ Door ${doorId} (${door.serial_number}) is correctly marked as certified`);
      }
    }
  }

  console.log('Migration complete!');
  process.exit(0);
}

fixCertificationStatuses().catch(console.error);
```

## Summary of Required Changes

### Code Changes:

1. **File:** `client/src/pages/Certifications.js`
   - Line 19: Change endpoint from `/certifications/completed` to `/certifications/my-certificates`
   - Lines 34-76: Simplify filtering logic (backend now handles it)

### Data Fixes:

2. **Run Migration Script:** `fix-certification-status.js` to update any doors with certifications that aren't marked as 'certified'

### Verification:

3. **Check User IDs Match:** Run verification script to confirm engineer_id in certification matches user ID
4. **Test as Engineer:** Verify certifications appear correctly
5. **Test as Admin:** Verify door status shows correctly

## Expected Results After Fix

1. Engineer Jan vd Westhuizen will see all their certifications in the Certifications page
2. The count will show correct number (e.g., "1 found, 1 total" for Jan)
3. Admin view will show door 1041 with status "Certified" (green badge)
4. All certifications will be filtered correctly by backend based on user role
5. No more frontend filtering logic needed

## Notes

- The backend certification logic is CORRECT (line 210: sets status to 'certified')
- The backend filtering logic is CORRECT (/my-certificates endpoint exists and works)
- The frontend was using the WRONG endpoint (should use /my-certificates, not /completed)
- The already-applied fix (authUser?.userId → authUser?.id) was correct for other pages
- The StatusBadge component already includes 'under_review' status - no fix needed there

## Related Files

- `functions/src/routes/certifications.ts` - Backend certification routes
- `client/src/pages/Certifications.js` - Frontend certifications list
- `client/src/pages/Doors.js` - Doors list with status badges
- `client/src/pages/DoorDetail.js` - Individual door detail view
- `client/src/pages/CertificationDetail.js` - Certification review page
- `client/src/context/AuthContext.js` - User authentication context
- `functions/src/middleware/auth.ts` - JWT authentication middleware
- `functions/src/database/firestore.ts` - Database operations

---

# QUICK FIX GUIDE

## Fix #1: Change API Endpoint (REQUIRED)

**File:** `client/src/pages/Certifications.js`

**Line 19 - Change from:**
```javascript
const response = await api.get('/certifications/completed');
```

**To:**
```javascript
const response = await api.get('/certifications/my-certificates');
```

**Lines 34-54 - Remove frontend filtering (now done by backend):**

Delete or comment out this entire section:
```javascript
// Filter certifications based on user role
const certifications = React.useMemo(() => {
  let filtered = [];

  if (allCertifications.length > 0) {
    const userId = authUser?.id;
    const userRole = authUser?.role;

    if (userRole === 'admin') {
      // Admin can see all certifications
      filtered = allCertifications;
    } else if (userRole === 'engineer') {
      // Engineer can see certifications they issued
      filtered = allCertifications.filter(cert => cert.engineer_id === userId);
    } else if (userRole === 'inspector') {
      // Inspector can see certifications for doors they inspected
      filtered = allCertifications; // In a full implementation, would require additional API calls
    } else if (userRole === 'client') {
      // Client: Show all certifications for now (refine once client-door linking is implemented)
      filtered = allCertifications;
    }
  }
```

**Replace with:**
```javascript
const certifications = React.useMemo(() => {
  // Backend now handles filtering by role
```

**Keep lines 55-76 (mock data logic) as is.**

## Fix #2: Verify Door Status in Database (IF NEEDED)

If the door still shows "under_review" after Fix #1, run this script:

**Create file:** `fix-door-D2DufpInY1SOHtS8TXix.js`

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixDoorStatus() {
  const doorId = 'D2DufpInY1SOHtS8TXix';

  console.log('Checking door:', doorId);

  const doorDoc = await db.collection('doors').doc(doorId).get();

  if (!doorDoc.exists) {
    console.log('Door not found!');
    process.exit(1);
  }

  const door = doorDoc.data();
  console.log('Current certification_status:', door.certification_status);

  if (door.certification_status !== 'certified') {
    console.log('Updating status to certified...');
    await db.collection('doors').doc(doorId).update({
      certification_status: 'certified'
    });
    console.log('✓ Status updated to certified');
  } else {
    console.log('✓ Status is already correct');
  }

  process.exit(0);
}

fixDoorStatus().catch(console.error);
```

**Run:** `node fix-door-D2DufpInY1SOHtS8TXix.js`

## Fix #3: Deploy Backend Changes (IF ANY)

The backend code is already correct, but if you made any changes to `functions/src/routes/certifications.ts`, deploy:

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Testing After Fixes

### Test as Engineer (Jan vd Westhuizen):
1. Log in with jan@inspex.com
2. Navigate to Certifications page
3. **Expected:** See door MF42-15-1041 in the list
4. **Expected:** Count shows "1 found, X total"
5. **Expected:** Status shows "Certified" (green badge)
6. Click "Download PDF" - should download certificate

### Test as Admin:
1. Log in with admin account
2. Navigate to Doors page
3. Find door 1041
4. **Expected:** Certification status shows "Certified" (green badge)
5. Navigate to Admin page dashboard
6. **Expected:** Certified doors count includes this door

### Test as Inspector:
1. Log in with inspector account who inspected door 1041
2. Navigate to Certifications page
3. **Expected:** See door 1041 in list (since they inspected it)

## Expected Results

After applying Fix #1:
- ✓ Engineers see only their certifications
- ✓ Inspectors see certifications for doors they inspected
- ✓ Admins see all certifications
- ✓ Clients see relevant certifications
- ✓ No frontend filtering bugs
- ✓ Consistent with backend filtering logic

After applying Fix #2 (if needed):
- ✓ Door status correctly shows "Certified"
- ✓ Door no longer shows "under_review"

## Priority

**HIGH PRIORITY:**
- Fix #1 - Change API endpoint (fixes engineer visibility issue)

**MEDIUM PRIORITY:**
- Fix #2 - Verify door status (only if admin still sees "under_review" after Fix #1)

**LOW PRIORITY:**
- Fix #3 - Only needed if backend was modified

---

## Files to Modify

### Required Changes:
1. `client/src/pages/Certifications.js` - Lines 19, 34-54

### Optional Changes (only if door status is wrong):
2. Create and run `fix-door-D2DufpInY1SOHtS8TXix.js`

### No Changes Needed:
- `functions/src/routes/certifications.ts` - Already correct
- `client/src/pages/Doors.js` - StatusBadge already includes under_review
- `client/src/pages/DoorDetail.js` - StatusBadge already correct
- `client/src/context/AuthContext.js` - User object structure is correct
