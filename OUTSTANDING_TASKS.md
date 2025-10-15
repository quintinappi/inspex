# INSPEX - Outstanding Tasks

**Last Updated:** 2025-10-05

## Summary
The INSPEX Refuge Bay Door Inspection System is functional with core workflows complete. Major frontend features for certificate enhancement have been implemented. The remaining tasks focus on PDF certificate styling, door types management completion, and integrating all images into professional certificates.

---

## 🔴 High Priority - Certificate PDF Enhancement

### 1. Update PDF Certificate Generation to Match Design Format
**Status:** Pending
**Priority:** High
**Description:** The current PDF certificate is basic text-only. Need to match the professional design certificate shown in the reference image.

**Requirements:**
- Header with Spectiv company logo (top left) ✅ UI Ready
- Client name and date in header (top right)
- Certificate number/serial
- Professional layout with door technical drawings/images
- High/Low pressure side diagrams
- Reference drawing numbers
- Design code and rating specifications
- Engineer signature image (not just text) ✅ UI Ready
- Professional formatting matching the design certificate

**Dependencies:**
- Company logo upload (Task #2) ✅ Completed
- Engineer signature upload (Task #3) ✅ Completed
- Door type images (Task #4) - Frontend Complete, Backend Ready

**Files to Modify:**
- `/functions/src/routes/certifications.ts` - `generateCertificatePDF()` function
- May need to add image processing library (sharp or similar)

---

## 🟡 Medium Priority - Admin Configuration

### 2. Add Company Logo Upload in Admin Settings
**Status:** ✅ Completed
**Priority:** Medium
**Description:** Add ability for admin to upload company logo (Spectiv logo) that will appear on certificates.

**Requirements:**
- New section in Admin panel: "Company Settings"
- Logo upload field with image preview
- Store logo in Firebase Storage
- Save logo URL/path in Firestore config collection
- Display current logo with option to replace
- Validate image type (PNG, JPG, SVG)
- Recommended size guidance

**Files Modified:**
- ✅ `/client/src/pages/Admin.js` - Added Company Settings section with logo upload UI
- ✅ `/functions/src/database/firestore.ts` - Add logo config methods (already implemented)
- ✅ `/functions/src/routes/admin.ts` - Add logo upload endpoint (already implemented)

**Database:**
- `config` collection → `company_settings` document
  - `logo_url: string`
  - `logo_storage_path: string`
  - `updated_at: timestamp`

---

### 3. Add Engineer Signature Upload in User Profile
**Status:** ✅ Completed
**Priority:** Medium
**Description:** Allow engineers to upload their signature image to be used on certificates.

**Requirements:**
- Add "Signature" section to Profile page
- Image upload with preview
- Store in Firebase Storage under `/signatures/{userId}/`
- Save signature URL in user document
- Show current signature if exists
- Option to remove/replace signature
- Validate image format and size

**Files Modified:**
- ✅ `/client/src/pages/Profile.js` - Added Signature section with upload UI
- ✅ `/functions/src/routes/users.ts` - Signature upload endpoint (already implemented)

**Database:**
- `users` collection → add fields:
  - `signature_url: string`
  - `signature_storage_path: string`

---

### 4. Create Door Types Management Section in Admin
**Status:** Pending
**Priority:** Medium
**Description:** Admin interface to manage door types with technical drawing images.

**Requirements:**
- New "Door Types" management card in Admin panel
- CRUD interface for door types:
  - Type name (e.g., "Refuge Bay Door")
  - Size/dimensions
  - Pressure ratings (High/Low)
  - Upload technical drawing images (isometric views)
  - Multiple images per door type (ISO view, High pressure side, Low pressure side)
- List view showing all door types with preview images
- Edit/Delete functionality
- Link door types to doors during door creation

**Files to Create/Modify:**
- `/client/src/pages/DoorTypesManagement.js` - New page
- `/client/src/pages/Admin.js` - Add "Manage Door Types" button
- `/functions/src/routes/doorTypes.ts` - New route file
- `/functions/src/database/firestore.ts` - Add door types methods

**Database:**
- New collection: `door_types`
  ```
  {
    id: string,
    name: string,
    description: string,
    pressure_high: number,
    pressure_low: number,
    images: {
      iso_view: string,
      high_pressure_side: string,
      low_pressure_side: string
    },
    created_at: timestamp,
    updated_at: timestamp
  }
  ```

- Update `doors` collection → add:
  - `door_type_id: string`

---

### 5. Integrate Door Type Images into PDF Certificate
**Status:** Pending
**Priority:** Medium
**Description:** Pull door type images from Firestore and embed them in the PDF certificate.

**Requirements:**
- Fetch door type data when generating certificate
- Download images from Firebase Storage URLs
- Embed images in PDF at correct positions (matching design)
- Handle missing images gracefully (show placeholder or skip)
- Ensure proper image scaling and positioning

**Files to Modify:**
- `/functions/src/routes/certifications.ts` - Update `generateCertificatePDF()`
- May need image processing library for resizing

**Dependencies:**
- Door types management must be complete (Task #4)

---

## 🟢 Low Priority - User Experience

### 6. Add PDF Certificate Download to All User Profiles
**Status:** Pending
**Priority:** Low
**Description:** All users should be able to view and download certificates related to their doors/inspections.

**Requirements:**
- Add "My Certificates" or "Certificates" section to Profile page
- List all certificates:
  - Admin: See all certificates
  - Engineer: See certificates they issued
  - Inspector: See certificates for doors they inspected
  - Client: See certificates for their doors (need client linking)
- Each certificate shows:
  - Door serial number
  - Certification date
  - Engineer name
  - Download PDF button
- Filter/search capabilities
- Pagination for large lists

**Files to Modify:**
- `/client/src/pages/Profile.js` - Add certificates section
- `/functions/src/routes/certifications.ts` - Add user-specific query endpoints

---

## 📋 Completed Tasks

✅ **Fix 500 error on /certifications/certify endpoint**
- Fixed date parsing issue in PDF generation
- Deployed and working

✅ **Add email notification with PDF attachment**
- Emails sent to admin when door is certified
- PDF certificate attached to email
- Deployed and working

✅ **Remove all SQLite code**
- Deleted `/server` directory
- Cleaned up `package.json`
- System now 100% Firebase-based

✅ **Remove "Add Doors" from engineer dashboard**
- Only admins can add new doors
- Engineers can only review/certify

---

## 🔧 Technical Notes

### Firebase Storage Structure
```
/certificates/
  certificate-{serial}-{timestamp}.pdf

/logos/
  company-logo.png

/signatures/
  {userId}/
    signature.png

/door-types/
  {doorTypeId}/
    iso-view.png
    high-pressure-side.png
    low-pressure-side.png
```

### Firestore Collections Structure
```
config/
  company_settings/
    - logo_url
    - logo_storage_path

door_types/
  {id}/
    - name
    - description
    - pressure_high
    - pressure_low
    - images: { iso_view, high_pressure_side, low_pressure_side }

doors/
  {id}/
    + door_type_id (NEW)
    - (existing fields)

users/
  {id}/
    + signature_url (NEW)
    + signature_storage_path (NEW)
    - (existing fields)
```

---

## 🎯 Next Steps Priority Order

1. **Company logo upload** (enables branded certificates)
2. **Engineer signature upload** (enables signed certificates)
3. **Door types management** (provides images for certificates)
4. **Update PDF generation** (combines all above into professional certificate)
5. **PDF downloads in profiles** (user convenience feature)

---

## ⚠️ Important Notes

- Email service is configured and working (`doors@spectiv.co.za`)
- Firebase Functions deployed at: `https://api-wl6xr4ukja-uc.a.run.app`
- All authentication uses Firebase Auth (no JWT/SQLite)
- Client URL: `http://localhost:3000` (development)
- Admin can manage users, serial numbers, and system settings
- Inspectors can complete inspections
- Engineers can certify doors
- All data stored in Firestore (Firebase)
