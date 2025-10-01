"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreDB = void 0;
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin if not already initialized
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
class FirestoreDB {
    constructor() {
        this.db = db;
    }
    static getInstance() {
        if (!FirestoreDB.instance) {
            FirestoreDB.instance = new FirestoreDB();
        }
        return FirestoreDB.instance;
    }
    // User operations
    async getUserByEmail(email) {
        const snapshot = await this.db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        if (snapshot.empty)
            return null;
        const doc = snapshot.docs[0];
        return Object.assign({ id: doc.id }, doc.data());
    }
    async getUserById(id) {
        const doc = await this.db.collection('users').doc(id).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    }
    async createUser(userData) {
        const docRef = await this.db.collection('users').add(Object.assign(Object.assign({}, userData), { created_at: firestore_1.FieldValue.serverTimestamp() }));
        return docRef.id;
    }
    // Purchase Order operations
    async createPurchaseOrder(po_number) {
        const docRef = await this.db.collection('purchase_orders').add({
            po_number,
            created_at: firestore_1.FieldValue.serverTimestamp()
        });
        return docRef.id;
    }
    async getPurchaseOrderByNumber(po_number) {
        const snapshot = await this.db.collection('purchase_orders')
            .where('po_number', '==', po_number)
            .limit(1)
            .get();
        if (snapshot.empty)
            return null;
        const doc = snapshot.docs[0];
        return Object.assign({ id: doc.id }, doc.data());
    }
    // Door operations
    async createDoor(doorData) {
        const docRef = await this.db.collection('doors').add(Object.assign(Object.assign({}, doorData), { created_at: firestore_1.FieldValue.serverTimestamp() }));
        return docRef.id;
    }
    async getDoorById(id) {
        const doc = await this.db.collection('doors').doc(id).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    }
    async getAllDoors() {
        const snapshot = await this.db.collection('doors')
            .orderBy('created_at', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    async updateDoor(id, updates) {
        await this.db.collection('doors').doc(id).update(updates);
    }
    // Door Inspection operations
    async createInspection(inspectionData) {
        const docRef = await this.db.collection('door_inspections').add(inspectionData);
        return docRef.id;
    }
    async getInspectionById(id) {
        const doc = await this.db.collection('door_inspections').doc(id).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    }
    async updateInspection(id, updates) {
        await this.db.collection('door_inspections').doc(id).update(updates);
    }
    async getInspectionsByStatus(status) {
        const snapshot = await this.db.collection('door_inspections')
            .where('status', '==', status)
            .orderBy('inspection_date', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    // Inspection Point operations
    async getInspectionPoints() {
        const snapshot = await this.db.collection('inspection_points')
            .orderBy('order_index')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    // Inspection Check operations
    async createInspectionCheck(checkData) {
        const docRef = await this.db.collection('inspection_checks').add(checkData);
        return docRef.id;
    }
    async updateInspectionCheck(id, updates) {
        const updateData = Object.assign({}, updates);
        if (updates.is_checked) {
            updateData.checked_at = firestore_1.FieldValue.serverTimestamp();
        }
        await this.db.collection('inspection_checks').doc(id).update(updateData);
    }
    async getChecksByInspectionId(inspectionId) {
        const snapshot = await this.db.collection('inspection_checks')
            .where('inspection_id', '==', inspectionId)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    // Certification operations
    async createCertification(certData) {
        const docRef = await this.db.collection('certifications').add(Object.assign(Object.assign({}, certData), { certified_at: firestore_1.FieldValue.serverTimestamp() }));
        return docRef.id;
    }
    async getCertificationsByDoorId(doorId) {
        const snapshot = await this.db.collection('certifications')
            .where('door_id', '==', doorId)
            .orderBy('certified_at', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    async getAllCertifications() {
        const snapshot = await this.db.collection('certifications')
            .orderBy('certified_at', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    // Helper methods for complex queries
    async getDoorsWithPendingInspections() {
        const snapshot = await this.db.collection('doors')
            .where('inspection_status', '==', 'pending')
            .orderBy('created_at', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    async getDoorsWithCompletedInspections() {
        const snapshot = await this.db.collection('doors')
            .where('inspection_status', '==', 'completed')
            .where('certification_status', '==', 'pending')
            .orderBy('created_at', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    async getDashboardStats() {
        const [totalDoors, pendingInspections, completedInspections, inProgressInspections, pendingCertifications, certifiedDoors] = await Promise.all([
            this.db.collection('doors').get(),
            this.db.collection('doors').where('inspection_status', '==', 'pending').get(),
            this.db.collection('doors').where('inspection_status', '==', 'completed').get(),
            this.db.collection('doors').where('inspection_status', '==', 'in_progress').get(),
            this.db.collection('doors')
                .where('inspection_status', '==', 'completed')
                .where('certification_status', '==', 'pending')
                .get(),
            this.db.collection('doors').where('certification_status', '==', 'certified').get()
        ]);
        return {
            totalDoors: { count: totalDoors.size },
            pendingInspections: { count: pendingInspections.size },
            completedInspections: { count: completedInspections.size },
            inProgressInspections: { count: inProgressInspections.size },
            pendingCertifications: { count: pendingCertifications.size },
            certifiedDoors: { count: certifiedDoors.size }
        };
    }
    // Serial number generation
    async getNextSerialNumber() {
        const configDoc = await this.db.collection('system_config').doc('serial_numbers').get();
        const config = configDoc.exists ? configDoc.data() : { startingSerial: 200 };
        const snapshot = await this.db.collection('doors').get();
        return ((config === null || config === void 0 ? void 0 : config.startingSerial) || 200) + snapshot.size;
    }
    async generateSerialNumber(nextNum, doorType) {
        const configDoc = await this.db.collection('system_config').doc('serial_numbers').get();
        const config = configDoc.exists ? configDoc.data() : { serialPrefix: 'MUF-S199-RBD' };
        const paddedNum = nextNum.toString().padStart(2, '0');
        return `${(config === null || config === void 0 ? void 0 : config.serialPrefix) || 'MUF-S199-RBD'}${doorType}-${paddedNum}-0`;
    }
    generateDrawingNumber(nextNum) {
        return `S${nextNum}`;
    }
}
exports.FirestoreDB = FirestoreDB;
//# sourceMappingURL=firestore.js.map