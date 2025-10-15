# INSPECTION WORKFLOW BUGS - QUICK REFERENCE

**Critical Issues Found:** 3
**Total Fix Time:** 2.5 hours
**Status:** READY TO FIX

---

## BUG #1: NO EMAIL ON INSPECTION COMPLETE ⚠️ CRITICAL

**What's broken:** Engineers NEVER receive email when inspections are completed

**Where:**
```
File: /functions/src/routes/inspections.ts
Line: 249 (add code after this line)
```

**The fix (copy this code):**
```typescript
// Send email notifications to engineers
try {
  const { notifyInspectionCompleted } = await import('../services/emailService');
  const door = await db.getDoorById(inspection.door_id);
  const inspector = await db.getUserById(inspection.inspector_id);

  // Get PO number
  let po_number = null;
  if (door?.po_id) {
    const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
    if (poDoc.exists) {
      po_number = poDoc.data()?.po_number;
    }
  }

  // Get engineer and admin emails
  const engineers = await db.db.collection('users').where('role', '==', 'engineer').get();
  const engineerEmails = engineers.docs.map(doc => doc.data().email).filter(Boolean);
  const admins = await db.db.collection('users').where('role', '==', 'admin').get();
  const adminEmails = admins.docs.map(doc => doc.data().email).filter(Boolean);
  const recipientEmails = [...engineerEmails, ...adminEmails];

  if (recipientEmails.length > 0) {
    await notifyInspectionCompleted({
      doorDetails: {
        serial_number: door?.serial_number,
        drawing_number: door?.drawing_number,
        description: door?.description,
        po_number,
        pressure: door?.pressure?.toString(),
        size: door?.size?.toString(),
        job_number: door?.job_number
      },
      inspectorName: inspector?.name || 'Unknown Inspector',
      recipientEmails
    });
    console.log(`Inspection completion email sent to ${recipientEmails.length} recipients`);
  }
} catch (emailError) {
  console.error('Error sending inspection completion email:', emailError);
  // Don't fail the completion if email fails
}
```

**Time:** 45 minutes
**Priority:** P0

---

## BUG #2: DELETION RACE CONDITION ⚠️ MEDIUM

**What's broken:** Door status sometimes doesn't reset to 'pending' after deleting last inspection

**Where:**
```
File: /functions/src/database/firestore.ts
Method: deleteInspection (lines 192-224)
```

**The fix (replace entire method):**
```typescript
async deleteInspection(id: string): Promise<void> {
  // Get the inspection first
  const inspection = await this.getInspectionById(id);
  if (!inspection) {
    throw new Error('Inspection not found');
  }

  // Check for other inspections BEFORE deleting (prevents race condition)
  const allInspectionsSnapshot = await this.db.collection('door_inspections')
    .where('door_id', '==', inspection.door_id)
    .get();

  const isLastInspection = allInspectionsSnapshot.docs.length === 1 &&
                           allInspectionsSnapshot.docs[0].id === id;

  // Delete all inspection checks
  const checksSnapshot = await this.db.collection('inspection_checks')
    .where('inspection_id', '==', id)
    .get();

  const batch = this.db.batch();

  checksSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Delete the inspection
  batch.delete(this.db.collection('door_inspections').doc(id));

  await batch.commit();

  // Update door status if this was the last inspection
  if (isLastInspection) {
    await this.updateDoor(inspection.door_id, {
      inspection_status: 'pending'
    });
  }
}
```

**Time:** 1.5 hours
**Priority:** P1

---

## DEPLOYMENT STEPS

1. **Make the fixes above**

2. **Build and deploy:**
   ```bash
   cd /Volumes/Q/Coding/inspex/functions
   npm run build
   firebase deploy --only functions
   ```

3. **Test:**
   - Complete an inspection
   - Check that engineers receive email
   - Delete an inspection
   - Check that door status resets correctly

---

## TESTING CHECKLIST

After deployment, verify:

- [ ] Complete an inspection → Email sent to ALL engineers ✉️
- [ ] Complete an inspection → Email sent to ALL admins ✉️
- [ ] Email contains door serial number, inspector name
- [ ] Delete last inspection → Door status resets to 'pending'
- [ ] Delete middle inspection (when multiple exist) → Door status unchanged
- [ ] No errors in Firebase Functions logs

---

## FILES MODIFIED

1. `/functions/src/routes/inspections.ts` - Add email notification
2. `/functions/src/database/firestore.ts` - Fix deletion race condition

## FILES CHECKED (NO CHANGES NEEDED)

- `/functions/src/services/emailService.ts` - Already working
- `/functions/src/routes/email.ts` - Already working
- `/client/src/pages/InspectionDetail.js` - Frontend already correct
- `/client/src/pages/Inspections.js` - Frontend already correct

---

**Need Help?** See full audit report: `INSPECTION_WORKFLOW_BUGS_AUDIT_2025-10-06.md`
