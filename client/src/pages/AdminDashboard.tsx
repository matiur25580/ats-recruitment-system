/*
 * LEARNING NOTE: Read-only platform control center for administrators.
 * Data is loaded from an admin-only API; this page never exposes private resume files or password data.
 */
import { useEffect, useState } from 'react';
import { Activity, BriefcaseBusiness, Users, UserRoundCheck, FileText, LogOut, RefreshCw, ShieldCheck, Sparkles, ArrowUpRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

type Overview = {
  totals: { users: number; candidates: number; recruiters: number; jobs: number; applications: number };
  statusData: { name: string; value: number }[];
  recentJobs: { _id: string; title: string; location: string; jobType: string; createdAt: string; recruiter?: { name?: string; email?: string } }[];
  recentApplications: { _id: string; status: string; createdAt: string; job?: { title?: string }; candidate?: { name?: string; email?: string } }[];
};

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

const AdminDashboard = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadOverview = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get('/admin/overview');
      setOverview(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load platform overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadOverview(); }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const totals = overview?.totals;
  const metrics = [
    { label: 'Total users', value: totals?.users ?? 0, detail: 'Registered accounts', icon: Users, tone: 'violet' },
    { label: 'Candidates', value: totals?.candidates ?? 0, detail: 'Talent community', icon: UserRoundCheck, tone: 'blue' },
    { label: 'Recruiters', value: totals?.recruiters ?? 0, detail: 'Hiring teams', icon: BriefcaseBusiness, tone: 'indigo' },
    { label: 'Job posts', value: totals?.jobs ?? 0, detail: 'Roles published', icon: FileText, tone: 'amber' },
    { label: 'Applications', value: totals?.applications ?? 0, detail: 'Submissions received', icon: Activity, tone: 'green' },
  ];

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f6fb] text-sm font-medium text-slate-500"><span className="flex items-center gap-3"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-500"/>Loading admin workspace…</span></div>;

  return (
    <main className="min-h-screen bg-[#f5f6fb] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur sm:px-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-900/20"><ShieldCheck size={22}/></div><div><p className="text-lg font-extrabold tracking-tight">HireFlow<span className="text-violet-600">.</span></p><p className="text-xs text-slate-400">Platform administration</p></div></div>
          <div className="flex items-center gap-2"><button onClick={() => void loadOverview(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/><span className="hidden sm:inline">Refresh</span></button><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"><LogOut size={15}/><span className="hidden sm:inline">Sign out</span></button></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#211d49] via-[#39316e] to-[#5745a7] p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-9">
          <div className="relative z-10 max-w-2xl"><p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100"><Sparkles size={14}/> ADMIN CONTROL CENTER</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your platform, at a glance.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/80">Monitor account growth, hiring activity and application outcomes from one secure overview.</p></div>
          <div className="pointer-events-none absolute -right-12 -top-28 h-72 w-72 rounded-full border-[38px] border-white/5"/><div className="pointer-events-none absolute -bottom-32 right-40 h-64 w-64 rounded-full bg-violet-300/15 blur-3xl"/>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((item) => { const Icon = item.icon; return <article key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{item.label}</p><span className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone === 'violet' ? 'bg-violet-100 text-violet-700' : item.tone === 'blue' ? 'bg-blue-100 text-blue-700' : item.tone === 'indigo' ? 'bg-indigo-100 text-indigo-700' : item.tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}><Icon size={19}/></span></div><p className="mt-4 text-3xl font-extrabold tracking-tight tabular-nums">{item.value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{item.detail}</p></article>; })}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-3 sm:p-6"><div className="mb-5"><h2 className="font-bold">Application pipeline</h2><p className="mt-1 text-xs text-slate-400">All applications grouped by current status</p></div><div className="h-72">{overview?.statusData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={overview.statusData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f6"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }}/><Tooltip cursor={{ fill: '#f5f3ff' }}/><Bar dataKey="value" name="Applications" fill="#7664dc" radius={[7,7,0,0]} barSize={42}/></BarChart></ResponsiveContainer> : <Empty message="No application activity yet."/>}</div></article>
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2 sm:p-6"><div className="mb-5"><h2 className="font-bold">Platform snapshot</h2><p className="mt-1 text-xs text-slate-400">Account distribution</p></div><div className="space-y-5">{[{ label: 'Candidates', value: totals?.candidates ?? 0, color: 'bg-violet-500' },{ label: 'Recruiters', value: totals?.recruiters ?? 0, color: 'bg-blue-500' }].map((item) => { const percent = totals?.users ? Math.round(item.value / totals.users * 100) : 0; return <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-600">{item.label}</span><span className="font-bold tabular-nums">{item.value.toLocaleString()} <span className="font-normal text-slate-400">({percent}%)</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }}/></div></div>; })}<div className="rounded-xl bg-violet-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-violet-900"><ShieldCheck size={16}/> Admin access protected</p><p className="mt-1 text-xs leading-5 text-violet-700">Platform metrics are available only to authenticated administrator accounts.</p></div></div></article>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Recently posted jobs</h2><p className="mt-1 text-xs text-slate-400">Latest roles across the platform</p></div><BriefcaseBusiness className="text-violet-500" size={19}/></div>{overview?.recentJobs.length ? <div className="divide-y divide-slate-100">{overview.recentJobs.map(job=><div key={job._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{job.title}</p><p className="mt-1 truncate text-xs text-slate-400">{job.location} · {job.jobType} · {job.recruiter?.name || 'Recruiter'}</p></div><span className="shrink-0 text-xs text-slate-400">{formatDate(job.createdAt)}</span></div>)}</div> : <Empty message="No jobs have been posted yet."/>}</article>
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Recent applications</h2><p className="mt-1 text-xs text-slate-400">Latest candidate submissions</p></div><FileText className="text-violet-500" size={19}/></div>{overview?.recentApplications.length ? <div className="divide-y divide-slate-100">{overview.recentApplications.map(app=><div key={app._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{app.candidate?.name || 'Candidate'}</p><p className="mt-1 truncate text-xs text-slate-400">{app.job?.title || 'Job unavailable'} · {formatDate(app.createdAt)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${app.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700' : app.status === 'Rejected' ? 'bg-rose-50 text-rose-700' : app.status === 'Reviewed' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{app.status}</span></div>)}</div> : <Empty message="No applications have arrived yet."/>}</article>
        </section>
        <p className="flex items-center justify-center gap-2 pb-2 text-xs text-slate-400"><ShieldCheck size={14}/> AI insights remain advisory; hiring decisions belong to people.</p>
      </div>
    </main>
  );
};

const Empty = ({ message }: { message: string }) => <div className="grid h-full min-h-36 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-sm text-slate-400">{message}</div>;

export default AdminDashboard;
