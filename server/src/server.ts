import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import applicationRoutes from './routes/applicationRoutes';
import statsRoutes from './routes/statsRoutes'; // নতুন রাউট

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/stats', statsRoutes); // নতুন রাউট

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'ATS Backend running' });
});

const MONGO_URI = process.env.MONGO_URI || '';
mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB Connected Successfully!')).catch((err) => console.error('❌ MongoDB Connection Error:', err));

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});
