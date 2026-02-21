# INSPEX - Refuge Bay Door Inspection System

## Project Overview

INSPEX is a comprehensive web application for managing refuge bay door inspections, certifications, and documentation. The system supports a multi-stage workflow from initial door registration through inspection, engineer certification, and final client release.

### Key Features
- **Door Management**: Auto-generated serial numbers (format: `MF42-{size_code}-{door_number}`) and drawing numbers
- **Dynamic Inspections**: Configurable inspection points with photo uploads
- **Digital Signatures**: Engineers can digitally sign certificates
- **PDF Generation**: Automatic certificate generation with PDF download
- **Email Notifications**: Automated notifications for inspection completion and certification
- **Multi-Role Access**: Admin, Inspector, Engineer, and Client roles
- **Workflow Management**: Multi-stage approval process (Draft → Engineer Review → Admin Release → Client)

### Supported Door Types
- **400 kPa V1 Doors**: 1.5M, 1.8M, 2.0M sizes
- **140 kPa V2 Doors**: 1.5M, 1.8M, 2.0M sizes

---

## Technology Stack

### Frontend
- **Framework**: React 18.2.0
- **Routing**: React Router DOM 6.8.0
- **Styling**: Tailwind CSS 3.3.6, Headless UI, Heroicons
- **State Management**: React Context (Auth, Notifications)
- **Data Fetching**: React Query 3.39.3, Axios
- **Signature Capture**: react-signature-canvas
- **File Upload**: react-dropzone
- **Date Handling**: date-fns
- **Build Tool**: Create React App (react-scripts 5.0.1)

### Backend
- **Runtime**: Firebase Cloud Functions (Node.js 20)
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 4.9.0
- **Authentication**: Firebase Auth + JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs

### Database & Storage
- **Database**: Firebase Firestore (NoSQL)
- **File Storage**: Firebase Storage
- **Authentication**: Firebase Authentication

### Additional Services
- **Email**: Nodemailer 6.9.7
- **PDF Generation**: PDFKit 0.13.0
- **File Upload**: Multer 1.4.5

### Deployment
- **Hosting**: Firebase Hosting
- **Functions**: Firebase Cloud Functions (us-central1, 1GiB memory, 300s timeout)

---

## Project Structure

```
inspex/
├── client/                     # React frontend application
│   ├── public/                 # Static assets (index.html, logo.png)
│   └── src/
│       ├── components/         # Reusable UI components
│       │   ├── AdminReleasePanel.js
│       │   ├── ClientCertificatePanel.js
│       │   ├── EngineerApprovalPanel.js
│       │   ├── EngravingPlateGenerator.js
│       │   ├── Layout.js
│       │   ├── LoadingSpinner.js
│       │   ├── ProtectedRoute.js
│       │   ├── WorkflowStatusBadge.js
│       │   └── WorkflowTimeline.js
│       ├── context/            # React Context providers
│       │   ├── AuthContext.js  # Firebase Auth state management
│       │   └── NotificationContext.js
│       ├── pages/              # Route-level page components
│       │   ├── AddDoor.js
│       │   ├── Admin.js
│       │   ├── AdminSetup.js
│       │   ├── CertificationDetail.js
│       │   ├── Certifications.js
│       │   ├── Dashboard.js
│       │   ├── DoorDetail.js
│       │   ├── Doors.js
│       │   ├── DoorTypesManagement.js
│       │   ├── InspectionDetail.js
│       │   ├── Inspections.js
│       │   ├── Login.js
│       │   ├── Profile.js
│       │   ├── PurchaseOrders.js      # NEW: PO management
│       │   ├── SetupDatabase.js
│       │   └── Users.js               # NEW: User management
│       ├── services/           # API and data services
│       │   ├── api.js          # Main API abstraction layer
│       │   ├── firestoreService.js
│       │   ├── workflowService.js
│       │   └── emailService.js
│       ├── types/              # Type definitions
│       │   └── workflow.js     # Workflow status constants
│       ├── utils/              # Utility functions
│       │   └── setupAdmin.js
│       ├── App.js              # Main App component with routes
│       ├── firebase.js         # Firebase client initialization
│       └── index.js            # React entry point
│
├── functions/                  # Firebase Cloud Functions (backend)
│   └── src/
│       ├── database/
│       │   ├── firestore.ts    # Firestore DB class with all operations
│       │   └── seedData.ts     # Initial data seeding
│       ├── middleware/
│       │   └── auth.ts         # JWT verification and role checking
│       ├── routes/             # Express route handlers
│       │   ├── auth.ts         # Authentication endpoints
│       │   ├── doors.ts        # Door management endpoints
│       │   ├── inspections.ts  # Inspection workflow endpoints
│       │   ├── certifications.ts
│       │   ├── users.ts        # User management (updated with auth sync)
│       │   ├── admin.ts
│       │   ├── email.ts
│       │   ├── doorTypes.ts
│       │   ├── purchaseOrders.ts    # NEW: PO management
│       │   └── debug.ts        # Debug endpoints (temporary)
│       ├── services/
│       │   └── emailService.ts # Email notification logic
│       ├── types/
│       │   └── express.d.ts    # TypeScript type extensions
│       └── index.ts            # Main Express app entry point
│
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Firestore query indexes
├── storage.rules               # Firebase Storage security rules
├── firebase.json               # Firebase project configuration
└── package.json                # Root package.json (orchestration)
```

