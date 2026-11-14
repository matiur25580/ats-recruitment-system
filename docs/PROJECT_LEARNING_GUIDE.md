# ATS Project Learning & Interview Guide

> This guide explains the architecture currently implemented in this repository. Read it alongside the source files; the source code remains the final authority if implementation details change.

## 1. What this project does

This is an Applicant Tracking System (ATS). Candidates can create an account, maintain a professional profile, upload a resume, browse jobs and apply. Recruiters can publish jobs, review applications, access candidate resumes and update application statuses. Resume-to-job matching is an AI-assisted signal only; it is not an automatic hiring decision.

## 2. Architecture at a glance

```text
React + TypeScript (client)
        |
        | Axios HTTP requests + JWT Bearer token
        v
Express + TypeScript (server)
        |
        +--> Routes --> Authentication middleware --> Role middleware
        |                                      |
        |                                      v
        |                                  Controllers
        |                                      |
        +--------------------------------------+
                         |
             +-----------+-----------+
             v           v           v
          MongoDB    Cloudinary    Gemini AI
          (Mongoose) (private PDF) (advisory analysis)
                         |
                       Email
                    (Nodemailer)
```

### Main folders

| Path | Responsibility |
|---|---|
| `client/src/pages` | Login, registration, dashboard and candidate profile screens |
| `client/src/services/api.ts` | Shared Axios instance and JWT request interceptor |
| `server/src/routes` | Maps HTTP methods/URLs to middleware and controllers |
| `server/src/middlewares` | Authentication and role-based authorization |
| `server/src/controllers` | Request validation and application business logic |
| `server/src/models` | MongoDB document schemas and model behavior |
| `server/src/config` | External service configuration |
| `server/src/utils` | Reusable JWT, AI and email helpers |

## 3. Request lifecycle

1. A user performs an action in a React page.
2. The page calls the shared Axios client in `client/src/services/api.ts`.
3. The request interceptor reads the saved JWT and adds `Authorization: Bearer <token>`.
4. Express receives the request at the matching route.
5. `protect` verifies the JWT and loads the current user from MongoDB.
6. `authorizeRoles(...)` checks whether that user role is allowed for the route.
7. The controller validates request data, runs the business operation and returns JSON.
8. React updates state and displays success/error feedback.

**Important interview distinction:** client-side route guards improve the user experience, but they are not security. Real access control happens on the server in middleware and controllers.

## 4. Authentication and authorization

- Registration and login are public routes under `/api/auth`.
- Public registration must create candidate accounts only. A browser must not be trusted to assign recruiter/admin privileges.
- The User model hashes a password with bcrypt in a Mongoose pre-save hook when the password changes.
- Login compares the submitted password with the stored bcrypt hash; hashes are not decrypted.
- The server signs a JWT containing the user ID. The client sends it on protected requests.
- `protect` verifies the token and reloads the account, so controllers use the current database user rather than trusting a role sent by the browser.
- `authorizeRoles` is role-based authorization (RBAC): a route explicitly lists allowed roles.

Authentication answers **“Who are you?”** Authorization answers **“What are you allowed to do?”**

## 5. Main data relationships

- **User**: account identity, role, candidate profile fields, skills, experience, education and resume metadata.
- **Job**: job description, requirements, location, salary, type, experience level and recruiter reference.
- **Application**: references one Job and one candidate User; stores status, cover letter, private resume identifier and optional AI analysis.
- A compound unique index on `{ job, candidate }` prevents duplicate applications at the database level.

Mongoose schemas describe document shape and validation. ObjectId references connect related documents. `populate()` loads selected fields from a referenced document when a response needs them.

## 6. Candidate and recruiter workflows

### Candidate
1. Register and log in.
2. Complete profile details, skills, work experience and education.
3. Upload a PDF resume.
4. Browse published jobs.
5. Apply with a resume and optional cover letter.
6. View submitted applications and their current statuses.

### Recruiter
1. Log in with a recruiter account provisioned through a trusted process.
2. Create jobs; each job stores the authenticated recruiter's ID as its owner.
3. View applications belonging to their own jobs.
4. Access a resume only when they own the relevant job.
5. Change application status to Pending, Reviewed, Accepted or Rejected.

