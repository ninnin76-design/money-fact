# 🦅 Project Money Fact: 수급의 신 (AI Stock Assistant)

## 1. 프로젝트 개요 (Overview)
**"개인 투자자가 '스마트 머니(Smart Money)'의 흐름을 놓치지 않도록 돕는다."**

'Money Fact'는 단순한 주식 시세 확인 앱이 아닙니다.  
**외국인**과 **기관**이라는 거대 자본(수급)의 움직임을 실시간으로 추적하고, 특히 **'내 종목(MY Stock)'**에 발생할 수 있는 **매도 폭탄(Risk)**을 조기에 감지하여 알려주는 **'개인 투자자용 리스크 관리 비서'**입니다.

---

## 2. 핵심 기능 (Core Features)

### 🚨 1. 위험 감지 시스템 (The Risk Radar)
*   **기능:** 사용자가 등록한 'MY 종목'을 24시간(장중) 감시.
*   **로직:**
    *   외인/기관이 **3일 연속 매도**하는지 추적.
    *   대량 매도 발생 시 **"외인 3일째 이탈 중! 주의 요망"** 알림 발송.
*   **UX:** 앱 실행 시 최상단에 **'⚠️ 위험 포착 배너'**를 띄워 즉각적인 대응 유도.

### 📊 2. 하이브리드 수급 분석 (Hybrid Analytics)
*   **Background:** 
    *   기존 앱들은 서버 데이터에만 의존하여 실시간성이 떨어짐.
*   **Solution:**
    *   **서버(Node.js):** 전체 시장의 큰 흐름(Buy/Sell Top 랭킹) 분석.
    *   **앱(Direct KIS):** 내 종목(MY)은 사용자의 폰에서 증권사 API를 직접 찔러 **0.1초의 지연도 없는 실시간 데이터** 확보.

### ☁️ 3. 클라우드 동기화 (Cloud Sync)
*   **보안 키(Secure Key):** 복잡한 회원가입 없이, 나만의 '닉네임(Key)' 하나로 데이터 백업/복구.
*   **프라이버시:** 개인정보 수집 최소화 (오직 종목 리스트만 저장).

---

## 3. 기술 스택 (Tech Stack)

### 📱 Frontend (App)
*   **Framework:** React Native (Expo SDK 52+)
*   **Language:** JavaScript (ES6+)
*   **UI Library:** Lucide Icons (직관적 아이콘), Custom StyleSheet (Toss 스타일의 깔끔한 디자인)
*   **Critical Libs:**
    *   `axios`: API 통신
    *   `expo-notifications`: 로컬 알림
    *   `expo-task-manager`: 백그라운드 작업

### 🖥️ Backend (Server)
*   **Runtime:** Node.js
*   **Hosting:** Render / Vercel (Cloud Environment)
*   **Database:** In-Memory / Lightweight JSON Storage (속도 최적화)

### 🔌 Data Provider
*   **KIS Developers (한국투자증권 오픈 API):** 
    *   실시간 호가, 주자별 매매 동향, 종목 정보 조회.

---

## 4. 🚀 개발 로드맵 & 핫한 기능 제안 (Future Ideas)

이번 개발 단계에서 고려하거나 향후 업데이트로 반영할 수 있는 **'시장 트렌드(Hot Trends)'** 아이디어입니다.

### 💡 아이디어 1: "AI 감정 분석 (Sentiment Analysis)"
*   **내용:** 내 종목과 관련된 뉴스 기사 제목을 AI가 크롤링하여 **"오늘 뉴스 분위기가 험악합니다(부정 80%)"** 라고 알려줌.
*   **기술:** Python(BeautifulSoup) + NLP 모델(koBERT 등).

### 💡 아이디어 2: "투자 MBTI & 진단"
*   **내용:** 사용자의 매매 패턴(추격 매수형, 존버형 등)을 분석해 **"대표님은 '불나방' 타입입니다. 진정하세요."** 같은 위트 있는 조언 제공.

### 💡 아이디어 3: "백테스팅 시뮬레이터 (Backtesting)"
*   **내용:** "만약 내가 이 전략(외인 3일 매수 따라하기)을 지난달에 썼다면 얼마 벌었을까?"를 계산해 보여줌. 사용자의 확신을 강화하는 도구.

---

## 5. 개발 원칙 (Dev Principles) & 컨텍스트
*   **속도(Speed):** 한국 사람은 느린 거 못 참는다. 로딩은 1초 이내.
*   **직관성(Intuition):** 복잡한 차트는 숨기고, **"그래서 사? 팔아?"**에 대한 힌트(연속 매수 일수)를 크게 보여준다.
*   **안정성(Stability):** 토큰 발급 실패나 API 오류로 인해 앱이 꺼지는 일은 없어야 한다. (철저한 에러 핸들링)

> **"Money Fact는 단순한 도구가 아니라, 당신의 투자를 승리로 이끄는 파트너입니다."**
