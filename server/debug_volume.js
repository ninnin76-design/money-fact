const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function debugVolumeRank() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    // Testing Market Division Codes: J(KOSPI), Q/W/0(KOSDAQ candidates)
    const markets = ['J', 'Q', 'W', '0'];

    console.log("=== DEBUGGING VOLUME RANK API ===");
    for (const m of markets) {
        try {
            console.log(`Testing Market [${m}]...`);
            const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`, {
                headers: {
                    authorization: `Bearer ${token}`,
                    appkey: APP_KEY,
                    appsecret: APP_SECRET,
                    tr_id: 'FHPST01710000',
                    custtype: 'P'
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: m,
                    FID_COND_SCR_DIV_CODE: '20171',
                    FID_INPUT_ISCD: '0000',
                    FID_DIV_CLS_CODE: '0',
                    FID_BLNG_CLS_CODE: '0',
                    FID_TRGT_CLS_CODE: '1',
                    FID_TRGT_EXLS_CLS_CODE: '0',
                    FID_INPUT_PRICE_1: '',
                    FID_INPUT_PRICE_2: '',
                    FID_VOL_CNT: '',
                    FID_INPUT_DATE_1: ''
                }
            });
            console.log(`[${m}] RT_CD: ${res.data.rt_cd}, MSG: ${res.data.msg1}, Count: ${res.data.output?.length || 0}`);
            if (res.data.output && res.data.output.length > 0) {
                console.log(`Sample: ${res.data.output[0].hts_kor_isnm} (${res.data.output[0].mksc_shrn_iscd || res.data.output[0].stck_shrn_iscd})`);
            }
        } catch (e) {
            console.log(`[${m}] FAIL: ${e.response?.status} - ${e.message}`);
        }
    }
}
debugVolumeRank();
