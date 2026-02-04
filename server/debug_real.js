const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function checkRealFact() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    // Check Top Ranked stock from FHPTJ04400000 first
    const r = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
        params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
    });

    const candidates = r.data.output || [];
    console.log(`Candidates Found: ${candidates.length}`);

    if (candidates.length > 0) {
        const testCode = candidates[0].mksc_shrn_iscd;
        console.log(`Testing History for First Candidate: ${candidates[0].hts_kor_isnm} (${testCode})`);

        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012200', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: testCode }
        });

        console.log("Daily History Rows:", invRes.data.output?.length || 0);
        if (invRes.data.output?.length > 0) {
            console.log("First Row Data:", invRes.data.output[0]);
        }
    }
}
checkRealFact();
