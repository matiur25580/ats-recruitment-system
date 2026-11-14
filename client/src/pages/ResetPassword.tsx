import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) { toast.error('This reset link is missing its token. Request a new link.'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters long.'); return; }
    if (password !== confirmPassword) { toast.error('The passwords do not match.'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      toast.success(data.message || 'Password reset successfully.');
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6fb] p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-7 shadow-2xl shadow-indigo-950/5 sm:p-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft size={16}/> Back to sign in</Link>
        <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><BriefcaseBusiness size={23}/></div>
        <p className="mt-7 text-sm font-semibold text-violet-700">Secure account recovery</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Create a new password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Choose a new password with at least 8 characters. Your other active sessions will be signed out.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">New password
            <span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-normal outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Confirm new password
            <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Enter the password again" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-normal outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/>
          </label>
          <button type="submit" disabled={submitting || !token} className="w-full rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-60">{submitting ? 'Updating password…' : 'Reset password'}</button>
        </form>
        {!token && <p className="mt-4 text-sm text-rose-600">This link is incomplete. <Link to="/forgot-password" className="font-semibold underline">Request another reset link</Link>.</p>}
      </section>
    </main>
  );
};

export default ResetPassword;
