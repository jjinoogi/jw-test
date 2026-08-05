# OFF PG 가맹점 신청 웹 솔루션 — 목업 데모

실제 서버/DB/인증 없이 목업 데이터(localStorage)로 동작하는 정적 데모 사이트입니다.

## 진입 경로

| 역할 | 경로 | 데모 로그인 |
|---|---|---|
| 어드민 | `/admin/` | 아무 아이디/비밀번호 |
| 총판 | `/partner/` | `partner1` / `partner2` / `partner3` (비밀번호 무관) |
| 영업사 | `/agency/` | `agency11`~`agency32` (비밀번호 무관) |
| 가맹점 | `/merchant/#{10자리코드}` | 로그인 없음 (총판/영업사가 발급한 링크로만 접근) |

가맹점 신청 URL은 `도메인/merchant/#코드` 형태이며, 총판/영업사가 하부업체를 등록하면 자동 생성됩니다.

## 로컬 실행

Node나 별도 빌드 도구 없이 순수 HTML/CSS/JS로 동작합니다. 아무 정적 서버로 루트 폴더를 서빙하면 됩니다.

```bash
python -m http.server 8843
```

이후 `http://localhost:8843` 접속.

## 배포

GitHub Pages 기준: 이 저장소를 GitHub에 푸시한 뒤 **Settings → Pages → Deploy from a branch (main / root)** 를 켜면 됩니다.
빌드 스텝이 없으므로 별도 CI 설정이 필요 없습니다 (`.nojekyll` 포함).

Netlify / Vercel / Cloudflare Pages 등 다른 정적 호스팅에 올려도 별도 설정 없이 동일하게 동작합니다
(모든 라우트가 폴더+`index.html` 구조이며, 가맹점 코드는 해시(`#`) 기반이라 서버 리라이트 규칙이 필요 없습니다).

## 데이터 초기화

브라우저 콘솔에서 `OffPG.reset()` 실행 시 목업 데이터가 초기 시드 상태로 리셋됩니다.
