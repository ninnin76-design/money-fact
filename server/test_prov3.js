require('dotenv').config();
const axios = require('axios');

async function testProv() {
    const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
    // Instead of generating a new token, let's just wait 1 minute.
    await new Promise(r => setTimeout(r, 60000));

    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET
    });
    const token = tRes.data.access_token;

    // 장중 투자자동향
    const provRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
        headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY, appsecret: process.env.KIS_APP_SECRET, tr_id: 'FHKST01012100', custtype: 'P' },
        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930' }
    });

    console.log("prov typeof:", typeof provRes.data.output);
    console.log("prov isArray:", Array.isArray(provRes.data.output));
    if (Array.isArray(provRes.data.output) && provRes.data.output.length > 0) {
        console.log("First element:", provRes.data.output[0]);
    } else {
        console.log("provRes.data.output:", provRes.data.output);
    }
}
testProv().catch(console.error);
