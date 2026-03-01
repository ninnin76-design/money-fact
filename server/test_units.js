
const axios = require('axios');
require('dotenv').config();

const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_BASE_URL = "https://openapi.koreainvestment.com:9443";

async function getAccessToken() {
    try {
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: "client_credentials",
            appkey: APP_KEY,
            appsecret: APP_SECRET
        });
        return res.data.access_token;
    } catch (e) {
        console.error("Auth Error:", e.message);
    }
}

async function testSectors() {
    const token = await getAccessToken();
    if (!token) return;

    const sectors = [
        { name: '반도체', code: '002', div: 'U' },
        { name: '이차전지', code: '824', div: 'U' }
    ];

    for (const s of sectors) {
        const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/investor-trend-by-sector`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKUP03500100',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: s.div,
                FID_INPUT_ISCD: s.code
            }
        });
        const d = res.data.output;
        const foreign = parseInt(d.prdy_frgn_ntby_tr_pbmn || 0);
        const institution = parseInt(d.prdy_orgn_ntby_tr_pbmn || 0);
        const flowNormal = Math.round((foreign + institution) / 100000000);
        console.log(`Sector: ${s.name}, Flow(normalized): ${flowNormal}억`);
    }
}

testSectors();
