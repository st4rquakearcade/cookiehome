# STARQUAKE ARCADE — memo

## 완료 작업 (누적)

### 기본 구조
- 메인 `@ST4RQUADE` → `pages/write.html` 링크
- 에디터 페이지 (cookiejar 기능, POST UI, Firebase `posts` 노드)
- 캘린더 페이지 (DAILY/MONTHLY, cookiejar 기능, Firebase `calendar` 노드)
- 공통: loader, page-shell(타이틀 애니메이션·스크롤 잠금), nav
- `seed.html`에 posts/calendar 노드 추가
- 에디터 JSON 내보내기/가져오기 (ed-export, ed-import)
- 캘린더 월 이동 네비게이션 (cal-prev / cal-today / cal-next)
- 캘린더 카테고리 관리 UI (cal-cats: 칩 목록 + 추가/삭제)

### Session 3
- SpecialGothicExpandedOne 폰트 추가 (`assets/css/fonts.css`)
- `--font-title` CSS 변수, `--content-w: 460px` (`tokens.css`)
- `.home-title`, `.page-title`, `.editor-head__title`, `.profile-name` 폰트 적용
- 로더 전체 페이지 적용: index.html + 모든 pages/*.html
- 에디터: border-top 제거, subtitle 스타일, toolbar icon weight 2→2.5, formatBlock 수정
- 카테고리 네비게이션: page-eyebrow → `write.html?board=[board]` 링크

### 현재 세션 (New Session)

#### 커서 / 스크롤
- `assets/css/cursor.css` + `assets/js/cursor.js` — Demo 4 스타일 커스텀 커서 (lens 25%)
- `assets/css/scroll.css` + `assets/js/scroll.js` — 스크롤 진행바 + 화살표 scroll-top
- **모든 페이지에 cursor/scroll 추가 완료**:
  - archive.html, banner.html, calendar.html, guest.html, log.html
  - memo.html, notice.html, pair.html, pair-list.html, profile.html
  - trpg.html, write.html, index.html, login.html

#### 로그인
- `pages/login.html` + `assets/css/login.css` — PRIVATE AREA 비밀번호 페이지 (0068)
- sessionStorage "sq_auth" === "ok" 인증
- `pages/write.html` — auth guard 추가

#### 배너 페이지
- `pages/banner.html` — NEIGHBORS 페이지, page-shell 구조
- `assets/css/banner.css` + `assets/js/banner.js`
- MY BANNER + OTHERS' BANNER 단일 칼럼 무한 스크롤 (IntersectionObserver)
- `data/banner.json` 시드 필요

#### 캘린더 필터링
- `assets/js/calendar.js` — toggle-pill 카테고리 칩 필터링 완전 구현
  - `var activeFilter = null` 모듈 스코프 선언
  - `getVisibleEvents(evArr)` — `ev.catId`로 필터링 (ev.category → ev.catId 수정)
  - `occsInRange()` — `getVisibleEvents(store.events)` 로 필터된 이벤트 사용
  - `renderCats()` — 체크박스 상태 올바른 로직, 이벤트 리스너 단순화

#### 타이포그래피 확장
- `layout.css`:
  - `.page-eyebrow` → `var(--font-title)` (STARQUAKE ARCADE / * 텍스트)
  - `.page-subnav a` → `var(--font-title)` (DAILY / MONTHLY)
  - `.site-nav a` → `var(--font-title)` (카테고리 네비)
- `home.css`:
  - `.home-handle` → `var(--font-title)` (@handle)

#### 아카이브 페이지
- `pages/archive.html` — 재작성, page-shell 구조
- `assets/css/archive.css` — 카테고리 탭, 그리드, 별점, 상세 패널
- `assets/js/archive.js` — 카테고리 전환, 5성 별점, 음악 시각화, 상세 패널
  - MUSIC: Web Audio API + Canvas 주파수 바 시각화 (아이들: 사인파 애니메이션)
  - 기타 카테고리: 스태거 CSS 애니메이션으로 항목 등장
  - 상세 패널: 오른쪽 슬라이드인 (translateX + backdrop)
  - Firebase `archive` 노드 또는 `data/archive.json` 폴백
- `data/archive.json` — 시드 데이터 생성

#### 홈 검색 (Gooey Search)
- `index.html` — SVG gooey 필터 (`feGaussianBlur stdDeviation=5` + `feColorMatrix 18 -15`)
- `.home-search` + `.goo-wrap` + `.goo-btn` + `.goo-input-wrap` 구조
- `home.css` — gooey 검색 스타일 전체 추가
- 디바운스 검색 (280ms), Firebase/JSON posts 검색
- 비밀글·미발행 포스트 제외 필터링

#### 에디터 Draft/Publish
- `editor.js` — `collectPost(publishedFlag)`: `published: true/false` 필드 추가
- `doDraft()`: 서버 저장, 리다이렉트 없음, `published: false`
- `doPublish()`: 서버 저장 + 게시판 리다이렉트, `published: true`
- `write.html` 버튼 레이블: "임시저장" → "DRAFT", "저장" → "PUBLISH"
- `index.html` 검색: `published !== false` 포스트만 표시

## 현재 상태
- 에디터: Draft(미발행)/Publish(발행) 구분, JSON 내보내기/가져오기
- 캘린더: 일정 CRUD·반복·완료체크, 카테고리 toggle-pill 필터링 완비
- 아카이브: Music(시각화)/기타 카테고리, 5성 별점, 상세 패널, Firebase 연동
- 홈: gooey 검색 바, @handle Special Gothic
- 모든 페이지: 커스텀 커서, 스크롤 진행바, scroll-top 화살표

## 알려진 이슈
- `data/banner.json` 시드 파일 미생성 (banner.js는 빈 배너 6개로 폴백)
- 게시판 페이지들이 `published: false` 포스트를 필터링하지 않음 (board pages 업데이트 필요)
- archive.js `connectVisualizer()`: 동일 `<audio>` element에 두 번 이상 `createMediaElementSource` 불가 (Web Audio 특성) — 예외 처리됨
- `scroll.css` `.scroll-top`이 `layout.css`와 중복 정의됨 — 로드 순서로 `scroll.css`가 우선

## 수정 파일 목록

### 신규 생성
- `assets/css/archive.css`
- `assets/css/banner.css`
- `assets/css/cursor.css`
- `assets/css/login.css`
- `assets/css/scroll.css`
- `assets/js/archive.js`
- `assets/js/banner.js`
- `assets/js/cursor.js`
- `assets/js/scroll.js`
- `data/archive.json`
- `pages/banner.html`
- `pages/login.html`

### 수정됨
- `assets/css/calendar.css` — toggle-pill 칩 스타일
- `assets/css/fonts.css` — @font-face 수정 (올바른 폰트 경로)
- `assets/css/home.css` — home-handle 폰트, gooey 검색 스타일 추가
- `assets/css/layout.css` — page-eyebrow/subnav/site-nav 폰트, scroll-top
- `assets/css/tokens.css` — --font-title, --content-w
- `assets/js/calendar.js` — activeFilter, getVisibleEvents, renderCats 완성
- `assets/js/editor.js` — Draft/Publish 분리, published 필드
- `index.html` — cursor/scroll, gooey search, SVG filter
- `pages/archive.html` — 전체 재작성
- `pages/banner.html` — page-shell 구조
- `pages/calendar.html` — cursor/scroll 추가
- `pages/write.html` — auth guard, cursor/scroll, DRAFT/PUBLISH 버튼
- 기타 모든 pages/*.html — cursor/scroll 추가

#### Pair 슬라이더
- `pages/pair-list.html` 재작성 — draggable-infinite-slider-gsaposmo 기반
  - GSAP + Draggable (CDN: jsdelivr) + InertiaPlugin (osmo CDN) 사용
  - `horizontalLoop` 함수 (소스 그대로 ES5로 변환) 내장
  - 카운터 (현재/전체), 화살표 버튼, 드래그 가능, 무한 루프
  - Firebase/JSON에서 pair items 로드 → 카테고리 필터 → 슬라이드 동적 생성
  - 3개 미만 시 항목 패딩 (루프 작동에 최소 3개 필요)
- `assets/css/pair.css` — 슬라이더 스타일 추가 (.pair-slider-section, .pair-overlay 등)
  - 페어 서브nav에 `var(--font-title)` 적용
- `data/banner.json` — 시드 파일 생성 (my/others 구조)

### 세션 B 추가 완료 (최신)

#### 화살표 크기 축소
- `scroll.css` `.scroll-top`: `width: 40px → 20px`, `height: 52px → 26px` (50% 축소)

#### 캘린더 수정
- `calendar.css`: `.cal-chip` border 제거 (`border: none`), `::after { content: attr(data-label) }` 변경
- `calendar.js` `renderCats()`: `data-label` 속성 추가, `<span class="cal-chip-name">` 제거

#### 아카이브 카테고리 단일 행
- `archive.css` `.arc-nav`: `flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none` 추가
- `archive.css` `.arc-nav__btn`: `flex-shrink: 0; white-space: nowrap` 추가
- `archive.js`: `LITERATURE` → `LIT.` 축약

#### Skin Editor (REQUIRED)
- `pages/skin.html` — 전체 스킨 에디터 페이지 (avocado_skin 구조 참조)
- `assets/css/skin.css` — 에디터 레이아웃, 컨트롤 스타일, LIST/VIEW/WRITE 미리보기
- `assets/js/skin.js` — 보드/뷰 선택, 스타일 컨트롤, Firebase 저장

#### 에디터 링크 (모든 페이지 헤더)
- 모든 board 페이지 eyebrow: `SKIN` 링크 추가 (`class="page-skin-link"`)
- banner.html, calendar.html, profile.html, trpg.html: STARQUAKE ARCADE / * → skin.html 링크
- `layout.css` `.page-skin-link` 스타일 추가
- `index.html` home-handle 옆 SKIN 링크 추가

#### Getting Started 슬라이드업
- `home.css`: `.home-started` 스타일 추가 (fixed, EasingQuads InOut: cubic-bezier(0.45, 0, 0.55, 1))
- `index.html`: `.home-started` HTML + mousemove 이벤트 JS 추가
  - 마우스가 뷰포트 하단 25% → 슬라이드업
  - 마우스 이동 후 200ms 딜레이 → 슬라이드다운

#### 화살표 divs 전체 페이지 적용
- `perl` batch replace: 모든 `^` 텍스트 → `<div class="arrow-top"></div><div class="arrow-bottom"></div>`
- scroll.js도 이미 innerHTML 교체 중 (중복이지만 무해)

#### 게시판 페이지 콘텐츠 렌더
- `assets/css/board.css` 신규 (avocado_skin 구조 참조)
- `pages/log.html` — page-shell 구조 + SQPosts.byBoard("log") 렌더
- `pages/memo.html` — page-shell 구조 + SQPosts.byBoard("memo") 렌더
- `pages/guest.html` — page-shell 구조 + SQPosts.byBoard("guest") 렌더
- 모두 `published !== false && !secret` 필터 적용

## 다음 작업 (우선순위 순)
1. **BalloonButton 엔트리**: 사이트 진입 전 애니메이션 (React+WebGL — 복잡, 연기)
2. **IMAGE DISPLAY / IMAGE 편집 슬롯**: 홈 이미지 영역, 배너 이미지 영역 편집 기능
3. **codrops-demo-main 페이지 전환**: SPA 라우터 + 네임스페이스 기반 전환
4. **TextBlockTransitions #6**: GSAP+Splitting.js 단어 애니메이션
5. **codrops-r3f-mirrors-master**: 글로벌 적용 (미러 제거, 프레임워크만)
6. **html-in-canvas-main**: 글로벌 적용, 텍스트 전용 버튼, Special Gothic One
7. **Banner Board**: html-in-canvas 내 Basic UI, My/Others 배너, 단일열 무한스크롤
8. **pair-list: 슬라이더 클릭 → 상세 모달**
