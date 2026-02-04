const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function checkActualData() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    // Testing with a guaranteed KOSPI stock: Samsung Electronics (005930)
    console.log("Checking Samsung Electronics (005930) Investor Data...");
    try {
        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012200', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930' }
        });
        console.log("Full Response Keys:", Object.keys(invRes.data));
        console.log("Output Length:", invRes.data.output?.length);
        if (invRes.data.output?.length > 0) {
            console.log("Sample Data Row 0:", invRes.data.output[0]);
        } else {
            console.log("Output is empty. Trying another market code...");
            // Try different tr_id OR different market code
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}
checkActualData();
