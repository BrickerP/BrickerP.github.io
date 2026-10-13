# Yupeng Lu

**AI Agent & Backend Engineer**

US Permanent Resident · No sponsorship required

[yplmicro@gmail.com](mailto:yplmicro@gmail.com) · [GitHub](https://github.com/BrickerP) · [LinkedIn](https://www.linkedin.com/in/yupeng-lu-845a0b411/)

Build production systems in TypeScript/Node.js, Python, and Java, spanning agent tool use and streaming execution, real-time voice, billing, automated testing, and cloud operations.

## Experience

### Baidu · Software Engineer, MeDo

Jul 2026 – Present · Beijing

MeDo generates, deploys, and hosts applications with AI. Responsible for overseas billing and related backend systems; contribute to platform operations and releases.

- Led the separation of overseas billing services and databases, defining boundaries for subscriptions, orders, credit ledgers, and payment events. Planned data migration, traffic cutover, and rollback, and owned rollout verification.
- Contributed to the design and cross-service integration of Supabase-hosted backends, covering agent tool access, schema changes, function deployment, and development/production isolation; integrated instance start/stop and recovery, resource quotas, and billing.
- Resolved missing entitlements after payment and canceled subscriptions reactivated by late events. Strengthened event idempotency, terminal-state checks, and failure retries to prevent duplicate grants and incorrect entitlement restoration.
- Investigated a cluster outage caused by malicious accounts running miners in code-execution sandboxes. Correlated node state, processes, and resource configuration to identify CPU overcommit, remove abusive workloads, and restore available capacity.
- Built migration reconciliation and failure-scenario acceptance checks against a production baseline of 6,750,000 historical ledger entries. Verified the path from checkout through payment callbacks to database postings, including debt, credit expiry, and periodic grants.

### Cookiy AI · AI Agent Engineer

Aug 2025 – Jul 2026 · Silicon Valley HQ / Beijing Engineering Team

AI interview platform for user research, covering interview execution, research analysis, and report generation.

- Developed research and report agents with task-scoped tools and report/evidence loading before edits. Split report generation into batch analysis, synthesis, and validation to constrain factual drift in later revisions.
- Owned MCP tools and public APIs, standardizing parameter validation, authentication, pagination, and task status across study creation, interviews, playback, and reports. Built a TypeScript CLI for external agents.
- Hardened SSE, WebSocket, and MCP long-running tasks with heartbeats, timeouts, cancellation, resource cleanup, and run-ID propagation; diagnosed stream disconnections and model API failures.
- Built end-to-end tests across the web app and CLI/MCP, checking actual tool results, generated content, and duration while retaining logs and run records. Added streaming edge cases and production failures to regression and release checks.
- Developed real-time voice interviews and report Q&A with LiveKit, speech recognition, and streaming TTS. Supported interruptions and follow-up turns, coordinating recognition, model responses, and audio playback.

### SMU · Software Engineer

Feb 2024 – Jan 2026 · Los Angeles

- Built Python AsyncIO order and inventory synchronization between Amazon, Shopify, and ERP systems, using Redis, Kafka, and batched database operations for asynchronous data flows.
- Independently built and operated GetDateLove, including a FastAPI/PostgreSQL backend, WebSocket messaging, payments, and AWS deployment, with Playwright end-to-end tests and CI release checks.

### Huawei Technologies · Software Engineer, SPU Development

Apr 2023 – Feb 2024 · Beijing

- Developed NE40E router traffic statistics and NetStream features in C/C++; investigated packet processing, flow logs, URL parsing, and HTTP header handling.

## Projects

### Live Trading System · Co-Developer

Apr 2026 – Present · Concurrent project

- Developed a Python live-execution system with fill deduplication, a persistent execution ledger, and broker reconciliation at startup to handle restarts, duplicate events, and inconsistent local state.
- Investigated latency regressions caused by scheduled backfills and real-time scans contending for SQLite write locks. Maintained AWS deployment, monitoring, and a research dashboard, using SSM for access and secret management.

## Skills

- **Languages and backend:** TypeScript/Node.js; Python (AsyncIO, FastAPI); Java/Spring Boot; C/C++.
- **Agents and real-time systems:** MCP, tool use and context constraints, OpenAI/Gemini integration, SSE/WebSocket, LiveKit.
- **Data and infrastructure:** MySQL, PostgreSQL, Redis, SQLite, Kafka; Linux, Docker, Kubernetes, AWS.
- **Testing and troubleshooting:** Playwright, API/CLI end-to-end testing, CI/CD, log correlation, performance analysis, production data reconciliation.

## Education

**Boston University** · M.S. Mathematical Finance & FinTech · GPA 3.78

**The Ohio State University** · B.A. Physics · GPA 3.84

## Public Work

[Cookiy TypeScript CLI](https://github.com/cookiy-ai/cookiy-cli) · [User Research Agent Integration](https://github.com/cookiy-ai/user-research-skill)
