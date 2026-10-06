# Healthify - Personal Health Copilot

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-teal.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![ABDM / ABHA Ready](https://img.shields.io/badge/ABDM%2FABHA-Ready-emerald.svg)](#)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-cyan.svg)](#)

A personal healthcare management platform for organizing medical records, prescriptions, laboratory reports, medicines, doctors, appointments, health history, emergency information, and healthcare sharing. Features an integrated Health Copilot for contextual search, document OCR understanding, plain-language explanations, comparisons, and multilingual navigation.

---

## 🏗️ Architecture & Philosophy

Healthify follows a clear product hierarchy:
```
HEALTHCARE PLATFORM
        ↓
USER + HEALTH DATA
        ↓
DOCUMENTS + RECORDS + MEDICINES + TIMELINE
        ↓
ABDM / ABHA + SHARING + EMERGENCY
        ↓
HEALTH COPILOT
        ↓
AI-POWERED UNDERSTANDING
```

- **Core Rule**: AI enhances the experience (OCR, summarization, entity extraction, plain-language explanations), but normal healthcare CRUD operations, timelines, reminders, and navigation run deterministically without AI dependency.
- **Tech Stack**:
  - **Frontend**: React 18, React Router v6, Tailwind CSS, Lucide React, Recharts.
  - **Backend**: Node.js, Express.js, Mongoose, JWT authentication, Rate Limiting, Helmet security headers, Morgan logging.
  - **Database**: MongoDB (with zero-configuration embedded memory fallback for local development).
  - **Internationalization**: English (`en`), Tamil (`ta`), Hindi (`hi`), Telugu (`te`).

---

## 📁 Repository Structure

```
healthify/
├── client/                     # Frontend React Application
│   ├── public/                 # Static assets
│   └── src/
│       ├── assets/             # Images, icons, badges
│       ├── components/         # Reusable UI & healthcare components
│       ├── context/            # React context providers (Auth, Language, Accessibility)
│       ├── hooks/              # Custom React hooks
│       ├── layouts/            # Mobile bottom-nav & desktop sidebar layouts
│       ├── locales/            # i18n JSON catalogs (en, ta, hi, te)
│       ├── pages/              # Healthcare pages (Dashboard, Records, Medicines, etc.)
│       ├── routes/             # App routing definitions
│       ├── services/           # API client and service endpoints
│       └── utils/              # Formatting, date, and validation helpers
└── server/                     # Backend REST API Server
    ├── config/                 # Environment and MongoDB configuration
    ├── controllers/            # Request handlers
    ├── integrations/           # Mock ABDM / ABHA & external service connectors
    ├── jobs/                   # Background tasks & deterministic reminders
    ├── middleware/             # Auth, error handling, rate limiting & logging
    ├── models/                 # Mongoose schemas (User, Document, Record, Medicine, etc.)
    ├── routes/                 # REST API endpoints
    ├── services/               # Healthcare business logic & AI Copilot layer
    ├── uploads/                # File storage for prescriptions and reports
    ├── utils/                  # Helper utilities
    └── validators/             # Request payload validators
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### 1. Server Setup
```bash
cd server
npm install
npm run dev
```
The server will start at `http://localhost:5000`. If a local MongoDB instance is not running, it automatically initializes an embedded in-memory MongoDB instance for seamless development.

### 2. Client Setup
```bash
cd client
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

---

## 🔒 Security & Privacy
- Zero hardcoded API keys; all configuration managed via `.env`.
- Explicit user consent history and access logs for all doctor/caregiver sharing.
- Strict emergency mode scoping: only vital signs, critical allergies, and emergency contacts are shared via Emergency QR cards.
