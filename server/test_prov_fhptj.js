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

    // 국내기관_외국인 매매종목가집계 API
    const p = '/uapi/domestic-stock/v1/quotations/inquire-investor';
    // Wait, the path for FHPTJ04400000 might be different. usually /uapi/domestic-stock/v1/quotations/inquire-investor ... Wait...
    // Let me try to search for the path. But I'll try it first with basic paths.

    const paths = [
        '/uapi/domestic-stock/v1/quotations/foreign-institution-total',
        '/uapi/domestic-stock/v1/quotations/inquire-investor',
        '/uapi/domestic-stock/v1/quotations/inquire-member',
        '/uapi/domestic-stock/v1/quotations/inquire-daily-investor'
    ];

    for (const path of paths) {
        try {
            console.log("Testing:", path);
            const r = await axios.get(`${KIS_BASE_URL}${path}`, {
                headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY, appsecret: process.env.KIS_APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
                // I need some params like market code, mkob code?
                // FID_COND_MRKT_DIV_CODE, FID_COND_SCR_DIV_CODE
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930', FID_COND_SCR_DIV_CODE: '16449', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
            });
            console.log("rt_cd:", r.data.rt_cd, "msg1:", r.data.msg1);
            if (r.data.rt_cd === '0') console.log("KEYS:", Object.keys(r.data.output || {}));
        } catch (e) {
            console.log("FAILED:", e.message);
        }
    }
}
testProv().catch(console.error);
