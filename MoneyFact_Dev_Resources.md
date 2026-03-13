# 📈 Money Fact 개발을 위한 필수 자료 모음 (KIS API & Tech Guide)

## 1. 한국투자증권(KIS) Open API 핵심 가이드

### 🔑 1.1 기본 설정 (Base URL)
*   **실전 투자:** `https://openapi.koreainvestment.com:9443`
*   **모의 투자:** `https://openapivts.koreainvestment.com:29443`
*   **웹소켓(실시간):** `ws://ops.koreainvestment.com:21000`

### 👥 1.2 외인/기관 수급 데이터 가져오기 (핵심!)
*   **API 명칭:** 국내기관_외국인 매매종목가집계 [국내주식-037]
*   **Endpoint:** `/uapi/domestic-stock/v1/quotations/foreign-institution-total`
*   **TR_ID (실전):** `FHPTJ04400000`
*   **설명:** 장중 실시간(약 30분~1시간 지연 집계)으로 외국인과 기관의 매수/매도 잠정치를 확인할 수 있습니다.
*   **주의:** 이 데이터는 확정치가 아니므로 '경향성' 파악에 사용해야 합니다. 
    *   *Tip:* 3일 연속 매도세가 포착되면 '위험 신호'로 간주하는 로직 구현 권장.

### ⚡ 1.3 실시간 체결가 (Websocket)
*   **TR_ID:** `H0STCNT0` (실시간 주식 체결가)
*   **활용:** 사용자가 보고 있는 'MY 종목'의 현재가를 0.1초 단위로 업데이트하여 UI에 반영.

---

## 2. React Native (Expo) 개발 꿀팁

### 📱 2.1 API 통신 (Axios vs Fetch)
*   **추천:** `Axios` 사용 (Timeout 설정 및 Interceptor 활용이 용이함).
*   **토큰 관리:** KIS 토큰은 24시간 유효하지만, 앱을 껐다 켜면 사라질 수 있음. `AsyncStorage`에 저장해두고 만료 시간을 체크하여 재발급 로직 구현 필수.

### 🔔 2.2 백그라운드 알림 (Background Fetch)
*   **라이브러리:** `expo-background-fetch`, `expo-task-manager`
*   **전략:** 
    *   앱이 꺼져있어도 15분마다 깨어나서 "내 종목"의 수급을 체크.
    *   위험 감지 시 `expo-notifications`로 로컬 푸시 발송.
    *   *주의:* iOS는 백그라운드 작업 주기를 OS가 맘대로 결정하므로, 안드로이드보다 덜 정확할 수 있음.

---

## 3. Money Fact만읠 차별화 아이디어 (Brainstorming)

### 💡 "스마트 머니 추적기"
*   단순히 "외인이 샀다"가 아니라, **"외인이 3일 연속 사면서 주가를 5% 올렸다 -> 찐매수"**라고 해석해주는 로직.
*   반대로 **"개미만 샀는데 주가가 올랐다 -> 꼬시기 패턴"** 경고.

### 💡 "인간 지표 (Human Index)"
*   커뮤니티 기능을 통해 "지금 살까요?" 투표를 올림.
*   대다수가 "산다"고 하면 -> "공포 탐욕 지수: 탐욕" -> **매도 권장**. (역발상 투자)

---

## 4. 참고용 예제 코드 (Python -> JS 변환 필요)
```javascript
// KIS API 요청 예시 (Axios)
const getForeignerData = async (stockCode, token) => {
  try {
    const response = await axios.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': APP_KEY,
        'appsecret': APP_SECRET,
        'tr_id': 'FHPTJ04400000'
      },
      params: {
        'fid_cond_mrkt_div_code': 'J',
        'fid_input_iscd': stockCode
      }
    });
    return response.data;
  } catch (error) {
    console.error("API Error", error);
  }
};
```

---

## 5. 핵심 로직 상세

### 🔥 5.1 오늘의 시장 종합 심리 (온도계)
시장에 존재하는 전체 코스피/코스닥(2,800여 개) 종목의 데이터를 취합하면 쓸모없는 잡음(노이즈)이 발생합니다. 머니팩트에서는 서버에서 지속 스캔 중인 **핵심 에이스 종목 170여 개(관심 종목 등)**의 당일 순매수/비 금액(억원)을 기준으로 계산합니다.
*   **공식:**
    `온도 = 기본점수 50도 + (외인 매수/매도 우위) ±10도 + (기관 매수/매도 우위) ±10도 + ((외인 합산 금액 + 기관 합산 금액) / 200)`
*   최대 온도는 95도, 최소 온도는 10도를 초과할 수 없도록 방어 로직이 적용되어 있습니다.

### 🤫 5.2 히든 매집 종목 (매집 의심 종목)
사용자가 설정한 연속 매집일 기준수(예: 3일 이상)를 충족할 때, 다음과 같은 기준으로 추출됩니다:
1.  **외인** 또는 **기관**의 수급이 설정된 N일 이상 연속으로 우상향 (연속 순매수).
2.  이때, 시장의 이목을 끌지 않도록 가격은 아직 크게 급등하지 않았을 경우 서버에서 `isHiddenAccumulation` 플래그를 할당합니다.
3.  앱에서 이를 받으면 필터링 조건과 맞을 때 화면상에 표출합니다. 

### 💡 API 404 에러 방지 조치사항 (v4.0.17+)
*   국내주식 거래량/거래대금 요청 시, 종종 KIS API가 제한(Throttle)되거나 404 에러를 뱉는 경우가 있습니다.
*   이를 방지하기 위해 개별 주식의 거래량에 가격을 곱한 단순 추산 로직(`현재가 / 100,000,000`)으로 '억원 단위' 매수 금액을 대신 구하도록 백엔드 처리되었습니다.
