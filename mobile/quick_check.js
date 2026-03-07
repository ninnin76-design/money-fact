const axios = require('axios');

const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
const BASE_URL = 'https://openapi.koreainvestment.com:9443';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function check() {
    let token = null;
    while (!token) {
        try {
            const res = await axios.post(`${BASE_URL}/oauth2/tokenP`, {
                grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
            });
            token = res.data.access_token;
        } catch (e) {
            console.log("Waiting for token...");
            await wait(10000);
        }
    }

    try {
        console.log("Checking 삼양컴텍 (484590)...");
        const res = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010900',
                custtype: 'P'
            },
            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '484590' }
        });

        if (res.data.output && res.data.output.length > 0) {
            console.log("Latest Date:", res.data.output[0].stck_bsop_date);
            console.log("Price:", res.data.output[0].stck_clpr);
            console.log("First 3 entries:", JSON.stringify(res.data.output.slice(0, 3), null, 2));
        } else {
            console.log("No data returned:", JSON.stringify(res.data, null, 2));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
check();
