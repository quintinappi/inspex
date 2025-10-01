"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const express = __importStar(require("express"));
const cors = __importStar(require("cors"));
const seedData_1 = require("./database/seedData");
// Route imports
const auth_1 = __importDefault(require("./routes/auth"));
const doors_1 = __importDefault(require("./routes/doors"));
const inspections_1 = __importDefault(require("./routes/inspections"));
const certifications_1 = __importDefault(require("./routes/certifications"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = express();
// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Initialize Firestore data on startup
(0, seedData_1.initializeFirestore)().catch(console.error);
// Routes
app.use('/auth', auth_1.default);
app.use('/doors', doors_1.default);
app.use('/inspections', inspections_1.default);
app.use('/certifications', certifications_1.default);
app.use('/admin', admin_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'INSPEX API is running on Firebase Functions' });
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