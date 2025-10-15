"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const seedData_1 = require("./database/seedData");
// Route imports
const auth_1 = __importDefault(require("./routes/auth"));
const doors_1 = __importDefault(require("./routes/doors"));
const inspections_1 = __importDefault(require("./routes/inspections"));
const certifications_1 = __importDefault(require("./routes/certifications"));
const admin_1 = __importDefault(require("./routes/admin"));
const email_1 = __importDefault(require("./routes/email"));
const users_1 = __importDefault(require("./routes/users"));
const doorTypes_1 = __importDefault(require("./routes/doorTypes"));
const debug_1 = require("./routes/debug");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Initialize Firestore data on startup
(0, seedData_1.initializeFirestore)().catch(console.error);
// Routes
app.use('/auth', auth_1.default);
app.use('/doors', doors_1.default);
app.use('/inspections', inspections_1.default);
app.use('/certifications', certifications_1.default);
app.use('/admin', admin_1.default);
app.use('/email', email_1.default);
app.use('/users', users_1.default);
app.use('/door-types', doorTypes_1.default);
// Debug routes (temporary - remove after debugging)
app.get('/debug/door/MF42-15-1041', debug_1.debugDoorQuery);
app.get('/debug/doors', debug_1.debugAllDoors);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'INSPEX API is running on Firebase Functions', timestamp: Date.now() });
});
// Error handling middleware
app.use((error, req, res, next) => {
    console.error('API Error:', error);
    res.status(500).json({
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});
// Export the Express app as a Firebase Function
exports.api = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 300,
    maxInstances: 100
}, app);
//# sourceMappingURL=index.js.map