## 7. Resume storage and access

- Multer accepts a bounded PDF upload into memory; the controller also checks the PDF signature.
- Resume files are stored as private raw resources in Cloudinary.
- MongoDB stores the Cloudinary public ID as a private field excluded from normal queries.
- A candidate can access their own profile resume. A recruiter can access an application resume only for a job they own.
- The API creates a short-lived signed download URL rather than exposing a permanent public file URL.
- Replacing/deleting a resume updates the database reference and cleans up the old Cloudinary resource.

**Why private storage?** A resume contains personal information. A random or hard-to-guess URL is not a substitute for authorization.

## 8. AI resume analysis

The AI helper extracts text from the PDF and sends bounded resume/job data to Gemini. It asks for a JSON response containing a 0–100 match score and a short summary, then validates the response before returning it.

The AI result is advisory. It can be unavailable if parsing, configuration or the AI provider fails. The hiring decision remains with the recruiter. The prompt also tells the model to treat resume/job text as data rather than instructions and not to use protected characteristics.

## 9. Useful concepts to explain in an interview

| Concept | Simple explanation |
|---|---|
| React state | Data that changes on screen and causes the component to render again |
| `useEffect` | Runs side effects such as loading profile data after a component mounts |
| Axios interceptor | Shared hook that modifies requests before they are sent |
| REST API | HTTP endpoints representing resources and actions |
| Middleware | Function that runs between receiving a request and reaching its controller |
| JWT | Signed token that carries identity claims between client and server |
| bcrypt | One-way password hashing algorithm designed for password storage |
| RBAC | Access control based on a user's role |
| Mongoose | ODM that maps JavaScript/TypeScript objects to MongoDB documents |
| Unique compound index | Database rule that prevents duplicate combinations of field values |
| Multer | Express middleware for handling multipart file uploads |
| Signed URL | Time-limited URL granting access to a private stored file |
| Environment variable | Runtime configuration/secret kept outside committed source code |
| CI | Automated checks that run when code is pushed |

## 10. Interview-ready project explanation

“I built an Applicant Tracking System with a React and TypeScript frontend and an Express/TypeScript backend. MongoDB with Mongoose stores users, jobs and applications. The system has candidate and recruiter workflows. Authentication uses bcrypt password hashing and JWT bearer tokens. Server middleware verifies the current user and applies role-based access control before controllers execute. Candidates maintain profiles and upload PDF resumes to private Cloudinary storage. Recruiters can manage their own jobs and review applications. The application can request an advisory AI resume-to-job analysis, while the final hiring decision remains human-controlled. The frontend uses a shared Axios client to communicate with the REST API.”

## 11. How to study the code

Follow this order so each concept builds on the previous one:

1. `client/src/main.tsx` → `client/src/App.tsx`: how React starts and routes work.
2. `client/src/services/api.ts`: how the browser calls the backend and attaches JWTs.
3. `server/src/server.ts`: how Express, middleware and routers are connected.
4. `server/src/routes`: how URLs, HTTP methods and access rules are mapped.
5. `server/src/middlewares`: how identity and roles are checked.
6. `server/src/controllers/authController.ts`: registration/login lifecycle.
7. `server/src/models/User.ts`, `Job.ts`, `Application.ts`: how data is stored and related.
8. `server/src/controllers/applicationController.ts`: the complete apply/review workflow.
9. `server/src/controllers/profileController.ts` and `client/src/pages/CandidateProfile.tsx`: profile and resume flow.
10. `server/src/utils/aiService.ts`, `mailer.ts`, `config/cloudinary.ts`: external integrations.

## 12. Comment and configuration conventions

- TypeScript/JavaScript: use `//` for a short explanation and `/* ... */` for a section/file note.
- JSX inside rendered markup: use `{/* ... */}`; ordinary `//` is not valid as a JSX child.
- CSS: use `/* ... */`.
- YAML workflow files: use `#`.
- JSON files (including `package.json`, lockfiles and `tsconfig.json`) do not support comments. Their meaning should be documented in Markdown instead.
- Comments explain **why** a decision exists or a concept works; they should not repeat obvious syntax or become stale copies of the code.
