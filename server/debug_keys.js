const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function checkDeepInvestor() {
    try {
        const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const token = tRes.data.access_token;
        console.log("Token received.");

        const testCode = "005930"; // Samsung Electronics

        // Not inquire-investor (FHKST01010900 - just summary), but 'investor-trend' ??
        // Actually, let's try FHKST01010900 again and see ALL fields in the row.
        // And also try to find if there is another TR_ID for detailed breakdown.

        console.log(`Testing FHKST01010900 Detailed Keys...`);
        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: testCode }
        });

        if (invRes.data.output && invRes.data.output.length > 0) {
            console.log("First Row Keys:", Object.keys(invRes.data.output[0]));
            console.log("First Row Values:", invRes.data.output[0]);
        }

    } catch (e) {
        console.error("AXIOS ERROR:", e.message);
    }
}
checkDeepInvestor();
