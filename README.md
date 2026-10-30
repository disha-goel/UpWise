# UPWISE — Architecture, APIs & Data Ingestion Specification

UPWISE is a modern, bilingual (English & Hindi) news aggregator, editorial learning platform, and citizen-journalism hub. This document provides a complete reference for all **external APIs, RSS feeds, backend REST endpoints, browser APIs, and database schemas** used throughout the project.

---

## 📑 Table of Contents

1. [External Data Sources & Ingestion](#1-external-data-sources--ingestion)
   - [Live RSS Feeds (English & Hindi)](#live-rss-feeds)
   - [AI & Generative Language APIs](#ai--generative-language-apis)
   - [Live Web Search APIs (Evidence Lens)](#live-web-search-apis-evidence-lens)
   - [Browser Native APIs](#browser-native-apis)
2. [Backend REST API Reference](#2-backend-rest-api-reference)
   - [Health & System](#health--system)
   - [Articles & Feed Ingestion](#articles--feed-ingestion)
   - [Story Clustering & Verification](#story-clustering--verification)
   - [User Bookmarks](#user-bookmarks)
   - [Authentication & User Profiles](#authentication--user-profiles)
   - [Community Journalism Hub](#community-journalism-hub)
   - [AI Assistant & Evidence Lens](#ai-assistant--evidence-lens)
3. [Frontend Service Adapter (`src/services/api.ts`)](#3-frontend-service-adapter)
4. [Database Models (Prisma & PostgreSQL)](#4-database-models-prisma--postgresql)
5. [Environment Configuration (`.env`)](#5-environment-configuration-env)
6. [Getting Started & Development Commands](#6-getting-started--development-commands)

---

## 1. External Data Sources & Ingestion

### Live RSS Feeds

The backend server continuously ingests, cleans, deduplicates (via SHA-256 content hashes), and clusters articles from official accredited RSS wire feeds located in [`server/src/ingestion/feedConfig.ts`](file:///d:/SideQuest/server/src/ingestion/feedConfig.ts).

#### English Sources (EN)
| Category | Source Name | Publisher | RSS Feed URL |
| :--- | :--- | :--- | :--- |
| **India & Politics** | The Hindu National | The Hindu | `https://www.thehindu.com/news/national/feeder/default.rss` |
| **India & Politics** | Indian Express National | The Indian Express | `https://indianexpress.com/section/india/feed/` |
| **Technology & Science** | TechCrunch | TechCrunch | `https://techcrunch.com/feed/` |
| **Technology & Science** | The Verge | The Verge | `https://www.theverge.com/rss/index.xml` |
| **Technology & Science** | Ars Technica | Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` |
| **Technology & Science** | NASA Releases | NASA | `https://www.nasa.gov/news-release/feed/` |
| **Business & Economy** | LiveMint Economy | Mint | `https://www.livemint.com/rss/economy` |
| **Business & Economy** | LiveMint Markets | Mint | `https://www.livemint.com/rss/markets` |
| **Business & Economy** | CNBC Business | CNBC | `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147` |
| **Sports** | ESPN Cricinfo | ESPNcricinfo | `https://www.espncricinfo.com/rss/content/story/feeds/0.xml` |
| **Sports** | BBC Sport | BBC Sport | `http://feeds.bbci.co.uk/sport/rss.xml` |
| **World & Lifestyle** | BBC World | BBC News | `http://feeds.bbci.co.uk/news/world/rss.xml` |
| **World & Lifestyle** | The Guardian World | The Guardian | `https://www.theguardian.com/world/rss` |

#### Hindi Sources (HI - हिन्दी समाचार स्रोत)
| Category | Source Name | Publisher | RSS Feed URL |
| :--- | :--- | :--- | :--- |
| **India & Politics** | Amar Ujala National | अमर उजाला | `https://www.amarujala.com/rss/national-news.xml` |
| **India & Politics** | BBC Hindi News | BBC News हिंदी | `https://feeds.bbci.co.uk/hindi/rss.xml` |
| **Technology & Science** | Amar Ujala Tech | अमर उजाला | `https://www.amarujala.com/rss/technology.xml` |
| **Business & Economy** | Amar Ujala Business | अमर उजाला | `https://www.amarujala.com/rss/business-news.xml` |
| **Sports** | Amar Ujala Sports | अमर उजाला | `https://www.amarujala.com/rss/sports-news.xml` |
| **World & Lifestyle** | Amar Ujala World | अमर उजाला | `https://www.amarujala.com/rss/world-news.xml` |

---

### AI & Generative Language APIs

Defined in [`server/src/services/aiService.ts`](file:///d:/SideQuest/server/src/services/aiService.ts):
- **Provider:** Google Gemini API
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}`
- **Model:** `gemini-1.5-flash`
- **Use Cases:**
  - **Editorial Chat Assistant:** Plain-language summarization, student exam impact analysis, career takeaways, and difficult terminology breakdown in English and Hindi.
  - **Evidence Synthesis:** Synthesizing cross-source evidence and generating verdicts (`supported`, `contradicted`, `inconclusive`).
  - **Offline/Unconfigured Fallback:** When `GEMINI_API_KEY` is not present, UPWISE uses an internal rule-based editorial engine that parses primary article text without hallucinating or breaking.

---

### Live Web Search APIs (Evidence Lens)

Defined in [`server/src/services/aiService.ts`](file:///d:/SideQuest/server/src/services/aiService.ts):
- **Provider:** Tavily Search API
- **Endpoint:** `https://api.tavily.com/search`
- **Payload:**
  ```json
  {
    "api_key": "<TAVILY_API_KEY>",
    "query": "<claim to evaluate>",
    "search_depth": "advanced",
    "include_answer": false,
    "max_results": 5
  }
  ```
- **Use Cases:**
  - Fact-checking claims against accredited web sources.
  - Extracting direct quotes, URLs, and publication dates for source cross-examination.
  - Transparent fallback: Evaluates strictly against primary article context if no search key is configured.

---

### Browser Native APIs

Used in the React frontend:
1. **Web Speech API (`SpeechSynthesis` & `SpeechSynthesisUtterance`)**:
   - Location: [`src/components/news/BriefingDesksSection.tsx`](file:///d:/SideQuest/src/components/news/BriefingDesksSection.tsx)
   - Powers the **"Today in 60 Seconds"** audio briefing player with playback controls and real-time animated equalizer.
2. **Clipboard API (`navigator.clipboard.writeText`)**:
   - Locations: [`InShortsCard.tsx`](file:///d:/SideQuest/src/components/news/InShortsCard.tsx), [`ArticleReaderPanel.tsx`](file:///d:/SideQuest/src/components/reader/ArticleReaderPanel.tsx), [`CommunityHub.tsx`](file:///d:/SideQuest/src/components/community/CommunityHub.tsx), [`EditorialComicsHub.tsx`](file:///d:/SideQuest/src/components/community/EditorialComicsHub.tsx)
   - Enables one-click sharing of articles, community dispatches, and editorial cartoons.
3. **Web Storage API (`localStorage`)**:
   - Manages user sessions, JWT auth tokens, guest session IDs, bookmarked article IDs, and offline fallback caches.

---

## 2. Backend REST API Reference

Base Server URL: `http://localhost:5000`

### Health & System
- `GET /api/health`
  - Returns backend server status, uptime, database connectivity, and counts of articles, clusters, sources, users, and community posts.
- `POST /api/news/refresh`
  - Triggers on-demand ingestion across all configured RSS feeds.

---

### Articles & Feed Ingestion
- `GET /api/categories`
  - Returns the list of standard editorial categories and subcategories.
- `GET /api/publishers`
  - Returns distinct publishers currently available in the database.
- `GET /api/trending?language=en|hi`
  - Returns top trending stories.
- `GET /api/articles`
  - Query parameters:
    - `category`: Filter by category name or ID
    - `subcategory`: Filter by subcategory
    - `q`: Free-text search query across title and summary
    - `source`: Filter by publisher name
    - `dateRange`: `today` | `yesterday` | `7d` | `30d` | `custom`
    - `startDate`, `endDate`: ISO date strings
    - `sort`: `latest` | `oldest` | `relevant`
    - `page`, `limit`: Pagination parameters
    - `language`: `en` | `hi` | `all`
    - `personalized`: `true` | `false` (uses authenticated user's preferred topics)
- `GET /api/search?q=:query`
  - Fast search endpoint for headlines and topics.
- `GET /api/articles/:id`
  - Retrieves a single article by UUID with full text and metadata.

---

### Story Clustering & Verification
- `GET /api/clusters/:id`
  - Returns a multi-source story cluster, grouping reporting from multiple publishers covering the same developing event.

---

### User Bookmarks
- `GET /api/bookmarks` (Requires Auth or `x-guest-session` header)
  - Returns the current user's or guest's saved articles.
- `POST /api/bookmarks`
  - Body: `{ "articleId": "uuid" }`
  - Saves an article to bookmarks.
- `DELETE /api/bookmarks/:articleId`
  - Removes an article from bookmarks.

---

### Authentication & User Profiles
- `POST /api/auth/register`
  - Body: `{ name, email, password, city?, language?, topics?, interests? }`
  - Registers a user and returns a signed JWT token and user profile.
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Verifies credentials and returns a signed JWT token.
- `POST /api/auth/logout`
  - Invalidates the current session token.
- `GET /api/auth/me` (Protected: `Authorization: Bearer <token>`)
  - Validates token and returns current user details.
- `GET /api/users/me/preferences` (Protected)
  - Fetches user's saved categories, cities, language, and topics.
- `PUT /api/users/me/preferences` (Protected)
  - Updates personalized preferences.
- `POST /api/auth/forgot-password`
  - Body: `{ email }`
  - Safe password recovery trigger.

---

### Community Journalism Hub
- `GET /api/community`
  - Query parameters: `city`, `category`, `status`, `search`, `page`, `limit`.
- `GET /api/community/:id`
  - Returns community dispatch details, verification level, comments, and upvote state.
- `POST /api/community` (Protected)
  - Body: `{ title, description, city, locality?, category, sourceUrl?, sourceExplanation?, imageUrl?, disclaimerAgreed }`
  - Submits a citizen report for review.
- `PUT /api/community/:id` (Protected)
  - Updates an author's own dispatch.
- `DELETE /api/community/:id` (Protected)
  - Deletes an author's dispatch or admin removal.
- `GET /api/community/:id/comments`
  - Lists comments on a dispatch.
- `POST /api/community/:id/comments` (Protected)
  - Body: `{ content }`
- `DELETE /api/community/comments/:commentId` (Protected)
  - Deletes a comment.
- `POST /api/community/:id/reactions` (Auth or `x-guest-session`)
  - Toggles upvotes on a dispatch.
- `POST /api/community/:id/moderate` (Reviewer/Admin only)
  - Body: `{ status: "approved"|"rejected"|"pending", verificationLevel: "verified"|"unverified" }`
- `POST /api/community/:id/report`
  - Body: `{ reason, details }`
  - Submits an editorial flag/report on community content.

---

### AI Assistant & Evidence Lens
- `POST /api/ai/chat` (Rate-limited: 30 req/min)
  - Body:
    ```json
    {
      "message": "Explain this article simply for students",
      "articleContext": {
        "title": "...",
        "publisher": "...",
        "summary": "...",
        "content": "...",
        "url": "..."
      },
      "language": "en",
      "history": []
    }
    ```
- `POST /api/ai/evidence-lens` (Rate-limited: 30 req/min)
  - Body:
    ```json
    {
      "claim": "India achieves record renewable energy milestone in Q3",
      "articleContext": { ... },
      "language": "en"
    }
    ```
  - Returns categorized evidence (`supporting`, `contradicting`, `inconclusive`), raw search sources with dates and quotes, an AI interpretation, and a verdict.

---

## 3. Frontend Service Adapter

Located at [`src/services/api.ts`](file:///d:/SideQuest/src/services/api.ts):
- Acts as an abstraction layer between React components and backend services.
- **Resilient Fallback Mode:** If the Express backend is not running or offline, all methods gracefully fall back to local bundled mock datasets ([`newsData.ts`](file:///d:/SideQuest/src/data/newsData.ts), [`communityData.ts`](file:///d:/SideQuest/src/data/communityData.ts), [`newsLocations.ts`](file:///d:/SideQuest/src/data/newsLocations.ts)) and persist changes to `localStorage`.
- Automatically attaches the `Authorization: Bearer <token>` and `x-guest-session: <sessionId>` headers to requests.

---

## 4. Database Models (Prisma & PostgreSQL)

The schema is defined in [`server/prisma/schema.prisma`](file:///d:/SideQuest/server/prisma/schema.prisma):

```
┌─────────────┐       ┌──────────────────────┐       ┌──────────────┐
│   Article   │◀─────▶│ ArticleClusterMember │◀─────▶│ StoryCluster │
└─────────────┘       └──────────────────────┘       └──────────────┘
       │
       ▼
┌─────────────┐       ┌──────────────┐
│  Bookmark   │◀─────▶│     User     │
└─────────────┘       └──────────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
┌──────────────┐      ┌─────────────┐       ┌──────────────┐
│ CommunityPost│◀────▶│   Comment   │       │ PostReaction │
└──────────────┘      └─────────────┘       └──────────────┘
```

- **`Article`**: Stores ingested news stories, full text, summaries, image URLs, categories, timestamps, reading times, and duplicate hashes.
- **`Source`**: Registry of RSS feed configurations, active state, and last fetch timestamp.
- **`StoryCluster` & `ArticleClusterMember`**: Groups multi-source coverage of the same event for balanced reading.
- **`User`**: Account authentication, bcrypt password hashes, roles (`user`, `reviewer`, `admin`), preferred language, and city.
- **`CommunityPost`**: Citizen journalism submissions with moderation status (`pending`, `approved`, `rejected`), locality, and verified source citations.
- **`Comment` & `PostReaction`**: Community discourse and upvoting mechanics.
- **`Bookmark`**: User and guest saved articles.

---

## 5. Environment Configuration (`.env`)

Backend environment variables in [`server/.env`](file:///d:/SideQuest/server/.env):

```env
# Database (PostgreSQL via Prisma)
DATABASE_URL="postgresql://postgres@localhost:5434/upwise?schema=public"

# Server Port & Runtime
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# JWT Authentication
JWT_SECRET=

# Optional: Google Gemini API (Generative AI Assistant)
GEMINI_API_KEY=

# Optional: Tavily Search API (Evidence Lens Live Web Verification)
TAVILY_API_KEY=
```

---

## 6. Getting Started & Development Commands

Install dependencies before running the app:

```bash
npm ci
npm --prefix server ci
cp server/.env.example server/.env
```

Set `DATABASE_URL` in `server/.env` to your PostgreSQL instance, then run
`npm --prefix server run prisma:generate`, `npm --prefix server run prisma:push`,
and `npm --prefix server run seed`. Start frontend and backend in separate terminals.
Development creates a private signing key in `server/data/.jwt-secret` when
`JWT_SECRET` is empty. Production requires an explicit secret and does not create
demo accounts. `npm run test:all` runs both suites using isolated test accounts.
Community actions require a successful server response. Empty live results remain
empty, and offline evidence excerpts are shown as inconclusive rather than verified.

### 1. Root Workspace (Frontend & Fullstack Scripts)
```bash
# Start frontend Vite dev server (http://localhost:5173)
npm run dev

# Start backend Express dev server in watch mode (http://localhost:5000)
npm run dev:server

# Build both backend & frontend
npm run build:all

# Run frontend tests
npm run test
```

### 2. Backend Server (`server/`)
```bash
cd server

# Install backend dependencies
npm install

# Push database schema to PostgreSQL
npm run prisma:push

# Generate Prisma Client
npm run prisma:generate

# Seed initial database records
npm run seed

# Run backend test suite
npm run test
```
