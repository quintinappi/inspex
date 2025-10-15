const { chromium } = require('playwright');

async function checkLocalAppData() {
    console.log('🔍 Launching browser to check local app data...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('🌐 Opening local app...');
        await page.goto('http://localhost:9876/inspections');
        await page.waitForTimeout(3000);

        // Try to find the completed tab and look for the door
        console.log('📋 Looking for Completed tab...');
        const completedTab = await page.$('text=Completed, button:has-text("Completed"), button:has-text("Completed (")');
        if (completedTab) {
            console.log('✅ Found Completed tab, clicking...');
            await completedTab.click();
            await page.waitForTimeout(3000);
        } else {
            console.log('❌ Completed tab not found, checking current content...');
        }

        console.log('🔍 Looking for door MF42-15-1041...');

        // Look for the door in the inspections table
        const doorElement = await page.$('text=MF42-15-1041');
        if (doorElement) {
            console.log('✅ Found door MF42-15-1041 in local app!');

            // Extract data from the table row
            const rowData = await doorElement.evaluateHandle(() => {
                const doorCell = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('MF42-15-1041'));
                if (doorCell) {
                    const row = doorCell.closest('tr');
                    if (row) {
                        const cells = row.querySelectorAll('td');
                        return {
                            serialNumber: cells[0]?.textContent?.trim(),
                            inspector: cells[1]?.textContent?.trim(),
                            completed: cells[2]?.textContent?.trim(),
                            status: cells[3]?.textContent?.trim(),
                            actions: cells[4]?.textContent?.trim()
                        };
                    }
                }
                return null;
            });

            const data = await rowData.jsonValue();
            console.log('\n🎯 LOCAL APP DATA FOR DOOR MF42-15-1041:');
            console.log('=====================================');
            console.log(`Serial Number: ${data?.serialNumber || 'N/A'}`);
            console.log(`Inspector: ${data?.inspector || 'N/A'}`);
            console.log(`Completed: ${data?.completed || 'N/A'}`);
            console.log(`Status: ${data?.status || 'N/A'}`);

            // Also check the certifications page
            console.log('\n📜 Checking certifications page...');
            await page.goto('http://localhost:9876/certifications');
            await page.waitForTimeout(3000);

            // Look for the door in certifications
            const certDoorElement = await page.$('text=MF42-15-1041');
            if (certDoorElement) {
                console.log('✅ Found door MF42-15-1041 in certifications!');

                const certRowData = await certDoorElement.evaluateHandle(() => {
                    const doorCell = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('MF42-15-1041'));
                    if (doorCell) {
                        const row = doorCell.closest('tr');
                        if (row) {
                            const cells = row.querySelectorAll('td');
                            return {
                                serialNumber: cells[0]?.textContent?.trim(),
                                description: cells[1]?.textContent?.trim(),
                                certDate: cells[2]?.textContent?.trim(),
                                engineer: cells[3]?.textContent?.trim(),
                                status: cells[4]?.textContent?.trim()
                            };
                        }
                    }
                    return null;
                });

                const certData = await certRowData.jsonValue();
                console.log('\n🎯 CERTIFICATIONS PAGE DATA:');
                console.log('=====================================');
                console.log(`Serial Number: ${certData?.serialNumber || 'N/A'}`);
                console.log(`Description: ${certData?.description || 'N/A'}`);
                console.log(`Certification Date: ${certData?.certDate || 'N/A'}`);
                console.log(`Engineer: ${certData?.engineer || 'N/A'}`);
                console.log(`Status: ${certData?.status || 'N/A'}`);

                // Compare the two
                console.log('\n🔍 COMPARISON:');
                console.log('=====================================');
                console.log(`Inspections page shows: "${data?.status}"`);
                console.log(`Certifications page shows: "${certData?.status}"`);

                if (data?.status !== certData?.status) {
                    console.log('❌ STATUS MISMATCH CONFIRMED!');
                    console.log('This is the bug we need to fix.');
                } else {
                    console.log('✅ Statuses match - bug might be fixed!');
                }

            } else {
                console.log('❌ Door MF42-15-1041 not found in certifications page');
            }

            // Take a screenshot for verification
            await page.screenshot({ path: '/tmp/local-app-screenshot.png', fullPage: true });
            console.log('\n📸 Screenshot saved to /tmp/local-app-screenshot.png');

        } else {
            console.log('❌ Door MF42-15-1041 not found in local app');

            // Try to list all doors we can find
            console.log('📋 Listing available doors...');
            const allText = await page.textContent('body');
            const doorMatches = allText.match(/MF42-\d+-\d+/g);
            if (doorMatches) {
                console.log('Found doors:', [...new Set(doorMatches)].slice(0, 10));
            }
        }

        // Check the network requests to see what the API is returning
        console.log('\n🌐 Checking network requests...');
        const responses = [];
        page.on('response', response => {
            if (response.url().includes('/inspections') || response.url().includes('/certifications')) {
                responses.push(response.url());
                console.log(`API Request: ${response.url()}`);
            }
        });

        // Refresh to catch network traffic
        await page.reload();
        await page.waitForTimeout(5000);

        if (responses.length > 0) {
            console.log(`📡 Captured ${responses.length} API requests`);
        } else {
            console.log('❌ No API requests captured');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('\n🔍 Keeping browser open for 30 seconds for manual inspection...');
        console.log('Check the browser windows for the app status!');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

checkLocalAppData().catch(console.error);