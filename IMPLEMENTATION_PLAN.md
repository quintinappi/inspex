# INSPEX Implementation Plan
**Date Created:** October 2, 2025
**Status:** Planning Phase
**Current State:** Broken Hybrid Architecture (Firebase Auth + Non-functional REST API)

---

## Executive Summary

INSPEX is a refuge bay door inspection system currently stuck between two architectures. The app uses Firebase Auth but all data operations fail because the REST API backend isn't running and the Firestore migration is incomplete.

**Goal:** Complete the Firebase migration to create a fully functional, serverless inspection management system.

**Estimated Timeline:** 12-15 hours of development work

---

## Current Architecture Issues

### ✅ What's Working
- Firebase Authentication (login/logout)
- React frontend UI (all pages render)
- Workflow state machine logic
- Routing and protected routes

### ❌ What's Broken
- All CRUD operations (doors, inspections, certifications)
- Photo uploads (no Storage configured)
- PDF generation (backend only, not accessible)
- Email notifications (placeholder only)
- Admin dashboard statistics

### 🔴 Critical Security Issues
1. Firebase API key exposed in Git history
2. Firestore rules set to `allow read, write: if true` (DANGEROUS!)
3. No API key restrictions
4. Live credentials in repository

---

## System Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    INSPECTION WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘

1. INSPECTOR adds refuge bay door
   └─> Stores in Firestore: doors collection

2. INSPECTOR completes inspection checklist
   └─> Photos uploaded to Firebase Storage
   └─> Checklist data in Firestore: door_inspections

3. ADMIN/INSPECTOR submits to engineer
   └─> Workflow state: pending_engineer_review
   └─> EMAIL sent to engineer

4. ENGINEER reviews and approves/rejects
   └─> If approved: engineer_approved → EMAIL to admin
   └─> If rejected: engineer_rejected → EMAIL to inspector

5. ADMIN releases certificate to client
   └─> PDF generated and stored in Firebase Storage
   └─> Workflow state: released_to_client
   └─> EMAIL sent to client with download link

6. CLIENT downloads certificate
   └─> Workflow state: client_downloaded
   └─> Client can accept or reject

7. CLIENT accepts → Workflow COMPLETE ✓
   OR
   CLIENT rejects → Back to engineer (engineer reviews again)
```

---

## User Roles & Permissions

| Role | Permissions | Email Notifications |
|------|-------------|-------------------|
| **Admin** | - Full system access<br>- User management<br>- Configuration<br>- Release certificates | - Engineer approval/rejection<br>- System alerts |
| **Inspector** | - Add/edit doors<br>- Complete inspections<br>- Upload photos<br>- Submit for review | - Engineer rejection<br>- Certificate released |
| **Engineer** | - Review inspections<br>- Approve/reject<br>- View certificates | - New inspection submitted<br>- Client rejection |
| **Client** | - View assigned certificates<br>- Download PDFs<br>- Accept/reject certificates | - Certificate available<br>- Follow-up reminders |

---

## Implementation Phases

### Phase 1: Security & Foundation (URGENT)
**Time: 1-2 hours**
**Priority: 🔴 CRITICAL**

#### Tasks:
1. **Rotate Firebase API Key**
   - Go to Google Cloud Console → Credentials
   - Revoke exposed key: `AIzaSyCv3YaxHhB-aZnNg5gr-kXtkvz7j6GNyXo`
   - Create new restricted API key
   - Add HTTP referrer restrictions: `http://localhost:3000/*`, `https://inspex001.web.app/*`
   - Update `/client/.env` with new key

2. **Lock Down Firestore Rules**
   - File: `/firestore.rules`
   - Remove line 7-9: `allow read, write: if true`
   - Uncomment role-based rules (lines 18-73)
   - Test with Firebase emulator:
     ```bash
     firebase emulators:start --only firestore
     ```
   - Deploy rules:
     ```bash
     firebase deploy --only firestore:rules
     ```

3. **Install Missing Dependencies**
   ```bash
   cd client
   npm install firebase
   ```

