<div align="center">

# HireFlow — ATS Recruitment System

**A modern, AI-assisted Applicant Tracking System for candidate discovery and recruiter workflows.**

[![CI](https://github.com/matiur25580/ats-recruitment-system/actions/workflows/ci.yml/badge.svg?branch=upgrade%2Fats-complete-modern)](https://github.com/matiur25580/ats-recruitment-system/actions/workflows/ci.yml)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-43853d?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47a248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

</div>

---

## Overview

HireFlow brings the core recruitment journey into one workspace. Candidates can create a professional profile, upload a private PDF resume, discover open roles and track applications. Recruiters can publish jobs, review applicants, access resumes for their own vacancies and move applications through a simple hiring pipeline.

The platform includes **AI-assisted resume-to-job analysis** to provide an additional matching signal. AI output is advisory only: it does not make hiring decisions or replace human review.

## Product experience

### Candidate workspace
- Secure candidate registration and sign-in with duplicate-email checks and clear login feedback.
- Forgot/reset password flow using hashed, one-time tokens that expire after 30 minutes; password changes revoke existing sessions.
- Editable professional profile with headline, summary, location and contact details.
- Skills, work experience and education sections.
- Profile completion checklist.
- Private PDF resume upload, replacement, viewing and deletion.
- Job discovery, application submission and application status tracking.

### Recruiter workspace
- Recruiter dashboard with job and application metrics.
- Create job posts with role details, requirements, location, salary, job type and experience level.
- View applicants for recruiter-owned jobs.
- Open candidate resumes through short-lived private download links.
- Update application status: Pending, Reviewed, Accepted or Rejected.
- Email notifications for new applications and status changes when SMTP is configured.

### AI-assisted matching
- Extracts text from uploaded PDF resumes.
- Compares resume content with job description and requirements using Gemini.
- Returns a validated match score and concise summary.
- Fails gracefully when AI configuration or analysis is unavailable.

> **Responsible hiring:** AI match scores are decision-support signals, not objective measures of candidate quality. Recruiters must review applications themselves and should never rely on an AI score as the sole hiring criterion.

## People behind every great hire

The images below are illustrative portraits and workplace photography representing the two people who use HireFlow. They are **not application screenshots or real HireFlow users**.

### Candidate experience

| Discovering opportunities | Building a profile |
|---|---|
| <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate portrait, professional man" /> | <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate portrait, professional woman" /> |
| <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate portrait, smiling professional" /> | <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate portrait, confident professional" /> |
| <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate portrait, professional headshot" /> | <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate portrait, professional woman headshot" /> |
| <img src="https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate portrait in a workplace" /> | <img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=720&q=85" width="320" alt="Candidate collaborating with colleagues" /> |

### Recruiter experience

| Hiring conversations | Team collaboration |
|---|---|
| <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=720&q=85" width="320" alt="Recruiter professional portrait" /> | <img src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=720&q=85" width="320" alt="Recruiter discussing candidates with a colleague" /> |
| <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=720&q=85" width="320" alt="Recruitment team working together" /> | <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=720&q=85" width="320" alt="Hiring team collaborating at a table" /> |
| <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=720&q=85" width="320" alt="Recruiter team meeting" /> | <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=720&q=85" width="320" alt="Recruitment planning session" /> |
| <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=720&q=85" width="320" alt="Professional team discussion" /> | <img src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=720&q=85" width="320" alt="Colleagues in a collaborative workplace" /> |

### Product interface

The current UI is implemented in the `client/` application. Product screenshots will be added after a verified browser walkthrough so that the README never presents mockups as live application screens.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 3, custom CSS |
| Navigation | React Router |
| API client | Axios |
| UI feedback & icons | React Hot Toast, Lucide React |
| Charts | Recharts |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Resume storage | Cloudinary private raw resources |
| AI analysis | Google Gemini API, pdf-parse v2 |
| Email | Nodemailer (configurable SMTP with bounded retry) |
| CI | GitHub Actions |

## Architecture

```text
React + TypeScript
       |
       | Axios + JWT Bearer token
       v
Express REST API
       |
       +--> Routes
       |      |
       |      +--> JWT authentication middleware
       |      +--> Role-based authorization middleware
       |      +--> Controllers
       |
       +--> Mongoose / MongoDB
       +--> Cloudinary (private PDF resumes)
       +--> Gemini (optional AI analysis)
       +--> Nodemailer (optional email notifications)
```

### Repository structure

```text
.
├── client/
│   ├── public/
│   └── src/
│       ├── pages/          # Login, Register, Dashboard, CandidateProfile
│       ├── services/       # Shared Axios API client
│       ├── components/     # Legacy UI components; current routes use pages/
│       └── App.tsx         # Frontend routes and route guard
├── server/
│   └── src/
│       ├── config/         # Cloudinary configuration
│       ├── controllers/    # API business logic
│       ├── middlewares/    # JWT authentication and role checks
│       ├── models/         # User, Job, Application and AuditLog schemas
│       ├── routes/         # REST API route definitions
│       └── utils/          # AI, JWT and email helpers
├── docs/
│   └── PROJECT_LEARNING_GUIDE.md
└── .github/workflows/
    └── ci.yml
```

## Getting started

### Prerequisites

- Node.js 22 or a compatible supported release.
- npm.
- MongoDB database (local or hosted).
- Cloudinary account if you want resume upload and private file delivery.
- Gemini API key if you want AI resume analysis.
- Gmail app password / SMTP credentials if you want email notifications.

### 1. Clone the repository

```bash
git clone https://github.com/matiur25580/ats-recruitment-system.git
cd ats-recruitment-system
```

### 2. Install backend dependencies

```bash
cd server
npm ci
```

### 3. Configure backend environment

Create `server/.env`:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ats_recruitment
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
CORS_ORIGIN=http://localhost:5173

# Required only for private resume upload and download
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional: AI resume analysis
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite

# Optional: email notifications (SMTP credentials)
EMAIL_USER=
EMAIL_PASS=
# Optional generic SMTP provider (if omitted, Gmail service is used)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=
CLIENT_URL=http://localhost:5173
```

Keep real credentials private. Never commit `.env` files, API keys, database URLs or SMTP passwords.

### 4. Start the backend

From the `server` directory:

```bash
npm run dev
```

The API listens on port `5000` by default. Check the health endpoint:

```text
http://localhost:5000/health
```

### 5. Install and start the frontend

Open a second terminal:

```bash
cd client
npm ci
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). During local development, Vite proxies `/api` requests to `http://localhost:5000`.

### Frontend environment

Only set `client/.env` when the API is hosted at a different origin:

```dotenv
VITE_API_URL=https://your-api-domain.example/api
```

When omitted, the frontend uses the relative `/api` base path.

## API overview

All API paths below are mounted under `/api`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a candidate account |
| POST | `/auth/login` | Public | Sign in and receive a JWT |
| POST | `/auth/forgot-password` | Public | Request a one-time password reset email |
| POST | `/auth/reset-password` | Public | Reset password using an expiring one-time token |
| GET | `/jobs` | Public | List available job records |
| POST | `/jobs` | Recruiter | Create a job |
| POST | `/applications/:jobId` | Candidate | Apply with a PDF resume |
| GET | `/applications/my-applications` | Candidate | List own applications |
| GET | `/applications/:jobId` | Recruiter / owner | List applicants for an owned job |
| GET | `/applications/:appId/resume` | Candidate / owning recruiter | Get a short-lived resume download URL |
| PUT | `/applications/:appId/status` | Recruiter / owner | Update application status |
| GET | `/profile` | Candidate | Read own profile |
| PUT | `/profile` | Candidate | Update own profile |
| POST | `/profile/resume` | Candidate | Upload or replace own resume |
| GET | `/profile/resume` | Candidate | Get own resume download URL |
| DELETE | `/profile/resume` | Candidate | Remove own resume |
| GET | `/stats/recruiter` | Recruiter | Read recruiter dashboard metrics |
| GET | `/admin/overview` | Admin | Read platform-wide aggregate metrics |
| GET | `/admin/audit-logs` | Admin | Read paginated, filtered security/activity audit events |

Protected endpoints expect:

```http
Authorization: Bearer <your-jwt>
```

## Security and privacy

- Public registration always creates a **candidate** account. The server ignores any role supplied by a public client.
- Duplicate registration is rejected with a clear login prompt. Login distinguishes unknown email from an incorrect password as requested; this reveals account existence, so production deployments should retain strict rate limits and monitor authentication abuse.
- Password reset tokens are cryptographically random, stored only as SHA-256 hashes, expire after 30 minutes, are single-use, and increment a session version so previously issued JWTs stop working.
- Passwords are hashed with bcrypt before they are stored.
- JWTs are verified by server middleware; the current user is loaded from the database for protected requests.
- Role middleware restricts candidate and recruiter actions.
- Recruiter application access is scoped to jobs owned by that recruiter.
- Resume PDFs are stored as private Cloudinary resources. The API checks ownership before generating short-lived download links.
- Upload endpoints limit file size and verify PDF content signatures.
- Secrets belong in environment variables and deployment secret stores.
- Configure `CORS_ORIGIN` to the exact production frontend origin(s).

## Scripts and checks

### Frontend (`client`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build the production frontend |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production build locally |
| `npx playwright test` | Run desktop/mobile browser E2E tests (install `@playwright/test` and Chromium first) |

### Backend (`server`)

| Command | Description |
|---|---|
| `npm run dev` | Start the TypeScript API in development |
| `npm run build` | Compile TypeScript into `server/dist` |
| `npm start` | Start the compiled API |

 > **Testing status:** backend validation and MongoDB-backed API integration tests run in CI, alongside Playwright browser checks for login, registration, password recovery and candidate/recruiter dashboards on desktop and mobile viewports. Cloudinary, SMTP and Gemini provider calls are deliberately not faked as live checks in normal CI; use the manual production smoke workflow below with real secrets before deployment.

## Search, pagination and auditability

- Public jobs and recruiter-owned jobs use server-side pagination and search. Public filters include job type, experience level and location; recruiter listings support job status.
- Recruiter applicant lists support pagination, candidate name/email or cover-letter search, and application status filtering.
- Admins can view a paginated audit feed at `GET /api/admin/audit-logs`, with optional `action` and `entityType` filters.
- Audit events record job creation/updates/status changes, application submissions/status changes and recruiter notes. They store safe metadata only—not resume bytes, credentials or request bodies.
- SMTP can use Gmail via `EMAIL_USER` / `EMAIL_PASS`, or a generic provider via `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` and the same credentials. Delivery retries once; notification failure does not roll back a saved application or status.

## Production integration verification

The `Production integration smoke test` workflow is configured for manual dispatch. It uploads a temporary private PDF to Cloudinary, downloads it through a signed URL, sends that PDF through Gemini analysis, sends one test email through the configured SMTP provider, and checks the deployed API and frontend HTTP endpoints. The temporary Cloudinary object is deleted after the run. GitHub exposes manual dispatch after the workflow file exists on the repository's default branch; until this feature branch is merged, run the same script directly from `server/` after `npm ci` and `npm run build`.

Before running it, create a GitHub Actions environment named `production-smoke` and configure:

**Environment secrets**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY`
- `EMAIL_USER`
- `EMAIL_PASS`
- `SMOKE_TEST_EMAIL` — a mailbox you control; the workflow sends one test message here.

**Environment variables**
- `SMOKE_API_URL` — deployed API origin, e.g. `https://api.example.com` (the workflow checks `/health`).
- `SMOKE_FRONTEND_URL` — deployed frontend origin.
- `GEMINI_MODEL` — optional model override; defaults to `gemini-3.5-flash-lite`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM` — optional generic SMTP configuration; omit `SMTP_HOST` to use Gmail service configuration.

The smoke workflow intentionally requires real provider credentials and is manual to prevent accidental email sends or provider charges on every push. A successful SMTP handoff does not prove inbox placement or bounce handling; inspect the destination inbox and provider delivery logs as well.

## Remaining production-readiness work

The core candidate/recruiter workflows, job lifecycle, pagination, audit events, backend integration tests and desktop/mobile browser checks are implemented. Before treating this as a production deployment, these environment-specific items still require owner action or further validation:

1. Run the production integration smoke workflow with real Cloudinary, SMTP and Gemini credentials, then inspect the received email and provider logs.
2. Verify deployment-specific HTTPS, exact `CORS_ORIGIN`, `VITE_API_URL`, secure environment secrets and database connectivity.
3. Run load/performance testing against production-like infrastructure and validate MongoDB backup/restore.
4. Define monitoring, incident response, privacy retention and applicable compliance policies.
5. Add email verification, account lifecycle controls and optional MFA.

A green CI run proves the checked-in code builds and the automated tests pass; only a successful smoke run proves the configured external integrations answered the tested requests. Neither certifies legal/compliance readiness.

## Learning and interview preparation

A guided explanation of the project architecture, request lifecycle, data relationships, authentication, authorization, resume storage, AI analysis and interview-ready project summary is available here:

**[Read the ATS Project Learning & Interview Guide](docs/PROJECT_LEARNING_GUIDE.md)**

Suggested study order:
1. Frontend entry point and routes.
2. Shared Axios client and JWT flow.
3. Express bootstrap and API routes.
4. Authentication and role middleware.
5. Mongoose models and relationships.
6. Controllers and candidate/recruiter workflows.
7. Cloudinary, Gemini and email integrations.

## Contribution workflow

The active development branch for the current upgrade is `upgrade/ats-complete-modern`. Keep feature work on a dedicated branch and do not push directly to `main`.

Before opening a pull request:
1. Run the frontend lint and production build.
2. Run the backend TypeScript build.
3. Add or update tests for changed behavior.
4. Review authorization and ownership checks for every protected API.
5. Confirm that no secrets or personal resume data are committed.

## License

No license file is currently included. Contact the repository owner before redistributing or reusing this project.
