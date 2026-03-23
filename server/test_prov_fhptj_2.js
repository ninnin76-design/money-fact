require('dotenv').config();
const axios = require('axios');

async function testFHPTJ() {
    const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
    // No new token to avoid 403. Using a long timeout if needed but let's just run.
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET
    });
    const token = tRes.data.access_token;

    // Path for [국내주식] 투자자 - 국내기관_외국인 매매종목가집계
    const path = '/uapi/domestic-stock/v1/quotations/foreign-institution-total';

    try {
        console.log("Testing FHPTJ04400000 on", path);
        const r = await axios.get(`${KIS_BASE_URL}${path}`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: process.env.KIS_APP_KEY,
                appsecret: process.env.KIS_APP_SECRET,
                tr_id: 'FHPTJ04400000',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'V', // V for snapshot? or J?
                FID_COND_SCR_DIV_CODE: '16449',
                FID_INPUT_ISCD: '0000', // 0000 for all?
                FID_DIV_CLS_CODE: '0',
                FID_RANK_SORT_CLS_CODE: '0',
                FID_ETC_CLS_CODE: '0'
            }
        });
        console.log("rt_cd:", r.data.rt_cd, "msg1:", r.data.msg1);
        if (r.data.output) {
            console.log("Output Length:", r.data.output.length);
            if (r.data.output.length > 0) {
                console.log("First item sample:", r.data.output[0]);
            }
        } else {
            console.log("No output field found.");
            console.log("Data keys:", Object.keys(r.data));
        }
    } catch (e) {
        console.log("FAILED:", e.message);
    }
}
testFHPTJ().catch(console.error);
