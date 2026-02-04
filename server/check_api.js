const axios = require('axios');
async function checkCurrentData() {
    try {
        const res = await axios.get('http://localhost:3000/api/analysis/supply/5/0');
        console.log("Status:", res.data.status);
        console.log("Data Type:", res.data.dataType);
        console.log("Update Time:", res.data.updateTime);
        console.log("Output Length:", res.data.output?.length || 0);
        if (res.data.output?.length > 0) {
            console.log("First Item:", res.data.output[0]);
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}
checkCurrentData();