4. **Update .gitignore** (if not already done)
   ```
   .env
   .env.local
   client/.env
   client/.env.local
   functions/.env
   ```

#### Deliverables:
- ✅ Secure Firebase API key with restrictions
- ✅ Firestore rules enforcing role-based access
- ✅ Firebase SDK installed in client
- ✅ No secrets in Git repository

---

### Phase 2: User Management System
**Time: 2-3 hours**
**Priority: 🔴 HIGH**

#### A. User Data Structure (Firestore)

**Collection:** `users/{userId}`
```javascript
{
  email: "inspector@company.com",
  name: "John Smith",
  role: "inspector", // admin | inspector | engineer | client
  company: "ABC Mining Co.", // optional
  phone: "+1234567890", // optional
  status: "active", // active | inactive | invited
  createdAt: "2024-10-02T12:00:00Z",
  createdBy: "admin-user-id",
  lastLogin: "2024-10-02T14:30:00Z",
  notificationPreferences: {
    email: true,
    sms: false,
    pushNotifications: true
  }
}
```

#### B. Create User Management UI

**File:** `/client/src/pages/Admin.js` (add new section)

**Features:**
1. **User List Table**
   - Columns: Name, Email, Role, Status, Created Date, Actions
   - Search/filter by role
   - Pagination

2. **Add User Form**
   ```jsx
   <form>
     <input name="email" type="email" required />
     <input name="name" type="text" required />
     <select name="role">
       <option>inspector</option>
       <option>engineer</option>
       <option>client</option>
     </select>
     <input name="company" type="text" />
     <input name="phone" type="tel" />
     <button type="submit">Create User</button>
   </form>
   ```

3. **User Actions**
   - Edit user details
   - Change role
   - Deactivate/reactivate
   - Delete user
   - Resend invitation email

#### C. Backend User Creation

**File:** `/functions/src/routes/admin.ts` (or create if missing)

```typescript
// Create user endpoint
router.post('/users', async (req, res) => {
  const { email, name, role, company, phone } = req.body;

  // Create Firebase Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password: generateTempPassword(), // or send password reset link
    displayName: name
  });

  // Create Firestore user document
  await admin.firestore().collection('users').doc(userRecord.uid).set({
    email,
    name,
    role,
    company,
    phone,
    status: 'invited',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: req.user.uid
  });

  // Send invitation email
  await sendInvitationEmail(email, name, tempPassword);

  res.json({ success: true, userId: userRecord.uid });
});
```

#### D. Example Test Users

Create these users for testing:

| Role | Email | Name |
|------|-------|------|
| Admin | admin@inspex.com | System Admin |
| Inspector | inspector@yourcompany.com | John Inspector |
| Engineer | engineer@yourcompany.com | Jane Engineer |
| Client | client@miningcompany.com | Bob Client |

#### Deliverables:
- ✅ User management UI in Admin panel
- ✅ Create/edit/delete user functions
- ✅ User list with filters
- ✅ Test users created for all roles

---

### Phase 3: Email Notification System
**Time: 2-3 hours**
**Priority: 🔴 HIGH**

#### A. Choose Email Service

**Recommendation: Firebase Extension (for MVP)**

```bash
firebase ext:install firestore-send-email
```

**Configuration:**
- SMTP Connection URI: Use Gmail or SendGrid
- Email documents collection: `email_queue`
- Default FROM address: `noreply@inspex.com`
- Free tier: 200 emails/day

**Alternative: SendGrid (for Production)**
```bash
cd functions
npm install @sendgrid/mail
```
- Free tier: 100 emails/day
- Professional templates
- Better analytics

#### B. Email Templates

**Collection:** `email_templates/{templateId}`

**1. User Invitation Email**
```javascript
{
  id: "user_invitation",
  subject: "Welcome to INSPEX - Your Account Has Been Created",
  body: `
    Hi {{user_name}},

    Your INSPEX account has been created with the role: {{user_role}}.

    Login here: {{login_url}}
    Temporary Password: {{temp_password}}

    Please change your password after first login.

    Best regards,
    INSPEX Team
  `,
  variables: ["user_name", "user_role", "login_url", "temp_password"]
}
```

