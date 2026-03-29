---
name: security-review
description: "Pre-deployment security check covering OWASP Top 10. Reviews authentication, injection, SSRF, XSS, CSRF, and secrets handling. Produces prioritized findings with severity, exploit scenario, and mitigation diff."
user-invocable: true
---

# Security Review — Pre-Deployment Check

Run this on every client project before deployment. Catches the OWASP Top 10 automatically.

## Review Checklist

Review changes for common web security issues:

1. **Authentication and authorization**: validate access control paths and privilege boundaries
2. **Injection**: check SQL injection, command injection, template injection, and unsafe deserialization
3. **Server-side request forgery (SSRF)**: verify URL fetching, allowlists, and network egress controls
4. **Cross-site scripting (XSS)**: verify output encoding, sanitization, and safe templating
5. **Cross-site request forgery (CSRF)**: verify CSRF tokens, same-site cookies, and unsafe endpoints
6. **Secrets handling**: find hard-coded keys, logs leaking secrets, and unsafe secret storage

## Output Format

Produce a prioritized list with:
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Exploit scenario**: How an attacker would exploit this
- **Exact mitigation diff**: The code change needed to fix it

## Source

[QuantumByte - Claude Code Prompts: Best Templates](https://quantumbyte.ai/articles/claude-code-prompts)