---

## Build and Development Commands

### Root Level Commands
```bash
# Install all dependencies (root + client + functions)
npm install
cd client && npm install
cd functions && npm install

# Start client development server
npm run dev
# OR
npm run client

# Build client for production
npm run build
```

### Client Commands (from `client/` directory)
```bash
# Start development server (port 3000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Functions Commands (from `functions/` directory)
```bash
# Build TypeScript
npm run build

# Deploy functions to Firebase
npm run deploy

# View function logs
npm run logs
```

### Firebase Commands
```bash
# Deploy all Firebase resources
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

---

## Environment Configuration

### Client Environment Variables (`client/.env`)
```bash
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_API_URL=/api  # Base URL for API calls
```

### Functions Environment Variables
Firebase Functions use Google Cloud environment configuration. Set using:
```bash
firebase functions:config:set jwt.secret="your-secret-key"
firebase functions:config:set email.host="smtp.gmail.com"
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.pass="your-app-password"
```

### Root Environment Variables (`.env`) - Legacy
The root `.env` file contains legacy configuration for local development (not used in Firebase deployment):
```bash
PORT=9876
JWT_SECRET=your-jwt-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## User Roles and Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| **admin** | System administrator | Full access to all features |
| **inspector** | Field inspector | Create doors, conduct inspections, upload photos |
| **engineer** | Certifying engineer | Review inspections, certify doors, digital signatures |
| **client** | End customer | View and download certificates |

### Firestore Rules Summary
- Users can read their own user document
- Admins can read/write all user documents
- Inspectors can create and manage inspections
- Engineers can create certifications
- All authenticated users can read door data

---

## Data Model

### Core Collections

**users**
- `id`, `name`, `email`, `role`, `status` (active/inactive)
- `company`, `phone`, `createdAt`, `updatedAt`
- `signature_url`, `signature_storage_path`

**doors**
- `id`, `po_id`, `door_type_id`, `door_number`, `serial_number`, `drawing_number`
- `job_number`, `description`, `pressure`, `door_type`, `size`
- `inspection_status`: 'pending' | 'in_progress' | 'completed'
- `certification_status`: 'pending' | 'under_review' | 'certified' | 'rejected'
- `completion_status`, `paid_status`, `created_at`

**door_types**
- `id`, `name`, `description`
- `pressure_high`, `pressure_low`
- `images`: { `iso_view`, `high_pressure_side`, `low_pressure_side` }
- `created_at`, `updated_at`

**door_inspections**
- `id`, `door_id`, `inspector_id`, `inspection_date`, `completed_date`
- `status`: 'in_progress' | 'completed' | 'superseded'
- `notes`

**inspection_points**
- `id`, `name`, `description`, `order_index`

**inspection_checks**
- `id`, `inspection_id`, `inspection_point_id`
- `is_checked`, `photo_path`, `notes`, `checked_at`

**certifications**
- `id`, `door_id`, `engineer_id`, `certified_at`
- `certificate_pdf_path`, `signature`

**purchase_orders**
- `id`, `po_number`, `client_name`, `client_email`
- `description`, `status` (active/completed/cancelled)
- `created_at`, `updated_at`

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login (returns JWT)
- `POST /api/auth/register` - User registration (admin only)

### Doors
- `GET /api/doors` - List all doors
- `POST /api/doors` - Create new door
- `GET /api/doors/:id` - Get door details
- `GET /api/doors/status/:status` - Get doors by status

### Inspections
- `GET /api/inspections` - List all inspections
- `POST /api/inspections/start/:doorId` - Start new inspection
- `GET /api/inspections/:id` - Get inspection with checks
- `PUT /api/inspections/:inspectionId/checks/:checkId` - Update check
- `POST /api/inspections/complete/:inspectionId` - Complete inspection
- `DELETE /api/inspections/:id` - Delete inspection

### Certifications
- `GET /api/certifications/pending` - Get pending certifications
- `POST /api/certifications/certify/:doorId` - Certify door
- `GET /api/certifications/download/:doorId` - Download certificate PDF

### Users
- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `POST /api/users/:id/reset-password` - Reset user password (admin only)

### Door Types
- `GET /api/door-types` - List all door types
- `POST /api/door-types` - Create new door type (admin only)
- `PUT /api/door-types/:id` - Update door type (admin only)
- `DELETE /api/door-types/:id` - Delete door type (admin only)

### Purchase Orders
- `GET /api/purchase-orders` - List all purchase orders
- `POST /api/purchase-orders` - Create new purchase order (admin only)
- `PUT /api/purchase-orders/:id` - Update purchase order (admin only)
- `DELETE /api/purchase-orders/:id` - Delete purchase order (admin only)

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/serial-config` - Get serial number config
- `PUT /api/admin/serial-config` - Update serial config
- `GET /api/admin/company-settings` - Get company settings
- `PUT /api/admin/company-settings` - Update company settings

