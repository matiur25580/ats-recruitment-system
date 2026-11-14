const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../dist/models/User').default;
const Job = require('../dist/models/Job').default;
const Application = require('../dist/models/Application').default;
const AuditLog = require('../dist/models/AuditLog').default;
const cloudinary = require('../dist/config/cloudinary').default;
const mailer = require('../dist/utils/mailer');
let capturedResetEmail = null;
mailer.configureMailerTransport({ sendMail: async (options) => { capturedResetEmail = options; return { messageId: 'integration-message' }; } });
process.env.EMAIL_USER = process.env.EMAIL_USER || 'noreply@example.test';
process.env.CLIENT_URL = 'http://localhost:5173';

// Deterministic Cloudinary SDK contract stub: the application route, validation, persistence and URL signing are exercised without external credentials.
let cloudinaryUploadCount = 0;
const destroyedCloudinaryIds = [];
cloudinary.uploader.upload_stream = (_options, callback) => ({ end: (_buffer) => callback(null, { public_id: `integration/private-resume-${++cloudinaryUploadCount}` }) });
cloudinary.uploader.destroy = async (publicId) => { destroyedCloudinaryIds.push(publicId); return { result: 'ok' }; };
cloudinary.utils.private_download_url = () => 'https://download.example.test/signed-resume';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret-at-least-32-characters';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '123456789';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test-cloudinary-secret';

const { app } = require('../dist/server');
let server;
let baseUrl;
let candidate;
let recruiter;
let otherRecruiter;
let candidateToken;
let recruiterToken;
let otherRecruiterToken;
let job;
let application;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
};

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

