# Claude Code God Mode Setup — Full Stack Turnaround Operator

Complete A-Z setup guide for the ultimate Claude Code configuration.
Built for tech turnaround operators who walk into companies, audit, restructure, and ship 10x.

---

## A. PREREQUISITES (install these first)

1. **Node.js LTS** — download from https://nodejs.org
2. **jq** — download from https://jqlang.github.io/jq/download/

---

## B. CLAUDE CODE PLUGINS (40 total)

Run each command inside Claude Code terminal.

### Core Workflow
```
claude plugin install commit-commands
claude plugin install feature-dev
claude plugin install frontend-design
claude plugin install pr-review-toolkit
claude plugin install context7
claude plugin install superpowers
```

### LSP — 11 Languages Covered
```
claude plugin install typescript-lsp
claude plugin install pyright-lsp
claude plugin install gopls-lsp
claude plugin install rust-analyzer-lsp
claude plugin install clangd-lsp
claude plugin install jdtls-lsp
claude plugin install kotlin-lsp
claude plugin install csharp-lsp
claude plugin install php-lsp
claude plugin install ruby-lsp
claude plugin install swift-lsp
```

### Service Integrations
```
claude plugin install github
claude plugin install figma
claude plugin install supabase
claude plugin install firebase
claude plugin install sentry
claude plugin install slack
claude plugin install linear
claude plugin install asana
claude plugin install playwright
claude plugin install terraform
claude plugin install laravel-boost
claude plugin install greptile
claude plugin install firecrawl
```

### Meta/Tooling
```
claude plugin install claude-code-setup
claude plugin install claude-md-management
claude plugin install skill-creator
claude plugin install plugin-dev
claude plugin install agent-sdk-dev
claude plugin install hookify
claude plugin install ralph-loop
claude plugin install security-guidance
```

### Community Marketplaces + Plugins
```
claude plugin marketplace add thedotmack/claude-mem
claude plugin install claude-mem

claude plugin marketplace add bayramannakov/claude-reflect
claude plugin install claude-reflect@claude-reflect-marketplace
```

### Self-Healing Stack
```
npm install -g claude-auto-retry

curl -fsSL https://raw.githubusercontent.com/pandnyr/self-healing-claude/main/install.sh | bash
```

### Activate Everything
```
/reload-plugins
```

Expected result: ~40 plugins, ~25 skills, ~21 agents, ~15 hooks, ~14 MCP servers, ~11 LSP servers

---

## C. DO NOT INSTALL (removed as redundant)

| Skip This | Why |
|-----------|-----|
| code-review | Subset of pr-review-toolkit |
| code-simplifier | Subset of pr-review-toolkit |
| serena | Redundant with 11 dedicated LSPs |

---

## D. LAYER 1-4 TOOLS (standalone tools, not Claude plugins)

These are installed per-engagement based on client stack. They are how YOU assess and restructure companies.

### Layer 1: Day-1 Assessment (X-ray a company in 2 hours)

| Tool | What It Does | Why It Won The Debate | Install |
|------|-------------|----------------------|---------|
| scc | Codebase size + COCOMO cost estimate | 30 sec, tells CFO "this costs $X to rebuild" | `go install github.com/boyter/scc/v3@latest` |
| SonarQube | Code quality grade + tech debt in person-days | Industry standard, board-level credibility | `docker run -d -p 9000:9000 sonarqube:community` |
| Trivy | Every CVE in dependency tree | 34K stars, scans everything | `curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \| sh` |
| TruffleHog | Leaked secrets with LIVE verification | Tells you which keys are STILL ACTIVE | `pip install trufflehog` |
| Semgrep | OWASP vulnerabilities in code | 13K stars, near-zero false positives | `pip install semgrep` |
| Gitleaks | Pre-commit hook to stop future leaks | Prevention layer | Download from github.com/gitleaks/gitleaks |
| Code-Maat | Git history hotspots + bus factor | Finds files AND people that are real risk | `java -jar code-maat.jar` from github.com/adamtornhill/code-maat |
| Knip | Dead code + unused deps (JS/TS) | Vercel deleted 300K lines using this | `npx knip` (no install needed) |
| Lizard | Cyclomatic complexity per function | Flags dangerous functions instantly | `pip install lizard` |
| jscpd | Code duplication percentage | >5% is a smell, >15% is a problem | `npx jscpd .` (no install needed) |
| GitIngest | Feed entire codebase to LLM | Fastest way to understand unknown code | Replace "hub" with "ingest" in any GitHub URL |
| DORA metrics | Engineering velocity baseline | The 4 metrics every board understands | Manual or use LinearB/Sleuth |

