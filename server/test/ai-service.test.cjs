const test = require('node:test');
const assert = require('node:assert/strict');
const { getGeminiModelName } = require('../dist/utils/aiService');

test('AI uses a supported Gemini Flash model by default', () => {
  const previous = process.env.GEMINI_MODEL;
  delete process.env.GEMINI_MODEL;
  assert.equal(getGeminiModelName(), 'gemini-3.5-flash-lite');
  if (previous === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = previous;
});

test('AI model can be configured without a code change', () => {
  const previous = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = 'gemini-custom-deployment-model';
  assert.equal(getGeminiModelName(), 'gemini-custom-deployment-model');
  if (previous === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = previous;
});
