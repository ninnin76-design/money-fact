const axios = require('axios');
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

async function test() {
    try {
        const resTok = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const token = resTok.data.access_token;
        console.log("Token:", token.substring(0, 10) + "...");

        const resData = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012200', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930' }
        });
        console.log("Response Keys:", Object.keys(resData.data));
        if (resData.data.output) {
            console.log("Output Length:", resData.data.output.length);
            if (resData.data.output.length > 0) {
                console.log("First item sample:", resData.data.output[0]);
            }
        } else {
            console.log("Full Data:", JSON.stringify(resData.data).substring(0, 500));
        }
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}
test();
