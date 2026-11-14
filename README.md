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
- Secure candidate registration and sign-in.
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

## Screens and design

The interface uses a responsive SaaS workspace layout with:
- A focused sign-in and candidate registration experience.
- A role-aware dashboard with metrics, charts and job cards.
- A candidate profile editor with completion progress and resume controls.
- Responsive navigation and layouts for smaller screens.
- Accessible form labels, keyboard focus states and feedback messages.

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
| AI analysis | Google Gemini API, pdf-parse |
| Email | Nodemailer (Gmail SMTP configuration) |
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
│       ├── models/         # User, Job and Application schemas
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

# Optional: email notifications (Gmail app password, not your normal password)
EMAIL_USER=
EMAIL_PASS=
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

Protected endpoints expect:

```http
Authorization: Bearer <your-jwt>
```

## Security and privacy

- Public registration always creates a **candidate** account. The server ignores any role supplied by a public client.
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

### Backend (`server`)

| Command | Description |
|---|---|
| `npm run dev` | Start the TypeScript API in development |
| `npm run build` | Compile TypeScript into `server/dist` |
| `npm start` | Start the compiled API |

> **Testing status:** the backend `test` script is currently a placeholder and no automated backend test suite is configured yet. The CI workflow currently installs dependencies, compiles the backend, lints the frontend and builds the frontend. A passing CI build is not the same as a full end-to-end test against a live MongoDB/Cloudinary/Gemini environment.

## Current limitations and next improvements

The current implementation provides the core candidate and recruiter journey. A deeper product audit identified these valuable next steps:

1. **Automated tests** — backend unit/integration tests, API authorization tests and frontend component tests.
2. **Password recovery and email verification** — secure, expiring, single-use tokens and account verification.
3. **Job lifecycle management** — edit, close/reopen, archive and expiry dates for job posts.
4. **Job search upgrades** — server-side filters, sorting, pagination and location/experience filters.
5. **Application timeline** — audit history of status changes, timestamps and recruiter notes.
6. **Recruiter/admin separation** — a dedicated admin experience for managing recruiter accounts and platform-level metrics.
7. **Candidate engagement** — saved jobs, application withdrawal and notification preferences.
8. **Production hardening** — rate limiting, structured request logging, centralized error handling, security headers and stronger observability.

These are proposed improvements, not features currently claimed as implemented.

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
