# AdWatch (Advertise) Project Overview

## Purpose
Watch-to-Earn app that rewards users with XP and WLD tokens for watching advertisements. Built as a World Mini App with World ID integration.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: World ID (MiniKit), NextAuth
- **Internationalization**: next-intl
- **Package Manager**: pnpm

## Key Features
- Ad viewing with XP rewards
- Challenge system for anti-bot protection
- Daily limits (XP and ad views)
- Quiz system
- Gift card rewards
- Activity tracking

## Project Structure
```
app/
├── [locale]/           # i18n pages
│   ├── page.tsx        # Main feed page
│   ├── ads/            # Ad viewing
│   ├── rewards/        # Rewards page
│   ├── profile/        # User profile
│   ├── activities/     # Activities
│   └── analytics/      # Analytics
├── api/                # API routes
│   ├── verify-worldid/ # World ID verification
│   ├── ad-view/        # Ad view tracking
│   ├── challenge/      # Challenge system
│   ├── quiz/           # Quiz endpoints
│   └── rewards/        # Rewards system
components/
├── auth/               # Auth components
├── feed/               # Feed (main TikTok-style)
├── ads/                # Ad display components
├── rewards/            # Rewards components
├── profile/            # Profile components
├── analytics/          # Analytics components
└── ui/                 # Shared UI components
lib/
├── supabase/           # Supabase clients
├── utils/              # Utility functions
├── env.ts              # Environment config
├── challengeStore.ts   # Challenge logic
├── dailyLimitStore.ts  # Daily limits
├── adViewStore.ts      # Ad view tracking
└── quizStore.ts        # Quiz logic
hooks/
└── useAuth.tsx         # Auth context hook
supabase/
└── migrations/         # SQL migrations
```

## Environment Variables
- `NEXT_PUBLIC_APP_ENV`: "PROD" or dev
- `NEXT_PUBLIC_WLD_APP_ID`: World App ID
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service key

## DEV Mode
`IS_DEV` flag (from lib/env.ts) enables dev user bypass for local testing.
