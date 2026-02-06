const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function checkRealFact() {
    try {
        const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const token = tRes.data.access_token;
        console.log("Token received.");

        // Try Samsung Electronics (005930) explicitly
        const testCode = "005930";
        console.log(`Testing History for Samsung Electronics (${testCode})`);

        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01012200',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: testCode
            }
        });

        console.log("Response Status:", invRes.status);
        console.log("Response Msg Code:", invRes.data.msg_cd);
        console.log("Response Message:", invRes.data.msg1);
        console.log("Daily History Rows:", invRes.data.output?.length || 0);

        if (invRes.data.output?.length > 0) {
            console.log("First Row Data:", invRes.data.output[0]);
        }

        // Also dump the entire keys of data to see if structure changed
        console.log("Data Keys:", Object.keys(invRes.data));

    } catch (e) {
        console.error("AXIOS ERROR:", e.message);
        if (e.response) {
            console.error("Response Data:", e.response.data);
        }
    }
}
checkRealFact();
