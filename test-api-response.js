// Test script to check API response with authentication
const testAPI = async () => {
    console.log('🔍 Testing API response for MF42-15-1041...');

    try {
        // Get JWT token by logging in
        const loginResponse = await fetch('https://api-wl6xr4ukja-uc.a.run.app/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Login failed');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;

        console.log('✅ Got token, testing inspections API...');

        // Test inspections API
        const inspectionsResponse = await fetch('https://api-wl6xr4ukja-uc.a.run.app/inspections', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!inspectionsResponse.ok) {
            throw new Error('Inspections API failed');
        }

        const inspections = await inspectionsResponse.json();

        // Find MF42-15-1041
        const targetDoor = inspections.find(item => item.serial_number === 'MF42-15-1041');

        if (targetDoor) {
            console.log('\n🎯 FOUND DOOR MF42-15-1041 IN API RESPONSE:');
            console.log('=====================================');
            console.log(`Serial Number: ${targetDoor.serial_number}`);
            console.log(`Inspection Status: ${targetDoor.inspection_status}`);
            console.log(`Certification Status: ${targetDoor.certification_status}`);
            console.log(`Door ID: ${targetDoor.door_id}`);
            console.log(`Status: ${targetDoor.status}`);
            console.log(`Completed Date: ${targetDoor.completed_date}`);

            console.log('\n🔍 FULL API OBJECT:');
            console.log(JSON.stringify(targetDoor, null, 2));
        } else {
            console.log('❌ Door MF42-15-1041 not found in inspections API response');

            console.log('\n📋 All doors in API response:');
            inspections.forEach(item => {
                console.log(`- ${item.serial_number} (cert: ${item.certification_status}, inspect: ${item.inspection_status})`);
            });
        }

        // Also test certifications API
        console.log('\n🔍 Testing certifications API...');
        const certsResponse = await fetch('https://api-wl6xr4ukja-uc.a.run.app/certifications/my-certificates', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (certsResponse.ok) {
            const certs = await certsResponse.json();
            const targetCert = certs.find(item => item.serial_number === 'MF42-15-1041');

            if (targetCert) {
                console.log('\n🎯 FOUND DOOR MF42-15-1041 IN CERTIFICATIONS API:');
                console.log('==========================================');
                console.log(`Serial Number: ${targetCert.serial_number}`);
                console.log(`Certification Status: ${targetCert.certification_status}`);
                console.log(`Engineer Name: ${targetCert.engineer_name}`);
                console.log(`Certified At: ${targetCert.certified_at}`);

                console.log('\n🔍 FULL CERTIFICATION OBJECT:');
                console.log(JSON.stringify(targetCert, null, 2));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Try checking the browser network tab manually on the live site');
    }
};

testAPI();