test('MongoDB-backed API integration: auth, roles, job ownership, applications and private data', async (t) => {
  assert.ok(process.env.MONGO_URI, 'MONGO_URI must point to an isolated test database');
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.init(), Job.init(), Application.init(), AuditLog.init()]);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await t.test('public registration always creates a candidate and login issues a usable token', async () => {
      const registered = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: 'Integration Candidate', email: 'candidate.integration@example.test', password: 'StrongPass123!', role: 'admin' }),
      });
      assert.equal(registered.response.status, 201);
      assert.equal(registered.body.role, 'candidate');
      assert.ok(registered.body.token);
      candidate = await User.findOne({ email: 'candidate.integration@example.test' });
      candidateToken = registered.body.token;

      const duplicate = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: 'Duplicate', email: 'candidate.integration@example.test', password: 'StrongPass123!' }),
      });
      assert.equal(duplicate.response.status, 409);
      assert.equal(duplicate.body.message, 'This email is already registered. Please log in.');

      const login = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'CANDIDATE.INTEGRATION@example.test', password: 'StrongPass123!' }),
      });
      assert.equal(login.response.status, 200);
      assert.equal(login.body.role, 'candidate');
      assert.ok(login.body.token);
      candidateToken = login.body.token;

      const unknownEmail = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: 'not.registered@example.test', password: 'StrongPass123!' }),
      });
      assert.equal(unknownEmail.response.status, 404);
      assert.equal(unknownEmail.body.message, 'This email does not exist. Please register first.');

      const wrongPassword = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: 'candidate.integration@example.test', password: 'WrongPass123!' }),
      });
      assert.equal(wrongPassword.response.status, 401);
      assert.equal(wrongPassword.body.message, 'Incorrect password. Please try again.');
    });

    await t.test('missing, malformed and wrong-role credentials are rejected', async () => {
      const missing = await request('/api/jobs/mine');
      assert.equal(missing.response.status, 401);
      const invalid = await request('/api/jobs/mine', { headers: bearer('not-a-jwt') });
      assert.equal(invalid.response.status, 401);
      const candidateCreate = await request('/api/jobs', {
        method: 'POST', headers: bearer(candidateToken),
        body: JSON.stringify({ title: 'Forbidden', description: 'No', location: 'Remote', salary: 1, jobType: 'Full-time', experienceLevel: 'Entry' }),
      });
      assert.equal(candidateCreate.response.status, 403);
    });

    await t.test('recruiter can create and manage only their own jobs', async () => {
      recruiter = await User.create({ name: 'Recruiter One', email: 'recruiter.integration@example.test', password: 'StrongPass123!', role: 'recruiter' });
      otherRecruiter = await User.create({ name: 'Recruiter Two', email: 'other.recruiter.integration@example.test', password: 'StrongPass123!', role: 'recruiter' });
      const login = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: recruiter.email, password: 'StrongPass123!' }),
      });
      assert.equal(login.response.status, 200);
      recruiterToken = login.body.token;
      const otherLogin = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: otherRecruiter.email, password: 'StrongPass123!' }),
      });
      otherRecruiterToken = otherLogin.body.token;

      const created = await request('/api/jobs', {
        method: 'POST', headers: bearer(recruiterToken),
        body: JSON.stringify({ title: 'Integration Engineer', description: 'Build reliable systems', location: 'Remote', salary: 90000, jobType: 'Full-time', experienceLevel: 'Mid' }),
      });
      assert.equal(created.response.status, 201);
      job = created.body;
      assert.equal(String(job.recruiter), String(recruiter._id));

      const paginatedJobs = await request('/api/jobs?page=1&limit=1&q=Integration&jobType=Full-time');
      assert.equal(paginatedJobs.response.status, 200);
      assert.equal(paginatedJobs.body.items.length, 1);
      assert.equal(paginatedJobs.body.pagination.total, 1);
      assert.equal(paginatedJobs.body.pagination.page, 1);

      const recruiterJobs = await request('/api/jobs/mine?page=1&limit=1&q=Integration&status=Open', { headers: bearer(recruiterToken) });
      assert.equal(recruiterJobs.response.status, 200);
      assert.equal(recruiterJobs.body.items.length, 1);
      assert.equal(recruiterJobs.body.pagination.total, 1);

      const forbiddenEdit = await request(`/api/jobs/${job._id}`, {
        method: 'PUT', headers: bearer(otherRecruiterToken),
        body: JSON.stringify({ title: 'Hijacked', description: 'No', location: 'Remote', salary: 1, jobType: 'Full-time', experienceLevel: 'Entry' }),
      });
      assert.equal(forbiddenEdit.response.status, 403);

      const closed = await request(`/api/jobs/${job._id}/status`, {
        method: 'PATCH', headers: bearer(recruiterToken), body: JSON.stringify({ status: 'Closed' }),
      });
      assert.equal(closed.response.status, 200);
      assert.equal(closed.body.job.status, 'Closed');
      const publicJobs = await request('/api/jobs');
      assert.equal(publicJobs.response.status, 200);
      assert.equal(publicJobs.body.items.some((item) => item._id === job._id), false);

      const closedApplyForm = new FormData();
      closedApplyForm.append('resume', new Blob([Buffer.from('%PDF-1.7 test')], { type: 'application/pdf' }), 'resume.pdf');
      const closedApply = await request(`/api/applications/${job._id}`, {
        method: 'POST', headers: bearer(candidateToken), body: closedApplyForm,
      });
      assert.equal(closedApply.response.status, 409);
    });

    await t.test('recruiter application access, notes privacy and resume authorization are enforced', async () => {
      const reopened = await request(`/api/jobs/${job._id}/status`, {
        method: 'PATCH', headers: bearer(recruiterToken), body: JSON.stringify({ status: 'Open' }),
      });
      assert.equal(reopened.response.status, 200);

      const applicationForm = new FormData();
      applicationForm.append('resume', new Blob([Buffer.from('%PDF-1.7 test resume')], { type: 'application/pdf' }), 'resume.pdf');
      applicationForm.append('coverLetter', 'Integration test cover letter');
      const submitted = await request(`/api/applications/${job._id}`, {
        method: 'POST', headers: bearer(candidateToken), body: applicationForm,
      });
      assert.equal(submitted.response.status, 201);
      application = await Application.findById(submitted.body.application._id);
      assert.equal(application.resumePublicId, 'integration/private-resume-1');
      assert.equal(application.aiAnalysisStatus, 'unavailable');
      application.recruiterNotes.push({ author: recruiter._id, note: 'Internal screening note', createdAt: new Date() });
      await application.save();

      const duplicateForm = new FormData();
      duplicateForm.append('resume', new Blob([Buffer.from('%PDF-1.7 test')], { type: 'application/pdf' }), 'resume.pdf');
      const duplicateApply = await request(`/api/applications/${job._id}`, {
        method: 'POST', headers: bearer(candidateToken), body: duplicateForm,
      });
      assert.equal(duplicateApply.response.status, 400);

      const candidateApps = await request('/api/applications/my-applications', { headers: bearer(candidateToken) });
      assert.equal(candidateApps.response.status, 200);
      assert.equal(candidateApps.body.length, 1);
      assert.equal(Object.hasOwn(candidateApps.body[0], 'recruiterNotes'), false);
      assert.equal(Object.hasOwn(candidateApps.body[0], 'resumePublicId'), false);

      const recruiterApps = await request(`/api/applications/${job._id}`, { headers: bearer(recruiterToken) });
      assert.equal(recruiterApps.response.status, 200);
      assert.equal(recruiterApps.body.items[0].recruiterNotes[0].note, 'Internal screening note');

      const filteredApplicants = await request(`/api/applications/${job._id}?page=1&limit=1&q=Integration&status=Pending`, { headers: bearer(recruiterToken) });
      assert.equal(filteredApplicants.response.status, 200);
      assert.equal(filteredApplicants.body.items.length, 1);
      assert.equal(filteredApplicants.body.pagination.total, 1);

      const otherRecruiterApps = await request(`/api/applications/${job._id}`, { headers: bearer(otherRecruiterToken) });
      assert.equal(otherRecruiterApps.response.status, 403);

      const candidateResume = await request(`/api/applications/${application._id}/resume`, { headers: bearer(candidateToken) });
      assert.equal(candidateResume.response.status, 200);
      assert.equal(candidateResume.body.url, 'https://download.example.test/signed-resume');
      assert.ok(candidateResume.body.expiresAt > Math.floor(Date.now() / 1000));
      const unauthorizedResume = await request(`/api/applications/${application._id}/resume`, { headers: bearer(otherRecruiterToken) });
      assert.equal(unauthorizedResume.response.status, 403);
    });

    await t.test('status history is appended once and recruiter notes are recruiter-only', async () => {
      const updated = await request(`/api/applications/${application._id}/status`, {
        method: 'PUT', headers: bearer(recruiterToken), body: JSON.stringify({ status: 'Reviewed' }),
      });
      assert.equal(updated.response.status, 200);
      assert.equal(updated.body.application.statusHistory.length, 2);

      const repeated = await request(`/api/applications/${application._id}/status`, {
        method: 'PUT', headers: bearer(recruiterToken), body: JSON.stringify({ status: 'Reviewed' }),
      });
      assert.equal(repeated.response.status, 200);
      assert.equal(repeated.body.application.statusHistory.length, 2);

      const accepted = await request(`/api/applications/${application._id}/status`, {
        method: 'PUT', headers: bearer(recruiterToken), body: JSON.stringify({ status: 'Accepted' }),
      });
      assert.equal(accepted.response.status, 200);
      assert.equal(accepted.body.application.statusHistory.length, 3);

      const invalidTransition = await request(`/api/applications/${application._id}/status`, {
        method: 'PUT', headers: bearer(recruiterToken), body: JSON.stringify({ status: 'Reviewed' }),
      });
      assert.equal(invalidTransition.response.status, 409);

      const candidateStatusChange = await request(`/api/applications/${application._id}/status`, {
        method: 'PUT', headers: bearer(candidateToken), body: JSON.stringify({ status: 'Rejected' }),
      });
      assert.equal(candidateStatusChange.response.status, 403);

      const invalidNote = await request(`/api/applications/${application._id}/notes`, {
        method: 'POST', headers: bearer(recruiterToken), body: JSON.stringify({ note: '   ' }),
      });
      assert.equal(invalidNote.response.status, 400);

      const forbiddenNote = await request(`/api/applications/${application._id}/notes`, {
        method: 'POST', headers: bearer(otherRecruiterToken), body: JSON.stringify({ note: 'Should not be saved' }),
      });
      assert.equal(forbiddenNote.response.status, 403);

      const addedNote = await request(`/api/applications/${application._id}/notes`, {
        method: 'POST', headers: bearer(recruiterToken), body: JSON.stringify({ note: '  Interview shortlist  ' }),
      });
      assert.equal(addedNote.response.status, 201);
      assert.equal(addedNote.body.notes.at(-1).note, 'Interview shortlist');
    });

    await t.test('candidate profile resume upload, private download and deletion use private storage', async () => {
      const profileForm = new FormData();
      profileForm.append('resume', new Blob([Buffer.from('%PDF-1.7 profile resume')], { type: 'application/pdf' }), 'profile-resume.pdf');
      const uploaded = await request('/api/profile/resume', {
        method: 'POST', headers: bearer(candidateToken), body: profileForm,
      });
      assert.equal(uploaded.response.status, 200);
      assert.equal(uploaded.body.resumeFileName, 'profile-resume.pdf');

      const profile = await request('/api/profile', { headers: bearer(candidateToken) });
      assert.equal(profile.response.status, 200);
      assert.equal(profile.body.hasResume, true);
      assert.equal(Object.hasOwn(profile.body, 'resumePublicId'), false);

      const download = await request('/api/profile/resume', { headers: bearer(candidateToken) });
      assert.equal(download.response.status, 200);
      assert.equal(download.body.url, 'https://download.example.test/signed-resume');

      const deleted = await request('/api/profile/resume', { method: 'DELETE', headers: bearer(candidateToken) });
      assert.equal(deleted.response.status, 200);
      assert.ok(destroyedCloudinaryIds.includes('integration/private-resume-2'));
    });

    await t.test('password recovery uses one-time expiring tokens and revokes existing sessions', async () => {
      const recoveryUser = await User.create({ name: 'Recovery User', email: 'recovery.integration@example.test', password: 'OriginalPass123!', role: 'candidate' });
      const originalLogin = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: recoveryUser.email, password: 'OriginalPass123!' }),
      });
      assert.equal(originalLogin.response.status, 200);

      const requested = await request('/api/auth/forgot-password', {
        method: 'POST', body: JSON.stringify({ email: recoveryUser.email }),
      });
      assert.equal(requested.response.status, 200);
      assert.match(requested.body.message, /If an account exists/);
      assert.ok(capturedResetEmail?.text);
      const resetUrl = capturedResetEmail.text.match(/http:\/\/localhost:5173\/reset-password\?token=([a-f0-9]+)/)?.[0];
      assert.ok(resetUrl, 'reset email should contain a frontend reset URL');
      const resetToken = new URL(resetUrl).searchParams.get('token');

      const reset = await request('/api/auth/reset-password', {
        method: 'POST', body: JSON.stringify({ token: resetToken, password: 'NewStrongPass123!' }),
      });
      assert.equal(reset.response.status, 200);

      const oldSession = await request('/api/jobs/mine', { headers: bearer(originalLogin.body.token) });
      assert.equal(oldSession.response.status, 401);
      const newLogin = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: recoveryUser.email, password: 'NewStrongPass123!' }),
      });
      assert.equal(newLogin.response.status, 200);

      const reused = await request('/api/auth/reset-password', {
        method: 'POST', body: JSON.stringify({ token: resetToken, password: 'AnotherStrong123!' }),
      });
      assert.equal(reused.response.status, 400);

      const unknown = await request('/api/auth/forgot-password', {
        method: 'POST', body: JSON.stringify({ email: 'unknown.recovery@example.test' }),
      });
      assert.equal(unknown.response.status, 200);
      assert.equal(unknown.body.message, requested.body.message);
    });

    await t.test('admin audit feed is role-protected, paginated and contains safe action metadata', async () => {
      const recruiterDenied = await request('/api/admin/audit-logs', { headers: bearer(recruiterToken) });
      assert.equal(recruiterDenied.response.status, 403);

      const admin = await User.create({ name: 'Platform Admin', email: 'admin.integration@example.test', password: 'StrongPass123!', role: 'admin' });
      const login = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: admin.email, password: 'StrongPass123!' }),
      });
      assert.equal(login.response.status, 200);
      const auditResponse = await request('/api/admin/audit-logs?page=1&limit=5', { headers: bearer(login.body.token) });
      assert.equal(auditResponse.response.status, 200);
      assert.ok(auditResponse.body.pagination.total >= 3);
      assert.ok(auditResponse.body.items.some((entry) => entry.action === 'application.status_changed'));
      assert.equal(Object.hasOwn(auditResponse.body.items[0] || {}, 'requestBody'), false);
    });
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  }
});
