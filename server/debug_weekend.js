const axios = require('axios');
const fs = require('fs');

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function getAccessToken() {
    try {
        console.log("Getting token...");
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        return res.data.access_token;
    } catch (e) {
        console.error("Token Error:", e.message);
        if (e.response) console.error(e.response.data);
    }
}

async function testFetch() {
    const token = await getAccessToken();
    if (!token) return;

    console.log("Token acquired. Fetching ranking...");

    try {
        // Source 1: Foreign/Inst Net Buy Rank
        const rankRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
        });

        const data = rankRes.data.output || [];
        console.log(`Initial Rank Fetch: ${data.length} items`);
        if (data.length > 0) console.log("Sample:", data[0].hts_kor_isnm);

    } catch (e) {
        console.error("Fetch Error:", e.message);
        if (e.response) console.error("Error Detail:", e.response.data);
    }
}

testFetch();
