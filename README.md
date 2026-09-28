# kabbik-backend

Backend REST API for [Kabbik](https://kabbik.com) — an audiobook and audio content platform.

## Quick Start

```bash
npm install
ENV=dev npm run dev   # http://localhost:8080
```

## Documentation

Full documentation is in the [`docs/`](docs/README.md) folder:

### Setup & Architecture
- [Getting Started](docs/getting-started.md) — local setup
- [Architecture](docs/architecture.md) — system design and request flow
- [Configuration](docs/configuration.md) — environment variables
- [Deployment](docs/deployment.md) — PM2 and production

### API Reference
- [API v1](docs/api/v1.md) · [v2](docs/api/v2.md) · [v3](docs/api/v3.md) · [v4](docs/api/v4.md)

### Business Logic
- [Business Logic Index](docs/business-logic/README.md) — subscriptions, streaming, partners, rewards, and more
- [bKash Flows](docs/business-logic/bkash-flows.md) · [Partner Apps](docs/business-logic/partner-apps.md) · [Session Tracking](docs/business-logic/session-tracking.md)

### Code Reference
- [Controllers](docs/controllers.md) · [Middleware](docs/middleware.md) · [Utils](docs/utils-reference.md) · [Stored Procedures](docs/stored-procedures.md)

## Tech Stack

Node.js · Express · MySQL · Redis · AWS S3 · Firebase · PM2

## API Versions

```
/api/v1   Legacy core API
/api/v2   Auth, core, audiobooks v2
/api/v3   bKash, Google Pay, quiz, push notifications
/api/v4   Primary modern API (payments, telecom, courses)
```
