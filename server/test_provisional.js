const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function testProvisional() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: APP_KEY,
        appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    try {
        console.log("Testing FHPTJ04400000...");
        const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHPTJ04400000',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'V', // Entire
                FID_COND_SCR_DIV_CODE: '16449',
                FID_INPUT_ISCD: '0000',
                FID_DIV_CLS_CODE: '0', // Quantity
                FID_RANK_SORT_CLS_CODE: '0', // Net Buy
                FID_ETC_CLS_CODE: '0' // All
            }
        });
        console.log('Fields:', Object.keys(res.data.output?.[0] || {}).join(', '));
        console.log('Count:', res.data.output?.length);
        if (res.data.output?.[0]) console.log('Sample:', res.data.output[0]);
    } catch (e) {
        console.log('Fail:', e.response?.status, e.response?.data);
    }
}
testProvisional();
