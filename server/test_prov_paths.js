require('dotenv').config();
const axios = require('axios');

async function testProv() {
    const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
    await new Promise(r => setTimeout(r, 60000));

    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET
    });
    const token = tRes.data.access_token;

    // Test different possible paths for provisional API
    const pathsToTest = [
        '/uapi/domestic-stock/v1/quotations/inquire-time-investor',
        '/uapi/domestic-stock/v1/quotations/inquire-investor-time',
        '/uapi/domestic-stock/v1/quotations/inquire-daily-investor',
        '/uapi/domestic-stock/v1/quotations/inquire-est-investor'
    ];

    for (const p of pathsToTest) {
        try {
            const provRes = await axios.get(`${KIS_BASE_URL}${p}`, {
                headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY, appsecret: process.env.KIS_APP_SECRET, tr_id: 'FHKST01012100', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930' }
            });
            console.log("Found valid path:", p);
            console.log("rt_cd:", provRes.data.rt_cd, "msg1:", provRes.data.msg1);
            if (provRes.data.rt_cd === '0') console.log(Object.keys(provRes.data.output || {}));
        } catch (e) {
            if (e.response && e.response.status !== 404) {
                console.log("Path", p, "returned status", e.response.status, e.response.data);
            }
        }
    }
}
testProv().catch(console.error);
