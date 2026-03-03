
const axios = require('axios');
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

async function testToken() {
    try {
        console.log("Testing KIS Token Refresh...");
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        console.log("✅ Success! Token obtained:", res.data.access_token.substring(0, 10) + "...");
    } catch (e) {
        console.error("❌ Failed!");
        console.error("Status:", e.response?.status);
        console.error("Data:", JSON.stringify(e.response?.data || e.message, null, 2));
    }
}

testToken();
