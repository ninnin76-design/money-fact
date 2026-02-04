const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function testRanking() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: APP_KEY,
        appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    // Testing the URI suggested by subagent/internal docs
    const uri = '/uapi/domestic-stock/v1/ranking/investor-buy-rank';
    try {
        console.log(`Testing ${uri}...`);
        const res = await axios.get(`${KIS_BASE_URL}${uri}`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHPST01760000',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_COND_SCR_DIV_CODE: '20176',
                FID_INPUT_ISCD: '7000', // Pension
                FID_DIV_CLS_CODE: '0',  // Net Buy
                FID_RANK_SORT_CLS_CODE: '0', // Quantity
                FID_ETC_CLS_CODE: '0' // Today
            }
        });
        console.log('SUCCESS!', res.data.output?.length, 'items found.');
        if (res.data.output?.[0]) console.log('Sample:', res.data.output[0].hts_kor_isnm);
    } catch (e) {
        console.log('FAIL:', e.response?.status, e.response?.data?.msg1 || e.message);
    }
}
testRanking();
