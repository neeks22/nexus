#!/bin/bash
# Claude Code God Mode — One-Click Installer
# Run this INSIDE Claude Code terminal: bash install-god-mode.sh

echo "=== INSTALLING CLAUDE CODE GOD MODE ==="
echo ""

# Core Workflow
echo "[1/8] Installing Core Workflow plugins..."
claude plugin install commit-commands
claude plugin install feature-dev
claude plugin install frontend-design
claude plugin install pr-review-toolkit
claude plugin install context7
claude plugin install superpowers

# LSP - 11 Languages
echo "[2/8] Installing LSP plugins (11 languages)..."
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

# Service Integrations
echo "[3/8] Installing Service Integration plugins..."
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

# Meta/Tooling
echo "[4/8] Installing Meta/Tooling plugins..."
claude plugin install claude-code-setup
claude plugin install claude-md-management
claude plugin install skill-creator
claude plugin install plugin-dev
claude plugin install agent-sdk-dev
claude plugin install hookify
claude plugin install ralph-loop
claude plugin install security-guidance

# Community Plugins
echo "[5/8] Installing Community plugins..."
claude plugin marketplace add thedotmack/claude-mem
claude plugin install claude-mem
claude plugin marketplace add bayramannakov/claude-reflect
claude plugin install claude-reflect@claude-reflect-marketplace

# Self-Healing
echo "[6/8] Installing Self-Healing stack..."
npm install -g claude-auto-retry
curl -fsSL https://raw.githubusercontent.com/pandnyr/self-healing-claude/main/install.sh | bash

echo ""
echo "=== INSTALLATION COMPLETE ==="
echo ""
echo "Run /reload-plugins inside Claude Code to activate."
echo "Total: 40 plugins + self-healing stack"
echo ""
echo "Next step: Tell Claude 'Check memory. I'm a full-stack turnaround operator.'"
