import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// Firestore service to replace REST API calls
class FirestoreService {
  // Generic CRUD operations
  async get(collectionName, id) {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      throw new Error('Document not found');
    }
  }

  async getAll(collectionName, options = {}) {
    let q = collection(db, collectionName);

    if (options.where) {
      q = query(q, where(options.where.field, options.where.operator, options.where.value));
    }

    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
    }

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });

    return { data };
  }

  async create(collectionName, data) {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return { data: { id: docRef.id, ...data } };
  }

  async update(collectionName, id, data) {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });

    return { data: { id, ...data } };
  }

  async delete(collectionName, id) {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { data: { success: true } };
  }

  // Helper method to generate serial number in new format
  generateSerialNumber(doorNumber, size) {
    // Format: MF42-{size_code}-{door_number}
    // Size codes: 15 for 1.5m, 18 for 1.8m, 20 for 2.0m
    const sizeMap = {
      '1.5': '15',
      '1.8': '18',
      '2.0': '20',
      '1500': '15',
      '1800': '18',
      '2000': '20'
    };

    const sizeCode = sizeMap[size?.toString()] || '15';
    const paddedDoorNum = doorNumber.toString().padStart(4, '0');

    return `MF42-${sizeCode}-${paddedDoorNum}`;
  }

  // Door operations
  async getDoors() {
    const result = await this.getAll('doors', { orderBy: { field: 'createdAt', direction: 'desc' } });
    // Regenerate serial numbers for all doors
    if (result.data) {
      result.data = result.data.map(door => ({
        ...door,
        serial_number: this.generateSerialNumber(door.door_number, door.size)
      }));
    }
    return result;
  }

  async getDoor(id) {
    const result = await this.get('doors', id);
    // Regenerate serial number
    if (result.data) {
      console.log('🔍 DOOR BEFORE:', result.data.serial_number);
      console.log('🔍 Door number:', result.data.door_number, 'Size:', result.data.size);
      result.data.serial_number = this.generateSerialNumber(result.data.door_number, result.data.size);
      console.log('🔍 DOOR AFTER:', result.data.serial_number);
    }
    return result;
  }

  async createDoor(doorData) {
    // Generate serial and drawing numbers
    const doorsSnapshot = await getDocs(collection(db, 'doors'));
    const nextNum = doorsSnapshot.size > 0 ? doorsSnapshot.size + 200 : 200;

    // Generate serial number using new format: MF42-{size_code}-{door_number}
    const serialNumber = this.generateSerialNumber(doorData.door_number, doorData.size);

    // Generate drawing number: S{num}
    const drawingNumber = `S${nextNum.toString().padStart(3, '0')}`;

    // Generate description
    const description = `${doorData.size} Meter ${doorData.pressure} kPa Refuge Bay Door`;

    // Create door with generated fields
    const fullDoorData = {
      ...doorData,
      serial_number: serialNumber,
      drawing_number: drawingNumber,
      description: description,
      inspection_status: 'pending',
      certification_status: 'pending'
    };

    return this.create('doors', fullDoorData);
  }

  async updateDoor(id, doorData) {
    return this.update('doors', id, doorData);
  }

  async deleteDoor(id) {
    return this.delete('doors', id);
  }

  // Inspection operations
  async getInspections() {
    const result = await this.getAll('door_inspections', { orderBy: { field: 'inspection_date', direction: 'desc' } });

    // Enhance inspections with door and inspector data
    if (result.data) {
      const enhancedInspections = await Promise.all(result.data.map(async (inspection) => {
        // Get door data
        let doorData = {};
        if (inspection.door_id) {
          try {
            const doorResult = await this.getDoor(inspection.door_id);
            doorData = doorResult.data || {};
          } catch (e) {
            // Silently handle missing door documents
            doorData = { serial_number: 'N/A', drawing_number: 'N/A' };
          }
        }

        // Get inspector data
        let inspectorData = {};
        if (inspection.inspector_id) {
          try {
            const inspectorResult = await this.getUser(inspection.inspector_id);
            inspectorData = inspectorResult.data || {};
          } catch (e) {
            // Silently handle missing inspector documents
            inspectorData = { name: 'Unknown' };
          }
        }

        // Get checks count
        let totalChecks = 0;
        let completedChecks = 0;
        try {
          const checksSnapshot = await getDocs(
            query(
              collection(db, 'inspection_checks'),
              where('inspection_id', '==', inspection.id)
            )
          );
          totalChecks = checksSnapshot.size;
          completedChecks = checksSnapshot.docs.filter(doc => doc.data().is_checked === true).length;
        } catch (e) {
          // Silently handle missing checks
          totalChecks = 0;
          completedChecks = 0;
        }

        return {
          ...inspection,
          serial_number: doorData.serial_number || 'N/A',
          drawing_number: doorData.drawing_number || 'N/A',
          inspector_name: inspectorData.name || 'Unknown',
          total_checks: totalChecks,
          completed_checks: completedChecks
        };
      }));

      result.data = enhancedInspections;
    }

    return result;
  }

  async getInspection(id) {
    return this.get('door_inspections', id);
  }

  async createInspection(inspectionData) {
    return this.create('door_inspections', inspectionData);
  }

  async updateInspection(id, inspectionData) {
    return this.update('door_inspections', id, inspectionData);
  }

  async deleteInspection(id) {
    try {
      console.log('[FIRESTORE] Starting deleteInspection for:', id);

      // Get the inspection to find its door_id
      const inspection = await this.get('door_inspections', id);
      console.log('[FIRESTORE] Found inspection:', inspection.data);

      const doorId = inspection.data.door_id;

      // Delete all associated inspection checks
      const checksQuery = query(
        collection(db, 'inspection_checks'),
        where('inspection_id', '==', id)
      );
      const checksSnapshot = await getDocs(checksQuery);
      console.log('[FIRESTORE] Found', checksSnapshot.size, 'checks to delete');

      const deletePromises = [];
      checksSnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      console.log('[FIRESTORE] Deleted all inspection checks');

      // Delete the inspection
      await this.delete('door_inspections', id);
      console.log('[FIRESTORE] Deleted inspection document');

      // Update door status back to pending if door exists
      if (doorId) {
        try {
          // Check if door exists before trying to update
          const doorRef = doc(db, 'doors', doorId);
          const doorSnap = await getDoc(doorRef);

          if (doorSnap.exists()) {
            await updateDoc(doorRef, {
              inspection_status: 'pending',
              updatedAt: new Date().toISOString()
            });
            console.log('[FIRESTORE] Updated door status to pending');
          } else {
            console.warn('[FIRESTORE] Door not found, skipping status update:', doorId);
          }
        } catch (doorError) {
          // Don't fail the entire deletion if door update fails
          console.error('[FIRESTORE] Error updating door status (non-fatal):', doorError);
        }
      }

      console.log('[FIRESTORE] Inspection deletion completed successfully');
      return { data: { success: true } };
    } catch (error) {
      console.error('[FIRESTORE] Error deleting inspection:', error);
      throw error;
    }
  }

  // Certification operations
  async getCertifications() {
    return this.getAll('certifications', { orderBy: { field: 'createdAt', direction: 'desc' } });
  }

  async getCertification(id) {
    return this.get('certifications', id);
  }

  // Config operations
  async getConfig() {
    const configDoc = await getDoc(doc(db, 'config', 'app_config'));
    if (configDoc.exists()) {
      return { data: configDoc.data() };
    }
    // Return default config if doesn't exist (correct prefix)
    const defaultConfig = {
      serialPrefix: 'MUF-S199-RBD',
      startingSerial: '200'
    };
    return { data: defaultConfig };
  }

  async updateConfig(configData) {
    const configRef = doc(db, 'config', 'app_config');
    // Use setDoc with merge to create if doesn't exist, update if it does
    await setDoc(configRef, {
      ...configData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { data: configData };
  }

  // User operations
  async getUsers() {
    return this.getAll('users', { orderBy: { field: 'createdAt', direction: 'desc' } });
  }

  async getUser(id) {
    return this.get('users', id);
  }

  async createUser(userData) {
    return this.create('users', userData);
  }

  async updateUser(id, userData) {
    return this.update('users', id, userData);
  }

  async deleteUser(id) {
    return this.delete('users', id);
  }

  // Admin dashboard
  async getAdminDashboard() {
    try {
      // Get statistics
      const doorsSnapshot = await getDocs(collection(db, 'doors'));
      const inspectionsSnapshot = await getDocs(collection(db, 'door_inspections'));
      const usersSnapshot = await getDocs(collection(db, 'users'));

      const totalDoors = doorsSnapshot.size;
      const totalInspections = inspectionsSnapshot.size;
      const activeUsers = usersSnapshot.size;

      // Count doors by status
      let pendingInspections = 0;
      let inProgressInspections = 0;
      let completedInspections = 0;
      let pendingCertifications = 0;
      let certifiedDoors = 0;

      doorsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.inspection_status === 'pending') {
          pendingInspections++;
        } else if (data.inspection_status === 'in_progress') {
          inProgressInspections++;
        } else if (data.inspection_status === 'completed') {
          if (data.certification_status === 'pending') {
            pendingCertifications++;
          } else if (data.certification_status === 'certified') {
            certifiedDoors++;
          }
          completedInspections++;
        }
      });

      // Get recent activity (last 10 inspections)
      const recentInspectionsQuery = query(
        collection(db, 'door_inspections'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const recentSnapshot = await getDocs(recentInspectionsQuery);
      const recentActivity = [];

      recentSnapshot.forEach((doc) => {
        const data = doc.data();
        recentActivity.push({
          description: `Inspection ${data.status || 'created'} for door ${data.door_id || 'unknown'}`,
          timestamp: data.createdAt || new Date().toISOString()
        });
      });

      return {
        data: {
          statistics: {
            totalDoors: { count: totalDoors },
            totalInspections: { count: totalInspections },
            pendingInspections: { count: pendingInspections },
            inProgressInspections: { count: inProgressInspections },
            completedInspections: { count: completedInspections },
            pendingCertifications: { count: pendingCertifications },
            certifiedDoors: { count: certifiedDoors },
            activeUsers
          },
          recentActivity
        }
      };
    } catch (error) {
      console.error('Error getting admin dashboard:', error);
      return {
        data: {
          statistics: {
            totalDoors: { count: 0 },
            totalInspections: { count: 0 },
            pendingInspections: { count: 0 },
            inProgressInspections: { count: 0 },
            completedInspections: { count: 0 },
            pendingCertifications: { count: 0 },
            certifiedDoors: { count: 0 },
            activeUsers: 0
          },
          recentActivity: []
        }
      };
    }
  }

  // Enhanced inspection operations
  async getDoorsByStatus(status) {
    const q = query(
      collection(db, 'doors'),
      where('inspection_status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      const doorData = { id: doc.id, ...doc.data() };
      // Regenerate serial number
      doorData.serial_number = this.generateSerialNumber(doorData.door_number, doorData.size);
      data.push(doorData);
    });
    return { data };
  }

  async getInspectionPoints() {
    return this.getAll('inspection_points', {
      orderBy: { field: 'order_index', direction: 'asc' }
    });
  }

  async startInspection(doorId) {
    try {
      // Get current user
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get inspection points
      const pointsResult = await this.getInspectionPoints();
      const points = pointsResult.data;

      if (!points || points.length === 0) {
        throw new Error('No inspection points found. Please seed the database first.');
      }

      // Create inspection
      const inspectionRef = await addDoc(collection(db, 'door_inspections'), {
        door_id: doorId,
        inspector_id: userId,
        status: 'in_progress',
        inspection_date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create checks for each inspection point
      const checks = [];
      for (const point of points) {
        const checkRef = await addDoc(collection(db, 'inspection_checks'), {
          inspection_id: inspectionRef.id,
          inspection_point_id: point.id,
          is_checked: false,
          notes: '',
          photo_path: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        checks.push({
          id: checkRef.id,
          ...point,
          is_checked: false,
          notes: '',
          photo_path: null
        });
      }

      // Update door status
      await updateDoc(doc(db, 'doors', doorId), {
        inspection_status: 'in_progress',
        updatedAt: new Date().toISOString()
      });

      // Get door details
      const doorDoc = await getDoc(doc(db, 'doors', doorId));
      const doorData = { id: doorDoc.id, ...doorDoc.data() };
      // Regenerate serial number
      if (doorData.door_number && doorData.size) {
        doorData.serial_number = this.generateSerialNumber(doorData.door_number, doorData.size);
      }

      return {
        data: {
          inspection: {
            id: inspectionRef.id,
            door_id: doorId,
            status: 'in_progress',
            ...doorData
          },
          checks
        }
      };
    } catch (error) {
      console.error('Error starting inspection:', error);
      throw error;
    }
  }

  async getInspectionWithChecks(inspectionId) {
    try {
      const inspection = await this.get('door_inspections', inspectionId);

      // Get checks
      const checksQuery = query(
        collection(db, 'inspection_checks'),
        where('inspection_id', '==', inspectionId)
      );
      const checksSnapshot = await getDocs(checksQuery);
      const checks = [];

      // Get inspection points for reference
      const points = await this.getInspectionPoints();
      const pointsMap = {};
      points.data.forEach(p => {
        pointsMap[p.id] = p;
      });

      checksSnapshot.forEach((doc) => {
        const checkData = { id: doc.id, ...doc.data() };
        const point = pointsMap[checkData.inspection_point_id];
        checks.push({
          ...checkData,
          name: point?.name || '',
          description: point?.description || '',
          order_index: point?.order_index || 0
        });
      });

      // Sort by order
      checks.sort((a, b) => a.order_index - b.order_index);

      // Get door data - handle missing door gracefully
      let doorData = { data: {} };
      try {
        doorData = await this.get('doors', inspection.data.door_id);
        // Regenerate serial number using the same method as getDoor()
        if (doorData.data.door_number && doorData.data.size) {
          doorData.data.serial_number = this.generateSerialNumber(doorData.data.door_number, doorData.data.size);
        }
      } catch (error) {
        console.warn('Could not fetch door details:', error);
      }

      // Get inspector data
      let inspector_name = 'Unknown Inspector';
      if (inspection.data.inspector_id) {
        try {
          const inspectorData = await this.get('users', inspection.data.inspector_id);
          inspector_name = inspectorData.data.name || inspectorData.data.email;
        } catch (error) {
          console.warn('Could not fetch inspector details:', error);
        }
      }

      return {
        data: {
          inspection: {
            ...inspection.data,
            serial_number: doorData.data.serial_number || 'N/A',
            drawing_number: doorData.data.drawing_number || 'N/A',
            description: doorData.data.description || 'N/A',
            inspector_name
          },
          checks
        }
      };
    } catch (error) {
      console.error('Error getting inspection with checks:', error);
      throw error;
    }
  }

  async updateInspectionCheck(checkId, data) {
    return this.update('inspection_checks', checkId, data);
  }

  async completeInspection(inspectionId, notes) {
    try {
      const inspection = await this.get('door_inspections', inspectionId);

      await this.update('door_inspections', inspectionId, {
        status: 'completed',
        completion_notes: notes || '',
        completed_at: new Date().toISOString()
      });

      await this.update('doors', inspection.data.door_id, {
        inspection_status: 'completed'
      });

      // Send email notification to engineers
      try {
        // Get door details
        const doorResult = await this.getDoor(inspection.data.door_id);
        const doorDetails = doorResult.data;

        // Get inspector name
        const inspectorResult = await this.getUser(inspection.data.inspector_id);
        const inspectorName = inspectorResult.data.name || 'Unknown Inspector';

        // Get all engineers to notify
        const usersSnapshot = await getDocs(
          query(
            collection(db, 'users'),
            where('role', '==', 'engineer')
          )
        );

        const engineerEmails = [];
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.email && userData.status === 'active') {
            engineerEmails.push(userData.email);
          }
        });

        if (engineerEmails.length > 0) {
          // Call the backend email API
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${process.env.REACT_APP_API_URL}/email/inspection-completed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              doorDetails,
              inspectorName,
              recipientEmails: engineerEmails
            })
          });

          if (!response.ok) {
            console.error('Failed to send email notification:', await response.text());
          } else {
            console.log('Email notification sent successfully to engineers');
          }
        }
      } catch (emailError) {
        // Don't fail the inspection completion if email fails
        console.error('Error sending email notification:', emailError);
      }

      return { data: { success: true } };
    } catch (error) {
      console.error('Error completing inspection:', error);
      throw error;
    }
  }

  async getDoorsPendingCertification() {
    try {
      // Get doors with completed inspections pending certification
      const doorsQuery = query(
        collection(db, 'doors'),
        where('inspection_status', '==', 'completed'),
        where('certification_status', '==', 'pending')
      );
      const doorsSnapshot = await getDocs(doorsQuery);
      const doors = [];

      // Enhance with inspection and inspector details
      for (const doorDoc of doorsSnapshot.docs) {
        const doorData = { id: doorDoc.id, ...doorDoc.data() };
        // Regenerate serial number
        if (doorData.door_number && doorData.size) {
          doorData.serial_number = this.generateSerialNumber(doorData.door_number, doorData.size);
        }

        // Get latest completed inspection
        const inspectionsQuery = query(
          collection(db, 'door_inspections'),
          where('door_id', '==', doorDoc.id),
          where('status', '==', 'completed'),
          orderBy('inspection_date', 'desc'),
          limit(1)
        );
        const inspectionsSnapshot = await getDocs(inspectionsQuery);

        if (!inspectionsSnapshot.empty) {
          const inspectionData = inspectionsSnapshot.docs[0].data();

          // Get inspector name
          let inspector_name = 'Unknown Inspector';
          if (inspectionData.inspector_id) {
            try {
              const inspectorData = await this.get('users', inspectionData.inspector_id);
              inspector_name = inspectorData.data.name || inspectorData.data.email;
            } catch (error) {
              console.warn('Could not fetch inspector details:', error);
            }
          }

          doors.push({
            ...doorData,
            inspection_date: inspectionData.inspection_date,
            inspector_name
          });
        } else {
          doors.push(doorData);
        }
      }

      return { data: doors };
    } catch (error) {
      console.error('Error getting doors pending certification:', error);
      throw error;
    }
  }

  async getCompletedCertifications() {
    try {
      const certifications = await this.getAll('certifications', {
        orderBy: { field: 'createdAt', direction: 'desc' }
      });

      // Enhance with door and engineer details
      const enhancedCertifications = await Promise.all(
        certifications.data.map(async (cert) => {
          let doorData = {};
          let engineerName = 'Unknown Engineer';

          // Get door data
          if (cert.door_id) {
            try {
              const door = await this.getDoor(cert.door_id);
              doorData = door.data;
            } catch (error) {
              console.warn('Could not fetch door details:', error);
            }
          }

          // Get engineer data
          if (cert.engineer_id) {
            try {
              const engineer = await this.get('users', cert.engineer_id);
              engineerName = engineer.data.name || engineer.data.email;
            } catch (error) {
              console.warn('Could not fetch engineer details:', error);
            }
          }

          return {
            ...cert,
            serial_number: doorData.serial_number,
            drawing_number: doorData.drawing_number,
            description: doorData.description,
            engineer_name: engineerName
          };
        })
      );

      return { data: enhancedCertifications };
    } catch (error) {
      console.error('Error getting completed certifications:', error);
      throw error;
    }
  }
}

const firestoreService = new FirestoreService();
export default firestoreService;
