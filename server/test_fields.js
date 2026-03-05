const axios = require('axios');
require('dotenv').config();

const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_BASE_URL = "https://openapi.koreainvestment.com:9443";

async function getAccessToken() {
    const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: "client_credentials",
        appkey: APP_KEY,
        appsecret: APP_SECRET
    });
    return res.data.access_token;
}

async function test() {
    const token = await getAccessToken();
    const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/investor-trend-by-sector`, {
        headers: {
            authorization: `Bearer ${token}`,
            appkey: APP_KEY,
            appsecret: APP_SECRET,
            tr_id: 'FHKUP03500100',
            custtype: 'P'
        },
        params: {
            FID_COND_MRKT_DIV_CODE: 'U',
            FID_INPUT_ISCD: '0002'
        }
    });
    console.log(JSON.stringify(res.data.output, null, 2));
}
test();
