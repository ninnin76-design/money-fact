
const axios = require('axios');
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

async function getAccessToken() {
    try {
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        return res.data.access_token;
    } catch (e) {
        console.error("Token fail", e.message);
        return null;
    }
}

async function testPrices() {
    const token = await getAccessToken();
    if (!token) return;

    const codes = ['005930', '000660', '035900']; // Samsung, SK Hynix, JYP
    for (const code of codes) {
        console.log(`--- Testing ${code} ---`);
        try {
            // 1. Inquire Investor (FHKST01010900)
            const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' }
            });
            const invOutput = invRes.data.output[0];
            console.log(`[Investor TR] stck_clpr: ${invOutput.stck_clpr}, prdy_ctrt: ${invOutput.prdy_ctrt}, stck_bsop_date: ${invOutput.stck_bsop_date}`);

            // 2. Inquire Price (FHKST01010100)
            const priceRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010100', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code }
            });
            const pOutput = priceRes.data.output;
            console.log(`[Price TR] stck_prpr: ${pOutput.stck_prpr}, prdy_ctrt: ${pOutput.prdy_ctrt}, hts_kor_isnm: ${pOutput.hts_kor_isnm}`);
        } catch (e) {
            console.error(`Error for ${code}: ${e.message}`);
        }
    }
}

testPrices();
