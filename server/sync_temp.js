const fs = require('fs');
const axios = require('axios');
const path = require('path');

const fbUrl = 'https://moneyfact-34481-default-rtdb.asia-southeast1.firebasedatabase.app';

async function syncNow() {
    try {
        const filePath = path.join(__dirname, 'market_report_snapshot.json');
        if (!fs.existsSync(filePath)) {
            console.error('No snapshot file found locally!');
            return;
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { allAnalysis, ...coreData } = data.marketReport || data;

        coreData.firebaseSavedAt = new Date().toISOString();

        await axios.put(`${fbUrl}/market_snapshot/latest.json`, coreData);
        console.log(`[Manual Sync] ☁️ Successfully pushed local snapshot (${coreData.updateTime}) to Firebase!`);
    } catch (e) {
        console.error('[Manual Sync] ❌ Failed:', e.message);
    }
}

syncNow();
