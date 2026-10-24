# Credit Freeze Guide

A free, offline-capable PWA that guides you through freezing your credit at all three major bureaus — Equifax, Experian, and TransUnion.

## Why this exists

Credit freezes are your best defense against identity theft. By federal law (the SECURE Act), they're **100% free**. But the bureau websites are designed to push paid products, making it hard to find the free options.

This guide shows you exactly where to click, step by step.

## Features

- **Three-bureau guide** — Equifax, Experian, TransUnion with direct links to free freeze pages
- **PIN tracker** — Save and manage your freeze PINs (encrypted, stored locally)
- **Status dashboard** — Track which bureaus you've completed
- **Works offline** — Install as a PWA, no internet needed
- **Zero tracking** — No analytics, no accounts, no data leaves your device
- **Grandmother-friendly** — Clear language, large fonts, no jargon

## What this is NOT

- Not affiliated with Equifax, Experian, or TransUnion
- Not a credit monitoring service
- Not a substitute for professional legal advice
- No "share progress" or social features
- No credit score checks

## Getting Started

### Option 1: Deploy to GitHub Pages (recommended)

1. Create a new GitHub repository
2. Push this code
3. Go to Settings → Pages → Source: Deploy from a branch → main / root
4. Your PWA will be live at `https://yourusername.github.io/repo-name/`

### Option 2: Run locally

```bash
cd credit-freeze-guide
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

### Option 3: Install as PWA

1. Deploy to any static hosting (GitHub Pages, Netlify, Cloudflare Pages)
2. Open in Chrome, Safari, or Edge
3. Tap "Install" when prompted
4. Use it like a native app — even offline

## Auto-Healing CI

This project includes a GitHub Actions workflow that monitors bureau websites for changes. If a freeze page changes significantly, the workflow will:

1. Fetch the page HTML
2. Compare against a known-good snapshot
3. Break the build and file an issue if the page has changed enough to need guidance updates

This keeps the guide accurate without manual checking.

## Security

- PINs are encrypted using AES-GCM (256-bit) via the Web Crypto API
- Encryption key is derived from a salt stored in localStorage
- Data never leaves your device
- This is basic obfuscation against casual access — not military-grade
- If you clear browser data, you lose your saved PINs

## License

This project is released into the public domain (CC0-1.0). Use it however you want.

## Credits

Built with care. No venture capital. No ads. No data harvesting.

Just people helping people protect themselves from identity theft.
