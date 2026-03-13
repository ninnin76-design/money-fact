const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;
const BASE_URL = "https://openapi.koreainvestment.com:9443";

async function test() {
    let out = [];
    const log = (msg) => { out.push(msg); };

    // 캐시된 토큰 사용
    const tokenFile = path.join(__dirname, 'real_token_cache.json');
    let token;
    if (fs.existsSync(tokenFile)) {
        const saved = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
        token = saved.token;
        log("캐시 토큰 사용\n");
    } else {
        log("토큰 캐시 없음!");
        fs.writeFileSync("test_out.txt", out.join('\n'));
        return;
    }

    const headers = {
        "authorization": `Bearer ${token}`,
        "appkey": APP_KEY, "appsecret": APP_SECRET, "custtype": "P"
    };

    try {
        log("=== TEST: inquire-daily-indexchartprice (FHKUP03500100) ===");
        const r2 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice`, {
            headers: { ...headers, tr_id: "FHKUP03500100" },
            params: {
                FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001",
                FID_INPUT_DATE_1: "20260301", FID_INPUT_DATE_2: "20260311",
                FID_PERIOD_DIV_CODE: "D"
            }
        });
        log(`OK: ${r2.status}`);
        if (r2.data.output1) log(`output1 keys: ${Object.keys(r2.data.output1).join(',')}`);
        if (r2.data.output2 && r2.data.output2.length > 0) log(`output2 keys: ${Object.keys(r2.data.output2[0]).join(',')}`);
    } catch (e) { log(`FAIL 2: ${e.response?.status} ${e.message}`); }

    try {
        log("\n=== TEST: inquire-index-price (FHPUP02100000) ===");
        const r4 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`, {
            headers: { ...headers, tr_id: "FHPUP02100000" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001" }
        });
        log(`OK: ${r4.status}`);
        if (r4.data.output) log(`output keys: ${Object.keys(r4.data.output).join(',')}`);
    } catch (e) { log(`FAIL 4: ${e.response?.status} ${e.message}`); }

    try {
        log("\n=== TEST: inquire-index-daily-price (FHPUP02120000) ===");
        const r5 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-daily-price`, {
            headers: { ...headers, tr_id: "FHPUP02120000" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001", FID_PERIOD_DIV_CODE: "D" }
        });
        log(`OK: ${r5.status}`);
        if (r5.data.output) log(`output keys: ${Object.keys(r5.data.output[0] || r5.data.output).join(',')}`);
    } catch (e) { log(`FAIL 5: ${e.response?.status} ${e.message}`); }

    // 투자자 관련 API 찾기
    // FHKUP03500100 은 사실 업종기간별시세.
    // 투자자매매동향은 시장별이면 FHKST01010600 (inquire-member)
    try {
        log("\n=== TEST: inquire-member (FHKST01010600) ===");
        const rm = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-member`, {
            headers: { ...headers, tr_id: "FHKST01010600" },
            params: { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: "005930" }
        });
        log(`OK: ${rm.status}`);
        if (rm.data.output) log(`output keys: ${Object.keys(rm.data.output).join(',')}`);
    } catch (e) { log(`FAIL member: ${e.response?.status} ${e.message}`); }

    try {
        log("\n=== TEST: HHPPG046600C1 (프로그램매매 투자자매매동향) ===");
        const rpp = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/program-trade-trend`, {
            headers: { ...headers, tr_id: "HHPPG046600C1", "custtype": "P" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_BASS_DT: "20260311", FID_DAY_DIV_CODE: "0" }
        });
        log(`OK: ${rpp.status}`);
    } catch (e) { log(`FAIL rpp: ${e.response?.status} ${e.message}`); }

    fs.writeFileSync("test_out2.txt", out.join('\n'));
}

test();
