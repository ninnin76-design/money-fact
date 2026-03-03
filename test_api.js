const axios = require('axios');

async function testAnalysis() {
    try {
        console.log("Testing Portfolio Analysis API...");
        const res = await axios.post('http://localhost:3000/api/my-portfolio/analyze', {
            codes: ['005930', '000660'] // Samsung, Hynix
        });
        console.log("Result:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testAnalysis();
