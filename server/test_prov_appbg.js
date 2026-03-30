require('dotenv').config();
const axios = require('axios');

async function testProvDirect() {
    const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: process.env.APP_KEY_BG,
        appsecret: process.env.APP_SECRET_BG
    });
    const token = tRes.data.access_token;

    // 장중 투자자동향 (잠정치)
    const provRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
        headers: { authorization: `Bearer ${token}`, appkey: process.env.APP_KEY_BG, appsecret: process.env.APP_SECRET_BG, tr_id: 'FHKST01012100', custtype: 'P' },
        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '373220' } // LG에너지솔루션
    });

    console.log(provRes.data.output ? JSON.stringify(provRes.data.output[0], null, 2) : "NO OUTPUT");
}
testProvDirect().catch(console.error);
