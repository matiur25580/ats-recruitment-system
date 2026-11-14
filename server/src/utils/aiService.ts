import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
const pdfParse = require('pdf-parse');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const analyzeResumeWithAI = async (pdfBuffer: Buffer, jobDescription: string, jobRequirements: string[]) => {
  try {
    // ১. পিডিএফ থেকে টেক্সট বের করা
    const pdfData = await pdfParse(pdfBuffer);
    const resumeText = pdfData.text;

    // ২. এআই-এর জন্য প্রম্পট তৈরি করা
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      You are an expert ATS (Applicant Tracking System). 
      I will provide you with a candidate's resume and a job description.
      Analyze the resume and compare it with the job.
      
      Return the response STRICTLY in JSON format with exactly two keys:
      "matchScore": An integer from 0 to 100 based on how well the candidate fits the job.
      "aiSummary": A brief 2-sentence explanation of why the candidate is a good or bad fit.

      Job Description: ${jobDescription}
      Job Requirements: ${jobRequirements.join(', ')}
      
      Resume Text:
      ${resumeText}
    `;

    // ৩. এআই-এর কাছে রিকোয়েস্ট পাঠানো
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // ৪. JSON রেসপন্স ক্লিন করা
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
    
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return { matchScore: 0, aiSummary: 'AI failed to analyze the resume.' };
  }
};
