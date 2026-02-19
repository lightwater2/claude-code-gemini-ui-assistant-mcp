---
name: gemini-ui
description: UI 구현 시 Claude가 설계·조립, Gemini가 컴포넌트 코드 생성. 협업 오케스트레이션.
allowed-tools: Read, Glob, Grep, Edit, Write
---

# Gemini UI — 협업형 UI 생성

## 역할 분리 (절대 규칙)

| Claude (YOU) | Gemini (MCP 도구) |
|-------------|------------------|
| 페이지 구조 설계 | 컴포넌트 코드 생성 |
| 파일 경로 결정 | 디자인 일관성 유지 |
| import 연결 | — |
| 라우팅·상태관리·데이터 패칭 | — |
| 생성 결과 검수·수정 지시 | — |

**핵심**: 절대 페이지 전체를 Gemini에게 위임하지 않는다.
Claude가 페이지 파일을 직접 작성하고, 컴포넌트만 Gemini에게 요청한다.

## 워크플로우

### Step 1: 분석 (Claude)
- 기존 코드 읽기 (유사 페이지, 컴포넌트 패턴)
- 요구사항에서 필요한 컴포넌트 목록 도출
- 각 컴포넌트의 이름, 역할, props 정의

### Step 2: 컴포넌트 생성 (Gemini)

**단일 컴포넌트** → `gemini_generate_component`

```
gemini_generate_component({
  name: "ComponentName",
  description: "what it does",
  props: "prop1: type, ...",
  designNotes: "stack + visual notes",
  references: "existing similar component code",
  layer: "shared|entities|features|widgets"
})
```

**여러 컴포넌트 (일관된 디자인 필요)** → `gemini_generate_component_set`

```
gemini_generate_component_set({
  pageContext: "결제 페이지: 카드 입력 + 주문 요약 + 결제 버튼",
  components: JSON.stringify([
    { name: "CardInputForm", description: "신용카드 번호·만료일·CVV 입력폼", props: "onSubmit: (data: CardData) => void" },
    { name: "OrderSummary", description: "주문 항목 목록과 합계 표시", props: "items: OrderItem[], total: number" },
    { name: "PaymentButton", description: "결제 실행 버튼, 로딩 상태 포함", props: "isLoading: boolean, onClick: () => void" }
  ]),
  designNotes: "React + TypeScript + Tailwind CSS, black & white design system",
  references: "기존 유사 컴포넌트 코드..."
})
```

반환값: JSON `{ "components": [{ "name": "...", "code": "..." }] }`
→ 각 항목을 파싱하여 적절한 경로에 파일 생성

**기존 컴포넌트 수정** → `gemini_modify_component`

```
gemini_modify_component({
  code: "<full component code>",
  instruction: "what to change",
  designNotes: "constraints to maintain"
})
```

**디자인 품질 검수** → `gemini_review_design`

```
gemini_review_design({
  code: "<component code>",
  context: "screen and purpose"
})
```

### Step 3: 배치·조립 (Claude)
- 각 컴포넌트를 적절한 경로에 파일 생성
- 페이지 파일을 직접 작성 (컴포넌트 import + 레이아웃 조합)
- 라우터에 페이지 등록
- 필요 시 상태 관리 훅 추가

### Step 4: 검수 (선택)
- `gemini_review_design`으로 디자인 일관성 확인
- 필요 시 `gemini_modify_component`로 미세 조정

## 스크린샷 참조 워크플로우

디자인 이미지/Figma 캡처가 있는 경우:

```
gemini_screenshot_to_code({
  imageBase64: "<base64 encoded image>",
  mimeType: "image/png",
  description: "결제 페이지 Figma 스크린샷",
  outputType: "component",
  designNotes: "React + TypeScript + Tailwind CSS",
  references: "기존 유사 컴포넌트..."
})
```

일반적 활용 패턴:
1. 이미지를 base64로 읽기
2. `gemini_screenshot_to_code`로 코드 초안 생성
3. 생성된 코드를 `references`로 활용하여 프로젝트 컨벤션에 맞게 재정제

## 도구 선택 가이드

| 상황 | 도구 |
|------|------|
| 컴포넌트 1개 신규 생성 | `gemini_generate_component` |
| 컴포넌트 2개+ 동시 생성 (디자인 일관성 필요) | `gemini_generate_component_set` |
| 기존 컴포넌트 수정 | `gemini_modify_component` |
| 디자인 품질 검수 | `gemini_review_design` |
| 디자인 이미지 → 코드 | `gemini_screenshot_to_code` |

## 팁

- 항상 `designNotes`에 프로젝트 스택 정보 포함
- `references`에 기존 유사 컴포넌트를 붙이면 패턴 매칭 정확도 대폭 향상
- 세트 생성 시 `pageContext`가 디자인 일관성의 핵심
- `generate_component_set` 반환 JSON 파싱: `JSON.parse(result).components.forEach(c => writeFile(c.name, c.code))`
