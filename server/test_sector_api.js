const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;
const BASE_URL = "https://openapi.koreainvestment.com:9443";

async function test() {
    // 캐시된 토큰 사용
    const tokenFile = path.join(__dirname, 'real_token_cache.json');
    let token;
    if (fs.existsSync(tokenFile)) {
        const saved = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
        token = saved.token;
        console.log("캐시 토큰 사용\n");
    } else {
        console.log("토큰 캐시 없음!");
        return;
    }

    const headers = {
        "authorization": `Bearer ${token}`,
        "appkey": APP_KEY, "appsecret": APP_SECRET, "custtype": "P"
    };

    // 테스트 1: 현재 사용중 (404 발생)
    console.log("=== TEST 1: inquire-investor-by-sector ===");
    try {
        const r1 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor-by-sector`, {
            headers: { ...headers, tr_id: "FHKUP03500100" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001" }
        });
        console.log("OK:", r1.status, JSON.stringify(r1.data).substring(0, 200));
    } catch (e) { console.log("FAIL:", e.response?.status, e.message); }

    await new Promise(r => setTimeout(r, 500));

    // 테스트 2: inquire-daily-indexchartprice
    console.log("\n=== TEST 2: inquire-daily-indexchartprice ===");
    try {
        const r2 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice`, {
            headers: { ...headers, tr_id: "FHKUP03500100" },
            params: {
                FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001",
                FID_INPUT_DATE_1: "20260301", FID_INPUT_DATE_2: "20260311",
                FID_PERIOD_DIV_CODE: "D"
            }
        });
        console.log("OK:", r2.status);
        if (r2.data.output1) console.log("output1:", JSON.stringify(r2.data.output1).substring(0, 300));
        if (r2.data.output2) console.log("output2 건수:", r2.data.output2.length);
    } catch (e) { console.log("FAIL:", e.response?.status, e.message); }

    await new Promise(r => setTimeout(r, 500));

    // 테스트 3: investor-trend-by-sector
    console.log("\n=== TEST 3: investor-trend-by-sector ===");
    try {
        const r3 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/investor-trend-by-sector`, {
            headers: { ...headers, tr_id: "FHKUP03500100" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001" }
        });
        console.log("OK:", r3.status, JSON.stringify(r3.data).substring(0, 200));
    } catch (e) { console.log("FAIL:", e.response?.status, e.message); }

    await new Promise(r => setTimeout(r, 500));

    // 테스트 4: inquire-index-price (업종별현재가)
    console.log("\n=== TEST 4: inquire-index-price ===");
    try {
        const r4 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`, {
            headers: { ...headers, tr_id: "FHPUP02100000" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001" }
        });
        console.log("OK:", r4.status);
        if (r4.data.output) console.log("데이터:", JSON.stringify(r4.data.output).substring(0, 300));
    } catch (e) { console.log("FAIL:", e.response?.status, e.message); }

    await new Promise(r => setTimeout(r, 500));

    // 테스트 5: inquire-index-daily-price (업종별 일별 시세)
    console.log("\n=== TEST 5: inquire-index-daily-price ===");
    try {
        const r5 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-daily-price`, {
            headers: { ...headers, tr_id: "FHPUP02120000" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001", FID_PERIOD_DIV_CODE: "D" }
        });
        console.log("OK:", r5.status);
        if (r5.data.output) console.log("데이터:", JSON.stringify(r5.data.output).substring(0, 200));
        if (r5.data.output1) console.log("데이터1:", JSON.stringify(r5.data.output1).substring(0, 200));
    } catch (e) { console.log("FAIL:", e.response?.status, e.message); }
}

test().catch(e => console.error(e.message));
