# INSPEX - Refuge Bay Door Inspection System

A comprehensive web application for managing refuge bay door inspections, certifications, and documentation.

## Features

- **Responsive Design**: Works on mobile devices and browsers
- **User Management**: Admin, Inspector, Engineer, and Client roles
- **Door Management**: Add doors with auto-generated serial/drawing numbers
- **Dynamic Inspections**: Configurable inspection points with photo uploads
- **Digital Signatures**: Engineers can digitally sign certificates
- **PDF Generation**: Automatic certificate generation with PDF download
- **Email Notifications**: Automated notifications for inspection completion and certification
- **Input Validation**: Server-side validation for all user inputs
- **Admin Dashboard**: Complete system overview and management
- **Health Monitoring**: Built-in health check endpoint for monitoring

## Door Types Supported

- **400 kPa V1 Doors**: 1.5M, 1.8M, 2.0M sizes
- **140 kPa V2 Doors**: 1.5M, 1.8M, 2.0M sizes

## Serial Number Generation

- Format: `MUF-S[###]-RBD[V1/V2]-01-0`
- Drawing Number: `S[###]`
- Auto-incremented based on existing doors

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone/Download the project**
   ```bash
   cd inspex
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install

   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your settings:
   ```
   PORT=9876
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open browser: `http://localhost:3000`
   - Default login:
     - Email: `admin@inspex.com`
     - Password: `admin123`

## Usage Guide

### Adding a New Door

1. Navigate to **Doors** → **Add Door**
2. Fill in:
   - PO Number
   - Door Number
   - Job Number (optional)
   - Size (1.5M, 1.8M, or 2.0M)
   - Pressure (140 kPa or 400 kPa)
3. Serial and Drawing numbers are auto-generated

### Conducting an Inspection

1. Go to **Inspections**
2. Select a door from pending list
3. Click **Start Inspection**
4. Complete each checkpoint:
   - Check the box if passed
   - Upload photo evidence
   - Add notes if needed
5. Complete inspection when finished

### Certifying a Door

1. Engineers go to **Certifications**
2. Review pending certifications
3. Click **Review** on a door
4. Verify all inspection points
5. Add digital signature
6. Click **Certify**
7. PDF certificate is auto-generated

### Admin Functions

1. **User Management**: Add inspectors and engineers
2. **Inspection Points**: Modify checklist items
3. **Dashboard**: View system statistics
4. **Bulk Import**: Import multiple doors

## File Structure

```
inspex/
├── server/                 # Backend API
│   ├── database/          # SQLite database and schema
│   ├── routes/            # API routes
│   ├── uploads/           # Uploaded inspection photos
│   └── certificates/      # Generated certificates
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React contexts
│   │   └── services/      # API services
│   └── public/
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Doors
- `GET /api/doors` - List all doors
- `POST /api/doors` - Add new door
- `GET /api/doors/:id` - Get door details

### Inspections
- `POST /api/inspections/start/:doorId` - Start inspection
- `GET /api/inspections/:id` - Get inspection details
- `PUT /api/inspections/check/:checkId` - Update inspection check
- `POST /api/inspections/complete/:id` - Complete inspection

### Certifications
- `GET /api/certifications/pending` - Get pending certifications
- `POST /api/certifications/certify/:doorId` - Certify door
- `GET /api/certifications/download/:doorId` - Download certificate

## Database Schema

- **users**: System users (admin, inspector, engineer)
- **doors**: Door records with auto-generated numbers
- **purchase_orders**: PO tracking
- **inspection_points**: Configurable checklist items
- **door_inspections**: Inspection sessions
- **inspection_checks**: Individual checkpoint results
- **certifications**: Engineer certifications

## Troubleshooting

### Common Issues

1. **Port 9876 already in use**
   - Change PORT in `.env` file
   - Or kill process: `lsof -ti:9876 | xargs kill -9`

2. **Database issues**
   - Delete `server/database/inspex.db` to reset
   - Restart server to recreate

3. **Photo upload fails**
   - Check `server/uploads/inspections` directory exists
   - Verify file permissions

4. **Email not working**
   - Check email configuration in `.env`
   - Use app passwords for Gmail

### Development Mode

Start development servers separately:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Health Check

Monitor application health:
```bash
curl http://localhost:9876/health
```

### Email Configuration

To enable email notifications:
1. For Gmail: Create an [App Password](https://support.google.com/accounts/answer/185833)
2. Update `.env` with your credentials:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```
3. Restart the server

**Note**: Email notifications will gracefully fail if not configured, allowing the system to work without them.

## Production Deployment

1. **Build the client**
   ```bash
   cd client
   npm run build
   cd ..
   ```

2. **Set environment**
   ```bash
   export NODE_ENV=production
   ```

3. **Start server**
   ```bash
   npm start
   ```

## Support

For issues or questions, check the following:
- Ensure all dependencies are installed
- Check console for error messages
- Verify database file permissions
- Confirm email configuration for notifications

## Recent Improvements

- ✅ Input validation on all API endpoints
- ✅ Email notification system for inspection completion and certification
- ✅ Environment variable validation on startup
- ✅ Health check endpoint for monitoring
- ✅ Production-ready error handling
- ✅ Security enhancements (sanitized inputs, parameterized queries)
- ✅ Improved configuration management

## API Endpoints

### System
- `GET /health` - Health check
- `GET /api` - API information

### Additional Notes

- All API endpoints require authentication (except login)
- Refer to the route files in `server/routes/` for complete API documentation
- Email notifications are optional but recommended for production use

## License

This project is proprietary software for refuge bay door inspection management.