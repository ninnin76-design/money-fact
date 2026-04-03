const axios = require('axios');
require('dotenv').config();

async function checkVirtual() {
    console.log("Testing Main Key on VIRTUAL URL...");
    try {
        const res = await axios.post('https://openapivts.koreainvestment.com:29443/oauth2/tokenP', {
            grant_type: 'client_credentials',
            appkey: process.env.KIS_APP_KEY,
            appsecret: process.env.KIS_APP_SECRET
        });
        console.log("✅ Virtual Token Success!", res.data.access_token);
    } catch (e) {
        console.log("❌ Virtual Fail:", e.response ? JSON.stringify(e.response.data) : e.message);
    }
}
checkVirtual();
