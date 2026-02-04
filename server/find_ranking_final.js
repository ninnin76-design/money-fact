const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function findCorrectRankingURI() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    // List of possible URIs for Ranking/Investor
    const candidates = [
        { name: 'Ranking Investor-Buy', url: '/uapi/domestic-stock/v1/ranking/investor-buy-rank', tr_id: 'FHPST01760000', scr: '20176' },
        { name: 'Ranking Investor-Netbuy', url: '/uapi/domestic-stock/v1/ranking/investor-net-purchase', tr_id: 'FHPST01740000', scr: '20174' },
        { name: 'Quotations Volume-Rank', url: '/uapi/domestic-stock/v1/quotations/volume-rank', tr_id: 'FHPST01710000', scr: '20171' },
        { name: 'Ranking Investor (Generic)', url: '/uapi/domestic-stock/v1/ranking/investor', tr_id: 'FHPST01760000', scr: '20176' },
        { name: 'Ranking Investor-Netbuy-Alt', url: '/uapi/domestic-stock/v1/ranking/investor-netbuy', tr_id: 'FHPST01760000', scr: '20176' }
    ];

    console.log("=== KIS RANKING URI SEARCH START ===");
    for (const c of candidates) {
        try {
            console.log(`Testing [${c.name}]: ${c.url}...`);
            const res = await axios.get(`${KIS_BASE_URL}${c.url}`, {
                headers: {
                    authorization: `Bearer ${token}`,
                    appkey: APP_KEY,
                    appsecret: APP_SECRET,
                    tr_id: c.tr_id,
                    custtype: 'P'
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_COND_SCR_DIV_CODE: c.scr,
                    FID_INPUT_ISCD: (c.tr_id === 'FHPST01740000' ? '0008' : '0000'), // 0008: Pension for Net Purchase API
                    FID_DIV_CLS_CODE: '0',  // 0: Qty
                    FID_RANK_SORT_CLS_CODE: '0', // 0: Net Buy
                    FID_ETC_CLS_CODE: '1' // 5 days if applicable
                }
            });
            console.log(`✅ SUCCESS! [${c.name}] Status: ${res.data.rt_cd} msg: ${res.data.msg1}`);
            if (res.data.output) {
                console.log(`Count: ${res.data.output.length}`);
                if (res.data.output[0]) console.log(`Sample: ${res.data.output[0].hts_kor_isnm}`);
                return { url: c.url, tr_id: c.tr_id, scr: c.scr };
            }
        } catch (e) {
            console.log(`❌ FAIL: [${c.name}] Status: ${e.response?.status} Msg: ${e.response?.data?.msg1 || 'Not Found'}`);
        }
    }
    return null;
}

findCorrectRankingURI();
