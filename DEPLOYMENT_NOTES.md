# INSPEX Deployment Notes

## Current Architecture

**IMPORTANT**: The INSPEX app currently uses **direct Firestore access** from the React client, NOT Firebase Functions.

### Why Direct Firestore?

The original implementation plan called for Firebase Functions as a backend API, but the current working implementation bypasses this by:
- Using Firebase Authentication directly from the client
- Using Firestore SDK directly from the client (`client/src/services/firestoreService.js`)
- All CRUD operations happen client-side through Firestore

### What This Means

✅ **Works Now**:
- User authentication (login, password reset)
- Door management (create, read, update, delete)
- User management (admin panel)
- Serial number generation (client-side)
- Data persistence in Firestore

❌ **Not Yet Implemented** (requires Firebase Functions):
- Email notifications (inspection completed, certification ready, etc.)
- Server-side validation
- PDF certificate generation
- Complex business logic

### Email Notifications

Email notification service has been created but requires Firebase Functions deployment:
- `functions/src/services/emailService.ts` - Email service
- `functions/src/routes/email.ts` - Email API routes
- Configuration: doors@spectiv.co.za with SMTP settings in `functions/.env`

To enable email notifications:
1. Fix TypeScript compilation errors in Firebase Functions
2. Deploy functions: `cd functions && firebase deploy --only functions`
3. Update `REACT_APP_FUNCTIONS_URL` in `client/.env`

### Security Considerations

⚠️ **Current Firestore Rules**: Open for authenticated users
```javascript
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

**Before Production**:
- Implement role-based security rules
- Move business logic to Firebase Functions
- Add server-side validation
- Rotate Firebase API key (currently exposed in git history)

### Firebase Functions TypeScript Issues

The Firebase Functions codebase has TypeScript compilation errors that need to be resolved before deployment:
- Request type mismatch with Express middleware
- PDFKit import issues
- Property access on Firestore documents

These do NOT affect the current working app since it doesn't use Functions.

## Deployment Checklist

### Current State (Direct Firestore)
- [x] Firebase project created (inspex001)
- [x] Firestore database configured
- [x] Firebase Authentication enabled
- [x] Firestore rules deployed (open for authenticated users)
- [x] React client configured
- [x] User management working
- [x] Door management working
- [x] Serial number generation working
- [x] Password reset functionality

### Before Production
- [ ] Secure Firestore rules (role-based access)
- [ ] Fix Firebase Functions TypeScript errors
- [ ] Deploy Firebase Functions
- [ ] Enable email notifications
- [ ] Rotate exposed Firebase API key
- [ ] Set up custom domain
- [ ] Configure Firebase Hosting
- [ ] Enable backup/restore for Firestore
- [ ] Set up monitoring and alerts

## Running the App

### Development
```bash
# Start React client
cd client && npm start

# App runs on http://localhost:3000
```

### User Accounts
See USER_ACCOUNTS.md for login credentials.

### Testing Email
```bash
# Test email configuration (works standalone)
node test-email-direct.js
```

## Architecture Decision

The current direct Firestore approach was chosen because:
1. Faster development - no backend API to build
2. Firebase SDK handles auth, offline support, real-time updates
3. Simpler deployment - just client hosting

Trade-offs:
- Less control over business logic
- Security depends entirely on Firestore rules
- Can't easily add complex server-side operations

For production, consider migrating critical operations to Firebase Functions.
