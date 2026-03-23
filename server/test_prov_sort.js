require('dotenv').config();
const axios = require('axios');

async function testSortCodes() {
    const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
    // Delay to avoid throttle
    await new Promise(r => setTimeout(r, 60000));

    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET
    });
    const token = tRes.data.access_token;

    for (let c = 0; c < 4; c++) {
        try {
            console.log("Testing Rank Sort Code:", c);
            const r = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                headers: {
                    authorization: `Bearer ${token}`,
                    appkey: process.env.KIS_APP_KEY,
                    appsecret: process.env.KIS_APP_SECRET,
                    tr_id: 'FHPTJ04400000',
                    custtype: 'P'
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'V',
                    FID_COND_SCR_DIV_CODE: '16449',
                    FID_INPUT_ISCD: '0000',
                    FID_DIV_CLS_CODE: '0',
                    FID_RANK_SORT_CLS_CODE: String(c),
                    FID_ETC_CLS_CODE: '0'
                }
            });
            if (r.data.output && r.data.output.length > 0) {
                const item = r.data.output[0];
                console.log(`  Top Item: ${item.hts_kor_isnm}, F: ${item.frgn_ntby_qty}, O: ${item.orgn_ntby_qty}`);
            } else {
                console.log("  No output");
            }
        } catch (e) {
            console.log("  Failed:", e.message);
        }
    }
}
testSortCodes().catch(console.error);
