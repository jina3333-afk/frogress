# Frogress

매일 사진 한 장으로 습관을 기록하고, 목표 기간이 끝나면 변화 하이라이트를 만들어주는 앱.
올챙이 → 개구리 성장 캐릭터로 "가랑비에 옷 젖듯" 쌓이는 변화를 표현한다.

## 실행

```bash
npm install
npm start        # Expo Dev Server
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
```

## 화면 흐름

`온보딩 → 홈 → 촬영 → (정렬 보정) → 하이라이트 재생 → 전환 → 연못` (아키텍처 노트 기준)

| 라우트 | 역할 |
| --- | --- |
| `app/index.tsx` | 저장된 상태를 보고 온보딩/홈으로 리다이렉트 |
| `app/onboarding.tsx` | 도메인 + 기간 선택. `mode=change_period`/`new_domain` 쿼리로 전환 화면에서 재진입 |
| `app/home.tsx` | 성장 상태, 오늘 기록 CTA, 최근 기록 스트립 |
| `app/capture.tsx` | 도메인별 촬영 가이드 오버레이로 촬영 → 정렬 보정(스텁) → 저장 |
| `app/highlight.tsx` | 완성된 사이클의 사진 슬라이드쇼 재생 (신규 완주 / 연못에서 재생 모드) |
| `app/transition.tsx` | 같은 방식 계속 / 기간 변경 / 새 도메인 추가 |
| `app/pond.tsx` | 완성된 사이클 컬렉션 (연못) |

## 코드 구조

- `lib/types.ts` — `Domain`, `DomainConfig`, `Entry`, `CompletedCycle` 등 아키텍처 노트의 핵심 데이터 모델
- `lib/domains.ts` — 도메인별 기본 설정 (기간, 촬영 가이드 타입)
- `lib/storage.ts` — AsyncStorage 기반 로컬 저장소 (Storage Layer)
- `lib/highlight.ts` — `HighlightGenerator` 인터페이스 + 1단계 `PhotoTimelapseGenerator`, 정렬 보정 스텁
- `components/CaptureGuideOverlay.tsx` — 얼굴 타원/전신 실루엣 가이드 (Capture Layer)
- `components/FrogGrowth.tsx` — 진행률에 따라 올챙이 → 개구리로 변하는 성장 인디케이터
- `theme/` — 색상/여백/타이포그래피 토큰

## 다음 단계 (아키텍처 노트 기준)

1. 실제 카메라 랜드마크 정렬 (MediaPipe) — 현재 `lib/highlight.ts`의 `alignEntryMedia`는 통과 스텁
2. Claude API 연동 (Haiku로 일일 지표 추출 → Sonnet으로 월간 요약)
3. 온디바이스 타임랩스 영상 렌더링 파이프라인
4. 구독/무료체험 로직 (7일 무료체험, Pro 게이팅)
