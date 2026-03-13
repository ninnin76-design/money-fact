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

    const tokenFile = path.join(__dirname, 'real_token_cache.json');
    let token = JSON.parse(fs.readFileSync(tokenFile, 'utf8')).token;

    const headers = {
        "authorization": `Bearer ${token}`,
        "appkey": APP_KEY, "appsecret": APP_SECRET, "custtype": "P"
    };

    try {
        log("=== TEST: inquire-investor with Sector Code (0001 KOSPI) ===");
        const rm = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: { ...headers, tr_id: "FHKST01010900" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0001" }
        });
        log(`OK: ${rm.status}`);
        if (rm.data.output && rm.data.output.length > 0) {
            log(`data[0]: ${JSON.stringify(rm.data.output[0])}`);
        }
    } catch (e) { log(`FAIL 1: ${e.response?.status} ${e.message} - ${JSON.stringify(e.response?.data)}`); }

    try {
        log("=== TEST: inquire-investor with Sector Code (0013 반도체) ===");
        const rm2 = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: { ...headers, tr_id: "FHKST01010900" },
            params: { FID_COND_MRKT_DIV_CODE: "U", FID_INPUT_ISCD: "0013" }
        });
        log(`OK: ${rm2.status}`);
        if (rm2.data.output && rm2.data.output.length > 0) {
            log(`data[0]: ${JSON.stringify(rm2.data.output[0])}`);
        }
    } catch (e) { log(`FAIL 2: ${e.response?.status} ${e.message} - ${JSON.stringify(e.response?.data)}`); }

    fs.writeFileSync("test_out3.txt", out.join('\n'));
}

test();
