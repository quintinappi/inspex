const https = require('https');

// Function to query the deployed Firebase API
async function queryDoorViaAPI() {
  console.log('🔍 QUERYING DOOR MF42-15-1041 VIA DEPLOYED API');
  console.log('='.repeat(60));

  // Your deployed Firebase Functions URL - you may need to update this
  const baseUrl = 'https://us-central1-inspex001.cloudfunctions.net/api';

  try {
    // First try to get all doors and find the one we need
    console.log('\n📄 Fetching all doors from API...');

    const doorsResponse = await fetch(`${baseUrl}/doors`);

    if (!doorsResponse.ok) {
      throw new Error(`HTTP error! status: ${doorsResponse.status}`);
    }

    const doors = await doorsResponse.json();
    console.log(`Received ${doors.length} doors from API`);

    // Find the specific door
    const targetDoor = doors.find(door => door.serial_number === 'MF42-15-1041');

    if (!targetDoor) {
      console.log('\n❌ Door MF42-15-1041 not found in API response');

      // Show similar doors
      const similarDoors = doors.filter(door =>
        door.serial_number && door.serial_number.includes('MF42')
      ).slice(0, 5);

      if (similarDoors.length > 0) {
        console.log('\n🔍 Similar doors found:');
        similarDoors.forEach(door => {
          console.log(`  🚪 ${door.serial_number} - Inspection: "${door.inspection_status}", Certification: "${door.certification_status}"`);
        });
      }

      return;
    }

    // Found the door - display its details
    console.log('\n✅ FOUND DOOR MF42-15-1041:');
    console.log(`  Door ID: ${targetDoor.id}`);
    console.log(`  Serial Number: "${targetDoor.serial_number}"`);
    console.log(`  Description: "${targetDoor.description}"`);
    console.log(`  Inspection Status: "${targetDoor.inspection_status}"`);
    console.log(`  Certification Status: "${targetDoor.certification_status}"`);
    console.log(`  PO Number: ${targetDoor.po_number || 'N/A'}`);
    console.log(`  Drawing Number: ${targetDoor.drawing_number || 'N/A'}`);
    console.log(`  Rejection Reason: ${targetDoor.rejection_reason || 'N/A'}`);
    console.log(`  Created: ${targetDoor.created_at}`);

    // Get inspections for this door
    console.log(`\n🔍 FETCHING INSPECTIONS FOR DOOR ${targetDoor.id}...`);
    try {
      const inspectionsResponse = await fetch(`${baseUrl}/inspections/door/${targetDoor.id}`);

      if (inspectionsResponse.ok) {
        const inspections = await inspectionsResponse.json();
        console.log(`Found ${inspections.length} inspection(s):`);

        inspections.forEach(inspection => {
          console.log(`  📋 Inspection ${inspection.id}:`);
          console.log(`    Status: "${inspection.status}"`);
          console.log(`    Inspector: ${inspection.inspector_name || inspection.inspector_id}`);
          console.log(`    Date: ${inspection.inspection_date}`);
          console.log(`    Completed: ${inspection.completed_date || 'Not completed'}`);
          console.log(`    Notes: ${inspection.notes || 'None'}`);
        });
      } else {
        console.log('  No inspections data available');
      }
    } catch (error) {
      console.log('  Error fetching inspections:', error.message);
    }

    // Get certifications for this door
    console.log(`\n🔍 FETCHING CERTIFICATIONS FOR DOOR ${targetDoor.id}...`);
    try {
      const certsResponse = await fetch(`${baseUrl}/certifications/door/${targetDoor.id}`);

      if (certsResponse.ok) {
        const certifications = await certsResponse.json();
        console.log(`Found ${certifications.length} certification(s):`);

        certifications.forEach(cert => {
          console.log(`  📜 Certification ${cert.id}:`);
          console.log(`    Engineer: ${cert.engineer_name || cert.engineer_id}`);
          console.log(`    PDF: ${cert.certificate_pdf_path || 'N/A'}`);
          console.log(`    Certified: ${cert.certified_at}`);
          console.log(`    Signature: ${cert.signature ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('  No certifications data available');
      }
    } catch (error) {
      console.log('  Error fetching certifications:', error.message);
    }

    // Summary of all doors
    console.log('\n📊 DATABASE SUMMARY FROM API:');
    console.log(`Total doors: ${doors.length}`);

    const certStatusCounts = {};
    const inspectStatusCounts = {};

    doors.forEach(door => {
      const certStatus = door.certification_status || 'pending';
      const inspectStatus = door.inspection_status || 'pending';

      certStatusCounts[certStatus] = (certStatusCounts[certStatus] || 0) + 1;
      inspectStatusCounts[inspectStatus] = (inspectStatusCounts[inspectStatus] || 0) + 1;
    });

    console.log('\nCertification Status Breakdown:');
    Object.entries(certStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} doors`);
    });

    console.log('\nInspection Status Breakdown:');
    Object.entries(inspectStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} doors`);
    });

  } catch (error) {
    console.error('❌ Error querying API:', error.message);

    console.log('\n🔧 TROUBLESHOOTING SUGGESTIONS:');
    console.log('1. Check if the API is deployed and accessible');
    console.log('2. Verify the base URL is correct');
    console.log('3. Check if authentication is required for API access');
    console.log('4. Consider using Firebase Admin SDK directly if you have service account credentials');
  }
}

// Helper function for fetch since Node.js might not have it
if (typeof fetch === 'undefined') {
  global.fetch = (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : require('http');

      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = protocol.request(url, requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const response = {
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            json: async () => JSON.parse(data),
            text: async () => data
          };
          resolve(response);
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  };
}

queryDoorViaAPI().catch(console.error);