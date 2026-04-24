# 🔔 Money Fact 심화 기능 가이드: 알림 & 백업 전략

## 1. 모바일 푸시 알림 (Push Notifications)

주식 앱에서 알림은 '생명'입니다. 외인이 팔고 있는데 알림이 안 오면 앱의 존재 가치가 없으니까요!

### ⚙️ 1.1 Expo Notifications 설정
*   **라이브러리:** `expo-notifications`, `expo-device`
*   **작동 방식:**
    1.  사용자 기기에서 **Push Token**을 발급받아 서버(혹은 로컬)에 저장.
    2.  `Notifications.setNotificationHandler`를 통해 앱이 켜져 있을 때와 꺼져 있을 때의 동작 정의.
*   **실전 팁:** 
    *   **중요도 설정:** 주식 매도 신호는 `AndroidNotificationPriority.MAX`로 설정하여 사용자가 절대 놓치지 않게 해야 함.
    *   **사운드:** 긴박함을 알리는 전용 알림음(예: 사이렌 소리)을 추가하면 UX가 만렙이 됨.

### 🔄 1.2 백그라운드 체크 (Background Fetch & Sync)
*   **라이브러리:** `expo-task-manager`
*   **로직:** 
    *   OS 레벨에서 주기적으로 앱을 깨움 (iOS/Android 공통).
    *   깨어난 짧은 시간(약 30초) 동안 KIS API를 조회하여 3일 연속 매도세인지 체크.
    *   조건 충족 시 `Notifications.scheduleNotificationAsync`로 즉각 알림.

---

## 2. 내 종목 데이터 백업 (Data Backup & Sync)

회원가입이 귀찮은 사용자들을 위해 '닉네임'이나 '클라우드 연동'만으로 종목을 지키는 법입니다.

### 🔒 2.1 보안 저장소 (Secure Storage)
*   **도구:** `expo-secure-store`
*   **용도:** KIS API 키, 개인 설정, 관심 종목 리스트 암호화 저장.
*   **장점:** 일반 `AsyncStorage`보다 훨씬 안전함 (iOS 키체인, Android 키스토어 사용).

### ☁️ 2.2 클라우드 동기화 (Cloud Syncing)
*   **방법 A (간편형):** `iCloud` / `Google Drive` 연동.
    *   `react-native-cloud-storage` 라이브러리를 통해 사용자의 개인 클라우드 공간에 JSON 파일로 백업.
    *   장점: 서버 유지비 없음, 사용자 프라이버시 보호.
*   **방법 B (백엔드형):** `Firebase Firestore` / `AWS Amplify`.
    *   사용자의 고유 ID(기기 ID 등)를 키로 사용하여 실시간 동기화.
    *   장점: 여러 기기(폰, 태블릿)에서 동기화 가능.

---

## 3. 대표님을 위한 추가 아이디어 (Expansion)

### 📈 "매수 타점 알리미"
*   단순 매도뿐만 아니라, **"내가 찍어둔 가격(지지선)에 도달했을 때"** 알림을 주는 기능.

### 🎭 "익명 종목 토크"
*   종목별로 익명 채팅방을 열어 **"나만 물렸나요?"** 같은 감정적 공유를 가능케 함 (리텐션 증가 전략).

### 🛡️ "리스크 스캔 Report"
*   매주 일요일 저녁, 내 종목들의 주간 수급 동향을 **한 장의 리포트 이미지**로 만들어 알림으로 전송.

> **"기술은 도구일 뿐, 핵심은 사용자의 소중한 자산을 지키는 마음입니다."**
