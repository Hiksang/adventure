# AdWatch 프로덕션 배포 가이드

로컬 Mac에서 백엔드를 호스팅하고 Cloudflare Tunnel로 안전하게 외부에 노출하는 방법입니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
│  - DDoS 보호                                                     │
│  - CDN 캐싱                                                      │
│  - SSL/TLS 종료                                                  │
│  - IP 숨김                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Cloudflare Tunnel
                              │ (암호화된 아웃바운드 연결)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     로컬 Mac (Docker Compose)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  cloudflared │──│   Next.js    │──│  PostgreSQL  │           │
│  │   (tunnel)   │  │     App      │  │    (DB)      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                           │                │                     │
│                           │          ┌──────────────┐           │
│                           └──────────│    Redis     │           │
│                                      │   (Cache)    │           │
│                                      └──────────────┘           │
│                                                                  │
│  ※ 포트포워딩 불필요                                             │
│  ※ DB는 외부 접근 불가                                           │
│  ※ 모든 데이터는 로컬에만 저장                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 요구사항

- macOS 또는 Linux
- Docker Desktop (Mac) 또는 Docker Engine (Linux)
- Cloudflare 계정 (무료)
- 도메인 (Cloudflare DNS 사용)

## 배포 단계

### 1. 도메인 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com)에서 도메인 추가
2. 네임서버를 Cloudflare로 변경

### 2. Cloudflare Tunnel 설정

```bash
# 설정 스크립트 실행
./scripts/setup-tunnel.sh
```

스크립트가 안내하는 대로:
1. Cloudflare 로그인 (브라우저 열림)
2. 터널 이름 입력 (예: `adwatch-prod`)
3. 도메인 입력 (예: `adwatch.app`)
4. 생성된 토큰을 `.env`에 추가

### 3. 환경 변수 설정

```bash
# 템플릿 복사
cp .env.production.example .env

# 편집
nano .env
```

필수 변수:
```env
# Database
POSTGRES_USER=adwatch
POSTGRES_PASSWORD=<강력한_비밀번호>
POSTGRES_DB=adwatch

# Redis
REDIS_PASSWORD=<강력한_비밀번호>

# Auth
JWT_SECRET=<32자_이상_랜덤_문자열>

# World ID
WORLDCOIN_APP_ID=app_xxx

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=<터널_토큰>
APP_URL=https://adwatch.app
```

비밀번호 생성:
```bash
# 안전한 비밀번호 생성
openssl rand -base64 32
```

### 4. 배포

```bash
# 프로덕션 배포
./scripts/deploy-production.sh
```

### 5. 확인

```bash
# 서비스 상태 확인
docker compose -f docker-compose.tunnel.yml ps

# 로그 확인
docker compose -f docker-compose.tunnel.yml logs -f

# 헬스체크
curl https://adwatch.app/api/health
```

## 관리 명령어

### 서비스 관리

```bash
# 전체 서비스 시작
docker compose -f docker-compose.tunnel.yml up -d

# 전체 서비스 중지
docker compose -f docker-compose.tunnel.yml down

# 특정 서비스 재시작
docker compose -f docker-compose.tunnel.yml restart app

# 로그 보기
docker compose -f docker-compose.tunnel.yml logs -f app
docker compose -f docker-compose.tunnel.yml logs -f tunnel
```

### 업데이트

```bash
# 코드 풀
git pull origin main

# 앱만 재빌드
docker compose -f docker-compose.tunnel.yml build app
docker compose -f docker-compose.tunnel.yml up -d app
```

### 백업

```bash
# DB 백업
./scripts/backup-db.sh

# 수동 백업
docker compose -f docker-compose.tunnel.yml exec db \
  pg_dump -U adwatch adwatch | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 복원

```bash
# DB 복원
gunzip -c backup_20240101.sql.gz | \
  docker compose -f docker-compose.tunnel.yml exec -T db \
  psql -U adwatch adwatch
```

## 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 모든 비밀번호가 강력한지 확인 (32자 이상, 랜덤)
- [ ] DB 포트가 외부에 노출되지 않았는지 확인
- [ ] Cloudflare SSL/TLS 모드가 "Full (strict)"인지 확인
- [ ] Cloudflare 방화벽 규칙 설정

## Cloudflare 권장 설정

1. **SSL/TLS**
   - 모드: Full (strict)
   - Always Use HTTPS: On
   - Minimum TLS Version: 1.2

2. **Security**
   - Security Level: Medium 이상
   - Bot Fight Mode: On
   - Challenge Passage: 30분

3. **Speed**
   - Auto Minify: HTML, CSS, JS
   - Brotli: On

4. **Caching**
   - Caching Level: Standard
   - Browser Cache TTL: 4시간

## 트러블슈팅

### 터널이 연결되지 않음

```bash
# 터널 로그 확인
docker compose -f docker-compose.tunnel.yml logs tunnel

# 토큰 확인
echo $CLOUDFLARE_TUNNEL_TOKEN
```

### 앱이 시작되지 않음

```bash
# 앱 로그 확인
docker compose -f docker-compose.tunnel.yml logs app

# 헬스체크
docker compose -f docker-compose.tunnel.yml exec app wget -q -O- http://localhost:3000/api/health
```

### DB 연결 실패

```bash
# DB 상태 확인
docker compose -f docker-compose.tunnel.yml exec db pg_isready

# DB 로그 확인
docker compose -f docker-compose.tunnel.yml logs db
```

## 모니터링

### 로그 로테이션

Docker의 기본 로그 드라이버를 설정하여 로그가 무한히 커지지 않도록 합니다:

```bash
# /etc/docker/daemon.json (또는 Docker Desktop 설정)
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 리소스 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
docker system df
```

## 비용

- **Cloudflare Tunnel**: 무료
- **도메인**: ~$10/년
- **전기/인터넷**: 기존 비용
- **총**: 거의 무료!

## 추가 보안 (선택)

### UPS (무정전 전원장치)

전원 문제로 인한 데이터 손실 방지:
- Mac Mini: 소형 UPS 권장
- 자동 종료 스크립트 설정

### 자동 백업

```bash
# crontab에 추가
0 2 * * * /path/to/advertise/scripts/backup-db.sh

# 백업을 클라우드에 동기화 (선택)
0 3 * * * aws s3 sync /path/to/backups s3://your-bucket/backups/
```

### 자동 재시작

```bash
# crontab에 추가 - 부팅 시 자동 시작
@reboot cd /path/to/advertise && docker compose -f docker-compose.tunnel.yml up -d
```
