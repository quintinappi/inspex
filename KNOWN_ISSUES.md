# INSPEX Known Issues and Resolutions

## Issue #1: Inspection Detail Page - Document Not Found Error

### **Date Encountered**: 2025-10-03

### **Error Message**:
```
Error getting inspection with checks: Error: Document not found
    at FirestoreService.get (firestoreService.js:27:1)
    at async FirestoreService.getInspectionWithChecks (firestoreService.js:383:1)
    at async InspectionDetail.enabled [as queryFn] (InspectionDetail.js:26:1)
```

### **Root Cause**:
The `getInspectionWithChecks()` method in `firestoreService.js` (line 415) was attempting to fetch door data using:
```javascript
const doorData = await this.get('doors', inspection.data.door_id);
```

This call would throw an error if:
1. The door referenced by `inspection.data.door_id` was deleted from Firestore
2. The `door_id` field was invalid or corrupted
3. There was a data integrity issue where the inspection references a non-existent door

The error propagated up and caused the entire Inspection Detail page to fail loading.

### **Why It Happened**:
This is a **data integrity issue** that can occur when:
- Testing/development data gets manually deleted from Firestore Console
- Door documents are deleted without cascading to related inspections
- Old inspection records exist from before schema changes
- Database seeding/migration scripts create orphaned inspections

### **Impact**:
- **Severity**: HIGH
- **User Impact**: Users cannot view inspection details for affected inspections
- **Scope**: Any inspection that references a deleted or missing door document
- **Workaround**: Delete the orphaned inspection from Firestore Console

### **Resolution Applied**:

**File Modified**: `/Volumes/Q/Coding/inspex/client/src/services/firestoreService.js`

**Lines Changed**: 414-420

**Before**:
```javascript
// Get door data
const doorData = await this.get('doors', inspection.data.door_id);
```

**After**:
```javascript
// Get door data - handle missing door gracefully
let doorData = { data: {} };
try {
  doorData = await this.get('doors', inspection.data.door_id);
} catch (error) {
  console.warn('Could not fetch door details:', error);
}
```

**Result Data Structure**:
```javascript
return {
  data: {
    inspection: {
      ...inspection.data,
      serial_number: doorData.data.serial_number || 'N/A',  // Fallback values
      drawing_number: doorData.data.drawing_number || 'N/A',
      description: doorData.data.description || 'N/A',
      inspector_name
    },
    checks
  }
};
```

### **How It Works Now**:
1. Method attempts to fetch door data
2. If door is missing, catches the error and logs a warning
3. Uses empty object with fallback values ('N/A')
4. Page loads successfully showing inspection checks
5. Door fields display 'N/A' instead of crashing

### **Prevention Strategy**:

#### **Option 1: Cascade Deletes** (Recommended for Production)
Add a Cloud Function to delete related inspections when a door is deleted:

```javascript
// functions/src/triggers/onDoorDelete.ts
export const onDoorDelete = functions.firestore
  .document('doors/{doorId}')
  .onDelete(async (snap, context) => {
    const doorId = context.params.doorId;

    // Delete related inspections
    const inspectionsSnapshot = await db.collection('door_inspections')
      .where('door_id', '==', doorId)
      .get();

    const batch = db.batch();
    inspectionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${inspectionsSnapshot.size} inspections for door ${doorId}`);
  });
```

#### **Option 2: Soft Deletes** (Alternative)
Instead of deleting doors, mark them as deleted:

```javascript
// In firestoreService.js
async deleteDoor(id) {
  return this.update('doors', id, {
    deleted: true,
    deletedAt: new Date().toISOString()
  });
}
```

Then filter deleted doors in queries:
```javascript
async getDoors() {
  return this.getAll('doors', {
    where: { field: 'deleted', operator: '!=', value: true },
    orderBy: { field: 'createdAt', direction: 'desc' }
  });
}
```

#### **Option 3: Validation Before Delete**
Prevent deletion if related records exist:

```javascript
async deleteDoor(id) {
  // Check for related inspections
  const inspections = await getDocs(
    query(collection(db, 'door_inspections'), where('door_id', '==', id))
  );

  if (!inspections.empty) {
    throw new Error(`Cannot delete door: ${inspections.size} inspection(s) exist. Delete inspections first.`);
  }

  return this.delete('doors', id);
}
```

### **Testing**:
To verify the fix works:

1. **Create test scenario**:
   ```javascript
   // In Firebase Console or test script
   // 1. Create a door
   // 2. Start an inspection for that door
   // 3. Delete the door document (keep inspection)
   // 4. Navigate to inspection detail page
   ```

2. **Expected behavior**:
   - Page loads without errors
   - Inspection checks are visible
   - Door fields show 'N/A'
   - Console shows warning: "Could not fetch door details"

3. **Verification**:
   - No red errors in browser console
   - React Query doesn't show error state
   - User can still complete inspection checklist

### **Related Files**:
- `/client/src/services/firestoreService.js` - Method implementation
- `/client/src/pages/InspectionDetail.js` - Consumer of the method
- `/firestore.rules` - Security rules (should prevent unauthorized deletes)

### **Long-term Recommendation**:
Implement **referential integrity** in Firestore by:
1. Using Cloud Functions for cascade deletes (Option 1)
2. Adding database migration scripts to clean orphaned records
3. Implementing validation in admin UI to prevent deletion of referenced documents
4. Adding Firestore rules to prevent deletion of doors with active inspections:

```javascript
// firestore.rules
match /doors/{doorId} {
  allow delete: if request.auth != null
    && request.auth.token.role == 'admin'
    && !exists(/databases/$(database)/documents/door_inspections/$(doorId));
}
```

### **Status**: ✅ RESOLVED
**Date Fixed**: 2025-10-03
**Fixed By**: System update to handle graceful degradation