#### Day-1 Execution Order
```
Step 1 (30 sec):  scc .                              -> size, languages, cost estimate
Step 2 (60 sec):  gitingest or code2prompt            -> LLM-digestible summary
Step 3 (2 min):   gitleaks detect --source=. -v       -> leaked secrets in git history
Step 4 (5 min):   trivy fs .                          -> every CVE in dependencies
Step 5 (5 min):   semgrep --config=auto .             -> OWASP vulnerabilities
Step 6 (5 min):   lizard -T cyclomatic_complexity=15  -> most complex functions
Step 7 (5 min):   npx jscpd .                         -> duplication percentage
Step 8 (10 min):  npx knip                            -> dead code, unused deps
Step 9 (30 min):  SonarQube scan                      -> full quality dashboard
Step 10 (30 min): Code-Maat analysis                  -> hotspots, bus factor
Result: Complete assessment in ~2 hours
```

### Layer 2: Restructure & Ship (Rebuild 10x faster)

| Tool | What It Does | Why It Won | Install |
|------|-------------|-----------|---------|
| Coolify | Self-hosted PaaS (Vercel/Heroku killer) | 15 min setup, $20/mo VPS | `curl -fsSL https://cdn.coollabs.io/coolify/install.sh \| bash` |
| Nixpacks | Auto-detect language -> container image | No Dockerfiles needed | `curl -sSL https://nixpacks.com/install.sh \| bash` |
| Kamal | Zero-downtime deploy to any Linux server | Works with any stack | `gem install kamal` |
| Atlas | "Terraform for databases" — declarative migrations | Catches breaking changes before prod | `curl -sSf https://atlasgo.sh \| sh` |
| Flipt | Feature flags — single binary, git-native | Zero deps, flags via PR review | Download from github.com/flipt-io/flipt |
| k6 | Load testing in 10 lines of JS | Prove restructured system performs | Download from k6.io |
| HyperDX/ClickStack | Full observability — one Docker command | Logs + traces + metrics + session replays | `docker run -p 8080:8080 docker.hyperdx.io/hyperdx/hyperdx-all-in-one` |
| OpenTofu | IaC (Terraform fork, open source) | Drop-in replacement, no license risk | Download from opentofu.org |
| Dagger | Portable CI/CD in any language | Runs identically on laptop and CI | `curl -fsSL https://dl.dagger.io/dagger/install.sh \| sh` |

### Layer 3: Security & Compliance (Non-negotiable)

| Tool | What It Does | Why It Won | Install |
|------|-------------|-----------|---------|
| Prowler | Cloud security posture AWS/Azure/GCP | Maps to SOC2/ISO27001/GDPR auto | `pip install prowler` |
| CISO Assistant | GRC — 130+ compliance frameworks | Map controls once, satisfy multiple audits | Docker from github.com/intuitem/ciso-assistant-community |
| DefectDojo | Centralize all vulnerability findings | Aggregates 150+ scanner outputs | Docker from github.com/DefectDojo/django-DefectDojo |
| Keycloak | Unified SSO/IAM | Replace fragmented auth systems | `docker run -p 8080:8080 quay.io/keycloak/keycloak start-dev` |
| Authentik | Modern IAM alternative to Keycloak | Cleaner UI, easier for mid-size | Docker from github.com/goauthentik/authentik |
| HashiCorp Vault | Secrets management | Eliminates hardcoded credentials | Docker or download from vaultproject.io |
| Nuclei | 12K+ templates for exploitable vulns | Near-zero false positives | `go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest` |
| Presidio | Find PII in databases | GDPR/CCPA compliance discovery | `pip install presidio-analyzer presidio-anonymizer` |
| Comply | Generate SOC2 policy docs from templates | Policy library in hours not months | Download from github.com/strongdm/comply |

### Layer 4: Run Your Agency (Internal operations)

| Tool | What It Does | Why It Won | Install |
|------|-------------|-----------|---------|
| Plane | Project management (Jira killer) | 46K stars, best open-source PM | Docker from github.com/makeplane/plane |
| Twenty | CRM (Salesforce killer) | 41K stars, modern, API-first | Docker from github.com/twentyhq/twenty |
| Invoice Ninja | Invoicing + time tracking | Most complete self-hosted | Docker from github.com/invoiceninja/invoiceninja |
| Cal.com | Scheduling (Calendly killer) | 40K stars, white-label | Docker from github.com/calcom/cal.com |
| Documenso | E-signatures (DocuSign killer) | Get SOWs signed for free | Docker from github.com/documenso/documenso |
| listmonk | Email/newsletter marketing | Replace $500/mo Mailchimp | Docker from github.com/knadh/listmonk |
| n8n | Workflow automation (Zapier killer) | Self-hosted, no per-execution costs | `docker run -p 5678:5678 n8nio/n8n` |
| PostHog | Product analytics for client SaaS | Session replay + funnels + A/B | Docker from github.com/PostHog/posthog |
| Metabase | BI dashboards for client KPIs | Non-technical users can build | `docker run -p 3000:3000 metabase/metabase` |

