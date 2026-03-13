const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

// Access Token 가져오기
async function getAccessToken() {
    try {
        const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials',
            appkey: APP_KEY,
            secretkey: APP_SECRET
        });
        return response.data.access_token;
    } catch (e) {
        console.error('Auth Error:', e.message);
        return null;
    }
}

async function testApi(token, code) {
    try {
        const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010100',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: code
            }
        });
        console.log(`[TEST SUCCESS] ${code}: ${response.data.output?.stck_prpr || 'No Output'}`);
        return true;
    } catch (e) {
        console.error(`[TEST ERROR] ${code}: ${e.response?.status || e.message}`);
        if (e.response?.data) {
            console.error('Response Data:', JSON.stringify(e.response.data));
        }
        return false;
    }
}

async function run() {
    const token = await getAccessToken();
    if (!token) return;

    // 테스트 종목 몇 개 (삼성전자, 소액주, 등)
    const testStocks = ['005930', '000660', '005380', '035420', '000100'];

    console.log('--- 120ms 간격 테스트 시작 ---');
    for (const s of testStocks) {
        await testApi(token, s);
        await new Promise(r => setTimeout(r, 120));
    }

    console.log('\n--- 300ms 간격 테스트 시작 ---');
    for (const s of testStocks) {
        await testApi(token, s);
        await new Promise(r => setTimeout(r, 300));
    }
}

run();
