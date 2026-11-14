import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      toast.success(data.message || 'If an account exists, reset instructions will be sent.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to request a password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6fb] p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-7 shadow-2xl shadow-indigo-950/5 sm:p-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft size={16}/> Back to sign in</Link>
        <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><BriefcaseBusiness size={23}/></div>
        <p className="mt-7 text-sm font-semibold text-violet-700">Account recovery</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Forgot your password?</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Enter the email address linked to your HireFlow account. If an account exists, we’ll send a secure reset link that expires in 30 minutes.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">Email address
            <span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-normal outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/></span>
          </label>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-60">{submitting ? 'Sending request…' : 'Send reset link'}<Send size={16}/></button>
        </form>
        <p className="mt-7 text-center text-xs leading-5 text-slate-400">For account security, this page does not reveal whether an email address is registered.</p>
      </section>
    </main>
  );
};

export default ForgotPassword;
