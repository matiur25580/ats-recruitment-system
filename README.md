# ATS Recruitment System

A full-stack applicant tracking system for candidates and recruiters.

## Local development

1. Install dependencies in both `server` and `client`.
2. Create `server/.env` using the variables below.
3. Start the API with `npm run dev` from `server`.
4. Start the web client with `npm run dev` from `client`.

### Backend environment

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWTs; use at least 32 characters |
| `PORT` | No | API port (defaults to `5000`) |
| `CORS_ORIGIN` | No | Comma-separated allowed browser origins (defaults to `http://localhost:5173`) |
| `CLOUDINARY_CLOUD_NAME` | For resume storage | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For resume storage | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For resume storage | Cloudinary API secret |

### Frontend environment

Set `VITE_API_URL` only when the API is hosted at a different origin, for example `https://api.example.com/api`. When omitted, the client uses the relative `/api` path, which is proxied to the local API by the Vite development server.

## Security notes

- Public registration always creates a candidate account. Privileged roles must be assigned through a trusted administrative process.
- Keep `.env` files and production secrets out of source control.
- Configure `CORS_ORIGIN` to the exact deployed frontend origin(s) before production deployment.
- AI resume matching is an assistive signal and should not be used as the sole basis for hiring decisions.
