/*
 * LEARNING NOTE: Role-aware dashboard: presents candidate/recruiter workflows and loads data from protected APIs.
 * Interview tip: explain the user action, state change, API request, and feedback shown on this screen.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText, UserRound,
  LayoutDashboard, LogOut, MapPin, Plus, Search, Send, Sparkles,
  X, UploadCloud, Eye, Ban, Menu, Pencil, Archive, RefreshCw, MessageSquare, History,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../services/api';

type User = { _id: string; name: string; email?: string; role: 'candidate' | 'recruiter' | 'admin' };
type Job = { _id: string; title: string; description: string; location: string; salary: number; jobType: string; experienceLevel?: string; recruiter?: any; status?: 'Open' | 'Closed' | 'Archived'; expiresAt?: string };
type Application = { _id: string; job?: any; candidate?: any; coverLetter?: string; status: string; matchScore?: number; aiSummary?: string; aiAnalysisStatus?: string; resumePublicId?: string; statusHistory?: { status: string; changedBy: string; changedAt: string }[]; recruiterNotes?: { author: string; note: string; createdAt: string }[] };

const initialForm = { title: '', description: '', requirements: '', location: '', salary: '', jobType: 'Full-time', experienceLevel: 'Entry', expiresAt: '' };
const chartColors = ['#64748b', '#8b5cf6', '#10b981', '#f97316'];

// Dashboard page: use the signed-in role to decide which recruitment tools and data should be shown.
const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formData, setFormData] = useState(initialForm);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [selectedJobApplicants, setSelectedJobApplicants] = useState<Application[] | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState('');
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!stored || !token) { navigate('/login'); return; }
      const parsed = JSON.parse(stored) as User;
      if (!parsed?._id || !['candidate', 'recruiter', 'admin'].includes(parsed.role)) {
        localStorage.removeItem('user'); localStorage.removeItem('token'); navigate('/login'); return;
      }
      setUser(parsed);
      void loadDashboard(parsed);
    } catch {
      localStorage.removeItem('user'); localStorage.removeItem('token'); navigate('/login');
    }
  }, [navigate]);

  const loadDashboard = async (current: User) => {
    setPageLoading(true);
    try {
      const jobsRequest = api.get(current.role === 'recruiter' ? '/jobs/mine' : '/jobs');
      const jobsResponse = await jobsRequest;
      const allJobs = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];
      setJobs(allJobs);
      if (current.role === 'candidate') {
        const response = await api.get('/applications/my-applications');
        setMyApplications(Array.isArray(response.data) ? response.data : []);
      }
      if (current.role === 'recruiter' || current.role === 'admin') {
        const response = await api.get('/stats/recruiter');
        setStats(response.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not load dashboard data');
    } finally { setPageLoading(false); }
  };

  const filteredJobs = useMemo(() => jobs.filter(job =>
    `${job.title} ${job.location} ${job.jobType}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [jobs, searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login');
  };

  const handlePostJob = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true);
    try {
      const payload = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        salary: Number(formData.salary),
        requirements: formData.requirements.split(',').map(item => item.trim()).filter(Boolean),
        ...(formData.expiresAt ? { expiresAt: new Date(formData.expiresAt).toISOString() } : {}),
      };
      if (editingJobId) {
        await api.put('/jobs/' + editingJobId, payload);
        toast.success('Job details updated');
      } else {
        await api.post('/jobs', payload);
        toast.success('Your job is now live');
      }
      setFormData(initialForm); setEditingJobId(null); setShowJobForm(false);
      if (user) await loadDashboard(user);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to publish job');
    } finally { setLoading(false); }
  };

  const handleViewApplicants = async (job: Job) => {
    setLoading(true); setSelectedJobApplicants(null); setActiveJobTitle(job.title);
    try {
      const response = await api.get(`/applications/${job._id}`);
      setSelectedJobApplicants(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load applicants');
    } finally { setLoading(false); }
  };

  const handleUpdateStatus = async (applicationId: string, status: string) => {
    try {
      await api.put(`/applications/${applicationId}/status`, { status });
      toast.success(`Application marked ${status.toLowerCase()}`);
      if (user) await loadDashboard(user);
      const job = jobs.find(item => item.title === activeJobTitle);
      if (job) await handleViewApplicants(job);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to update application');
    }
  };


  const handleEditJob = (job: Job) => {
    setEditingJobId(job._id);
    setFormData({ title: job.title, description: job.description, requirements: '', location: job.location, salary: String(job.salary), jobType: job.jobType, experienceLevel: job.experienceLevel || 'Entry', expiresAt: job.expiresAt ? new Date(job.expiresAt).toISOString().slice(0, 10) : '' });
    setShowJobForm(true);
  };

  const handleJobLifecycle = async (job: Job, status: 'Open' | 'Closed' | 'Archived') => {
    const verb = status === 'Archived' ? 'archive' : status === 'Closed' ? 'close' : 'reopen';
    if (!window.confirm(`Are you sure you want to ${verb} “${job.title}”?`)) return;
    try {
      await api.patch(`/jobs/${job._id}/status`, { status });
      toast.success(`Job ${status.toLowerCase()}`);
      if (user) await loadDashboard(user);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to update job');
    }
  };

  const handleAddNote = async (applicationId: string) => {
    const note = (noteDrafts[applicationId] || '').trim();
    if (!note) return;
    try {
      await api.post(`/applications/${applicationId}/notes`, { note });
      toast.success('Private recruiter note added');
      setNoteDrafts(current => ({ ...current, [applicationId]: '' }));
      const job = jobs.find(item => item.title === activeJobTitle);
      if (job) await handleViewApplicants(job);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to save note');
    }
  };

  const handleApply = async (jobId: string) => {
    if (!resumeFile) { toast.error('Please choose your resume first'); return; }
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('coverLetter', coverLetter);
      payload.append('resume', resumeFile);
      await api.post(`/applications/${jobId}`, payload);
      toast.success('Application submitted successfully');
      setApplyJobId(null); setCoverLetter(''); setResumeFile(null);
      if (user) await loadDashboard(user);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to submit application');
    } finally { setLoading(false); }
  };

  const handleOpenResume = async (applicationId: string) => {
    const popup = window.open('about:blank', '_blank');
    if (!popup) { toast.error('Please allow pop-ups to view resumes'); return; }
    popup.opener = null;
    try {
      const response = await api.get(`/applications/${applicationId}/resume`);
      popup.location.href = response.data.url;
    } catch (error: any) {
      popup.close();
      toast.error(error.response?.data?.message || 'Unable to open resume');
    }
  };

  if (!user || pageLoading) {
    return <div className="min-h-screen bg-slate-950 grid place-items-center text-slate-300"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-400" /> Loading your workspace…</div></div>;
  }

  const isRecruiter = user.role === 'recruiter' || user.role === 'admin';
  const statusData = Array.isArray(stats?.statusData) ? stats.statusData : [];
  const totalApps = Number(stats?.totalApplications ?? myApplications.length);
  const totalJobs = Number(stats?.totalJobs ?? jobs.length);

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#111426] px-5 py-6 text-white transition-transform lg:static lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/40"><BriefcaseBusiness size={22} /></div>
            <div><p className="text-lg font-bold tracking-tight">HireFlow<span className="text-violet-400">.</span></p><p className="text-xs text-slate-400">Talent workspace</p></div>
            <button className="ml-auto lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={20}/></button>
          </div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Workspace</p>
          <nav className="mt-3 space-y-1">
            <div className="flex items-center gap-3 rounded-xl bg-violet-500/15 px-3 py-3 text-sm font-semibold text-violet-200"><LayoutDashboard size={18}/> Overview</div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400"><BriefcaseBusiness size={18}/> {isRecruiter ? 'My job posts' : 'Explore jobs'}</div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400"><FileText size={18}/> {isRecruiter ? 'Applicants' : 'My applications'}</div>
            {!isRecruiter && <button onClick={() => navigate('/profile')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><UserRound size={18}/> My profile</button>}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <div className="mb-3 flex items-center gap-2 text-violet-300"><Sparkles size={16}/><span className="text-xs font-semibold">AI-assisted hiring</span></div>
            <p className="text-xs leading-5 text-slate-400">Use match insights as a helpful signal. Keep every hiring decision human-reviewed.</p>
          </div>
          <button onClick={handleLogout} className="mt-5 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={18}/> Sign out</button>
        </aside>

        {mobileNavOpen && <button aria-label="Close navigation overlay" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden"/>}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileNavOpen(true)} className="rounded-xl border border-slate-200 p-2 lg:hidden" aria-label="Open navigation"><Menu size={19}/></button>
                <div><p className="text-xs font-medium text-slate-400">Workspace / Overview</p><h1 className="mt-0.5 text-lg font-bold tracking-tight sm:text-xl">Dashboard</h1></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs capitalize text-slate-400">{user.role}</p></div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">{user.name?.slice(0,1).toUpperCase()}</div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#24234b] via-[#38306d] to-[#5141a0] p-6 text-white shadow-xl shadow-indigo-900/10 sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-violet-200"><Sparkles size={14}/> Your talent workspace</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{isRecruiter ? 'Build your next great team.' : 'Your next opportunity starts here.'}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/80">Welcome back, {user.name}. {isRecruiter ? 'Manage open roles, review applicants and track your hiring pipeline.' : 'Discover roles that fit your skills and keep every application in one place.'}</p>
                {isRecruiter && <button onClick={() => setShowJobForm(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-900 shadow-lg transition hover:-translate-y-0.5"><Plus size={17}/> Post a new job</button>}
              </div>
              <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[36px] border-white/5"/><div className="pointer-events-none absolute -bottom-32 right-32 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl"/>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Metric icon={<BriefcaseBusiness size={19}/>} label={isRecruiter ? 'Published jobs' : 'Available jobs'} value={isRecruiter ? totalJobs : jobs.length} note="Across your workspace" tint="violet"/>
              <Metric icon={<FileText size={19}/>} label={isRecruiter ? 'Applications received' : 'Applications sent'} value={totalApps} note="Application activity" tint="blue"/>
              <Metric icon={<Activity size={19}/>} label={isRecruiter ? 'Average AI match' : 'In review'} value={isRecruiter ? `${stats?.averageMatchScore ?? 0}%` : myApplications.filter(app => app.status === 'Pending' || app.status === 'Reviewed').length} note={isRecruiter ? 'Decision-support signal' : 'Waiting for an update'} tint="green"/>
            </section>

            {isRecruiter && statusData.length > 0 && <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-3">
                <div className="mb-4"><h3 className="font-bold">Hiring pipeline</h3><p className="text-xs text-slate-400">Applications by current status</p></div>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f6"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}}/><Tooltip cursor={{fill:'#f5f3ff'}}/><Bar dataKey="value" fill="#7664dc" radius={[7,7,0,0]} barSize={34}/></BarChart></ResponsiveContainer></div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2"><h3 className="font-bold">Status mix</h3><p className="text-xs text-slate-400">Current application distribution</p><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4}>{statusData.map((item: any,index: number)=><Cell key={item.name} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>
            </section>}

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div><h3 className="text-lg font-bold">{isRecruiter ? 'Your job postings' : 'Explore opportunities'}</h3><p className="text-sm text-slate-400">{isRecruiter ? 'Keep track of roles and review applicants.' : 'Find a role that matches your experience.'}</p></div>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1 sm:w-64"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={searchTerm} onChange={event=>setSearchTerm(event.target.value)} placeholder="Search jobs…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></div>
                  {isRecruiter && <button onClick={()=>setShowJobForm(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Plus size={16}/><span className="hidden sm:inline">New job</span></button>}
                </div>
              </div>
              {filteredJobs.length === 0 ? <EmptyState title={searchTerm ? 'No matching jobs' : 'Nothing here yet'} detail={searchTerm ? 'Try another search term.' : isRecruiter ? 'Publish your first role to start receiving applications.' : 'There are no open roles available right now.'}/> : <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {filteredJobs.map(job=><article key={job._id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-violet-200 hover:bg-white hover:shadow-md sm:p-5">
                  <div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><BriefcaseBusiness size={19}/></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${job.status === 'Archived' ? 'bg-slate-100 text-slate-600' : job.status === 'Closed' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{job.status || 'Open'}</span></div>
                  <h4 className="mt-3 text-base font-bold">{job.title}</h4><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{job.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={13}/>{job.location}</span><span className="inline-flex items-center gap-1"><Clock3 size={13}/>{job.jobType}</span>{job.salary > 0 && <span className="font-semibold text-slate-700">Salary: {job.salary.toLocaleString()}</span>}</div>
                  <div className="mt-4 border-t border-slate-200/70 pt-3">{isRecruiter ? <div className="flex flex-wrap items-center gap-3"><button onClick={()=>handleViewApplicants(job)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900">Applicants <ArrowUpRight size={15}/></button><button onClick={()=>handleEditJob(job)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-violet-700"><Pencil size={13}/> Edit</button>{job.status === 'Open' ? <button onClick={()=>void handleJobLifecycle(job,'Closed')} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><Ban size={13}/> Close</button> : job.status === 'Closed' ? <button onClick={()=>void handleJobLifecycle(job,'Open')} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><RefreshCw size={13}/> Reopen</button> : null}{job.status !== 'Archived' && <button onClick={()=>void handleJobLifecycle(job,'Archived')} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Archive size={13}/> Archive</button>}</div> : <button disabled={job.status !== 'Open'} onClick={()=>setApplyJobId(job._id)} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">{job.status === 'Open' ? 'Apply for this role' : 'Applications closed'} <ArrowUpRight size={15} className="ml-1 inline"/></button>}</div>
                </article>)}
              </div>}
            </section>

            {!isRecruiter && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h3 className="text-lg font-bold">My applications</h3><p className="text-sm text-slate-400">Follow the progress of your applications.</p></div>{myApplications.length===0?<EmptyState title="No applications yet" detail="When you apply for a role, its progress will appear here."/>:<div className="space-y-3">{myApplications.map(app=><div key={app._id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{app.job?.title || 'Job no longer available'}</p><p className="mt-1 text-xs text-slate-400">{app.job?.location || 'Location unavailable'}</p></div><div className="flex items-center gap-3"><span className="text-xs font-semibold text-violet-700">{app.matchScore !== undefined ? `${app.matchScore}% AI match` : ''}</span><StatusPill status={app.status}/></div></div>)}</div>}</section>}

            {selectedJobApplicants !== null && <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-lg shadow-violet-100/50 sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Applicants · {activeJobTitle}</h3><p className="text-sm text-slate-400">{selectedJobApplicants.length} application(s) received</p></div><button onClick={()=>setSelectedJobApplicants(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close applicants"><X size={18}/></button></div>{selectedJobApplicants.length===0?<EmptyState title="No applicants yet" detail="New applications will show up here."/>:<div className="space-y-3">{selectedJobApplicants.map(app=><div key={app._id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="font-bold">{app.candidate?.name || 'Candidate'}</p><p className="text-xs text-slate-400">{app.candidate?.email}</p><p className="mt-2 max-w-2xl text-sm text-slate-600">{app.coverLetter}</p>{app.resumePublicId&&<button onClick={()=>handleOpenResume(app._id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700"><Eye size={14}/> View resume</button>}{app.aiSummary&&<p className="mt-3 rounded-lg bg-violet-50 p-3 text-xs leading-5 text-violet-900"><Sparkles size={13} className="mr-1 inline"/>AI insight: {app.aiSummary} Human review is required.</p>}</div><div className="flex flex-wrap items-center gap-2 sm:justify-end">{app.matchScore!==undefined&&<span className="mr-2 text-sm font-bold text-violet-700">{app.matchScore}% match</span>}<StatusPill status={app.status}/><button onClick={()=>handleUpdateStatus(app._id,'Accepted')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"><CheckCircle2 size={14} className="mr-1 inline"/>Accept</button><button onClick={()=>handleUpdateStatus(app._id,'Rejected')} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"><Ban size={14} className="mr-1 inline"/>Reject</button></div></div></div>)}</div>}</section>}
          </div>
        </main>
      </div>

      {showJobForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><div className="my-6 w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-600">Recruiting</p><h3 className="mt-1 text-xl font-bold">{editingJobId ? 'Edit job posting' : 'Publish a new role'}</h3><p className="text-sm text-slate-400">Share the details candidates need to apply.</p></div><button onClick={()=>{setShowJobForm(false);setEditingJobId(null);setFormData(initialForm);}} className="rounded-xl border border-slate-200 p-2 text-slate-500" aria-label="Close form"><X size={18}/></button></div><form onSubmit={handlePostJob} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Job title"><input required value={formData.title} onChange={e=>setFormData({...formData,title:e.target.value})} placeholder="e.g. Product Designer" className="field-input"/></Field>
        <Field label="Location"><input required value={formData.location} onChange={e=>setFormData({...formData,location:e.target.value})} placeholder="Remote / City" className="field-input"/></Field>
        <Field label="Salary"><input required min="0" type="number" value={formData.salary} onChange={e=>setFormData({...formData,salary:e.target.value})} placeholder="Annual salary" className="field-input"/></Field>
        <Field label="Job type"><select value={formData.jobType} onChange={e=>setFormData({...formData,jobType:e.target.value})} className="field-input"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></Field>
        <Field label="Experience level"><select value={formData.experienceLevel} onChange={e=>setFormData({...formData,experienceLevel:e.target.value})} className="field-input"><option>Entry</option><option>Mid</option><option>Senior</option></select></Field>
        <Field label="Requirements (comma separated)"><input value={formData.requirements} onChange={e=>setFormData({...formData,requirements:e.target.value})} placeholder="React, TypeScript, UX" className="field-input"/></Field>
        <Field label="Application deadline (optional)"><input type="date" min={new Date().toISOString().slice(0,10)} value={formData.expiresAt} onChange={e=>setFormData({...formData,expiresAt:e.target.value})} className="field-input"/></Field>
        <div className="sm:col-span-2"><Field label="Job description"><textarea required rows={4} value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder="Describe the role and responsibilities…" className="field-input"/></Field></div>
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={()=>setShowJobForm(false);setEditingJobId(null);setFormData(initialForm);}} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button disabled={loading} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"><Plus size={15} className="mr-1 inline"/>{loading?(editingJobId?'Saving…':'Publishing…'):(editingJobId?'Save changes':'Publish job')}</button></div>
      </form></div></div>}

      {applyJobId && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-600">Application</p><h3 className="mt-1 text-xl font-bold">Apply for {jobs.find(job=>job._id===applyJobId)?.title}</h3></div><button onClick={()=>setApplyJobId(null)} aria-label="Close application" className="rounded-lg border p-2"><X size={18}/></button></div><p className="mt-2 text-sm text-slate-500">Attach your resume and add a short note to the hiring team.</p><label className="mt-5 block text-sm font-semibold">Cover letter<textarea rows={4} value={coverLetter} onChange={e=>setCoverLetter(e.target.value)} placeholder="Tell the team why you're a good fit…" className="field-input mt-2"/></label><label className="mt-4 block text-sm font-semibold">Resume (PDF)<span className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4 text-sm font-medium text-violet-800"><UploadCloud size={22}/><span className="min-w-0"><span className="block truncate">{resumeFile?.name || 'Choose a resume file'}</span><span className="text-xs font-normal text-violet-500">Select a file from your device</span></span><input type="file" accept="application/pdf,.pdf" onChange={e=>setResumeFile(e.target.files?.[0]||null)} className="sr-only"/></span></label><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setApplyJobId(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={loading} onClick={()=>void handleApply(applyJobId)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} className="mr-1 inline"/>{loading?'Submitting…':'Submit application'}</button></div></div></div>}
    </div>
  );
};

const Metric = ({icon,label,value,note,tint}:{icon:React.ReactNode;label:string;value:any;note:string;tint:string}) => <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`grid h-10 w-10 place-items-center rounded-xl ${tint==='violet'?'bg-violet-100 text-violet-700':tint==='blue'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>{icon}</span></div><p className="mt-4 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div>;
const EmptyState = ({title,detail}:{title:string;detail:string}) => <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center"><div><div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><FileText size={18}/></div><p className="text-sm font-semibold text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div></div>;
const StatusPill = ({status}:{status:string}) => <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status==='Accepted'?'bg-emerald-50 text-emerald-700':status==='Rejected'?'bg-rose-50 text-rose-700':status==='Reviewed'?'bg-blue-50 text-blue-700':'bg-amber-50 text-amber-700'}`}>{status}</span>;
const Field = ({label,children}:{label:string;children:React.ReactNode}) => <label className="block text-sm font-semibold text-slate-700">{label}{children}</label>;

export default Dashboard;
