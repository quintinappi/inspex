const https = require('https');

// Query the debug endpoint for door MF42-15-1041
async function queryDebugEndpoint() {
  console.log('🔍 QUERYING DEBUG ENDPOINT FOR DOOR MF42-15-1041');
  console.log('='.repeat(60));

  const functionUrl = 'https://api-wl6xr4ukja-uc.a.run.app/debug/door/MF42-15-1041';

  try {
    console.log(`\n📄 Querying: ${functionUrl}`);

    const response = await fetch(functionUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('\n✅ RESPONSE RECEIVED:');
    console.log(JSON.stringify(data, null, 2));

    // Parse and display the results
    if (data.doors && data.doors.length > 0) {
      const door = data.doors[0];
      console.log('\n🚪 DOOR DETAILS:');
      console.log(`  ID: ${door.id}`);
      console.log(`  Serial Number: "${door.serial_number}"`);
      console.log(`  Description: "${door.description}"`);
      console.log(`  Inspection Status: "${door.inspection_status}"`);
      console.log(`  Certification Status: "${door.certification_status}"`);
      console.log(`  Rejection Reason: ${door.rejection_reason || 'N/A'}`);
      console.log(`  Created: ${door.created_at}`);

      console.log('\n🔍 RELATED INSPECTIONS:');
      if (data.relatedData.inspections.length > 0) {
        data.relatedData.inspections.forEach(inspection => {
          console.log(`  📋 Inspection ${inspection.id}:`);
          console.log(`    Status: "${inspection.status}"`);
          console.log(`    Inspector: ${inspection.inspector_id}`);
          console.log(`    Date: ${inspection.inspection_date}`);
          console.log(`    Completed: ${inspection.completed_date || 'Not completed'}`);
          console.log(`    Notes: ${inspection.notes || 'None'}`);
        });
      } else {
        console.log('  No inspections found');
      }

      console.log('\n🔍 RELATED CERTIFICATIONS:');
      if (data.relatedData.certifications.length > 0) {
        data.relatedData.certifications.forEach(cert => {
          console.log(`  📜 Certification ${cert.id}:`);
          console.log(`    Engineer: ${cert.engineer_id}`);
          console.log(`    PDF: ${cert.certificate_pdf_path}`);
          console.log(`    Certified: ${cert.certified_at}`);
          console.log(`    Signature: ${cert.signature ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('  No certifications found');
      }
    } else {
      console.log('\n❌ Door MF42-15-1041 not found in database');
    }

  } catch (error) {
    console.error('❌ Error querying debug endpoint:', error.message);
  }
}

// Helper function for fetch since Node.js might not have it
if (typeof fetch === 'undefined') {
  global.fetch = (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const req = https.request(url, options || {}, (res) => {
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

      if (options && options.body) {
        req.write(options.body);
      }

      req.end();
    });
  };
}

queryDebugEndpoint();