const axios = require('axios');
const SERVER_URL = 'https://money-fact-server.onrender.com';

async function checkServer() {
    try {
        console.log("Fetching snapshot from server (Force Refresh)...");
        const res = await axios.get(`${SERVER_URL}/api/snapshot?force=true`, { timeout: 25000 });
        const snap = res.data;

        console.log("========================================");
        console.log("Current Server Time:", new Date().toLocaleString('ko-KR'));
        console.log("Last Update Time:", snap.updateTime ? new Date(snap.updateTime).toLocaleString('ko-KR') : 'N/A');
        console.log("Server Status:", snap.status);
        console.log("Scanning Stock Count:", snap.scanningCount || 0);
        console.log("Total Analysis Count:", snap.allAnalysis ? Object.keys(snap.allAnalysis).length : 0);
        console.log("========================================");

        if (snap.updateTime) {
            const diffMin = Math.round((Date.now() - new Date(snap.updateTime).getTime()) / 60000);
            console.log(`Server data was updated ${diffMin} minutes ago.`);
        }
    } catch (e) {
        console.error("Error connecting to server:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        }
    }
}

checkServer();
