const axios = require('axios');
require('dotenv').config();

const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;
const BASE_URL = "https://openapi.koreainvestment.com:9443";

async function testConnection() {
    console.log("--- KIS API 승인 상태 테스트 시작 ---");
    console.log(`사용 중인 APP_KEY: ${APP_KEY.substring(0, 5)}*****`);

    try {
        // 1. 접근 토큰 발급 테스트
        console.log("\n1. 접근 토큰(Access Token) 발급 시도...");
        const tokenResp = await axios.post(`${BASE_URL}/oauth2/tokenP`, {
            grant_type: "client_credentials",
            appkey: APP_KEY,
            appsecret: APP_SECRET
        });

        const accessToken = tokenResp.data.access_token;
        console.log("✅ 토큰 발급 성공!");

        // 2. 간단한 종목 조회 테스트 (삼성전자 005930)
        console.log("\n2. 삼성전자(005930) 시세 조회 시도...");
        const priceResp = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
            params: {
                fid_cond_mrkt_div_code: "J",
                fid_input_iscd: "005930"
            },
            headers: {
                "content-type": "application/json",
                "authorization": `Bearer ${accessToken}`,
                "appkey": APP_KEY,
                "appsecret": APP_SECRET,
                "tr_id": "FHKST01010100"
            }
        });

        if (priceResp.data.rt_cd === "0") {
            const price = priceResp.data.output.stck_prpr;
            console.log(`✅ 시세 조회 성공! 현재가: ${price}원`);
            console.log("\n🎊 축하합니다! API 승인이 완료되어 정상 작동합니다.");
        } else {
            console.log(`❌ 시세 조회 실패: ${priceResp.data.msg1}`);
        }

    } catch (error) {
        console.error("\n❌ 테스트 중 오류 발생:");
        if (error.response) {
            console.error(`상태 코드: ${error.response.status}`);
            console.error(`에러 내용: ${JSON.stringify(error.response.data)}`);
            if (error.response.status === 500) {
                console.error("💡 500 에러는 아직 KIS 서버에서 권한 전파(동기화)가 덜 되었을 때 발생합니다.");
            }
        } else {
            console.error(error.message);
        }
    }
}

testConnection();
