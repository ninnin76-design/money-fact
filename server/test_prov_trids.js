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

    // Test different TR IDs
    const trIds = ['FHKST01011200', 'FHKST01011300', 'FHKST01011400', 'FHKST01011500'];
    const p = '/uapi/domestic-stock/v1/quotations/inquire-investor';

    for (const tr_id of trIds) {
        try {
            console.log("Testing:", tr_id);
            const provRes = await axios.get(`${KIS_BASE_URL}${p}`, {
                headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY, appsecret: process.env.KIS_APP_SECRET, tr_id, custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930' }
            });
            console.log("rt_cd:", provRes.data.rt_cd, "msg1:", provRes.data.msg1);
            if (provRes.data.rt_cd === '0') console.log(Object.keys(provRes.data.output || {}));
        } catch (e) {
            console.log("Error for", tr_id, ":", e.message);
        }
    }
}
testProv().catch(console.error);
