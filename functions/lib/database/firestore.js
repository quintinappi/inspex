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
        const data = doc.data();
        return Object.assign({ id: doc.id }, data);
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
    async deleteInspection(id) {
        // Get the inspection first
        const inspection = await this.getInspectionById(id);
        if (!inspection) {
            throw new Error('Inspection not found');
        }
        // Check for other inspections BEFORE deleting (prevents race condition)
        const allInspectionsSnapshot = await this.db.collection('door_inspections')
            .where('door_id', '==', inspection.door_id)
            .get();
        const isLastInspection = allInspectionsSnapshot.docs.length === 1 &&
            allInspectionsSnapshot.docs[0].id === id;
        // Delete all inspection checks
        const checksSnapshot = await this.db.collection('inspection_checks')
            .where('inspection_id', '==', id)
            .get();
        const batch = this.db.batch();
        checksSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete the inspection
        batch.delete(this.db.collection('door_inspections').doc(id));
        await batch.commit();
        // Update door status if this was the last inspection
        if (isLastInspection) {
            await this.updateDoor(inspection.door_id, {
                inspection_status: 'pending'
            });
        }
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
    async getCertificationsByEngineerId(engineerId) {
        const snapshot = await this.db.collection('certifications')
            .where('engineer_id', '==', engineerId)
            .orderBy('certified_at', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    async getCertificationsByDoorsInspectedByUser(userId) {
        // First, get all doors that were inspected by this user
        const inspectionsSnapshot = await this.db.collection('door_inspections')
            .where('inspector_id', '==', userId)
            .get();
        if (inspectionsSnapshot.empty) {
            return [];
        }
        const doorIds = inspectionsSnapshot.docs.map(doc => doc.data().door_id);
        // Now get certifications for those doors
        const certifications = [];
        // Since we can't do a where-in query directly, we need to batch or query individually
        // For now, let's do individual queries (assuming small number of certifications)
        for (const doorId of doorIds) {
            const certSnapshot = await this.db.collection('certifications')
                .where('door_id', '==', doorId)
                .orderBy('certified_at', 'desc')
                .get();
            certSnapshot.docs.forEach(doc => {
                certifications.push(Object.assign({ id: doc.id }, doc.data()));
            });
        }
        // Sort by certified_at desc
        return certifications.sort((a, b) => b.certified_at.seconds - a.certified_at.seconds);
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
        const [totalDoors, pendingInspections, completedInspections, inProgressInspections, pendingCertifications, underReviewCertifications, certifiedDoors] = await Promise.all([
            this.db.collection('doors').get(),
            this.db.collection('doors').where('inspection_status', '==', 'pending').get(),
            this.db.collection('doors').where('inspection_status', '==', 'completed').get(),
            this.db.collection('doors').where('inspection_status', '==', 'in_progress').get(),
            this.db.collection('doors')
                .where('inspection_status', '==', 'completed')
                .where('certification_status', '==', 'pending')
                .get(),
            this.db.collection('doors')
                .where('certification_status', '==', 'under_review')
                .get(),
            this.db.collection('doors').where('certification_status', '==', 'certified').get()
        ]);
        return {
            totalDoors: { count: totalDoors.size },
            pendingInspections: { count: pendingInspections.size },
            completedInspections: { count: completedInspections.size },
            inProgressInspections: { count: inProgressInspections.size },
            pendingCertifications: { count: pendingCertifications.size + underReviewCertifications.size },
            underReviewCertifications: { count: underReviewCertifications.size },
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
    async generateSerialNumber(doorNumber, size) {
        // Format: MF42-{size_code}-{door_number}
        // Size codes: 15 for 1.5m, 18 for 1.8m, 20 for 2.0m
        const sizeMap = {
            '1.5': '15',
            '1.8': '18',
            '2.0': '20',
            '1500': '15',
            '1800': '18',
            '2000': '20' // Handle mm format
        };
        const sizeCode = sizeMap[size] || '15';
        const paddedDoorNum = doorNumber.toString().padStart(4, '0');
        return `MF42-${sizeCode}-${paddedDoorNum}`;
    }
    generateDrawingNumber(nextNum) {
        return `S${nextNum}`;
    }
}
exports.FirestoreDB = FirestoreDB;
//# sourceMappingURL=firestore.js.map