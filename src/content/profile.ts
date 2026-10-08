import PUBLIC_PROFILE from './public-profile.json';

/** Curated personal intro content sourced from the public resume PDF. */

export interface ProfileLink {
  id: string;
  label: string;
  href: string;
  detail?: string;
}

export interface PublicProof {
  label: string;
  detail: string;
  href: string;
}

export interface ExperienceRole {
  id: string;
  title: string;
  org: string;
  meta: string;
  summary: string[];
  details: string[];
}

export interface EducationItem {
  school: string;
  detail: string;
}

export interface Profile {
  name: string;
  role: string;
  dateModified: string;
  status: string;
  summary: string;
  publicProof: PublicProof[];
  experienceNote: string;
  primaryActions: Array<{
    linkId: string;
    label: string;
    staticLabel: string;
    style: string;
    modalOrder: number;
    staticOrder: number;
  }>;
  experience: ExperienceRole[];
  education: EducationItem[];
  focus: string;
  elsewhere: ProfileLink[];
}

export const PROFILE: Profile = {
  ...PUBLIC_PROFILE,
  experience: [
    {
      id: 'baidu',
      title: 'Software Engineer, MeDo',
      org: 'Baidu',
      meta: 'Jul 2026 – Present · Primary role · Beijing',
      summary: [
        'Overseas engineering owner for MeDo, an AI agent app builder: Stripe billing, credits ledger, ads attribution, growth, and SEO, plus the agent tooling the team ships and operates it with.',
        'Authored medo-infra-connect, a coding-agent skill + unified CLI (~5.5K LOC) giving agents governed access to AWS, MySQL, ClickHouse, OpenSearch, Metabase, and ad-platform APIs; read-only by default with a verified prod-write path.',
        'Evidence snapshot: 600+ merged code changes across 19 repos and 140+ design/RCA/verification docs in under 3 months.',
      ],
      details: [
        'Billing service extraction: led the move of the overseas credits ledger and Stripe stack (27 webhook event types, ~29K lines) out of the monolith into a new billing service on its own RDS; cut over 40/40 tables with 0 errors.',
        'Agent workflow guardrails: release-proof skills (code review ↔ deployed bundle ↔ design doc, 14 incident-derived gates) and a policy hook enforcing pipeline-only builds across Claude Code, Codex, Cursor, and OpenCode.',
        'LLM operations bots: hardened the Discord → LLM-enriched report → intake desk → issue-tracker pipeline and built an IM data-assistant bot over a read-only Metabase proxy.',
        'Agent sandbox abuse response: contained a cluster-wide outage where bot accounts prompted the coding agent to run crypto-miners; quantified 42× CPU overcommit and reclaimed ~40 cores with zero restarts.',
        'Subscriptions and pricing: Pro Max and annual plans on a two-phase quote → commit API over Stripe Subscription Schedules (20 countries, 10 currencies), Billing Portal cancellation, and a first-purchase offer A/B (+88% lift).',
        'Billing correctness: fixed Stripe lifecycle defects (revived canceled subscriptions, unsynced renewals, misread upgrade declines) with terminal-state gates and retry → dead-letter state machines.',
        'Ads attribution and consent: Meta Pixel + CAPI, Bing UET server-side conversions via a transactional outbox, a first-party CMP with GPC, and an append-only one-winner-per-user attribution model.',
        'Credits economy and abuse: cut gifted credits 35% without hurting retention or paid conversion; detected 437 inviters farming 20.6K fake accounts and shipped gifted-only clawback.',
        'Data and SEO: K8s CronJob collectors → ClickHouse → Metabase dashboards, a Next.js 16 blog replacing Ghost (/blog payload −92%), and a 1.9K-URL pSEO site moved onto EKS CI/CD.',
        'Enterprise and Azure OpenAI: Seat Pool + partner redemption codes across 6 repos and Azure OpenAI resale hosting with per-customer resource isolation.',
      ],
    },
    {
      id: 'cookiy',
      title: 'AI Agent Engineer',
      org: 'Cookiy AI',
      meta: 'Aug 2025 – Jul 2026 · Silicon Valley HQ / Beijing Engineering Team',
      summary: [
        'Owned 41 tools across 4 MCP servers and 26 Zod/OpenAPI schema files spanning study, interview, quant, billing, recruit, guide, playback, and report workflows.',
        'Shipped dual-surface E2E harness with 291 cases (168 SaaS + 123 CLI/MCP) and 7 L0–L6 gate profiles with runtime evidence packets.',
        'Evidence snapshot: 1,040 Cookiy merged PRs across MCP/API, report synthesis, voice runtime, video clips, billing, and release gates.',
      ],
      details: [
        'Contract-first agent/API platform: Zod/OpenAPI/MCP-style tool contracts, DTO/runtime validation, pagination/status semantics, CLI payload compatibility, and public API boundaries.',
        'CLI/skill distribution: published public skill and TypeScript CLI; MCP-first/REST-fallback behavior, token/login flows, and Cursor/Claude deep-link paths.',
        'Tool-using report/study chat agents: scoped registries, artifact load-before-edit discipline, evidence bundles, locked-fact guards; removed 7 duplicate tools and slimmed prompts by ~2.5k LOC.',
        'Evidence-bound report synthesis: objective-first multi-pass synthesis, cohort-batch passes, HTML fidelity/readiness gates, report-driven auto clips, and editorial HTML preservation.',
        'LLM production reliability: OpenAI/Gemini paths with native fetch, preserved auth headers, Cloudflare/401 handling, and preview backports.',
        'Streaming and long tool work: SSE/WebSocket/MCP streamable-HTTP with heartbeats, abort-cleanup isolation, hard timeouts, and stream-boundary regression tests.',
        'Realtime interview, avatar, and Report Voice Platform: LiveKit, Deepgram STT, TTS, Gemini/OpenAI LLM paths, Tavus/SpatialReal avatar (~200 ms barge-in), speculative follow-up turn-taking, and VAD barge-in.',
        'Agent-compatible auth and billing: compact CLI tokens, OAuth/Bearer semantics, wallet-ledger idempotency, StripeEventLog webhook audit, and pay-before-reveal report billing.',
        'Platform/release operations: Nginx gateway/deploy paths, cross-environment short-link routing, cookie isolation, preview/backport propagation, and Homebrew installer distribution.',
      ],
    },
    {
      id: 'smu',
      title: 'Software Engineer / 0-to-1 Product Owner',
      org: 'SMU',
      meta: 'Feb 2024 – Jan 2026 · Los Angeles, CA',
      summary: [
        'Built Python AsyncIO pipelines connecting Amazon Seller Central + Shopify with ERP; processed 500k+ daily orders and cut sync latency from 15 min to 30 s.',
        'Shipped GetDateLove end to end: FastAPI, Redis asyncio, PostgreSQL, WebSocket messaging, S3 voice notes, PayPal checkout, AWS/Nginx/CloudFront, and CI/Playwright release gates.',
      ],
      details: [
        'Shipped Redis/Kafka inventory sync, FastAPI/PostgreSQL tariff services, Elasticsearch HS Code lookup, Spark migration jobs, Docker/Jenkins CI/CD on AWS, and Sentry loops.',
        'Reduced operational and frontend entropy by replacing blocking Redis patterns, consolidating 11 Redis clients, batching SQL, and extracting stable frontend state owners.',
      ],
    },
    {
      id: 'quant',
      title: 'Co-Engineer',
      org: 'Quant Trading Systems Venture',
      meta: 'Apr 2026 – Present · Concurrent venture role',
      summary: [
        'Execution safety: IBKR heartbeat/reconnect, broker + DB startup reconcile, and bracket/OCO fixes, then a shared IBKR/Alpaca execution ledger and a flag-gated migration of live routing to Alpaca.',
        'Immutable public dashboard: renders as a pure function of content-addressed input snapshots, with Lambda publication, redacted live logs, daily P&L, and CloudFront/S3 OAC hardening.',
      ],
      details: [
        'Private live-trading system on AWS: intraday scanner → factor filter → broker bracket orders → S3 Parquet warehouse → public research dashboard.',
        'Rebuilt infra in a new AWS account with a verification checklist; moved live secrets to SSM Parameter Store with SSM-only deploys and an after-close watchdog.',
        'Reduced scanner/data latency with event-based scanner waits, vectorized reject reasons, warm-cache fast paths, SQLite parse optimization, and lazy-load startup paths.',
      ],
    },
    {
      id: 'huawei',
      title: 'Software Engineer, SPU Development',
      org: 'Huawei Technologies',
      meta: 'Apr 2023 – Feb 2024 · Beijing',
      summary: [
        'Built C/C++ SPU/router features for NE40E traffic statistics and NetStream monitoring; fixed 50+ packet-processing, flow-log, URL parsing, HTTP header, and SmartNet resource issues.',
      ],
      details: [],
    },
  ],
  education: [
    {
      school: 'Boston University',
      detail: 'M.S. Mathematical Finance & FinTech · GPA 3.78 · Computational Methods, Stochastic Calculus, Algorithmic Trading',
    },
    {
      school: 'The Ohio State University',
      detail: "B.A. Physics · GPA 3.84 · Dean's List",
    },
  ],
};