### Health Check
- `GET /api/health` - API health status

---

## Workflow States

The inspection workflow follows this state machine:

```
DRAFT (in_progress)
    ↓
PENDING_ENGINEER_REVIEW
    ↓ (approved)        ↓ (rejected)
ENGINEER_APPROVED    ENGINEER_REJECTED
    ↓                       ↓
PENDING_ADMIN_RELEASE    DRAFT (re-inspection)
    ↓
RELEASED_TO_CLIENT
    ↓ (downloaded)      ↓ (rejected)
CLIENT_DOWNLOADED    CLIENT_REJECTED
    ↓                       ↓
COMPLETED            ENGINEER_REJECTED
```

---

## Code Style Guidelines

### Frontend (JavaScript)
- Use functional components with React Hooks
- Use async/await for asynchronous operations
- Destructure props and state
- Use Tailwind CSS for styling
- Handle errors with try/catch blocks

### Backend (TypeScript)
- Use explicit types for function parameters and returns
- Use async/await for database operations
- Implement proper error handling with try/catch
- Return consistent response formats
- Use Firestore transactions for multi-step operations

### General
- Use meaningful variable names
- Add comments for complex logic
- Console.log important operations for debugging
- Follow existing code patterns when adding features

---

## Testing

### Manual Testing Checklist
- [ ] User login with different roles
- [ ] Door creation with auto-generated serial numbers
- [ ] Starting and completing inspections
- [ ] Photo upload during inspections
- [ ] Engineer certification with digital signature
- [ ] PDF certificate generation and download
- [ ] Email notifications (if configured)

