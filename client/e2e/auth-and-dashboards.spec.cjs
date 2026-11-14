const { test, expect } = require('@playwright/test');

const candidate = { _id: 'candidate-e2e', name: 'E2E Candidate', email: 'candidate.e2e@example.test', role: 'candidate' };
const recruiter = { _id: 'recruiter-e2e', name: 'E2E Recruiter', email: 'recruiter.e2e@example.test', role: 'recruiter' };

async function mockDashboardApi(page, role) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'POST' && url.pathname.endsWith('/jobs')) return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ _id: 'job-new', title: 'Platform Engineer' }) });
    if (url.pathname.endsWith('/jobs/mine') || url.pathname.endsWith('/jobs')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        items: role === 'candidate' ? [{ _id: 'job-1', title: 'Frontend Engineer', description: 'Build accessible products', location: 'Remote', salary: 80000, jobType: 'Full-time', status: 'Open' }] : [],
        pagination: { page: 1, limit: 12, total: role === 'candidate' ? 1 : 0, totalPages: 1 },
      }) });
    }
    if (url.pathname.endsWith('/applications/my-applications')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (route.request().method() === 'POST' && url.pathname.endsWith('/applications/job-1')) return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: 'Application submitted successfully', application: { _id: 'application-1' } }) });
    if (url.pathname.endsWith('/stats/recruiter')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totalJobs: 0, totalApplications: 0, averageMatchScore: 0, statusData: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('login and registration screens render without horizontal overflow on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('login-mobile.png'), fullPage: true });

  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('registration-mobile.png'), fullPage: true });
});

test('duplicate registration displays the API validation message', async ({ page }) => {
  await page.route('**/api/auth/register', route => route.fulfill({
    status: 409, contentType: 'application/json',
    body: JSON.stringify({ message: 'This email is already registered. Please log in.' }),
  }));
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Existing Candidate');
  await page.getByLabel('Email address').fill('existing@example.test');
  await page.locator('input[autocomplete="new-password"]').fill('StrongPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('This email is already registered. Please log in.')).toBeVisible();
});

test('unknown email login displays a clear registration message', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({
    status: 404, contentType: 'application/json',
    body: JSON.stringify({ message: 'This email does not exist. Please register first.' }),
  }));
  await page.goto('/login');
  await page.getByLabel('Email address').fill('unknown@example.test');
  await page.locator('input[autocomplete="current-password"]').fill('StrongPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('This email does not exist. Please register first.')).toBeVisible();
});

test('forgot and reset password screens are usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/api/auth/forgot-password', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ message: 'If an account exists for this email, password reset instructions will be sent shortly.' }),
  }));
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('candidate@example.test');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/If an account exists for this email/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

  await page.route('**/api/auth/reset-password', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ message: 'Your password has been reset successfully. Please sign in with your new password.' }),
  }));
  await page.goto('/reset-password?token=e2e-reset-token');
  await page.locator('input[autocomplete="new-password"]').nth(0).fill('NewStrongPass123!');
  await page.locator('input[autocomplete="new-password"]').nth(1).fill('NewStrongPass123!');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('candidate dashboard loads job discovery and application workspace', async ({ page }, testInfo) => {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, candidate);
  await mockDashboardApi(page, 'candidate');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Your next opportunity starts here.' })).toBeVisible();
  await expect(page.getByText('Frontend Engineer')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My applications' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('candidate-dashboard.png'), fullPage: true });
});

test('recruiter dashboard loads hiring workspace and opens the job form', async ({ page }, testInfo) => {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, recruiter);
  await mockDashboardApi(page, 'recruiter');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Build your next great team.' })).toBeVisible();
  await page.getByRole('button', { name: 'Post a new job' }).click();
  await expect(page.getByRole('heading', { name: 'Publish a new role' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('recruiter-dashboard-job-form.png'), fullPage: true });
});

test('successful candidate registration enters the candidate workspace', async ({ page }) => {
  await mockDashboardApi(page, 'candidate');
  await page.route('**/api/auth/register', route => route.fulfill({
    status: 201, contentType: 'application/json',
    body: JSON.stringify({ token: 'e2e-token', ...candidate }),
  }));
  await page.goto('/register');
  await page.getByLabel('Full name').fill(candidate.name);
  await page.getByLabel('Email address').fill(candidate.email);
  await page.locator('input[autocomplete="new-password"]').fill('StrongPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Your next opportunity starts here.' })).toBeVisible();
});

test('candidate can submit an application and sees success feedback', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, candidate);
  await mockDashboardApi(page, 'candidate');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Apply for this role' }).click();
  await page.getByLabel('Cover letter').fill('I am excited to apply for this role.');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'candidate-resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\\nHireFlow browser test resume'),
  });
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Application submitted successfully')).toBeVisible();
});

test('recruiter can publish a job and sees success feedback', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, recruiter);
  await mockDashboardApi(page, 'recruiter');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Post a new job' }).click();
  await page.getByLabel('Job title').fill('Platform Engineer');
  await page.getByLabel('Location').fill('Remote');
  await page.getByLabel('Salary').fill('95000');
  await page.getByLabel('Job description').fill('Build secure, scalable recruitment workflows.');
  await page.getByRole('button', { name: 'Publish job' }).click();
  await expect(page.getByText('Your job is now live')).toBeVisible();
});
