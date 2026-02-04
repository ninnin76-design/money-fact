const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function testRankings() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: APP_KEY,
        appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    const candidates = [
        { name: 'Volume Rank V', url: '/uapi/domestic-stock/v1/quotations/volume-rank', tr_id: 'FHPST01710000', scr: '20171' },
        { name: 'Investor Net Purchase', url: '/uapi/domestic-stock/v1/ranking/investor-net-purchase', tr_id: 'FHPST01740000', scr: '20174' },
        { name: 'Investor NetBuy', url: '/uapi/domestic-stock/v1/ranking/investor-netbuy', tr_id: 'FHPST01760000', scr: '20176' },
        { name: 'Foreign/Inst Total', url: '/uapi/domestic-stock/v1/quotations/foreign-institution-total', tr_id: 'FHPTJ04400000', scr: '16449' },
    ];

    for (const c of candidates) {
        try {
            console.log(`Testing ${c.name}: ${c.url}...`);
            const res = await axios.get(`${KIS_BASE_URL}${c.url}`, {
                headers: {
                    authorization: `Bearer ${token}`,
                    appkey: APP_KEY,
                    appsecret: APP_SECRET,
                    tr_id: c.tr_id,
                    custtype: 'P'
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'V', // Changed to V
                    FID_COND_SCR_DIV_CODE: c.scr,
                    FID_INPUT_ISCD: '0000', // All market
                    FID_DIV_CLS_CODE: '0',
                    FID_RANK_SORT_CLS_CODE: (c.tr_id === 'FHPTJ04400000' ? '0' : '0001'),
                    FID_ETC_CLS_CODE: '0',
                }
            });
            console.log(`SUCCESS ${c.name}! Count: ${res.data.output?.length || 0}`);
            if (res.data.output?.[0]) console.log(`Sample: ${res.data.output[0].hts_kor_isnm || res.data.output[0].hts_kor_nm}`);
        } catch (e) {
            console.log(`FAIL ${c.name}: ${e.response?.status} ${e.response?.data?.msg1 || ''}`);
        }
    }
}

testRankings();
