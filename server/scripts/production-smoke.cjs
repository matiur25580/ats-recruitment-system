const cloudinary = require('../dist/config/cloudinary').default;
const { analyzeResumeWithAI } = require('../dist/utils/aiService');
const { sendEmail } = require('../dist/utils/mailer');

const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'GEMINI_API_KEY', 'EMAIL_USER', 'EMAIL_PASS', 'SMOKE_TEST_EMAIL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  process.stderr.write(`Missing required production smoke secrets: ${missing.join(', ')}\n`);
  process.exit(2);
}

function createPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length 68 >>\nstream\nBT /F1 12 Tf 72 720 Td (HireFlow integration smoke test) Tj ET\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

async function uploadPrivatePdf(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'raw', type: 'private', use_filename: false, unique_filename: true, format: 'pdf',
    }, (error, result) => {
      if (error) reject(error);
      else if (!result?.public_id) reject(new Error('Cloudinary returned no public_id'));
      else resolve(result.public_id);
    });
    stream.end(buffer);
  });
}

async function main() {
  const results = [];
  const pdf = createPdf();
  let cloudinaryPublicId;

  try {
    cloudinaryPublicId = await uploadPrivatePdf(pdf);
    const signedUrl = cloudinary.utils.private_download_url(cloudinaryPublicId, 'pdf', {
      resource_type: 'raw', type: 'private', expires_at: Math.floor(Date.now() / 1000) + 180, attachment: true,
    });
    const download = await fetch(signedUrl);
    if (!download.ok) throw new Error(`Cloudinary signed download returned HTTP ${download.status}`);
    const downloaded = Buffer.from(await download.arrayBuffer());
    if (downloaded.subarray(0, 5).toString() !== '%PDF-') throw new Error('Cloudinary download did not return a PDF payload');
    results.push('Cloudinary private PDF upload + signed download: PASS');

    const analysis = await analyzeResumeWithAI(
      pdf,
      'We need a software engineer who understands JavaScript and web application development.',
      ['JavaScript', 'Web application development'],
    );
    if (!analysis || !Number.isInteger(analysis.matchScore) || !analysis.aiSummary) {
      throw new Error('Gemini returned no valid resume analysis');
    }
    results.push(`Gemini PDF analysis: PASS (score ${analysis.matchScore})`);

    const emailSent = await sendEmail(
      process.env.SMOKE_TEST_EMAIL,
      'HireFlow production integration smoke test',
      'This is a controlled test email confirming HireFlow SMTP delivery. No action is required.',
    );
    if (!emailSent) throw new Error('SMTP smoke-test email could not be delivered');
    results.push('SMTP delivery: PASS');

    if (process.env.SMOKE_API_URL) {
      const health = await fetch(new URL('/health', process.env.SMOKE_API_URL));
      if (!health.ok) throw new Error(`Production API health endpoint returned HTTP ${health.status}`);
      const body = await health.json();
      if (body.ok !== true) throw new Error('Production API health response was not healthy');
      results.push('Deployed API health endpoint: PASS');
    }
    if (process.env.SMOKE_FRONTEND_URL) {
      const frontend = await fetch(process.env.SMOKE_FRONTEND_URL);
      if (!frontend.ok) throw new Error(`Production frontend returned HTTP ${frontend.status}`);
      const html = await frontend.text();
      if (!html.includes('HireFlow') || !html.includes('id="root"')) throw new Error('Production frontend HTML did not look like HireFlow');
      results.push('Deployed frontend HTTP smoke test: PASS');
    }

    for (const result of results) process.stdout.write(`PASS: ${result}\n`);
  } finally {
    if (cloudinaryPublicId) {
      await cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: 'raw', type: 'private' });
    }
  }
}

main().catch((error) => {
  process.stderr.write(`PRODUCTION SMOKE TEST FAILED: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  process.exit(1);
});
