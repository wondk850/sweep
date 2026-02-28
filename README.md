# 🧹 Sweep — 영어 순서배열 학습 앱

**수능/내신 영어 서술형을 위한 어순 배열 트레이닝 웹앱**

> 교사가 문장을 입력하면 학생이 청크(구/절)와 단어를 순서대로 배열합니다.  
> Cloudflare Tunnel로 로컬에서 실행 → 학생은 스마트폰/노트북으로 접속

---

## ✨ 주요 기능

### 📖 3단계 학습 시스템
| 단계 | 설명 |
|------|------|
| **1단계** 청크 배열 | 의미 단위(구/절)로 순서 맞추기 |
| **2단계** 핵심 배열 | 주어·동사·목적어 등 핵심 요소 배열 |
| **3단계** 완전 배열 | 모든 단어를 올바른 순서로 배열 |

### 🇰🇷 한글 해석 입력 (수능/내신 재현)
- 영어 문장 / 한글 해석을 각각 붙여넣기 1번씩
- 학습 화면에서 **한글 해석이 문제**로 표시 → 실전 시험과 동일한 환경

### 🔊 TTS 소리 설정
- `✅ 정답 후 자동` — 정답 맞히면 원어민 발음 자동 재생 (기본값)
- `🔊 자유 청취` — 버튼 클릭으로 언제든 청취
- `🔇 소리 없음` — TTS 비활성화

### ❌ 시도 횟수 설정 (2~6회)
- 교사가 스킵까지 허용할 시도 횟수를 2~6회 중 직접 설정
- 제한 없이 맞출 때까지 도전 모드도 지원

### 📊 Gemini 최적화 MD 결과지
- **📋 MD 복사** — 전체 결과를 마크다운으로 클립보드 복사 → Gemini에 바로 붙여넣기
- **📄 MD 저장** — `.md` 파일로 다운로드 (보관용)
- 문장별 오답 기록, 학생 오답 원문, Gemini 분석 프롬프트 자동 포함

### 🔗 공유 링크
- 교사 설정(문장·단계·타이머·TTS·시도횟수·한글해석) 전체가 URL 파라미터로 인코딩
- 링크 클릭 한 번으로 학생 바로 시작

### 🎯 Syntax Sniper 연계
- MD 결과지의 오답 문장 → [Syntax Sniper](https://github.com/wondk850/syntax-sniper)에 붙여넣기
- Gemini가 오답 패턴 분석 후 집중 훈련할 후치수식 유형 추천

---

## 🚀 시작하기

### 요구사항
- Python 3.x (로컬 서버용)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (`cloudflared`)

### 실행

```bash
# 1. 저장소 클론
git clone https://github.com/wondk850/sweep.git
cd sweep

# 2. cloudflared 설치 (최초 1회)
install-cloudflared.bat 실행

# 3. 앱 실행
Sweep 실행.bat 더블클릭
```

터미널에 `https://xxx.trycloudflare.com` 주소가 뜨면 **학생에게 공유**하세요.

---

## 📋 사용 흐름

```
교사                              학생
 │                                 │
 ├─ 영어 문장 입력                  │
 ├─ 한글 해석 입력 (선택)            │
 ├─ 단계/TTS/시도횟수 설정           │
 ├─ 🔗 링크 생성 → 공유 ────────────►│
 │                                 ├─ 청크/단어 배열
 │                                 ├─ 오답 시 파란 힌트
 │                                 └─ 결과 화면
 │◄──────── MD 결과지 ─────────────┘
 │
 ├─ Gemini에 MD 붙여넣기
 ├─ 후치수식 오답 패턴 분석
 └─ Syntax Sniper 연계 훈련
```

---

## 🛠️ 기술 스택

- **HTML5 + CSS3 + Vanilla JavaScript** (의존성 zero, 단일 파일 구조)
- **Web Speech API** — TTS 원어민 발음
- **Cloudflare Tunnel** — 서버 없이 외부 접속
- **Python http.server** — 로컬 웹서버

---

## 📁 파일 구조

```
sweep/
├── index.html          # 메인 앱
├── app.js              # 핵심 로직
├── style.css           # 스타일
├── Sweep 실행.bat      # 원클릭 실행 (Windows)
├── start.bat           # 대체 실행 스크립트
└── install-cloudflared.bat  # cloudflared 설치
```

---

## 🔄 학습 파이프라인

```
Sweep (어순 배열) → MD 결과지 → Gemini 2.5 Pro (분석) → Syntax Sniper (후치수식 훈련)
```

- **Sweep**: 전체 문장 어순 감각 훈련
- **Gemini**: 오답 패턴 중 후치수식 연관성 분석
- **Syntax Sniper**: 관계절·분사구·to부정사 등 집중 마킹 훈련

---

## 📄 라이선스

MIT License — 자유롭게 사용, 수정, 배포 가능합니다.

Made with ❤️ by **Wonsummer Studio**
