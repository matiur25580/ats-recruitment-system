/*
 * LEARNING NOTE: Public candidate signup form. Privileged roles must be assigned only through trusted administrative workflows.
 * Interview tip: explain the user action, state change, API request, and feedback shown on this screen.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// Public registration intentionally creates candidate accounts only; never trust a role supplied by a browser.
const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const loadingToast = toast.loading('Creating your account…');
    try {
      const response = await api.post('/auth/register', { name: formData.name.trim(), email: formData.email.trim(), password: formData.password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      toast.success('Your workspace is ready!', { id: loadingToast });
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to create your account. Please try again.', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-indigo-950/5 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#17172f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full border-[54px] border-violet-400/10"/>
          <div className="absolute -bottom-36 -left-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"/>
          <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600"><BriefcaseBusiness size={21}/></span><span className="text-xl font-bold tracking-tight">HireFlow<span className="text-violet-400">.</span></span></Link>
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold text-violet-200"><Sparkles size={14}/> Your next chapter starts here</span>
            <h1 className="mt-7 text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">A better hiring journey, <span className="text-violet-300">built together.</span></h1>
            <p className="mt-5 text-base leading-7 text-slate-300">Create your account and bring clarity to every step — whether you are building a team or finding your next opportunity.</p>
            <div className="mt-9 space-y-4">{['A focused workspace for your goals','Clear application and hiring progress','Helpful insights, with people in control'].map(item=><div key={item} className="flex items-center gap-3 text-sm text-slate-200"><CheckCircle2 size={17} className="shrink-0 text-violet-300"/>{item}</div>)}</div>
          </div>
          <p className="relative z-10 text-xs text-slate-500">People first. Better hiring, together.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-9 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><BriefcaseBusiness size={19}/></span><span className="text-lg font-bold">HireFlow<span className="text-violet-600">.</span></span></Link>
            <div className="mb-7"><p className="text-sm font-semibold text-violet-700">Get started for free</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Create your account</h2><p className="mt-2 text-sm leading-6 text-slate-500">A few details are all you need to get started.</p></div>
            <form onSubmit={handleRegister} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Full name
                <span className="relative mt-2 block"><UserRound size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" autoComplete="name" required value={formData.name} onChange={event=>setFormData({...formData,name:event.target.value})} placeholder="Your name" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/></span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Email address
                <span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" autoComplete="email" required value={formData.email} onChange={event=>setFormData({...formData,email:event.target.value})} placeholder="you@company.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/></span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Password
                <span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type={showPassword?'text':'password'} autoComplete="new-password" required value={formData.password} onChange={event=>setFormData({...formData,password:event.target.value})} placeholder="Create a password" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span>
              </label>
              <button type="submit" disabled={submitting} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Creating account…':'Create account'}{!submitting&&<ArrowRight size={17} className="transition group-hover:translate-x-1"/>}</button>
            </form>
            <p className="mt-7 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-bold text-violet-700 hover:text-violet-900">Sign in</Link></p>
            <p className="mt-8 text-center text-xs leading-5 text-slate-400">Please use candidate information responsibly. AI insights support — never replace — human decisions.</p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Register;