---

## E. AI AGENT ARSENAL (Force Multipliers)

| Tool | Role | Why It Won | Install |
|------|------|-----------|---------|
| CrewAI | Multi-agent orchestration | Build "turnaround crew" that audits auto | `pip install crewai` |
| Aider | AI pair programming in terminal | Fastest multi-file edits | `pip install aider-chat` |
| OpenHands | Autonomous coding agent | Works while you're in meetings | Docker from github.com/All-Hands-AI/OpenHands |
| CodeRabbit | AI PR review bot | Every PR reviewed day 1 | GitHub App from coderabbit.ai |
| Qodo Cover Agent | Auto-generate test suites | 0% to 60%+ coverage in hours | `pip install cover-agent` |
| ast-grep | Structural code refactoring | Find/replace across 1000 files | `npx @ast-grep/cli` |
| OpenRewrite | Auto-upgrade Java/Spring | Months of migration automated | Maven/Gradle plugin from openrewrite.org |
| Rector | Auto-upgrade PHP/Laravel | Same for PHP shops | `composer require rector/rector --dev` |
| Dify | Build AI-powered internal tools | Visual builder for deliverables | Docker from github.com/langgenius/dify |
| code2prompt | Feed codebase to LLM | Quick context loading | `pip install code2prompt` |

---

## F. 90-DAY TURNAROUND PLAYBOOK

```
WEEK 1: X-RAY
|-- scc                  -> size/cost estimate
|-- SonarQube            -> quality grade
|-- Trivy + TruffleHog   -> security posture
|-- DORA metrics         -> engineering velocity
|-- Code-Maat            -> hotspots + bus factor
|-- Prowler              -> cloud compliance gaps
'-- DELIVERABLE: Board presentation with objective data

WEEKS 2-4: STABILIZE
|-- Gitleaks pre-commit hooks -> stop the bleeding
|-- HyperDX                   -> instant observability
|-- Flipt                     -> feature flags for safe deploys
|-- CodeRabbit                -> AI code review on every PR
'-- Quick wins that build trust

WEEKS 5-8: RESTRUCTURE
|-- Strangler Fig Pattern (NEVER big-bang rewrite)
|-- Boring technology defaults (Next.js + Supabase + Vercel)
|-- Max 3 innovation tokens per engagement
|-- Atlas                     -> database migrations
|-- Qodo                      -> auto-generate test coverage
'-- Dagger                    -> portable CI/CD

WEEKS 9-12: SHIP & TRANSFER
|-- Coolify/Kamal             -> production deployment
|-- k6                        -> prove performance
|-- CLAUDE.md files           -> institutional knowledge capture
|-- CISO Assistant            -> compliance documentation
|-- DORA re-measurement       -> before/after proof
'-- DELIVERABLE: Measurable improvement metrics
```

---

## G. COST MATH (Self-hosting saves $2,100+/mo)

| SaaS You Replace | Monthly Cost Saved |
|------------------|-------------------|
| Salesforce -> Twenty | $300+ |
| Jira -> Plane | $200+ |
| Mailchimp -> listmonk | $500+ |
| Calendly -> Cal.com | $100+ |
| DocuSign -> Documenso | $100+ |
| Datadog -> HyperDX | $500+ |
| Vercel Pro -> Coolify | $200+ |
| Zapier -> n8n | $200+ |
| **Total saved** | **$2,100+/mo** |

All self-hosted on a $40-100/mo VPS via Coolify.

---

## H. PRICING MODEL

| Service | Price |
|---------|-------|
| Tech Due Diligence Assessment | $15K-$25K (1-2 weeks) |
| 90-Day Turnaround Engagement | $24K-$45K |
| Ongoing Advisory Retainer | $5K-$15K/mo |
| Expected client ROI | Prevented outages ($50-500K+), avoided bad hires, accelerated sales |

---

## I. KEY RULES

- Strangler Fig Pattern for migrations — NEVER big-bang rewrite
- Boring Technology principle — max 3 innovation tokens per engagement
- Default rebuild stack: Next.js + Supabase + Vercel
- DORA metrics for before/after measurement
- Two-page charter co-signed by CEO: decision rights, KPIs, exit path
- Tech DD checklists: github.com/aroder/TIDD + github.com/dizzydes/technical-due-diligence-checklist

---

## J. AFTER INSTALL

1. Run `/reload-plugins` in Claude Code
2. In your first session, tell Claude: "Check memory. I'm a full-stack turnaround operator."
3. Claude will know your role, your tools, and your methodology
4. Say "I'm assessing a company today" and Claude will walk you through the 90-day playbook

---

Built on 2026-03-30. Setup session: ~4 hours of research, debate, and installation.
