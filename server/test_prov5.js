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

    // 장중 투자자동향 - path 변경 테스트
    const pathsToTest = [
        '/uapi/domestic-stock/v1/quotations/inquire-investor',
        '/uapi/domestic-stock/v1/quotations/inquire-time-iteminvestor'
    ];

    for (const p of pathsToTest) {
        try {
            console.log("Testing path:", p);
            const provRes = await axios.get(`${KIS_BASE_URL}${p}`, {
                headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY, appsecret: process.env.KIS_APP_SECRET, tr_id: 'FHKST01012100', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930' }
            });
            console.log("rt_cd:", provRes.data.rt_cd, "msg1:", provRes.data.msg1);
            if (provRes.data.output) console.log("output is array:", Array.isArray(provRes.data.output));
        } catch (e) {
            console.log("Error:", e.message);
        }
    }
}
testProv().catch(console.error);
