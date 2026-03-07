const axios = require('axios');
const fs = require('fs');

const SERVER_URL = 'https://money-fact-server.onrender.com';

async function checkServer() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    log('🔍 서버 스냅샷 데이터 점검 시작...\n');
    log('요청 시간: ' + new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

    try {
        const startTime = Date.now();
        const res = await axios.get(`${SERVER_URL}/api/snapshot?t=${Date.now()}`, { timeout: 30000 });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const d = res.data;

        log(`응답 시간: ${elapsed}초\n`);

        log('═══════════════════════════════════════');
        log('📊 기본 정보');
        log('═══════════════════════════════════════');
        log(`  status: ${d.status}`);
        log(`  updateTime: ${d.updateTime}`);
        const updateDate = new Date(d.updateTime);
        log(`  updateTime (한국시간): ${updateDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        log(`  _scanTriggered: ${d._scanTriggered || 'N/A'}`);

        log('\n═══════════════════════════════════════');
        log('📡 스캔 통계');
        log('═══════════════════════════════════════');
        if (d.scanStats) {
            log(`  전종목 스캔: ${d.scanStats.totalScanned} 개`);
            log(`  심층 분석: ${d.scanStats.deepScanned} 개`);
            log(`  성공 히트: ${d.scanStats.successHits} 개`);
            log(`  와이드넷 추가: ${d.scanStats.wideNetAdded} 개`);
        } else {
            log('  (스캔 통계 없음)');
        }

        log('\n═══════════════════════════════════════');
        log('📈 섹터별 자금 흐름');
        log('═══════════════════════════════════════');
        if (d.sectors && d.sectors.length > 0) {
            d.sectors.forEach(s => {
                const arrow = s.flow >= 0 ? '↑' : '↓';
                log(`  ${s.name}: ${arrow} ${s.flow}억`);
            });
        } else {
            log('  (섹터 데이터 없음)');
        }

        log('\n═══════════════════════════════════════');
        log('🏦 기관/외국인 수급 흐름');
        log('═══════════════════════════════════════');
        if (d.instFlow) {
            log(`  연기금(pnsn): ${d.instFlow.pnsn} 억`);
            log(`  투신(ivtg): ${d.instFlow.ivtg} 억`);
            log(`  보험(ins): ${d.instFlow.ins} 억`);
            if (d.instFlow.foreign !== undefined) log(`  외국인(foreign): ${d.instFlow.foreign} 억`);
            if (d.instFlow.institution !== undefined) log(`  기관합계(institution): ${d.instFlow.institution} 억`);
        } else {
            log('  (기관 수급 데이터 없음)');
        }

        log('\n═══════════════════════════════════════');
        log('💰 매수 데이터 (buyData)');
        log('═══════════════════════════════════════');
        const buyData = d.buyData || {};
        const buyKeys = Object.keys(buyData);
        let totalBuy = 0;
        if (buyKeys.length > 0) {
            buyKeys.forEach(k => {
                const count = (buyData[k] || []).length;
                totalBuy += count;
                log(`  [${k}]: ${count}개 종목`);
            });
            log(`  ── 총 매수 종목: ${totalBuy}개`);

            log('\n  📋 샘플 매수 종목 (최대 5개):');
            let shown = 0;
            for (const k of buyKeys) {
                for (const item of (buyData[k] || [])) {
                    if (shown >= 5) break;
                    log(`    [${k}] ${item.name}(${item.code}) 가격:${item.price} 연속:${item.streak}일 fStreak:${item.fStreak} iStreak:${item.iStreak}`);
                    shown++;
                }
                if (shown >= 5) break;
            }
        } else {
            log('  (매수 데이터 없음)');
        }

        log('\n═══════════════════════════════════════');
        log('📉 매도 데이터 (sellData)');
        log('═══════════════════════════════════════');
        const sellData = d.sellData || {};
        const sellKeys = Object.keys(sellData);
        let totalSell = 0;
        if (sellKeys.length > 0) {
            sellKeys.forEach(k => {
                const count = (sellData[k] || []).length;
                totalSell += count;
                log(`  [${k}]: ${count}개 종목`);
            });
            log(`  ── 총 매도 종목: ${totalSell}개`);

            log('\n  📋 샘플 매도 종목 (최대 5개):');
            let shown = 0;
            for (const k of sellKeys) {
                for (const item of (sellData[k] || [])) {
                    if (shown >= 5) break;
                    log(`    [${k}] ${item.name}(${item.code}) 가격:${item.price} 연속:${item.streak}일 fStreak:${item.fStreak} iStreak:${item.iStreak}`);
                    shown++;
                }
                if (shown >= 5) break;
            }
        } else {
            log('  (매도 데이터 없음)');
        }

        log('\n═══════════════════════════════════════');
        log('🔬 전체 분석 데이터 (allAnalysis)');
        log('═══════════════════════════════════════');
        const allAnalysis = d.allAnalysis || {};
        const analysisKeys = Object.keys(allAnalysis);
        log(`  총 분석 종목 수: ${analysisKeys.length}개`);
        if (analysisKeys.length > 0) {
            log('\n  📋 샘플 분석 종목 (최대 5개):');
            analysisKeys.slice(0, 5).forEach(code => {
                const a = allAnalysis[code];
                log(`    ${a.name || code}(${code}) fStreak:${a.fStreak} iStreak:${a.iStreak} vwap:${a.vwap} hidden:${a.isHiddenAccumulation}`);
            });
        }

        log('\n═══════════════════════════════════════');
        log('🩺 자동 진단 결과');
        log('═══════════════════════════════════════');

        let issues = 0;

        const timeDiff = Date.now() - updateDate.getTime();
        const hoursDiff = (timeDiff / (1000 * 60 * 60)).toFixed(1);
        if (timeDiff > 24 * 60 * 60 * 1000) {
            log(`  ⚠️ updateTime이 ${hoursDiff}시간 전 데이터입니다! (24시간 이상 경과)`);
            issues++;
        } else if (timeDiff > 6 * 60 * 60 * 1000) {
            log(`  ⚠️ updateTime이 ${hoursDiff}시간 전 데이터입니다.`);
            issues++;
        } else {
            log(`  ✅ updateTime: ${hoursDiff}시간 전 (정상)`);
        }

        if (d.status === 'SCANNING') {
            log('  🔄 서버가 현재 스캔 중입니다 (데이터가 곧 갱신됩니다)');
        } else if (d.status === 'READY' || d.status === 'IDLE') {
            log('  ✅ 서버 상태: 정상 (READY/IDLE)');
        } else {
            log(`  ℹ️ 서버 상태: ${d.status}`);
        }

        if (d.sectors) {
            const nullFlows = d.sectors.filter(s => s.flow === null || s.flow === undefined || isNaN(s.flow));
            if (nullFlows.length > 0) {
                log(`  ⚠️ null 값 섹터 ${nullFlows.length}개 발견: ${nullFlows.map(s => s.name).join(', ')}`);
                issues++;
            } else {
                log('  ✅ 섹터 데이터: 모두 유효한 값');
            }
        } else {
            log('  ⚠️ 섹터 데이터 없음!');
            issues++;
        }

        if (totalBuy === 0 && totalSell === 0) {
            log('  ⚠️ 매수/매도 데이터가 모두 비어 있습니다!');
            issues++;
        } else {
            log(`  ✅ 매수 ${totalBuy}개 / 매도 ${totalSell}개 종목 확인`);
        }

        if (analysisKeys.length === 0) {
            log('  ⚠️ allAnalysis가 비어 있습니다!');
            issues++;
        } else {
            log(`  ✅ allAnalysis: ${analysisKeys.length}개 종목 분석 완료`);
        }

        let zeroPriceCount = 0;
        for (const k of buyKeys) {
            for (const item of (buyData[k] || [])) {
                if (!item.price || item.price === '0' || item.price === 0) zeroPriceCount++;
            }
        }
        if (zeroPriceCount > 0) {
            log(`  ⚠️ 가격이 0이거나 없는 종목: ${zeroPriceCount}개`);
            issues++;
        } else if (totalBuy > 0) {
            log('  ✅ 가격 데이터: 모두 유효');
        }

        log('\n═══════════════════════════════════════');
        if (issues === 0) {
            log('🎉 진단 완료: 문제 없음! 모든 데이터가 정상입니다.');
        } else {
            log(`🔧 진단 완료: ${issues}개 항목 확인 필요`);
        }
        log('═══════════════════════════════════════');

        fs.writeFileSync('server_check_result.txt', output, 'utf8');
        console.log('결과가 server_check_result.txt 파일에 저장되었습니다.');

    } catch (err) {
        let errOutput = '❌ 서버 응답 오류: ' + err.message + '\n';
        if (err.response) {
            errOutput += '  HTTP 상태: ' + err.response.status + '\n';
        }
        console.error(errOutput);
        fs.writeFileSync('server_check_result.txt', errOutput, 'utf8');
    }
}

checkServer();