**2. Inspection Submitted for Review**
```javascript
{
  id: "inspection_submitted",
  subject: "New Inspection Ready for Review - Door {{door_number}}",
  body: `
    Hi {{engineer_name}},

    A new inspection has been submitted for your review:

    Door: {{door_number}}
    Inspector: {{inspector_name}}
    Completed: {{completion_date}}

    Review here: {{inspection_url}}

    Please review within 3 business days.

    Best regards,
    INSPEX System
  `,
  variables: ["engineer_name", "door_number", "inspector_name", "completion_date", "inspection_url"]
}
```

**3. Engineer Approved/Rejected**
```javascript
{
  id: "engineer_decision",
  subject: "Inspection {{status}} - Door {{door_number}}",
  body: `
    Hi {{admin_name}},

    Engineer {{engineer_name}} has {{status}} the inspection for Door {{door_number}}.

    {{#if approved}}
    The certificate is ready for release to the client.
    {{else}}
    Rejection reason: {{rejection_comments}}
    Expected return date: {{expected_date}}
    {{/if}}

    View details: {{inspection_url}}

    Best regards,
    INSPEX System
  `,
  variables: ["admin_name", "engineer_name", "status", "door_number", "rejection_comments", "inspection_url"]
}
```

**4. Certificate Ready for Download**
```javascript
{
  id: "certificate_ready",
  subject: "Certificate Available - Door {{door_number}}",
  body: `
    Hi {{client_name}},

    Your inspection certificate is now available for download:

    Door Number: {{door_number}}
    Serial Number: {{serial_number}}
    Certified Date: {{certified_date}}

    Download certificate: {{download_url}}

    If you have any issues, please contact us immediately.

    Best regards,
    INSPEX Team
  `,
  variables: ["client_name", "door_number", "serial_number", "certified_date", "download_url"]
}
```

**5. Client Rejection**
```javascript
{
  id: "client_rejection",
  subject: "Client Rejected Certificate - Door {{door_number}}",
  body: `
    Hi {{engineer_name}},

    Client {{client_name}} has rejected the certificate for Door {{door_number}}.

    Rejection reason: {{rejection_comments}}
    Issue description: {{issue_description}}

    Please review and address the issues: {{inspection_url}}

    Best regards,
    INSPEX System
  `,
  variables: ["engineer_name", "client_name", "door_number", "rejection_comments", "issue_description", "inspection_url"]
}
```

#### C. Update Workflow Service

**File:** `/client/src/services/workflowService.js`

```javascript
// Replace console.log with actual email sending
static async sendNotifications(inspectionId, status, data) {
  const inspection = await getDoc(doc(db, 'door_inspections', inspectionId));
  const inspectionData = inspection.data();

  switch (status) {
    case INSPECTION_STATUS.PENDING_ENGINEER_REVIEW:
      // Get engineer's email
      const engineers = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'engineer'))
      );

      for (const engineerDoc of engineers.docs) {
        await addDoc(collection(db, 'email_queue'), {
          to: engineerDoc.data().email,
          template: {
            name: 'inspection_submitted',
            data: {
              engineer_name: engineerDoc.data().name,
              door_number: inspectionData.door_number,
              inspector_name: inspectionData.inspector_name,
              completion_date: new Date(inspectionData.completed_at).toLocaleDateString(),
              inspection_url: `${window.location.origin}/inspections/${inspectionId}`
            }
          }
        });
      }
      break;

    case INSPECTION_STATUS.ENGINEER_APPROVED:
      // Email admin
      const admins = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'))
      );

      for (const adminDoc of admins.docs) {
        await addDoc(collection(db, 'email_queue'), {
          to: adminDoc.data().email,
          template: {
            name: 'engineer_decision',
            data: {
              admin_name: adminDoc.data().name,
              engineer_name: data.engineer_name,
              status: 'approved',
              door_number: inspectionData.door_number,
              inspection_url: `${window.location.origin}/inspections/${inspectionId}`
            }
          }
        });
      }
      break;

    // ... other cases
  }
}
```

#### D. Email Log Collection

**Collection:** `email_logs/{logId}`
```javascript
{
  to: "engineer@company.com",
  template: "inspection_submitted",
  status: "sent", // sent | failed | pending
  sentAt: "2024-10-02T15:30:00Z",
  inspectionId: "abc123",
  error: null, // or error message if failed
  retryCount: 0
}
```

#### Deliverables:
- ✅ Email service configured (Firebase Extension or SendGrid)
- ✅ 5 email templates created
- ✅ Workflow service updated to send emails
- ✅ Email logging implemented
- ✅ Test emails sent successfully

---

### Phase 4: Deploy Firebase Functions
**Time: 2-3 hours**
**Priority: 🔴 HIGH**

#### A. Build and Deploy Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

#### B. Test Endpoints

**Base URL:** `https://us-central1-inspex001.cloudfunctions.net/api`

**Test with curl:**
```bash
# Health check
curl https://us-central1-inspex001.cloudfunctions.net/api/health

# Get doors (requires auth token)
curl -H "Authorization: Bearer <token>" \
  https://us-central1-inspex001.cloudfunctions.net/api/doors

# Create door
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"door_number":"RBD-001","serial_number":"MUF-S199-RBDV1-01-0"}' \
  https://us-central1-inspex001.cloudfunctions.net/api/doors
```

#### C. Update Frontend API Configuration

**File:** `/client/.env`
```bash
REACT_APP_FIREBASE_FUNCTIONS_URL=https://us-central1-inspex001.cloudfunctions.net/api
```

**File:** `/client/src/services/api.js`
```javascript
const API_BASE_URL = process.env.REACT_APP_FIREBASE_FUNCTIONS_URL;

export const api = {
  get: async (path) => {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  post: async (path, data) => {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // ... put, delete
};
```

#### Deliverables:
- ✅ Firebase Functions deployed
- ✅ All endpoints tested and working
- ✅ Frontend configured to call Functions
- ✅ Authentication working with Functions

---

### Phase 5: Firebase Storage Setup
**Time: 1-2 hours**
**Priority: ⚠️ MEDIUM**

#### A. Create Storage Bucket

```bash
firebase init storage
```

#### B. Configure Storage Rules

**File:** `storage.rules`
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isInspector() {
      return isAuthenticated() &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role in ['admin', 'inspector'];
    }

    // Inspection photos
    match /inspections/{inspectionId}/{filename} {
      allow read: if isAuthenticated();
      allow write: if isInspector();
    }

    // Certificates (PDFs)
    match /certificates/{certId}/{filename} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only storage
```

#### C. Update Photo Upload Component

**File:** `/client/src/pages/InspectionDetail.js`

```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const handlePhotoUpload = async (file, checkId) => {
  try {
    // Create reference
    const storageRef = ref(storage, `inspections/${inspectionId}/${checkId}_${Date.now()}.jpg`);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Update Firestore with photo URL
    await updateDoc(doc(db, 'inspection_checks', checkId), {
      photo_url: downloadURL,
      photo_uploaded_at: new Date().toISOString()
    });

    return downloadURL;
  } catch (error) {
    console.error('Photo upload failed:', error);
    throw error;
  }
};
```

#### D. PDF Storage for Certificates

**File:** `/functions/src/routes/certifications.ts`

```typescript
import { getStorage } from 'firebase-admin/storage';
import PDFDocument from 'pdfkit';

router.post('/generate/:inspectionId', async (req, res) => {
  const { inspectionId } = req.params;

  // Generate PDF
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(chunks);

    // Upload to Storage
    const bucket = getStorage().bucket();
    const file = bucket.file(`certificates/${inspectionId}/certificate.pdf`);

    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        inspectionId,
        generatedAt: new Date().toISOString()
      }
    });

    // Get signed URL (valid for 7 days)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    // Save URL to Firestore
    await admin.firestore().collection('certifications').add({
      inspectionId,
      certificateUrl: url,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, certificateUrl: url });
  });

  // Generate PDF content
  doc.fontSize(20).text('Refuge Bay Door Inspection Certificate', 100, 100);
  // ... add more content
  doc.end();
});
```

#### Deliverables:
- ✅ Storage bucket created
- ✅ Storage rules configured
- ✅ Photo upload working
- ✅ PDF generation and storage working

---

### Phase 6: Connect Frontend to Backend
**Time: 2-3 hours**
**Priority: ⚠️ MEDIUM**

#### A. Update All Page Components

Replace all REST API calls with Firebase Functions calls:

**Doors Page:**
```javascript
// OLD
const { data } = await api.get('/api/doors');

