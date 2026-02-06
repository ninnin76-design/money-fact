const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function checkMaxHistory() {
    try {
        const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const token = tRes.data.access_token;

        // Check Samsung Electronics
        const code = "005930";
        console.log(`Checking data depth for ${code}...`);

        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code }
        });

        const rows = invRes.data.output || [];
        console.log(`Received ${rows.length} rows.`);
        if (rows.length > 0) {
            console.log(`First Date: ${rows[0].stck_bsop_date}`);
            console.log(`Last Date: ${rows[rows.length - 1].stck_bsop_date}`);
        }

    } catch (e) {
        console.log("Error:", e.message);
    }
}
checkMaxHistory();
