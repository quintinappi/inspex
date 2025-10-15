import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'inspector' | 'engineer' | 'client';
  created_at: Timestamp;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  created_at: Timestamp;
}

export interface Door {
  id: string;
  po_id: string;
  door_number: number;
  serial_number: string;
  drawing_number: string;
  job_number: string;
  description: string;
  pressure: number;
  door_type: string;
  size: string;
  inspection_status: 'pending' | 'in_progress' | 'completed';
  certification_status: 'pending' | 'under_review' | 'certified' | 'rejected';
  rejection_reason?: string;
  completion_status: 'pending' | 'completed';
  paid_status: 'pending' | 'paid';
  created_at: Timestamp;
}

export interface DoorInspection {
  id: string;
  door_id: string;
  inspector_id: string;
  inspection_date: Timestamp;
  completed_date?: Timestamp;
  status: 'in_progress' | 'completed' | 'superseded';
  notes?: string;
}

export interface InspectionPoint {
  id: string;
  name: string;
  description: string;
  order_index: number;
}

export interface InspectionCheck {
  id: string;
  inspection_id: string;
  inspection_point_id: string;
  is_checked: boolean;
  photo_path?: string;
  notes?: string;
  checked_at?: Timestamp;
}

export interface Certification {
  id: string;
  door_id: string;
  engineer_id: string;
  certified_at: Timestamp;
  certificate_pdf_path: string;
  signature?: string;
}

export class FirestoreDB {
  private static instance: FirestoreDB;
  public db = db;

  public static getInstance(): FirestoreDB {
    if (!FirestoreDB.instance) {
      FirestoreDB.instance = new FirestoreDB();
    }
    return FirestoreDB.instance;
  }

