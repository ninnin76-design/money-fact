const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;

async function test() {
    try {
        console.log("Getting token...");
        const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const token = tRes.data.access_token;
        console.log("Token received.");

        console.log("Getting daily data for 005930...");
        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010900',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: '005930',
                FID_PERIOD_DIV_CODE: 'D',
                FID_ORG_ADJ_PRC: '0'
            }
        });
        const daily = invRes.data.output || [];
        console.log("Daily data count:", daily.length);
        if (daily.length > 0) {
            console.log("Latest date:", daily[0].stck_bsop_date);
            console.log("Latest price:", daily[0].stck_clpr);
        } else {
            console.log("Full response:", JSON.stringify(invRes.data, null, 2));
        }
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

test();
