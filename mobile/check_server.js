const axios = require('axios');

const SERVER_URL = 'https://money-fact-server.onrender.com';

async function checkServer() {
    console.log('🔍 서버 스냅샷 데이터 점검 시작...\n');
    console.log('요청 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

    try {
        const startTime = Date.now();
        const res = await axios.get(`${SERVER_URL}/api/snapshot?t=${Date.now()}`, { timeout: 30000 });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const d = res.data;

        console.log(`응답 시간: ${elapsed}초\n`);

        console.log('═══════════════════════════════════════');
        console.log('📊 기본 정보');
        console.log('═══════════════════════════════════════');
        console.log('  status:', d.status);
        console.log('  updateTime:', d.updateTime);
        const updateDate = new Date(d.updateTime);
        console.log('  updateTime (한국시간):', updateDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
        console.log('  _scanTriggered:', d._scanTriggered || 'N/A');

        console.log('\n═══════════════════════════════════════');
        console.log('📡 스캔 통계');
        console.log('═══════════════════════════════════════');
        if (d.scanStats) {
            console.log('  전종목 스캔:', d.scanStats.totalScanned, '개');
            console.log('  심층 분석:', d.scanStats.deepScanned, '개');
            console.log('  성공 히트:', d.scanStats.successHits, '개');
            console.log('  와이드넷 추가:', d.scanStats.wideNetAdded, '개');
        } else {
            console.log('  (스캔 통계 없음)');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('📈 섹터별 자금 흐름');
        console.log('═══════════════════════════════════════');
        if (d.sectors && d.sectors.length > 0) {
            d.sectors.forEach(s => {
                const arrow = s.flow >= 0 ? '↑' : '↓';
                console.log(`  ${s.name}: ${arrow} ${s.flow}억`);
            });
        } else {
            console.log('  (섹터 데이터 없음)');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('🏦 기관/외국인 수급 흐름');
        console.log('═══════════════════════════════════════');
        if (d.instFlow) {
            console.log('  연기금(pnsn):', d.instFlow.pnsn, '억');
            console.log('  투신(ivtg):', d.instFlow.ivtg, '억');
            console.log('  보험(ins):', d.instFlow.ins, '억');
            if (d.instFlow.foreign !== undefined) console.log('  외국인(foreign):', d.instFlow.foreign, '억');
            if (d.instFlow.institution !== undefined) console.log('  기관합계(institution):', d.instFlow.institution, '억');
        } else {
            console.log('  (기관 수급 데이터 없음)');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('💰 매수 데이터 (buyData)');
        console.log('═══════════════════════════════════════');
        const buyData = d.buyData || {};
        const buyKeys = Object.keys(buyData);
        let totalBuy = 0;
        if (buyKeys.length > 0) {
            buyKeys.forEach(k => {
                const count = (buyData[k] || []).length;
                totalBuy += count;
                console.log(`  [${k}]: ${count}개 종목`);
            });
            console.log(`  ── 총 매수 종목: ${totalBuy}개`);

            console.log('\n  📋 샘플 매수 종목 (최대 5개):');
            let shown = 0;
            for (const k of buyKeys) {
                for (const item of (buyData[k] || [])) {
                    if (shown >= 5) break;
                    console.log(`    [${k}] ${item.name}(${item.code}) 가격:${item.price} 연속:${item.streak}일 fStreak:${item.fStreak} iStreak:${item.iStreak}`);
                    shown++;
                }
                if (shown >= 5) break;
            }
        } else {
            console.log('  (매수 데이터 없음)');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('📉 매도 데이터 (sellData)');
        console.log('═══════════════════════════════════════');
        const sellData = d.sellData || {};
        const sellKeys = Object.keys(sellData);
        let totalSell = 0;
        if (sellKeys.length > 0) {
            sellKeys.forEach(k => {
                const count = (sellData[k] || []).length;
                totalSell += count;
                console.log(`  [${k}]: ${count}개 종목`);
            });
            console.log(`  ── 총 매도 종목: ${totalSell}개`);

            console.log('\n  📋 샘플 매도 종목 (최대 5개):');
            let shown = 0;
            for (const k of sellKeys) {
                for (const item of (sellData[k] || [])) {
                    if (shown >= 5) break;
                    console.log(`    [${k}] ${item.name}(${item.code}) 가격:${item.price} 연속:${item.streak}일 fStreak:${item.fStreak} iStreak:${item.iStreak}`);
                    shown++;
                }
                if (shown >= 5) break;
            }
        } else {
            console.log('  (매도 데이터 없음)');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('🔬 전체 분석 데이터 (allAnalysis)');
        console.log('═══════════════════════════════════════');
        const allAnalysis = d.allAnalysis || {};
        const analysisKeys = Object.keys(allAnalysis);
        console.log(`  총 분석 종목 수: ${analysisKeys.length}개`);
        if (analysisKeys.length > 0) {
            console.log('\n  📋 샘플 분석 종목 (최대 5개):');
            analysisKeys.slice(0, 5).forEach(code => {
                const a = allAnalysis[code];
                console.log(`    ${a.name || code}(${code}) fStreak:${a.fStreak} iStreak:${a.iStreak} vwap:${a.vwap} hidden:${a.isHiddenAccumulation}`);
            });
        }

        console.log('\n═══════════════════════════════════════');
        console.log('🩺 자동 진단 결과');
        console.log('═══════════════════════════════════════');

        let issues = 0;

        const timeDiff = Date.now() - updateDate.getTime();
        const hoursDiff = (timeDiff / (1000 * 60 * 60)).toFixed(1);
        if (timeDiff > 24 * 60 * 60 * 1000) {
            console.log(`  ⚠️ updateTime이 ${hoursDiff}시간 전 데이터입니다! (24시간 이상 경과)`);
            issues++;
        } else if (timeDiff > 6 * 60 * 60 * 1000) {
            console.log(`  ⚠️ updateTime이 ${hoursDiff}시간 전 데이터입니다.`);
            issues++;
        } else {
            console.log(`  ✅ updateTime: ${hoursDiff}시간 전 (정상)`);
        }

        if (d.status === 'SCANNING') {
            console.log('  🔄 서버가 현재 스캔 중입니다 (데이터가 곧 갱신됩니다)');
        } else if (d.status === 'READY' || d.status === 'IDLE') {
            console.log('  ✅ 서버 상태: 정상');
        } else {
            console.log(`  ℹ️ 서버 상태: ${d.status}`);
        }

        if (d.sectors) {
            const nullFlows = d.sectors.filter(s => s.flow === null || s.flow === undefined || isNaN(s.flow));
            if (nullFlows.length > 0) {
                console.log(`  ⚠️ null 값 섹터 ${nullFlows.length}개: ${nullFlows.map(s => s.name).join(', ')}`);
                issues++;
            } else {
                console.log('  ✅ 섹터 데이터: 모두 유효');
            }
        }

        if (totalBuy === 0 && totalSell === 0) {
            console.log('  ⚠️ 매수/매도 데이터가 모두 비어 있음!');
            issues++;
        } else {
            console.log(`  ✅ 매수 ${totalBuy}개 / 매도 ${totalSell}개 종목`);
        }

        if (analysisKeys.length === 0) {
            console.log('  ⚠️ allAnalysis가 비어 있음!');
            issues++;
        } else {
            console.log(`  ✅ allAnalysis: ${analysisKeys.length}개 종목 분석`);
        }

        let zeroPriceCount = 0;
        for (const k of buyKeys) {
            for (const item of (buyData[k] || [])) {
                if (!item.price || item.price === '0' || item.price === 0) zeroPriceCount++;
            }
        }
        if (zeroPriceCount > 0) {
            console.log(`  ⚠️ 가격 0/없는 종목: ${zeroPriceCount}개`);
            issues++;
        } else if (totalBuy > 0) {
            console.log('  ✅ 가격 데이터: 모두 유효');
        }

        console.log('\n═══════════════════════════════════════');
        if (issues === 0) {
            console.log('🎉 진단 완료: 문제 없음! 모든 데이터 정상!');
        } else {
            console.log(`🔧 진단 완료: ${issues}개 항목 확인 필요`);
        }
        console.log('═══════════════════════════════════════');

    } catch (err) {
        console.error('❌ 서버 응답 오류:', err.message);
        if (err.response) {
            console.error('  HTTP 상태:', err.response.status);
        }
    }
}

checkServer();