// NEW
const { data } = await api.get('/doors');
```

**Inspections Page:**
```javascript
// OLD
const response = await api.post('/api/inspections/start', { doorId });

// NEW
const response = await api.post('/inspections/start', { doorId });
```

#### B. Update API Wrapper

Ensure `/client/src/services/api.js` properly routes all calls to Firebase Functions.

#### C. Error Handling

Add proper error handling for all API calls:
```javascript
try {
  const result = await api.get('/doors');
  setDoors(result.data);
} catch (error) {
  if (error.code === 'permission-denied') {
    showError('You do not have permission to access doors');
  } else if (error.code === 'not-found') {
    showError('Door not found');
  } else {
    showError('Failed to load doors. Please try again.');
  }
}
```

#### Deliverables:
- ✅ All pages calling Firebase Functions
- ✅ Error handling implemented
- ✅ Loading states working
- ✅ No more "Backend Connection Issue" errors

---

### Phase 7: End-to-End Testing
**Time: 2-3 hours**
**Priority: ✅ LOW**

#### Test Scenario: Complete Workflow

**1. Setup Test Users**
- ✅ admin@inspex.com (already exists)
- ✅ inspector@test.com (create)
- ✅ engineer@test.com (create)
- ✅ client@test.com (create)

**2. Inspector: Add Door**
- Login as inspector@test.com
- Navigate to "Add Door"
- Fill form:
  - PO Number: PO-2024-001
  - Door Number: 1
  - Job Number: JOB-001
  - Door Type: V1
  - Size: 1.5M
  - Pressure: 400 kPa
- Submit
- ✅ Verify door appears in Firestore
- ✅ Verify serial number generated: MUF-S199-RBDV1-01-0

**3. Inspector: Complete Inspection**
- Navigate to "Inspections"
- Click "Start Inspection" on new door
- Complete checklist:
  - Check each item (pass/fail)
  - Upload 2-3 photos
  - Add notes
- Submit inspection
- ✅ Verify photos in Firebase Storage
- ✅ Verify inspection in Firestore
- ✅ Verify email sent to engineer@test.com

**4. Engineer: Review Inspection**
- Check email inbox (engineer@test.com)
- Click link in email
- Login as engineer
- Review inspection
- Click "Approve"
- Add comments: "Inspection looks good, approved for release"
- ✅ Verify email sent to admin@inspex.com
- ✅ Verify workflow status: engineer_approved

**5. Admin: Release Certificate**
- Login as admin
- Navigate to "Admin Panel"
- See pending release notification
- Click "Release to Client"
- Select client: client@test.com
- ✅ Verify PDF generated in Firebase Storage
- ✅ Verify email sent to client@test.com
- ✅ Verify workflow status: released_to_client

**6. Client: Download Certificate**
- Check email inbox (client@test.com)
- Click download link
- Login as client
- Download PDF
- ✅ Verify PDF downloads successfully
- ✅ Verify workflow status: client_downloaded

**7. Client: Accept Certificate**
- Click "Accept Certificate"
- ✅ Verify workflow status: completed
- ✅ Verify completion email sent

#### Alternative Flow: Test Rejections

**Engineer Rejection:**
- Engineer clicks "Reject"
- Adds comments: "Photo 3 is blurry, please retake"
- Sets expected return date: 3 days from now
- ✅ Verify email sent to inspector
- ✅ Verify workflow status: engineer_rejected
- Inspector edits, resubmits
- ✅ Verify back to pending_engineer_review

**Client Rejection:**
- Client clicks "Reject"
- Adds issue description: "Measurements don't match specs"
- ✅ Verify email sent to engineer
- ✅ Verify workflow status: client_rejected
- Engineer reviews, makes changes, approves
- ✅ Verify workflow continues

#### Deliverables:
- ✅ Complete happy path tested
- ✅ Rejection scenarios tested
- ✅ All emails sending correctly
- ✅ All data persisting to Firestore
- ✅ Photos and PDFs stored in Storage
- ✅ No errors in console

---

## Database Schema Reference

### Collections

#### `users`
```javascript
{
  email: string,
  name: string,
  role: "admin" | "inspector" | "engineer" | "client",
  company: string?,
  phone: string?,
  status: "active" | "inactive" | "invited",
  createdAt: timestamp,
  createdBy: string, // user ID
  lastLogin: timestamp,
  notificationPreferences: {
    email: boolean,
    sms: boolean,
    pushNotifications: boolean
  }
}
```

#### `doors`
```javascript
{
  serial_number: string, // "MUF-S199-RBDV1-01-0"
  drawing_number: string, // "S199"
  po_number: string,
  door_number: number,
  job_number: string,
  size: string, // "1.5" | "1.8" | "2.0"
  pressure: string, // "140" | "400"
  door_type: "V1" | "V2",
  inspection_status: "pending" | "in_progress" | "completed",
  certification_status: "pending" | "certified",
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `door_inspections`
```javascript
{
  doorId: string, // reference
  door_number: string,
  inspector_id: string,
  inspector_name: string,
  status: "draft" | "pending_engineer_review" | "engineer_approved" | ...,
  inspection_date: timestamp,
  notes: string,
  completed_at: timestamp,
  engineer_id: string?,
  engineer_comments: string?,
  admin_released_by: string?,
  client_downloaded_at: timestamp?,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `inspection_checks`
```javascript
{
  inspection_id: string, // reference
  point_id: string, // reference to inspection_points
  name: string,
  description: string,
  is_checked: boolean,
  notes: string,
  photo_url: string?, // Firebase Storage URL
  checked_at: timestamp
}
```

#### `inspection_points` (master checklist)
```javascript
{
  name: string,
  description: string,
  category: string,
  order: number,
  required: boolean,
  door_type_filter: "V1" | "V2" | null
}
```

#### `certifications`
```javascript
{
  door_id: string,
  inspection_id: string,
  engineer_id: string,
  engineer_name: string,
  certificate_url: string, // Firebase Storage
  digital_signature: string?,
  certified_at: timestamp,
  created_at: timestamp
}
```

#### `workflow_logs`
```javascript
{
  inspection_id: string,
  action: string, // status transition
  data: object,
  timestamp: timestamp,
  created_by: string
}
```

#### `email_queue` (for Firebase Extension)
```javascript
{
  to: string | string[],
  template: {
    name: string,
    data: object
  },
  delivery: {
    startTime: timestamp,
    endTime: timestamp?,
    error: string?,
    attempts: number,
    state: "PENDING" | "PROCESSING" | "SUCCESS" | "ERROR"
  }
}
```

#### `email_logs`
```javascript
{
  to: string,
  template: string,
  status: "sent" | "failed" | "pending",
  sentAt: timestamp,
  inspectionId: string?,
  error: string?
}
```

#### `config`
```javascript
// Document: app_config
{
  serialPrefix: string, // "MUF-S199-RBD"
  startingSerial: string, // "200"
  updatedAt: timestamp
}
```

---

## Technology Stack

### Frontend
- React 18.2.0
- React Router DOM 6.8.0
- React Query 3.39.3
- Tailwind CSS 3.3.6
- Heroicons 2.0.18
- Firebase SDK 12.1.0

### Backend
- Firebase Auth
- Cloud Firestore
- Firebase Functions (Node.js 18)
- Firebase Storage
- Firebase Extensions (email)

### Tools
- Firebase CLI
- Git
- npm/node

---

## Environment Variables

### `/client/.env`
```bash
# React App
PORT=3000
SKIP_PREFLIGHT_CHECK=true

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=<your-new-key>
REACT_APP_FIREBASE_AUTH_DOMAIN=inspex001.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=inspex001
REACT_APP_FIREBASE_STORAGE_BUCKET=inspex001.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
REACT_APP_FIREBASE_APP_ID=<app-id>

# API Configuration
REACT_APP_FIREBASE_FUNCTIONS_URL=https://us-central1-inspex001.cloudfunctions.net/api
```

### `/functions/.env` (if needed)
```bash
# SendGrid (if using)
SENDGRID_API_KEY=<your-sendgrid-key>

# SMTP (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<app-password>
```

---

## Success Criteria

### Security
- ✅ No exposed API keys in code or Git history
- ✅ Firestore rules enforcing role-based access
- ✅ Storage rules protecting files
- ✅ API key restrictions enabled

### Functionality
- ✅ Users can log in with all roles
- ✅ Inspector can add doors and complete inspections
- ✅ Photos upload to Firebase Storage
- ✅ Engineer can review and approve/reject
- ✅ Admin can release certificates
- ✅ PDFs generate and store correctly
- ✅ Client can download certificates
- ✅ All workflow states working

### Notifications
- ✅ Email sent when inspection submitted
- ✅ Email sent when engineer approves/rejects
- ✅ Email sent when certificate ready
- ✅ Email sent when client rejects

### User Experience
- ✅ No backend connection errors
- ✅ Fast page loads (<2s)
- ✅ Responsive UI on mobile
- ✅ Clear error messages
- ✅ Loading states for async operations

---

## Timeline Estimate

| Phase | Description | Hours | Priority |
|-------|-------------|-------|----------|
| 1 | Security & Foundation | 1-2 | 🔴 Critical |
| 2 | User Management | 2-3 | 🔴 High |
| 3 | Email Notifications | 2-3 | 🔴 High |
| 4 | Deploy Functions | 2-3 | 🔴 High |
| 5 | Firebase Storage | 1-2 | ⚠️ Medium |
| 6 | Connect Frontend | 2-3 | ⚠️ Medium |
| 7 | E2E Testing | 2-3 | ✅ Low |
| **Total** | | **12-19 hours** | |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Choose starting point:**
   - Option A: Security first (recommended)
   - Option B: Deploy Functions first
   - Option C: User management first

3. **Set up development environment**
4. **Begin Phase 1**

---

## Questions & Decisions Needed

### Email Service Choice
- [ ] Use Firebase Extension (easier, limited to 200/day)
- [ ] Use SendGrid (more powerful, 100/day free)
- [ ] Use custom SMTP (unlimited, more setup)

### User Invitation Flow
- [ ] Auto-generate passwords and email them
- [ ] Send password reset link instead
- [ ] Use magic link authentication (passwordless)

### PDF Generation
- [ ] Keep PDFKit library
- [ ] Use HTML to PDF service
- [ ] Use template-based system

### Testing Approach
- [ ] Manual testing only
- [ ] Write automated tests
- [ ] Use Firebase emulators

---

## Resources

### Documentation
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firebase Storage Docs](https://firebase.google.com/docs/storage)
- [Firebase Extensions](https://firebase.google.com/products/extensions)

### Tools
- [Firebase Console](https://console.firebase.google.com/project/inspex001)
- [Google Cloud Console](https://console.cloud.google.com)
- [SendGrid Dashboard](https://app.sendgrid.com) (if used)

---

## Appendix: Command Reference

### Firebase Commands
```bash
# Login
firebase login

# Init project
firebase init

# Deploy all
firebase deploy

# Deploy specific
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage

# Test locally
firebase emulators:start

# View logs
firebase functions:log
```

### Development Commands
```bash
# Start client
cd client && npm start

# Build client
cd client && npm run build

# Build functions
cd functions && npm run build

# Run functions locally
cd functions && npm run serve
```

---

**Document Version:** 1.0
**Last Updated:** October 2, 2025
**Author:** Development Team
**Status:** Ready for Implementation
