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
      id: 'cookiy',
      title: 'AI Agent Engineer',
      org: 'Cookiy AI',
      meta: 'Aug 2025 – Present · Primary role · Silicon Valley HQ / Beijing Engineering Team',
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
        'Improved live IBKR execution safety with heartbeat/reconnect, account-update ordering, broker+DB startup reconcile, bracket/OCO fixes, and deterministic flatten paths.',
        'Built research/ops visibility: live dashboard, Pipeline Health, Trade Cards, Factor/Calibration/Drift views, Signal Funnel, and daily S3 Parquet archive.',
      ],
      details: [
        'Private live-trading systems on AWS EC2: scanner → factor filter → IBKR bracket orders → S3 Parquet warehouse → researcher dashboard.',
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
