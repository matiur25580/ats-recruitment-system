import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const loadingToast = toast.loading('Signing you in…');
    try {
      const response = await api.post('/auth/login', { email: email.trim(), password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      toast.success('Welcome back!', { id: loadingToast });
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to sign in. Check your details and try again.', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-indigo-950/5 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.02fr_.98fr]">
        <section className="relative hidden overflow-hidden bg-[#17172f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full border-[54px] border-violet-400/10" />
          <div className="absolute -bottom-36 -left-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-950/40"><BriefcaseBusiness size={21}/></span>
            <span className="text-xl font-bold tracking-tight">HireFlow<span className="text-violet-400">.</span></span>
          </Link>
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold text-violet-200"><Sparkles size={14}/> A smarter way to hire</span>
            <h1 className="mt-7 text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">Great teams start with <span className="text-violet-300">great connections.</span></h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Bring your hiring workflow together. Discover opportunities, manage applications and make confident, people-first decisions.</p>
            <div className="mt-9 space-y-4">
              {['One clear view of every application','Useful AI-assisted candidate insights','A simpler path from discovery to decision'].map(item=><div key={item} className="flex items-center gap-3 text-sm text-slate-200"><CheckCircle2 size={17} className="shrink-0 text-violet-300"/>{item}</div>)}
            </div>
          </div>
          <p className="relative z-10 text-xs text-slate-500">Thoughtful hiring starts here.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-10 inline-flex items-center gap-2 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><BriefcaseBusiness size={19}/></span><span className="text-lg font-bold">HireFlow<span className="text-violet-600">.</span></span></Link>
            <div className="mb-8">
              <p className="text-sm font-semibold text-violet-700">Welcome back</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to your workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Enter your account details to continue where you left off.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block text-sm font-semibold text-slate-700">Email address
                <span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@company.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/></span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Password
                <span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span>
              </label>
              <button type="submit" disabled={submitting} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Signing in…':'Sign in'}{!submitting&&<ArrowRight size={17} className="transition group-hover:translate-x-1"/>}</button>
            </form>
            <p className="mt-8 text-center text-sm text-slate-500">New to HireFlow? <Link to="/register" className="font-bold text-violet-700 hover:text-violet-900">Create an account</Link></p>
            <p className="mt-10 text-center text-xs leading-5 text-slate-400">By continuing, you agree to use candidate information responsibly and keep hiring decisions human-reviewed.</p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
