const axios = require('axios');

const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
const BASE_URL = 'https://openapi.koreainvestment.com:9443';

async function check() {
    try {
        const tokenRes = await axios.post(`${BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const token = tokenRes.data.access_token;

        console.log("Checking Price (FHKST01010100) for 484590...");
        const res = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010100' },
            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '484590' }
        });
        console.log("Price Response:", JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.error("Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
check();