  // User operations
  async getUserByEmail(email: string): Promise<User | null> {
    const snapshot = await this.db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  async getUserById(id: string): Promise<User | null> {
    const doc = await this.db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as User;
  }

  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<string> {
    const docRef = await this.db.collection('users').add({
      ...userData,
      created_at: FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  // Purchase Order operations
  async createPurchaseOrder(po_number: string): Promise<string> {
    const docRef = await this.db.collection('purchase_orders').add({
      po_number,
      created_at: FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async getPurchaseOrderByNumber(po_number: string): Promise<PurchaseOrder | null> {
    const snapshot = await this.db.collection('purchase_orders')
      .where('po_number', '==', po_number)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as PurchaseOrder;
  }

  // Door operations
  async createDoor(doorData: Omit<Door, 'id' | 'created_at'>): Promise<string> {
    const docRef = await this.db.collection('doors').add({
      ...doorData,
      created_at: FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async getDoorById(id: string): Promise<Door | null> {
    const doc = await this.db.collection('doors').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Door;
  }

  async getAllDoors(): Promise<Door[]> {
    const snapshot = await this.db.collection('doors')
      .orderBy('created_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Door));
  }

  async updateDoor(id: string, updates: Partial<Door>): Promise<void> {
    await this.db.collection('doors').doc(id).update(updates);
  }

  // Door Inspection operations
  async createInspection(inspectionData: Omit<DoorInspection, 'id'>): Promise<string> {
    const docRef = await this.db.collection('door_inspections').add(inspectionData);
    return docRef.id;
  }

  async getInspectionById(id: string): Promise<DoorInspection | null> {
    const doc = await this.db.collection('door_inspections').doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as Omit<DoorInspection, 'id'>;
    return { id: doc.id, ...data };
  }

  async updateInspection(id: string, updates: Partial<DoorInspection>): Promise<void> {
    await this.db.collection('door_inspections').doc(id).update(updates);
  }

  async getInspectionsByStatus(status: string): Promise<DoorInspection[]> {
    const snapshot = await this.db.collection('door_inspections')
      .where('status', '==', status)
      .orderBy('inspection_date', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DoorInspection));
  }

  async deleteInspection(id: string): Promise<void> {
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
  async getInspectionPoints(): Promise<InspectionPoint[]> {
    const snapshot = await this.db.collection('inspection_points')
      .orderBy('order_index')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InspectionPoint));
  }

  // Inspection Check operations
  async createInspectionCheck(checkData: Omit<InspectionCheck, 'id'>): Promise<string> {
    const docRef = await this.db.collection('inspection_checks').add(checkData);
    return docRef.id;
  }

  async updateInspectionCheck(id: string, updates: Partial<InspectionCheck>): Promise<void> {
    const updateData: any = { ...updates };
    if (updates.is_checked) {
      updateData.checked_at = FieldValue.serverTimestamp();
    }
    await this.db.collection('inspection_checks').doc(id).update(updateData);
  }

  async getChecksByInspectionId(inspectionId: string): Promise<InspectionCheck[]> {
    const snapshot = await this.db.collection('inspection_checks')
      .where('inspection_id', '==', inspectionId)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InspectionCheck));
  }

  // Certification operations
  async createCertification(certData: Omit<Certification, 'id' | 'certified_at'>): Promise<string> {
    const docRef = await this.db.collection('certifications').add({
      ...certData,
      certified_at: FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async getCertificationsByDoorId(doorId: string): Promise<Certification[]> {
    const snapshot = await this.db.collection('certifications')
      .where('door_id', '==', doorId)
      .orderBy('certified_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certification));
  }

  async getAllCertifications(): Promise<Certification[]> {
    const snapshot = await this.db.collection('certifications')
      .orderBy('certified_at', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certification));
  }

  async getCertificationsByEngineerId(engineerId: string): Promise<Certification[]> {
    const snapshot = await this.db.collection('certifications')
      .where('engineer_id', '==', engineerId)
      .orderBy('certified_at', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certification));
  }

  async getCertificationsByDoorsInspectedByUser(userId: string): Promise<Certification[]> {
    // First, get all doors that were inspected by this user
    const inspectionsSnapshot = await this.db.collection('door_inspections')
      .where('inspector_id', '==', userId)
      .get();

    if (inspectionsSnapshot.empty) {
      return [];
    }

    const doorIds = inspectionsSnapshot.docs.map(doc => doc.data().door_id);

    // Now get certifications for those doors
    const certifications: Certification[] = [];

    // Since we can't do a where-in query directly, we need to batch or query individually
    // For now, let's do individual queries (assuming small number of certifications)
    for (const doorId of doorIds) {
      const certSnapshot = await this.db.collection('certifications')
        .where('door_id', '==', doorId)
        .orderBy('certified_at', 'desc')
        .get();

      certSnapshot.docs.forEach(doc => {
        certifications.push({ id: doc.id, ...doc.data() } as Certification);
      });
    }

    // Sort by certified_at desc
    return certifications.sort((a, b) => b.certified_at.seconds - a.certified_at.seconds);
  }

  // Helper methods for complex queries
  async getDoorsWithPendingInspections(): Promise<Door[]> {
    const snapshot = await this.db.collection('doors')
      .where('inspection_status', '==', 'pending')
      .orderBy('created_at', 'asc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Door));
  }

  async getDoorsWithCompletedInspections(): Promise<Door[]> {
    const snapshot = await this.db.collection('doors')
      .where('inspection_status', '==', 'completed')
      .where('certification_status', '==', 'pending')
      .orderBy('created_at', 'asc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Door));
  }

  async getDashboardStats() {
    const [
      totalDoors,
      pendingInspections,
      completedInspections,
      inProgressInspections,
      pendingCertifications,
      underReviewCertifications,
      certifiedDoors
    ] = await Promise.all([
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
  async getNextSerialNumber(): Promise<number> {
    const configDoc = await this.db.collection('system_config').doc('serial_numbers').get();
    const config = configDoc.exists ? configDoc.data() : { startingSerial: 200 };

    const snapshot = await this.db.collection('doors').get();
    return (config?.startingSerial || 200) + snapshot.size;
  }

  async generateSerialNumber(doorNumber: number, size: string): Promise<string> {
    // Format: MF42-{size_code}-{door_number}
    // Size codes: 15 for 1.5m, 18 for 1.8m, 20 for 2.0m
    const sizeMap: { [key: string]: string } = {
      '1.5': '15',
      '1.8': '18',
      '2.0': '20',
      '1500': '15',  // Handle mm format
      '1800': '18',  // Handle mm format
      '2000': '20'   // Handle mm format
    };

    const sizeCode = sizeMap[size] || '15';
    const paddedDoorNum = doorNumber.toString().padStart(4, '0');

    return `MF42-${sizeCode}-${paddedDoorNum}`;
  }

  generateDrawingNumber(nextNum: number): string {
    return `S${nextNum}`;
  }
}
