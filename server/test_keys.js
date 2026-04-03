require('dotenv').config();
const axios = require('axios');

async function testKey(name, key, secret) {
    console.log(`\n[${name}] 테스트 시작...`);
    console.log(`Key: ${key.substring(0, 10)}...`);

    try {
        const res = await axios.post('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
            grant_type: 'client_credentials',
            appkey: key,
            appsecret: secret
        });

        if (res.data.access_token) {
            console.log(`✅ [${name}] 성공! 토큰 발급 완료.`);
            return true;
        } else {
            console.log(`❌ [${name}] 실패: 토큰이 응답에 없습니다.`);
            console.log(JSON.stringify(res.data));
            return false;
        }
    } catch (e) {
        console.log(`❌ [${name}] 에러 발생!`);
        if (e.response) {
            console.log(`상태 코드: ${e.response.status}`);
            console.log(`오류 내용: ${JSON.stringify(e.response.data)}`);
        } else {
            console.log(`메시지: ${e.message}`);
        }
        return false;
    }
}

async function run() {
    const mainKey = process.env.KIS_APP_KEY;
    const mainSecret = process.env.KIS_APP_SECRET;
    const bgKey = process.env.KIS_APP_KEY_BG;
    const bgSecret = process.env.KIS_APP_SECRET_BG;

    const mainResult = await testKey('메인 키 (Main)', mainKey, mainSecret);

    console.log('\n--- 2초 대기 중 (연속 요청 방지) ---');
    await new Promise(r => setTimeout(r, 2000));

    const bgResult = await testKey('BG 키 (Background)', bgKey, bgSecret);

    console.log('\n======================================');
    if (mainResult && bgResult) {
        console.log('🎉 모든 키가 정상입니다! 듀얼 엔진 가동 가능.');
    } else if (!mainResult && bgResult) {
        console.log('⚠️ BG 키만 정상입니다. 메인 키 확인이 필요합니다.');
    } else if (mainResult && !bgResult) {
        console.log('⚠️ 메인 키만 정상입니다. BG 키 확인이 필요합니다.');
    } else {
        console.log('🚫 모든 키에 문제가 있습니다. 설정을 확인해 주세요.');
    }
    console.log('======================================');
}

run();
