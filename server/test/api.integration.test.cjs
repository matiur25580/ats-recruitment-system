const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../dist/models/User').default;
const Job = require('../dist/models/Job').default;
const Application = require('../dist/models/Application').default;

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
  await Promise.all([User.init(), Job.init(), Application.init()]);

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

      const login = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'CANDIDATE.INTEGRATION@example.test', password: 'StrongPass123!' }),
      });
      assert.equal(login.response.status, 200);
      assert.equal(login.body.role, 'candidate');
      assert.ok(login.body.token);
      candidateToken = login.body.token;
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
      assert.equal(publicJobs.body.some((item) => item._id === job._id), false);

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

      application = await Application.create({
        job: job._id,
        candidate: candidate._id,
        status: 'Pending',
        resumePublicId: 'integration/private-resume',
        statusHistory: [{ status: 'Pending', changedBy: candidate._id, changedAt: new Date() }],
        recruiterNotes: [{ author: recruiter._id, note: 'Internal screening note', createdAt: new Date() }],
      });

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

      const recruiterApps = await request(`/api/applications/${job._id}`, { headers: bearer(recruiterToken) });
      assert.equal(recruiterApps.response.status, 200);
      assert.equal(recruiterApps.body[0].recruiterNotes[0].note, 'Internal screening note');

      const otherRecruiterApps = await request(`/api/applications/${job._id}`, { headers: bearer(otherRecruiterToken) });
      assert.equal(otherRecruiterApps.response.status, 403);

      const candidateResume = await request(`/api/applications/${application._id}/resume`, { headers: bearer(candidateToken) });
      assert.equal(candidateResume.response.status, 200);
      assert.ok(candidateResume.body.url);
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
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  }
});
