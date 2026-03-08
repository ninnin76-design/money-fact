
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = process.env.KIS_APP_SECRET || 'uxLk5zL+ozOiV8NarXq0kt0E7GOsHt+Alb4S8k2CciUL6VXlK4hnF8tW+wzE7DZ1vfwmiOniz0cDM+1pWsCiJYirzrmuXQI52hR0=nzhsUM0B+ipW9MjmLZNxeRPBByUtG5/k/j5xGt1+ZwVaf';

async function getAccessToken() {
    try {
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials',
            appkey: APP_KEY,
            secretkey: APP_SECRET
        });
        return res.data.access_token;
    } catch (e) {
        console.error('Auth failed', e.message);
        return null;
    }
}

async function test() {
    const token = await getAccessToken();
    if (!token) return;

    // 반도체 sector
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
            FID_INPUT_ISCD: '0013'
        }
    });
    console.log('--- Raw Sector Data (0013 - Semiconductor) ---');
    console.log(res.data.output);
}

test();
