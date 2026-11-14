# Backend API integration tests

The integration suite uses a real MongoDB instance and the built Express application. It does not use the production database or real Cloudinary/SMTP credentials.

## Run locally

From the `server` directory:

```bash
npm ci
npm run build
MONGO_URI=mongodb://127.0.0.1:27017/hireflow_integration_test \
JWT_SECRET=integration-test-secret-at-least-32-characters \
CLOUDINARY_CLOUD_NAME=test-cloud \
CLOUDINARY_API_KEY=123456789 \
CLOUDINARY_API_SECRET=test-cloudinary-secret \
npm test
```

Use a dedicated disposable test database. The integration suite drops that database when it finishes.

## Coverage

- Public registration cannot assign privileged roles; duplicate registration and login behavior
- Bearer token validation and role-based endpoint restrictions
- Recruiter job creation, ownership checks, job closing, and rejection of applications to closed jobs
- Duplicate application prevention before external resume storage is called
- Candidate response privacy (no recruiter notes or private storage identifiers)
- Recruiter-only application visibility and note creation
- Application and candidate-profile resume upload flows using a deterministic Cloudinary SDK stub, private download URL generation, and profile resume deletion
- Admin-only paginated audit feed and safe activity metadata
- SMTP input validation, transient retry and permanent failure behavior using a fake transport
- Resume download authorization for the candidate and owning recruiter, with unrelated recruiters denied
- Application status history, idempotent updates, allowed transitions, and candidate write denial

Cloudinary is replaced with a deterministic SDK stub: tests exercise the upload controller, validation, persistence, authorization, URL generation and cleanup paths, but do not contact a real Cloudinary account or download a real remote file. SMTP retry behavior is tested with an injected fake transport; live delivery is not attempted. Gemini is not invoked against a live API, and the integration test deliberately uses a minimal PDF fixture to verify graceful AI unavailability.
