const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function testRankingV3() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    // Most likely paths for FHPST01740000 based on standard KIS patterns
    const candidates = [
        { url: '/uapi/domestic-stock/v1/ranking/investor-net-buy', tr_id: 'FHPST01740000', scr: '20174' },
        { url: '/uapi/domestic-stock/v1/quotations/investor-buy-ranking', tr_id: 'FHPST01740000', scr: '20174' },
        { url: '/uapi/domestic-stock/v1/ranking/investor-buy', tr_id: 'FHPST01740000', scr: '20174' },
        { url: '/uapi/domestic-stock/v1/quotations/investor-net-buy', tr_id: 'FHPST01740000', scr: '20174' }
    ];

    for (const c of candidates) {
        try {
            console.log(`Testing ${c.url}...`);
            const res = await axios.get(`${KIS_BASE_URL}${c.url}`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: c.tr_id, custtype: 'P' },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_COND_SCR_DIV_CODE: c.scr,
                    FID_INPUT_ISCD: '0008',
                    FID_DIV_CLS_CODE: '0',
                    FID_RANK_SORT_CLS_CODE: '0',
                    FID_ETC_CLS_CODE: '1'
                }
            });
            console.log(`SUCCESS! URL: ${c.url}`);
            process.exit(0);
        } catch (e) {
            console.log(`Fail ${c.url}: ${e.response?.status}`);
        }
    }
}
testRankingV3();
