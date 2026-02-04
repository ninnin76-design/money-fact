const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function verifyRealData() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    const types = [
        { name: 'Foreigner', code: '0001' },
        { name: 'Institution', code: '0002' },
        { name: 'Pension', code: '0008' }
    ];

    console.log("=== KIS REAL-TIME DATA VERIFICATION (5 Days) ===");
    for (const t of types) {
        try {
            // Using the path /uapi/domestic-stock/v1/ranking/investor (common ranking endpoint)
            const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/ranking/investor-net-purchase`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPST01740000', custtype: 'P' },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_COND_SCR_DIV_CODE: '20174',
                    FID_INPUT_ISCD: t.code,
                    FID_DIV_CLS_CODE: '0',
                    FID_RANK_SORT_CLS_CODE: '0',
                    FID_ETC_CLS_CODE: '1' // 5 days
                }
            });
            const top5 = (res.data.output || []).slice(0, 5).map(s => s.hts_kor_isnm);
            console.log(`[${t.name}] Top 5: ${top5.join(', ')}`);
        } catch (e) {
            console.log(`[${t.name}] FAIL: ${e.response?.status}`);
        }
    }
}
verifyRealData();
