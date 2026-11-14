const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidEmail, isValidPassword, isValidPdfBuffer } = require('../dist/utils/validation');

test('email validation accepts a conventional address', () => {
  assert.equal(isValidEmail('candidate@example.com'), true);
});

test('email validation rejects malformed addresses and whitespace', () => {
  for (const value of ['not-an-email', 'candidate@', '@example.com', 'candidate @example.com', '']) {
    assert.equal(isValidEmail(value), false, value);
  }
});

test('password validation enforces the minimum length', () => {
  assert.equal(isValidPassword('1234567'), false);
  assert.equal(isValidPassword('12345678'), true);
});

test('PDF validation checks the file signature, not only the MIME type', () => {
  assert.equal(isValidPdfBuffer(Buffer.from('%PDF-1.7\\nbody')), true);
  assert.equal(isValidPdfBuffer(Buffer.from('not a PDF')), false);
  assert.equal(isValidPdfBuffer(Buffer.from('%PD')), false);
});
