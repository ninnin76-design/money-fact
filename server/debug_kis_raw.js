const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function getAccessToken() {
    try {
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: "client_credentials",
            appkey: APP_KEY,
            secretkey: APP_SECRET
        });
        return res.data.access_token;
    } catch (e) {
        console.error("Token Error:", e.message);
        return null;
    }
}

async function debugStock(code) {
    const token = await getAccessToken();
    if (!token) return;

    try {
        console.log(`Checking Stock: ${code}`);
        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010900',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: code,
                FID_PERIOD_DIV_CODE: 'D',
                FID_ORG_ADJ_PRC: '0'
            }
        });
        console.log("Full First Day Data:", JSON.stringify(invRes.data.output[0], null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

debugStock('005930');
