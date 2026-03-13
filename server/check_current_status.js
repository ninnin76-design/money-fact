const axios = require('axios');

async function checkSnapshot() {
    try {
        const response = await axios.get('http://localhost:3000/api/snapshot');
        console.log("Current Server Memory Snapshot:");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("Error fetching snapshot from local server:", e.message);
    }
}

checkSnapshot();
