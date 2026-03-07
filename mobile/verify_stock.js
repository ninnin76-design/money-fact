const axios = require('axios');

const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
const BASE_URL = 'https://openapi.koreainvestment.com:9443';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkStock() {
    let token = null;
    while (!token) {
        try {
            console.log("Get Token...");
            const tokenRes = await axios.post(`${BASE_URL}/oauth2/tokenP`, {
                grant_type: 'client_credentials',
                appkey: APP_KEY,
                appsecret: APP_SECRET
            });
            token = tokenRes.data.access_token;
            console.log("Token acquired.");
        } catch (e) {
            console.log("Token rate limit. Waiting 20s...");
            await wait(20000);
        }
    }

    try {
        console.log("2. Fetching Investor Data (FHKST01010900) for 484590...");
        const invRes = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010900',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: '484590'
            }
        });
        console.log("Investor response:");
        console.log(JSON.stringify(invRes.data, null, 2));

        console.log("3. Fetching Price Data (FHKST01010400) for 484590...");
        const priceRes = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010400',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: '484590',
                FID_PERIOD_DIV_CODE: 'D',
                FID_ORG_ADJ_PRC: '0'
            }
        });
        console.log("Price response:");
        console.log(JSON.stringify(priceRes.data, null, 2));
    } catch (e) {
        console.error("Error occurred:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}

checkStock();
