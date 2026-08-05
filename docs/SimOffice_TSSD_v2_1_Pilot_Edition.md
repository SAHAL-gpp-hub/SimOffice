# SimOffice — Technology Stack Selection Document (TSSD)
## Pilot / Demo Edition

| | |
|---|---|
| **Document type** | Technology Stack Selection Document, **re-scoped to a single-college pilot/demo deployment** of PRD§5.1's Phase 0 MVP — not the multi-institution commercial rollout costed in TSSD v1.0. |
| **Relationship to v1.0** | v1.0 is not discarded — it remains the reference for what SimOffice becomes *if* this pilot succeeds and needs to scale to multiple institutions. This document is what you actually build against **now**. §9 defines exactly when to graduate from this document back to v1.0. |
| **Source of truth** | SimOffice PRD v3.1, scoped to §5.1's Phase 0 definition, run as a single supervised deployment rather than a multi-school rollout. |
| **Version** | 2.1 — Pilot/Demo Edition |
| **Status** | Ready to build against. |

> **What changed in v2.1 (full changelog in [Section 13](#13-changelog-v20--v21)):** added resource-limit configuration to the sandbox selection (§5.3), turned the compliance shortcut in §8 from an assumption into a confirm-first gate, and tightened the device-baseline PoC item (§10) to require recording actual numbers.

---

## Table of Contents

1. [Purpose & Scope of This Edition](#1-purpose--scope-of-this-edition)
2. [What Changed From v1.0, and Why — Summary Table](#2-what-changed-from-v10-and-why--summary-table)
3. [What Did *Not* Change, and Why That Matters](#3-what-did-not-change-and-why-that-matters)
4. [Re-Weighted Evaluation Methodology](#4-re-weighted-evaluation-methodology)
5. [Categories With Updated Selections](#5-categories-with-updated-selections)
6. [Compatibility Matrix (Narrowed)](#6-compatibility-matrix-narrowed)
7. [Pilot Cost Estimate](#7-pilot-cost-estimate)
8. [Security Considerations — What Cost-Cutting Did *Not* Touch](#8-security-considerations--what-cost-cutting-did-not-touch)
9. [Graduation Triggers — When to Move Back to v1.0](#9-graduation-triggers--when-to-move-back-to-v10)
10. [Open PoC Items (Pilot-Relevant Subset)](#10-open-poc-items-pilot-relevant-subset)
11. [Consolidated Stack Summary — Pilot Edition](#11-consolidated-stack-summary--pilot-edition)
12. [Changelog v1.0 → v2.0](#12-changelog-v10--v20)
13. [Changelog v2.0 → v2.1](#13-changelog-v20--v21)

---

## 1. Purpose & Scope of This Edition

TSSD v1.0 answered "what should SimOffice run on as a commercial product serving multiple schools?" That is not the question right now. The question right now is: **what does it take to build and run the PRD§5.1 Phase 0 MVP as a single-college pilot or demo, at effectively zero infrastructure cost, without weakening any requirement the PRD treats as non-negotiable?**

That distinction matters because a naive "just make it cheaper" pass would be tempted to also cut the requirements that *aren't* about cost — sandbox isolation (PRD§8.1, §16.4) and verification tamper-resistance (PRD§8.5) don't become optional just because the deployment is small. A single classroom of students is still a group of people with an incentive to game a grading check, and a container escape is just as real a risk in a one-VPS pilot as in a production fleet. **This document cuts spend, not safety** — every change below either removes a paid convenience layer (managed hosting, a commercial IdP, an enterprise observability platform) or removes a requirement that only existed *because* the original scope was multi-institution (SSO connector breadth, formal compliance review, CDN edge delivery). Nothing that protects the student or the integrity of the exercise is weakened.

**Assumed pilot shape (stated explicitly since it drives every decision below):** one college, one supervised class/session at a time, campus network (already established as good), a handful of concurrent students, run either from a single low-cost VPS or existing on-campus hardware you already control.

---

## 2. What Changed From v1.0, and Why — Summary Table

| Category | v1.0 (production) | v2.0 (pilot) | Why the change is safe here |
|---|---|---|---|
| Compute/hosting | GKE (Kubernetes, multi-node) | Single VPS or on-campus lab machine, Docker Compose | No multi-institution concurrency to isolate at the infra level; one supervised deployment doesn't need cluster orchestration. |
| Database | Managed Cloud SQL for PostgreSQL | Self-hosted PostgreSQL (same engine, Docker container) | Same database, same schema, same guarantees — only the *hosting* changes. Fully reversible later. |
| Cache | Managed Memorystore for Valkey | Self-hosted Valkey (Docker container) | Same as above — same engine, self-hosted. |
| Sandbox | E2B managed → self-hosted gVisor at scale | E2B free/hobby tier **or** self-hosted gVisor (`runsc`) | At pilot scale, self-hosting the *same* isolation technology this document already recommends for the long term costs nothing and needs no vendor account. See §5.3 for the full re-evaluation. |
| Auth (teacher/admin) | Auth0 (SSO connector catalog) | Self-rolled login (email/password or campus credential check) + JWT | SSO breadth exists to solve *district IT integration friction* — there is no district here, just your own college. That whole requirement disappears, not just its cost. |
| Cloud provider | GCP (or AWS) | None — a single VPS provider (or literally your own hardware) | Hyperscaler features (global regions, managed autoscaling, enterprise support) have no pilot-scale use case yet. |
| Storage/CDN | GCS + Cloudflare CDN | Local filesystem + nginx | Directly because of your good campus network — this was flagged in §12/§13 of v1.0 as removable exactly under this condition. |
| Orchestration | Kubernetes (GKE) | Docker Compose | Kubernetes' value is multi-node scheduling and self-healing at scale; a single VPS has neither problem to solve. |
| Infrastructure as Code | Terraform | A documented setup script + `docker-compose.yml` | Terraform's value is repeatable multi-resource cloud provisioning; provisioning one VPS by hand once, well-documented, is not worth the tooling overhead yet. |
| Monitoring/observability | Grafana/Prometheus/Loki → Datadog | Sentry (free tier) + manual observation during supervised sessions | You are physically present for every pilot session — live dashboards solve a problem (unattended production monitoring) that doesn't exist yet. |
| Device compatibility testing | BrowserStack | Real campus lab machines/Chromebooks | Better ground truth than emulated device access, and free since you already have the hardware. |

**Unchanged (see §3):** 3D engine, client framework, multiplayer networking, backend language/framework, database *engine* (only hosting changed), content authoring pipeline, CI/CD, testing frameworks.

---

## 3. What Did *Not* Change, and Why That Matters

It would be a mistake to read "pilot edition" as "everything got simpler." The following were already the zero-cost-optimal choice in v1.0 for reasons that had nothing to do with production scale — they don't change here because there was never a paid alternative being carried for scale reasons:

- **Babylon.js (3D engine)** — Apache-2.0, free at any scale. The reasoning in v1.0 §4 (built-in physics/character controller, Chromebook-viable) applies identically to one classroom or one thousand.
- **React + TypeScript + Vite (client shell)** — free at any scale; unchanged.
- **Colyseus (multiplayer networking)** — MIT-licensed, self-hostable from the start; v1.0 never proposed a paid managed version of this. The room-per-team model and native reconnection support (§6 in v1.0) matter exactly as much for one team of students as for a thousand.
- **Node.js + NestJS (backend)** — free; unchanged.
- **PostgreSQL and Valkey as *engines*** — only the hosting (managed vs. self-hosted) changed in §2 above; the technology selection reasoning in v1.0 §8–9 is untouched.
- **Git-based content authoring + GitHub Actions correctness gate** — already free, already the right shape for one scenario or many; unchanged.
- **Vitest, Playwright, k6** — all free tools; the reasoning for why each was chosen (§19 in v1.0) doesn't reference scale at all.

This matters because it shows the cost reduction came almost entirely from removing *managed-service convenience* (things that exist to reduce operational burden across many institutions) rather than from swapping out core technology decisions. If this pilot needs to scale later, you are upgrading hosting and adding vendor integrations — not rewriting the application.

---

## 4. Re-Weighted Evaluation Methodology

Only the categories in §5 needed re-scoring; the methodology itself (8 criteria, 1–5 scale, weighted sum, per v1.0 §3) is unchanged. What changed is which criteria matter for a pilot:

- **Licensing & Cost** is weighted far more heavily across every re-scored category — for a self-funded academic pilot, a $0 self-hosted option beats a technically superior paid one unless the paid option closes a genuine safety or integrity gap (this is exactly why sandbox isolation, §5.3, is scored differently from auth, §5.4).
- **Long-Term Viability / enterprise governance risk** is weighted down — a pilot has a much shorter time horizon and no multi-year vendor lock-in exposure to protect against.
- **Ecosystem & Talent** is weighted down for infra categories (Kubernetes, Terraform) where the pilot's actual team is you, not a future hire.
- **Security / Isolation** is *not* weighted down anywhere it appeared in v1.0 — see §8.

---

## 5. Categories With Updated Selections

### 5.1 Compute & Hosting

**Decision: ✅ Single VPS (Hetzner or DigitalOcean, cheapest tier with ≥4GB RAM) or an existing on-campus lab machine, running everything via Docker Compose.**

A single small VPS (or literally a spare lab PC on the campus LAN, given the network quality already established) comfortably runs the NestJS API, Colyseus rooms, self-hosted PostgreSQL, self-hosted Valkey, and the sandbox layer for a handful of concurrent students — this is well within what a $5–$10/month VPS tier handles, or free if run on hardware the college already owns. Docker Compose (not Kubernetes) is the packaging format specifically because it keeps the exact same container images that would later run on Kubernetes — **the migration path to v1.0's GKE setup is "translate docker-compose.yml into Kubernetes manifests," not a rewrite.**

**Rejected for pilot scope:** GKE/managed Kubernetes (§14 in v1.0) — its value is scheduling across many nodes and self-healing at scale, neither of which a single-VPS pilot needs; running it here would mean paying Kubernetes' operational complexity tax for zero benefit.

### 5.2 Database & Cache Hosting

**Decision: ✅ Self-hosted PostgreSQL 17.x and Valkey 8.x, both as Docker containers on the same VPS/lab machine.**

Identical engines and versions to v1.0 §8–9; only the hosting model changes. Use Docker named volumes for persistence and a simple `pg_dump` cron job (or manual export before/after each session) as the pilot-scale backup strategy — a managed backup service isn't justified yet, but *some* backup discipline still is, since losing a semester's worth of pilot data to a disk failure is a real and avoidable risk even at this scale.

### 5.3 Code Execution Sandbox — Re-Evaluated for Pilot Scope

**PRD requirements unchanged from v1.0: §8.1 (isolation, no path to real systems), §8.5 (tamper-resistant, server-computed verification) — these do not relax at pilot scale. New in PRD v3.1: §8.6 (enforced per-environment CPU/memory/wall-clock resource ceilings) also does not relax at pilot scale — a shared single VPS makes this requirement more urgent at pilot scope, not less.**

| Criterion (weight) | E2B free/hobby tier | Self-hosted gVisor (`runsc`) on the VPS |
|---|---|---|
| Security / Isolation (35%) | 5 | 5 |
| Cost (30%) | 4 (free tier, session-length capped) | 5 (fully free, no cap) |
| Setup effort (20%) | 5 (SDK integration only) | 3 (requires configuring `runsc` as a Docker/containerd runtime yourself) |
| Long-term fit if this scales later (15%) | 5 (same vendor, just add a paid plan) | 4 (same technology v1.0 recommends for production self-hosting — no rework, just more nodes) |
| **Weighted total** | **4.70** | **4.45** |

**Decision: ✅ E2B free/hobby tier as the default recommendation for getting the pilot built and demoed quickly, with self-hosted gVisor as the equally-valid path if you'd rather have zero external dependency and don't mind the extra setup time — conditional on the egress check below.**

This is close enough that either is defensible — call it based on your timeline. If there's a deadline (a submission, a demo date), E2B's free tier gets you a working, genuinely-isolated sandbox with an SDK call, no infrastructure to configure. If you have time to spare and want full independence from any third-party account, self-hosting `runsc` as your container runtime on the same VPS gives you the identical isolation guarantee for permanently zero cost, with the honest cost of needing to configure it yourself. **Either way, the trust-zone separation requirement (PRD§8.5) is implemented identically** — student-editable code and the protected verification harness stay in separate, student-unwritable paths, verification result computed server-side — this was never a cost-driven requirement and doesn't change here (see §8).

**Confirm before committing to E2B (new in v2.1):** the scoring above treats both options as equal on Security/Isolation (5/5), but that score covers Firecracker-class kernel isolation, not egress control specifically. PRD§8.1 requires no network path beyond a scenario's declared dependencies. Before picking E2B's free tier as the default, confirm its actual documentation/SDK supports restricting a sandbox's outbound network access to that scope — if the free tier only guarantees isolation *between* sandboxes and from the host, without a configurable egress allowlist, that's a real gap against §8.1, and `GVisorProvider` (where you control the network namespace directly, SAD §5) becomes the correct default rather than a merely-more-effort alternative. This is a 10–15 minute documentation check, not a re-evaluation of the whole table.

**Resource limits (new in v2.1, implements PRD§8.6):** whichever provider is chosen, every provisioned environment needs an enforced CPU/memory/wall-clock ceiling, not just isolation — a runaway loop or fork bomb in student code is an expected occurrence in a debugging exercise, and this VPS is shared by every team's environment plus the platform's own services (Postgres, Valkey, `app-server`). E2B's SDK exposes per-sandbox resource configuration at creation time; `runsc` takes standard Docker `--cpus`/`--memory` flags at container-create time via `sandbox-orchestrator`. Neither option requires new infrastructure to add this — it's a provisioning-time parameter either way (see SAD v1.3 §7.4 for the concrete defaults).

**Rejected:** managed E2B *paid* tier (no cost justification yet — the free tier's session-length cap is a non-issue for a class-period-length exercise), plain Docker without a hardened runtime (still disqualified for the same isolation-gap reason as in v1.0 — this was never a scale-dependent rejection).

### 5.4 Authentication

**Decision: ✅ Self-rolled login for the teacher/admin role (email + password, or a check against a college-provided credential list, backed by a JWT session) — no third-party identity provider.**

Auth0's entire value proposition in v1.0 §11 was its breadth of SSO connectors for integrating with *many different districts' identity systems*. A single-college pilot has exactly one institution and, realistically, one or a handful of teacher/admin users — there is no SSO integration problem to solve, so there's nothing for Auth0 to be worth paying for (or even worth the integration time on its free tier). Student identity is unchanged from v1.0: lightweight, roster/join-code-scoped session tokens issued directly by the backend, never a third-party account — this was already the zero-cost, minimal-PII design and applies identically here.

**Rejected:** Auth0 (solves a problem — multi-district SSO — that doesn't exist at this scale), Cognito/Firebase Identity (same reasoning — no benefit over a simple self-built login when there's only one institution to serve).

### 5.5 Storage & Asset Delivery

**Decision: ✅ Local filesystem on the VPS, served directly via nginx.**

This is the change your "good campus network" comment directly justifies: CDN edge delivery (Cloudflare, in v1.0 §13) exists to solve latency for geographically distributed, possibly bandwidth-constrained school networks. A single campus with a good network has neither problem — assets served straight from the same VPS running the app will load fine. nginx also fronts the NestJS API as a reverse proxy in this setup, so no separate load balancer is needed either.

### 5.6 Infrastructure as Code

**Decision: ✅ A documented shell setup script + a single `docker-compose.yml`, not Terraform.**

Terraform's value (v1.0 §15) is repeatable, auditable provisioning across many cloud resources — a single VPS provisioned once doesn't generate enough repetition to justify learning/maintaining a Terraform module for it. Document the manual setup steps clearly (a `SETUP.md` in the repo) so it's reproducible if the VPS needs to be rebuilt, but don't build IaC tooling for a one-time task.

### 5.7 Monitoring & Observability

**Decision: ✅ Sentry (free tier) for error capture, plus manual observation during supervised sessions — no Grafana/Prometheus/Datadog stack.**

The entire justification for a full observability stack in v1.0 §17 was catching problems in *unattended* production traffic across many concurrent sessions you can't personally watch. A pilot session is, by definition, one you're present for — you are the monitoring dashboard. Sentry stays because it catches errors even during a session you're focused on demoing rather than debugging, which is a real gap manual observation alone doesn't cover.

### 5.8 Device & Browser Compatibility Testing

**Decision: ✅ Test directly on real campus lab machines and any Chromebooks the college actually owns.**

This is strictly better ground truth than BrowserStack's emulated/remote device access (v1.0 §19), and it's free because you already have access to the actual hardware your pilot will run on. Keep Playwright for the non-3D UI flows (unchanged from v1.0 §19) — that reasoning didn't depend on scale either.

---

## 6. Compatibility Matrix (Narrowed)

The full multi-tier compatibility matrix in v1.0 §21 was built for an unknown, wide range of school hardware. For a known campus environment, narrow it to what's actually true of your lab:

| | Target |
|---|---|
| Browser | Whatever Chromium-based browser (Chrome/Edge) is installed on campus lab machines — confirm current version once, no need to hedge across a wide version range |
| OS | Whatever the lab machines run (Windows, ChromeOS, or Linux) — test on the actual images |
| Network | Already established as good — WebSocket connectivity (v1.0 §25 PoC item 6) is very likely a non-issue here; do one quick manual test rather than a formal validation plan |
| Device tier | Whatever the actual lab hardware is — run the Babylon.js scene on it directly and observe frame rate; this *is* your device-baseline test, no separate test plan needed |

---

## 7. Pilot Cost Estimate

| Line item | Choice | Monthly cost |
|---|---|---|
| Hosting | VPS (Hetzner/DigitalOcean ~4GB tier) or free on-campus hardware | $0–$10 |
| Database | Self-hosted PostgreSQL (Docker) | $0 |
| Cache | Self-hosted Valkey (Docker) | $0 |
| Sandbox | E2B free/hobby tier, or self-hosted gVisor | $0 |
| Auth | Self-rolled | $0 |
| Storage/CDN | Local filesystem + nginx | $0 |
| CI/CD | GitHub Actions free tier | $0 |
| Monitoring | Sentry free tier | $0 |
| Device testing | Real campus hardware | $0 |
| **Total** | | **$0–$10/month** |

This is a >100x reduction from v1.0's pilot-phase estimate of ~$400–$1,300/month — the difference is entirely managed-service convenience and multi-institution readiness, neither of which this scope needs yet (§2).

---

## 8. Security Considerations — What Cost-Cutting Did *Not* Touch

Stated plainly, because it's the part most worth being careful about: **removing a $50/month managed database is a hosting decision. Removing kernel-level sandbox isolation would be a safety decision, and this document doesn't make that trade.**

- **Isolation (PRD§16.4):** self-hosted gVisor or E2B's free tier both provide the same Firecracker/gVisor-class kernel isolation as the paid tiers evaluated in v1.0 §10 — the isolation guarantee is not weaker, only the hosting is cheaper.
- **Verification tamper-resistance (PRD§8.5):** implemented identically regardless of hosting choice — student-editable code and the protected verification harness are separate trust zones, verification computed server-side. A single classroom of students has exactly as much incentive to try to game a grading check as a thousand students do; this was never a function of scale.
- **What genuinely is reduced, and why that's an acceptable trade at this scope:** no formal COPPA/FERPA/GDPR-K compliance review (PRD§16.6), no vendor-backed SLA, no third-party penetration test. This is appropriate **only** for a supervised academic pilot/demo where you control who participates and aren't collecting or storing real students' data at any meaningful scale beyond the demo itself.
- **Confirm participant age range before relying on this reduction (rewritten in v2.1 — this was previously an assumption, now it's a gate):** the reduced compliance posture above is conditional on the pilot cohort's actual age, not a default that applies to "a college pilot" in general. Per PRD§16.6, the full COPPA/FERPA/GDPR-K-equivalent review is a **blocking Critical item** if the cohort includes minors, at any deployment scale. Before running a real class:
  - If the cohort is confirmed **adult** (e.g., diploma-program or degree-program students, 18+), standard institutional consent for a class exercise is almost certainly sufficient — but confirm with your college's own policy before running it with a real class, not because the technology needs it, but because that's a college-policy question this document can't answer for you.
  - If the cohort **includes minors**, this reduced posture does not apply — the full review in PRD§16.6 is required regardless of the pilot's small scale, and engineering may proceed in parallel but no student data may be collected from a real class until that review is complete.
  - Don't infer the answer from "it's a pilot" or "it's a college" — confirm it directly against who will actually be sitting in the session.
- **Backups:** the one place pilot-scale corner-cutting creates a real, avoidable risk is skipping backups entirely. Keep the simple `pg_dump` habit from §5.2 even though everything else here is informal.

---

## 9. Graduation Triggers — When to Move Back to v1.0

Move from this Pilot Edition to the full production TSSD v1.0 when **any** of the following becomes true:

1. More than one institution needs to use it, and you no longer control every deployment personally.
2. You're storing real, identifiable student data beyond a single supervised demo/term.
3. You need the system to run unattended (no one physically present/monitoring during sessions).
4. Concurrent load exceeds what a single VPS comfortably handles (a concrete signal: sustained CPU/memory pressure on the VPS during a normal session, or sandbox queueing delays).
5. A district or school IT department asks for SSO integration, a formal compliance posture, or an uptime guarantee.

None of these are close for a single-college pilot, which is exactly why this document exists as a separate, deliberately smaller edition rather than a permanent downgrade of v1.0.

---

## 10. Open PoC Items (Pilot-Relevant Subset)

Most of v1.0 §25's PoC list was about *scale* (Colyseus horizontal scaling, cost crossover modeling, district SSO integration) and doesn't apply yet. What's still worth a quick, low-effort check before your demo:

1. **Trust-zone tamper resistance (still fully applicable):** confirm a student genuinely cannot read or overwrite the verification harness through the workstation's code-editing surface, regardless of which sandbox option (§5.3) you pick. This is the one item worth deliberately testing yourself, not skipping.
2. **Babylon.js performance on the actual lab machines — tightened in v2.1:** run it and watch the frame rate, but *write down the numbers* — session join time, sustained fps, and workstation check-run response time (PRD§16.2) — rather than a subjective "seemed fine." This is still the device-baseline test at this scale (§6), no formal test plan needed, but PRD§16.2 (as revised in v3.1) and the Phase 0 exit criteria (PRD§5.2) both depend on an actual recorded number existing, not just an impression.
3. **gVisor setup validated**, if you choose the self-hosted sandbox path over E2B's free tier — confirm `runsc` is correctly configured as the container runtime before relying on it for a live demo.
4. **E2B egress documentation check (new in v2.1):** per §5.3, spend 10–15 minutes confirming whether E2B's free tier supports restricting a sandbox's outbound network access, before locking in E2B as the pilot default over self-hosted gVisor.
5. **Resource-ceiling smoke test (new in v2.1):** before the demo, deliberately run something resource-heavy (an intentional infinite loop is fine) inside one provisioned environment and confirm it's actually capped/terminated per the limits in SAD v1.3 §7.4, rather than assuming the `--cpus`/`--memory` flags (or E2B's equivalent config) are wired up correctly.

---

## 11. Consolidated Stack Summary — Pilot Edition

| Category | Selected | Changed from v1.0? |
|---|---|---|
| 3D client engine | Babylon.js 8.x | No |
| Client app shell | React 19 + TypeScript + Vite | No |
| Multiplayer networking | Colyseus 0.17.x | No |
| Backend | Node.js 24 LTS + NestJS | No |
| Database | PostgreSQL 17.x, self-hosted (Docker) | Hosting only |
| Cache | Valkey 8.x, self-hosted (Docker) | Hosting only |
| Sandbox | E2B free/hobby tier, or self-hosted gVisor | Hosting/tier only |
| Sandbox resource limits (new in v2.1) | Per-environment CPU/memory/wall-clock ceiling (provider's native config — E2B SDK or Docker `--cpus`/`--memory`) | New — implements PRD§8.6 |
| Auth | Self-rolled (teacher/admin) + roster tokens (students) | Yes |
| Hosting | Single VPS or on-campus machine, Docker Compose | Yes |
| Storage/CDN | Local filesystem + nginx | Yes |
| IaC | Setup script + `docker-compose.yml` | Yes |
| CI/CD | GitHub Actions | No |
| Monitoring | Sentry free tier + manual observation | Yes |
| Testing | Vitest, Playwright, k6 | No |
| Device testing | Real campus hardware | Yes |
| Content authoring | Git + manifest + GitHub Actions gate | No |

---

## 12. Changelog v1.0 → v2.0

| Change | Reasoning |
|---|---|
| Re-scoped entire document to single-college pilot, PRD§5.1 Phase 0 only | Multi-institution production concerns don't apply yet |
| Compute/hosting: GKE → single VPS/Docker Compose | No multi-node scale to justify Kubernetes |
| DB/Cache: managed → self-hosted (same engines) | Same technology, cheaper hosting, fully reversible |
| Sandbox: managed-only → E2B free tier or self-hosted gVisor | Isolation/tamper-resistance requirements unchanged; only cost/hosting re-evaluated |
| Auth: Auth0 → self-rolled | SSO breadth solves a multi-district problem that doesn't exist at pilot scale |
| Storage/CDN: GCS+Cloudflare → local + nginx | Directly justified by confirmed good campus network |
| Orchestration: Kubernetes → Docker Compose | No multi-node scheduling problem to solve |
| IaC: Terraform → setup script | One-time provisioning doesn't justify IaC tooling overhead |
| Monitoring: Grafana/Datadog → Sentry + manual | Supervised sessions substitute for unattended-production monitoring |
| Device testing: BrowserStack → real hardware | Free, and better ground truth than emulation |
| Added §9 (Graduation Triggers) | New — defines exactly when to move back to v1.0, so this isn't a permanent scope narrowing |
| Security posture (§8) | Explicitly unchanged for isolation/tamper-resistance; explicitly reduced only for compliance review/SLA/pentest, with reasoning stated |

---

## 13. Changelog v2.0 → v2.1

This revision closes three gaps surfaced by cross-reviewing this document against PRD v3.1 and SAD v1.3 (both updated in the same pass):

| Change | Reasoning |
|---|---|
| §5.3 | Added a resource-limit requirement (CPU/memory/wall-clock) to the sandbox decision, implementing new PRD§8.6 — isolation was already covered, capacity ceilings were not |
| §5.3 | Added an explicit "confirm before committing" gate on whether E2B's free tier actually supports egress restriction, rather than scoring it 5/5 on isolation without distinguishing sandbox isolation from network-egress control |
| §8 | Rewrote the compliance paragraph from an assumption ("if diploma-program students, likely adults...") into a gate: confirm the actual cohort age before applying the reduced-compliance posture; if minors are included, the full PRD§16.6 review applies regardless of pilot scale |
| §10 | Tightened the device-baseline PoC item to require recording actual numbers (join time, fps, check-run latency), not just an impression; added two new PoC items (E2B egress check, resource-ceiling smoke test) |
| §11 | Added a consolidated-stack-summary row for sandbox resource limits |
| Throughout | Cross-references bumped to PRD v3.1 |
