const test = require('node:test');
const assert = require('node:assert/strict');
const { sendEmail, configureMailerTransport } = require('../dist/utils/mailer');
process.env.EMAIL_USER = 'noreply@example.test';

test('email delivery validates input, retries transient SMTP errors once, and reports failure', async () => {
  let calls = 0;
  configureMailerTransport({
    sendMail: async () => {
      calls += 1;
      if (calls === 1) throw new Error('temporary SMTP outage');
      return { messageId: 'test-message' };
    },
  });

  assert.equal(await sendEmail('invalid-address', 'Subject', 'Body'), false);
  assert.equal(calls, 0);
  assert.equal(await sendEmail('candidate@example.test', 'Application update', 'Status changed'), true);
  assert.equal(calls, 2);

  calls = 0;
  configureMailerTransport({
    sendMail: async () => {
      calls += 1;
      throw new Error('SMTP unavailable');
    },
  });
  assert.equal(await sendEmail('candidate@example.test', 'Application update', 'Status changed'), false);
  assert.equal(calls, 2);
  configureMailerTransport(null);
});
