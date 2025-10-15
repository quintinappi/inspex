# How to Check Actual Firebase Data for Door MF42-15-1041

## Direct Firebase Console Access
1. Go to: https://console.firebase.google.com/project/inspex001/firestore
2. Navigate to the "doors" collection
3. Search for documents where `serial_number` == "MF42-15-1041"

## What to Look For

### 1. Door Document
Find the door document and check:
- `inspection_status` field
- `certification_status` field
- `rejection_reason` field (if any)

### 2. Related Inspections
Go to the "door_inspections" collection:
- Filter by `door_id` matching the door's ID
- Check the `status` field of each inspection
- Look for `completed_date` timestamps

### 3. Related Certifications
Go to the "certifications" collection:
- Filter by `door_id` matching the door's ID
- Check if any certification records exist
- Look at `certified_at` timestamps

## Expected Issue
Based on the code analysis, the problem is likely:
- Door document has `certification_status` = "under_review" or "pending"
- But a certification record exists in the certifications collection
- The inspections page shows the door's actual status
- The certifications page assumes all certification records are "Certified"

## Quick Test
You can also check the live API endpoints:
- https://api-wl6xr4ukja-uc.a.run.app/inspections (shows inspections with door status)
- https://api-wl6xr4ukja-uc.a.run.app/certifications/my-certificates (shows certifications)

The fix I deployed should now include the door's actual certification_status in the API response, so both pages should show consistent status.