### Debug Endpoints (Temporary)
- `GET /api/debug/doors` - List all doors
- `GET /api/debug/door/:serialNumber` - Find door by serial

---

## Security Considerations

### Authentication
- JWT tokens expire after 24 hours
- Firebase Auth manages session persistence
- API endpoints require valid JWT token

### Authorization
- Role-based access control on all endpoints
- Firestore rules enforce data access permissions
- Users can only access data appropriate to their role

### Data Protection
- Passwords hashed with bcrypt (10 rounds)
- Environment variables for sensitive configuration
- Firestore rules prevent unauthorized data access

### Deployment Security
- Never commit `.env` files
- Use Firebase Functions config for secrets
- Storage rules restrict file access

---

## Important Development Notes

### Critical Rules
1. **Do NOT commit unless explicitly asked** - The user prefers to control git operations
2. **No Firebase Emulator** - Always deploy functions when changed (we use production Firebase)
3. **Firebase Visibility** - The system has specific ways to "see" into Firebase data (debug endpoints, Firestore console)

### Common Patterns
- Serial numbers auto-generated in format: `MF42-{size_code}-{door_number}`
- Size codes: 15 (1.5m), 18 (1.8m), 20 (2.0m)
- Photos stored in Firebase Storage at `inspection-photos/`
- Company logo stored at `logos/`

### Known Issues (Historical)
See `KNOWN_ISSUES.md`, `BUG_CERTIFICATION_STATUS.md`, and `OUTSTANDING_TASKS.md` for historical bug tracking and status.

---

## Deployment Process

1. **Build client**
   ```bash
   cd client && npm run build
   ```

2. **Build functions**
   ```bash
   cd functions && npm run build
   ```

3. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

4. **Verify deployment**
   - Check hosting URL
   - Test API health endpoint
   - Verify Firestore rules deployed

---

## Recent Changes (2025-02-03)

### New Features Added

1. **Dedicated Users Management Page** (`/admin/users`)
   - Full CRUD operations for users
   - Search, filter by role and status
   - User statistics cards
   - Enable/disable user accounts (syncs with Firebase Auth)
   - Reset passwords

2. **Purchase Orders Management** (`/admin/purchase-orders`)
   - Complete PO management interface
   - Client name/email tracking
   - Status management (active/completed/cancelled)
   - Door count per PO

3. **Enhanced Door Creation**
   - Purchase Order dropdown selection (linked to PO collection)
   - Door Type dropdown selection (linked to door_types collection)
   - Auto-pressure selection based on door type
   - PO and Door Type details shown during creation

4. **Role-Based Dashboard Views**
   - Admin: Full system stats, user count, pending inspections/certifications
   - Inspector: Pending inspections, in-progress count, my inspections
   - Engineer: Pending certifications, certified count
   - Client: My doors, pending/available certificates

5. **User Account Management Improvements**
   - User status (active/inactive) now syncs with Firebase Auth disabled state
   - Orphaned Auth users fixed (created Firestore docs for inspector@inspex.com and client@inspex.com)

6. **Database Seeding**
   - Default serial config created
   - Default company settings created
   - Sample purchase order (PO-001) created
   - Default door types created (V1 400kPa, V2 140kPa)

### Navigation Updates
- Added "Users" link for admins
- Added "Purchase Orders" link for admins

### Backend Updates
- New route: `/purchase-orders` with full CRUD
- Updated `/users` PUT to sync status with Firebase Auth
- Updated `/doors` POST to accept `po_id` and `door_type_id`
- Added `door_type_id` field to Door interface
- Runtime updated from Node.js 18 to Node.js 20

---

## Resources

- **Firebase Console**: https://console.firebase.google.com/project/inspex001
- **Firestore Documentation**: https://firebase.google.com/docs/firestore
- **Firebase Functions**: https://firebase.google.com/docs/functions
- **React Documentation**: https://react.dev
