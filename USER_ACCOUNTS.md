# INSPEX User Accounts

## Current User Accounts

### Administrator Account
- **Email**: admin@inspex.com
- **Password**: Admin@2025
- **Role**: Administrator
- **Permissions**: Full system access, user management, configuration

### Inspector Account
- **Email**: quintin@de-bruin.co.za
- **Password**: Inspector@2025
- **Role**: Inspector
- **Permissions**: Create and complete door inspections

### Engineer Account
- **Email**: quintin@app-i.co.za
- **Password**: Engineer@2025
- **Role**: Engineer
- **Permissions**: Review inspections, approve/reject doors, generate certificates

### Client Account
- **Email**: spectivmech@gmail.com
- **Password**: Client@2025
- **Role**: Client
- **Permissions**: View certifications, download certificates

---

## Password Management

### Changing Passwords
All users can change their passwords from their Profile page:
1. Click on "Profile" in the navigation menu
2. Scroll to "Change Password" section
3. Enter current password
4. Enter new password (minimum 8 characters)
5. Confirm new password
6. Click "Change Password"

### Password Requirements
- Minimum 8 characters
- Must be different from current password
- Current password required for verification

### Forgot Password
Password reset functionality is available via Firebase Auth email reset. This will be configured once Firebase hosting is set up.

---

## Security Notes

⚠️ **IMPORTANT**: All users should change their default passwords immediately after first login!

The default passwords listed above are temporary and should only be used for initial setup and testing.

---

## Firebase Authentication

Users are authenticated using Firebase Authentication with email/password. User profiles are stored in Firestore under the `users` collection.

Each user document contains:
- `name`: Full name
- `email`: Email address
- `role`: User role (admin, inspector, engineer, client)
- `status`: Account status (active, inactive)
- `company`: Company name (optional)
- `phone`: Phone number (optional)
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp
