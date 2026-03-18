# PRD: FromSeoul Ops Bot
**Product Requirements Document v0.2**
버전: 0.2.0 | 작성일: 2026-03-19 | 작성자: Milo (PM)
상태: **검토중**

---

## 1. 개요 (Overview)

### 1.1 배경

FromSeoul은 OAS·MRG·BTQ 3개 Booth.pm 의상 브랜드를 운영하는 크리에이티브 조직이다.
내부 6인·외부 20인+ 구조에서 기획→생산→출시 파이프라인의 레거시 지식이 개인 DM·노션 파편·구두 인수인계로 분산되어 있어 소통 비용과 온보딩 비용이 높다.

**핵심 문제:**
- 신규 외부 인력에게 동일한 설명을 반복하는 소통 비용
- SOP 문서가 없거나 구식이라 품질 편차 발생
- 파이프라인 현황 파악에 수동 확인 필요
- 지식이 사람에 종속되어 확장이 불가능한 구조

### 1.2 미션

크리에이티브 팀의 오퍼레이션 지식을 중앙화하고, 자연어 명령으로 파이프라인을 제어할 수 있는 AI 에이전트 인터페이스를 구축한다.
**목표: 무한 복제 가능한 Booth 브랜드 운영 구조 실현.**

### 1.3 제품 정의

| 항목 | 내용 |
|------|------|
| 제품명 | FromSeoul Ops Bot (코드명: `OpsBot`) |
| 형태 | PWA 챗봇 (Gemini-style UI) |
| LLM | GPT-4o mini (OpenAI) |
| 배포 MVP | GitHub Pages + Vercel API Routes |
| 배포 v1.0 | Vercel (단일 프로젝트, 커스텀 도메인) |
| 접근 | Role-based 초대코드 + PIN |

---

## 2. 목표 (Goals)

| # | 목표 | 성공 지표 | 우선순위 |
|---|------|-----------|----------|
| G1 | 레거시 지식 중앙화 | SOP 10건+ 인덱싱, 쿼리 응답 정확도 85%+ | P0 |
| G2 | 온보딩 자동화 | 신규 외부 인력 온보딩 소요시간 50% 단축 | P0 |
| G3 | 파이프라인 명령 실행 | 자연어로 5종 이상 명령 실행 가능 | P1 |
| G4 | 접근 제어 | 4레벨 권한별 데이터 노출 100% 분리 | P0 |
| G5 | 대시보드 연동 준비 | REST API 인터페이스 정의·문서화 완료 | P2 |

---

## 3. 사용자 및 역할 (Users & Roles)

### 3.1 역할 정의

| 레벨 | 역할 | 실제 대상 | 인원 |
|------|------|-----------|------|
| L0 | **Owner** | CPO (Milo) | 1명 |
| L1 | **Admin** | 아트디렉터, 브랜드 매니저 | 4명 |
| L2 | **Member** | 내부 모델러·리거 | 4명 |
| L3 | **External** | 외부 프리랜서 | 20명+ |

### 3.2 역할별 접근 권한

| 데이터/기능 | L0 | L1 | L2 | L3 |
|-------------|:--:|:--:|:--:|:--:|
| 전체 파이프라인 현황 | ✅ | ✅ | ❌ | ❌ |
| 브랜드별 비축량 조회 | ✅ | ✅ | 본인 브랜드 | ❌ |
| 브랜드 매출·수익 데이터 | ✅ | ❌ | ❌ | ❌ |
| 자신의 태스크 | ✅ | ✅ | ✅ | ✅ |
| 전체 SOP 조회 | ✅ | ✅ | ✅ | ✅ |
| 브랜드 레거시 문서 | ✅ | ✅ | ✅ | ❌ |
| 인력 관리·초대 | ✅ | ✅ | ❌ | ❌ |
| 기획 홀드·재개 명령 | ✅ | ✅ | ❌ | ❌ |
| 시스템 설정 | ✅ | ❌ | ❌ | ❌ |
| 지식베이스 편집 | ✅ | ✅ | ❌ | ❌ |

### 3.3 인증 플로우

```
[초대 링크 접속]
       ↓
[역할 선택 + 초대코드 입력]
       ↓
[PIN 4자리 설정 (최초 1회)]
       ↓
[JWT 발급] → 세션 시작
       ↓
[만료: Internal 7일 / External 24시간]
```

---

## 4. 핵심 기능 상세 (Feature Specs)

### 4.1 채팅 UI (Gemini-style)

#### 레이아웃
```
┌─────────────────────────────────────────┐
│  [≡]  OpsBot            [역할 뱃지] [⚙] │  ← 헤더
├──────────┬──────────────────────────────┤
│          │                              │
│  대화    │   채팅 영역                  │
│  히스토리│   (메시지 스트림)            │
│          │                              │
│  ─────   │                              │
│  새 대화 │                              │
│  + 버튼  │                              │
│          ├──────────────────────────────┤
│          │  [빠른 액션 칩들]            │
│          │  ┌───────────────────────┐   │
│          │  │  메시지 입력창    [↑] │   │  ← 인풋
│          │  └───────────────────────┘   │
└──────────┴──────────────────────────────┘
```

#### 메시지 렌더링
- 마크다운 완전 지원: 코드블록, 테이블, 리스트, 볼드/이탤릭
- 스트리밍 응답 (Server-Sent Events)
- 코드블록 복사 버튼
- 응답 중 로딩 인디케이터 (점 애니메이션)

#### 빠른 액션 칩 (역할별 다름)

| 역할 | 기본 칩 |
|------|---------|
| L0/L1 | 오늘 파이프라인 현황 / OAS 비축량 / 기획 큐 확인 |
| L2 | 내 태스크 확인 / QA 체크리스트 / 리깅 가이드 |
| L3 | 온보딩 가이드 / 내 브리프 확인 / 납품 기준 |

#### PWA 설정
- 홈 화면 설치 지원
- 오프라인: 지식베이스 캐시된 응답 제공 (인터넷 없을 때 이전 답변 재활용)
- 테마: 다크 기본, 라이트 전환

---

### 4.2 지식저장소 (Knowledge Base)

#### 4.2.1 문서 구조

```
knowledge/
├── pipeline/
│   ├── 01-stage-definitions.md      # 10단계 파이프라인 정의
│   ├── 02-qa-gates.md               # 각 스테이지 QA 통과 조건
│   ├── 03-buffer-rules.md           # 버퍼 임계값·기획 홀드 규칙
│   └── 04-cadence-calendar.md       # 2주 릴리즈 캐덴스 규칙
├── sop/
│   ├── modeling/
│   │   ├── pre-modeling-checklist.md    # 블로킹~베이스메시 기준
│   │   └── post-modeling-checklist.md   # 디테일~클린업~LOD 기준
│   ├── texturing/
│   │   ├── uv-standards.md              # UV 언랩 규격
│   │   └── pbr-material-guide.md        # PBR 텍스처 기준
│   ├── rigging/
│   │   ├── bone-setup-guide.md          # 본 셋업 표준
│   │   └── weight-physics-checklist.md  # 웨이트·피직스 검수 기준
│   └── launch/
│       ├── booth-listing-sop.md         # Booth 리스팅 절차
│       ├── thumbnail-specs.md           # 썸네일 규격
│       └── promotion-playbook.md        # 판촉·SNS 플레이북
├── brand/
│   ├── OAS/
│   │   ├── brand-identity.md            # 브랜드 아이덴티티
│   │   └── product-legacy.md            # 출시 이력
│   ├── MRG/
│   │   ├── brand-identity.md
│   │   └── product-legacy.md
│   └── BTQ/
│       ├── brand-identity.md
│       └── product-legacy.md
└── onboarding/
    ├── modeler-onboarding.md        # 모델러 온보딩 패키지
    ├── rigger-onboarding.md         # 리거 온보딩 패키지
    └── external-brief-template.md  # 외부 인력 브리프 템플릿
```

#### 4.2.2 인덱싱 우선순위 (Phase 0 — 즉시 작성 필요)

| 우선순위 | 문서 | 이유 |
|----------|------|------|
| 🔴 P0 | `pipeline/01-stage-definitions.md` | 모든 명령의 기반 데이터 |
| 🔴 P0 | `pipeline/02-qa-gates.md` | QA 게이팅 판단 기준 |
| 🔴 P0 | `pipeline/03-buffer-rules.md` | 임계값=3, 기획 홀드 로직 |
| 🔴 P0 | `onboarding/external-brief-template.md` | 외부 인력 즉시 활용 |
| 🟡 P1 | `sop/modeling/pre-modeling-checklist.md` | 모델러 QA 1순위 |
| 🟡 P1 | `sop/modeling/post-modeling-checklist.md` | 모델러 QA 2순위 |
| 🟡 P1 | `sop/rigging/weight-physics-checklist.md` | 리깅 QA 1순위 |
| 🟡 P1 | `sop/launch/booth-listing-sop.md` | 출시 절차 표준화 |
| 🟢 P2 | `brand/OAS/brand-identity.md` | 브랜드 컨텍스트 |
| 🟢 P2 | `brand/MRG/brand-identity.md` | 브랜드 컨텍스트 |
| 🟢 P2 | `brand/BTQ/brand-identity.md` | 브랜드 컨텍스트 |

> **P0 문서 (4건)는 개발 착수 전 CPO + AD가 작성 완료해야 함.**
> 나머지는 봇 운영 중에 순차 추가 가능.

#### 4.2.3 RAG 파이프라인

```
[마크다운 문서 저장]
       ↓
[청크 분할: 512 tokens, overlap 64]
       ↓
[OpenAI text-embedding-3-small → 벡터]
       ↓
[Vercel KV (Redis) 저장]

─── 쿼리 시 ───

[사용자 메시지]
       ↓
[쿼리 임베딩 생성]
       ↓
[코사인 유사도 검색 → top-5 청크]
       ↓
[GPT-4o mini에 컨텍스트 주입]
       ↓
[스트리밍 응답]
```

---

### 4.3 파이프라인 명령 엔진 (Command Engine)

#### 4.3.1 Intent 분류 방식

GPT-4o mini function calling 사용:

```json
functions: [
  "get_buffer_status",     // 비축량 조회
  "update_stage",          // 스테이지 이동
  "get_pipeline_overview", // 전체 현황
  "hold_planning",         // 기획 홀드
  "resume_planning",       // 기획 재개
  "send_onboarding",       // 온보딩 링크 발송
  "get_my_tasks",          // 내 태스크 조회
  "knowledge_query"        // 지식베이스 검색 (fallback)
]
```

#### 4.3.2 MVP 명령 상세

| 명령 | Intent | 실행 | 권한 |
|------|--------|------|------|
| "OAS 비축량 알려줘" | `get_buffer_status` | Buffer API 조회 | L1+ |
| "[상품명] 모델링 완료 처리" | `update_stage` | ClickUp 스테이지 업데이트 | L2+ |
| "이번 주 출시 예정 리스트" | `get_pipeline_overview` | ClickUp 필터 쿼리 | L1+ |
| "BTQ 기획 홀드" | `hold_planning` | 기획 자동화 플래그 OFF | L1+ |
| "모델러 온보딩 링크 생성" | `send_onboarding` | JWT 임시 링크 생성 | L1+ |
| "리깅 체크리스트 보여줘" | `knowledge_query` | RAG 검색 | L2+ |

#### 4.3.3 버퍼 임계값 로직

```
버퍼 기획 중단 조건 (기확정: 임계값 = 3)

IF 브랜드별 QA통과~출시준비 완료 상품 수 >= 3
  → 해당 브랜드 기획 자동 홀드
  → Discord #alert 알림: "⚠️ [브랜드] 버퍼 임계값 도달. 기획 홀드."

IF 버퍼 < 2
  → Discord #alert 알림: "🔴 [브랜드] 버퍼 부족. 기획 재개 권고."
```

---

### 4.4 Admin 기능

#### 지식베이스 관리 UI (L1+)
- 문서 목록 조회
- 마크다운 편집기 (인라인)
- 문서 추가·삭제
- 저장 시 자동 재인덱싱 트리거

#### 인력 관리 (L1+)
- 초대 링크 생성 (역할 지정)
- 활성 세션 목록
- 외부 인력 접근 만료 처리

---

### 4.5 대시보드 연동 API

추후 미션 컨트롤 대시보드에서 직접 소비할 REST API:

```
GET  /api/v1/buffer              # 브랜드별 비축량 전체
GET  /api/v1/buffer/:brand       # 특정 브랜드 비축량
GET  /api/v1/pipeline            # 전체 파이프라인 현황
GET  /api/v1/pipeline/:brand     # 브랜드별 현황
POST /api/v1/pipeline/stage      # 스테이지 업데이트
GET  /api/v1/schedule            # 출시 캘린더 (추후)
POST /api/v1/ticket              # 태스크 생성 (추후)
GET  /api/v1/knowledge/search    # 지식베이스 쿼리 (추후)
```

인증: Bearer JWT (L0/L1만 접근 가능)

---

## 5. 기술 스택 (Tech Stack)

### Frontend

| 항목 | 선택 | 버전 | 이유 |
|------|------|------|------|
| Framework | React | 18+ | 생태계, 팀 친화 |
| Build | Vite | 5+ | vocab-master와 동일 패턴 |
| Styling | Tailwind CSS | 3+ | Gemini-style 빠른 구현 |
| PWA | vite-plugin-pwa | 0.20+ | 기존 검증 |
| Markdown | react-markdown + remark-gfm | latest | 메시지 렌더링 |
| State | Zustand | 4+ | 경량, 심플 |
| HTTP | axios | 1+ | 스트리밍 지원 |

### Backend (Vercel Serverless)

| 항목 | 선택 | 이유 |
|------|------|------|
| Runtime | Vercel Functions (Node.js) | 무료 티어, GitHub 연동 |
| LLM | GPT-4o mini (OpenAI) | 저비용, function calling 우수 |
| Embedding | text-embedding-3-small | 벡터 검색, 저비용 |
| Vector Store | Vercel KV (Redis) | MVP: 별도 DB 없이 처리 |
| Auth | jose (JWT) | 서버리스 친화 |
| Stream | Server-Sent Events (SSE) | 스트리밍 응답 |

### 외부 연동

| 서비스 | 용도 | API |
|--------|------|-----|
| ClickUp API v2 | 파이프라인 데이터 | REST |
| Discord Webhook | 버퍼 알림, 온보딩 DM | Webhook |
| OpenAI | LLM + 임베딩 | SDK |

---

## 6. 시스템 아키텍처

```
[PWA 클라이언트]
       │
       │ HTTPS / SSE
       ↓
[Vercel Edge / API Routes]
       │
       ├── /api/chat      → GPT-4o mini (OpenAI)
       │                     + RAG (Vercel KV 벡터)
       │
       ├── /api/pipeline  → ClickUp API v2
       │
       ├── /api/buffer    → ClickUp 커스텀 필드 집계
       │
       ├── /api/knowledge → Vercel KV (마크다운 청크)
       │
       └── /api/auth      → JWT 발급·검증

[알림]
  Vercel Cron (5분 주기) → 버퍼 체크 → Discord Webhook
```

---

## 7. 보안 설계 (Security)

| 항목 | 방식 |
|------|------|
| 인증 | JWT HS256, 서버사이드 검증 |
| 전송 | HTTPS only (Vercel 기본) |
| API 키 | Vercel 환경변수, 클라이언트 노출 없음 |
| 권한 검사 | 모든 API Route에서 JWT 디코딩 후 레벨 확인 |
| External 격리 | L3 쿼리는 별도 컨텍스트 프롬프트 (민감 정보 시스템 프롬프트 차단) |
| 세션 만료 | Internal 7일 / External 24시간 |
| 초대코드 | 1회용, 생성 후 48시간 만료 |

---

## 8. 비기능 요구사항

| 항목 | 목표 |
|------|------|
| 응답 지연 | 첫 토큰 < 1.5초 |
| 가용성 | 99%+ (Vercel SLA 기반) |
| 동시 접속 | 30명 (외부 인력 동시 온보딩 고려) |
| 모바일 | iOS Safari, Android Chrome 완전 지원 |
| 오프라인 | 캐시된 지식베이스 응답 제공 |

---

## 9. MVP 빌드 마일스톤

| 마일스톤 | 기간 | 산출물 | 담당 |
|----------|------|--------|------|
| **M0** 설계 확정 | 1일 | PRD 확정, 디렉토리 구조, API 스펙 | PM |
| **M1** UI 쉘 | 3일 | 채팅 UI, 인증 플로우, PWA, 다크/라이트 테마 | Dev |
| **M2** 지식베이스 | 3일 | RAG 파이프라인, P0 문서 4건 인덱싱 | Dev + AD |
| **M3** 명령 엔진 | 3일 | Intent 분류, ClickUp 연동 3종, 버퍼 로직 | Dev |
| **M4** 권한 시스템 | 2일 | JWT 인증, 4레벨 접근 제어, 초대 링크 | Dev |
| **M5** 배포 | 1일 | Vercel 배포, 환경변수, 도메인 | Dev |
| **MVP 총** | **~13일** | | |

### 병렬 작업 (M2와 동시)
- AD + Brand Managers: P0 문서 4건 작성
- CPO: 브랜드 아이덴티티 문서 초안

---

## 10. 미결 사항 (Open Questions)

| # | 질문 | 결정 | 상태 |
|---|------|------|------|
| Q1 | LLM 선택 | GPT-4o mini | ✅ 확정 |
| Q2 | 기획 중단 임계값 | 버퍼 3개 | ✅ 확정 |
| Q3 | External 세션 만료 | 24시간 | ✅ 확정 |
| Q4 | P0 SOP 문서 작성 담당자 | AD + Brand Managers | 🔲 미착수 |
| Q5 | 박범진 브랜드 분리 비축 트랙 별도 분리 여부 | - | ❓ 미결 |
| Q6 | ClickUp 워크스페이스 ID·API 키 제공 | - | ❓ 미결 |
| Q7 | Discord 알림 채널 ID (#alert) | - | ❓ 미결 |
| Q8 | Vercel 팀 계정 or 개인 계정 사용 | - | ❓ 미결 |

---

*문서 위치: `projects/ops-bot/docs/PRD-ops-bot.md`*
*다음 단계: Q4~Q8 결정 → M1 개발 착수*
