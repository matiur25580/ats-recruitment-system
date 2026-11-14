import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BriefcaseBusiness, Check, CheckCircle2, ChevronRight, Download,
  FileText, GraduationCap, LoaderCircle, MapPin, Plus, Save, Trash2, UploadCloud,
  UserRound, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

type Experience = {
  title: string; company: string; location: string; startDate: string;
  endDate: string; current: boolean; description: string;
};
type Education = {
  institution: string; degree: string; fieldOfStudy: string;
  startDate: string; endDate: string; description: string;
};
type Profile = {
  name: string; email: string; headline: string; phone: string; location: string;
  summary: string; skills: string[]; experience: Experience[]; education: Education[];
  hasResume: boolean; resumeFileName?: string; resumeUploadedAt?: string;
};

const emptyExperience = (): Experience => ({ title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
const emptyEducation = (): Education => ({ institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', description: '' });
const emptyProfile: Profile = {
  name: '', email: '', headline: '', phone: '', location: '', summary: '',
  skills: [], experience: [], education: [], hasResume: false,
};

const CandidateProfile = () => {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [skillsText, setSkillsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!localStorage.getItem('token') || !stored) { navigate('/login', { replace: true }); return; }
    try {
      const user = JSON.parse(stored);
      if (user?.role !== 'candidate') { navigate('/dashboard', { replace: true }); return; }
    } catch {
      localStorage.removeItem('user'); localStorage.removeItem('token');
      navigate('/login', { replace: true }); return;
    }
    void loadProfile();
  }, [navigate]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/profile');
      const next: Profile = {
        ...emptyProfile,
        ...data,
        skills: Array.isArray(data.skills) ? data.skills : [],
        experience: Array.isArray(data.experience) ? data.experience : [],
        education: Array.isArray(data.education) ? data.education : [],
      };
      setProfile(next);
      setSkillsText(next.skills.join(', '));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load your profile');
    } finally { setLoading(false); }
  };

  const completion = useMemo(() => {
    const checks = [
      Boolean(profile.name.trim()), Boolean(profile.headline.trim()), Boolean(profile.location.trim()),
      Boolean(profile.phone.trim()), Boolean(profile.summary.trim()), profile.skills.length > 0,
      profile.experience.length > 0, profile.education.length > 0, profile.hasResume,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile(current => ({ ...current, [key]: value }));

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: profile.name, headline: profile.headline, phone: profile.phone,
        location: profile.location, summary: profile.summary,
        skills: skillsText.split(',').map(item => item.trim()).filter(Boolean),
        experience: profile.experience, education: profile.education,
      };
      const { data } = await api.put('/profile', payload);
      setProfile(current => ({ ...current, ...data }));
      setSkillsText((data.skills || []).join(', '));
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({ ...user, name: data.name }));
      }
      toast.success('Profile saved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to save profile');
    } finally { setSaving(false); }
  };

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file'); return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error('Resume must be 5 MB or smaller'); return; }
    setResumeBusy(true);
    try {
      const form = new FormData();
      form.append('resume', file);
      const { data } = await api.post('/profile/resume', form);
      setProfile(current => ({ ...current, hasResume: true, resumeFileName: data.resumeFileName, resumeUploadedAt: data.resumeUploadedAt }));
      toast.success('Resume uploaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to upload resume');
    } finally { setResumeBusy(false); }
  };

  const handleResumeDownload = async () => {
    setResumeBusy(true);
    try {
      const { data } = await api.get('/profile/resume');
      const link = document.createElement('a');
      link.href = data.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to open resume');
    } finally { setResumeBusy(false); }
  };

  const handleResumeDelete = async () => {
    if (!window.confirm('Remove your current resume from your profile?')) return;
    setResumeBusy(true);
    try {
      await api.delete('/profile/resume');
      setProfile(current => ({ ...current, hasResume: false, resumeFileName: undefined, resumeUploadedAt: undefined }));
      toast.success('Resume removed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to remove resume');
    } finally { setResumeBusy(false); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f6fb] text-slate-500"><div className="flex items-center gap-3"><LoaderCircle className="animate-spin" size={20}/> Loading your profile…</div></div>;

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-7">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700"><ArrowLeft size={17}/> Dashboard</Link>
          <div className="flex items-center gap-2 text-sm font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><BriefcaseBusiness size={18}/></span>HireFlow<span className="text-violet-600">.</span></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-7 lg:py-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#24234b] via-[#38306d] to-[#5141a0] p-6 text-white shadow-xl shadow-indigo-900/10 sm:p-8">
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[38px] border-white/5"/>
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-violet-200"><UserRound size={14}/> Candidate workspace</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your professional profile</h1><p className="mt-2 max-w-xl text-sm leading-6 text-violet-100/80">Tell your story, highlight your strengths and keep your application details up to date.</p></div>
            <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur"><span className="text-3xl font-bold">{completion}%</span><span className="mt-1 text-[11px] font-medium text-violet-100">Complete</span></div>
          </div>
          <div className="relative z-10 mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-violet-300 transition-all" style={{ width: completion + '%' }}/></div>
        </section>

        <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><UserRound size={19}/></span><div><h2 className="font-bold">Personal information</h2><p className="text-xs text-slate-400">The basics recruiters use to get to know you.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Full name<input required maxLength={120} value={profile.name} onChange={e=>update('name',e.target.value)} className="field-input"/></label>
                <label className="text-sm font-semibold text-slate-700">Email address<input disabled value={profile.email} className="field-input cursor-not-allowed opacity-70"/></label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Professional headline<input maxLength={160} value={profile.headline} onChange={e=>update('headline',e.target.value)} placeholder="e.g. Frontend Developer | React & TypeScript" className="field-input"/></label>
                <label className="text-sm font-semibold text-slate-700">Phone number<input maxLength={40} value={profile.phone} onChange={e=>update('phone',e.target.value)} placeholder="+91 98765 43210" className="field-input"/></label>
                <label className="text-sm font-semibold text-slate-700">Location<input maxLength={120} value={profile.location} onChange={e=>update('location',e.target.value)} placeholder="City, Country" className="field-input"/></label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Professional summary<textarea rows={4} maxLength={2000} value={profile.summary} onChange={e=>update('summary',e.target.value)} placeholder="Share your experience, strengths and the kind of opportunities you're looking for…" className="field-input resize-y"/></label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><CheckCircle2 size={19}/></span><div><h2 className="font-bold">Skills & expertise</h2><p className="text-xs text-slate-400">Separate skills with commas.</p></div></div>
              <label className="block text-sm font-semibold text-slate-700">Your skills<textarea rows={3} value={skillsText} onChange={e=>setSkillsText(e.target.value)} placeholder="React, TypeScript, UI Design, Communication" className="field-input resize-y"/></label>
              <div className="mt-3 flex flex-wrap gap-2">{skillsText.split(',').map(s=>s.trim()).filter(Boolean).slice(0,30).map((s,i)=><span key={s+i} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">{s}</span>)}</div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BriefcaseBusiness size={19}/></span><div><h2 className="font-bold">Work experience</h2><p className="text-xs text-slate-400">Add roles that show your professional journey.</p></div></div><button type="button" onClick={()=>update('experience',[...profile.experience,emptyExperience()])} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50"><Plus size={15}/> Add</button></div>
              {profile.experience.length===0&&<EmptyPanel title="No experience added yet" detail="Add your current or previous roles when you're ready."/>}
              <div className="space-y-4">{profile.experience.map((item,index)=><div key={index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Experience {index+1}</span><button type="button" onClick={()=>update('experience',profile.experience.filter((_,i)=>i!==index))} aria-label="Remove experience" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Job title"><input required maxLength={120} value={item.title} onChange={e=>update('experience',profile.experience.map((v,i)=>i===index?{...v,title:e.target.value}:v))} className="field-input"/></Field>
                  <Field label="Company"><input required maxLength={120} value={item.company} onChange={e=>update('experience',profile.experience.map((v,i)=>i===index?{...v,company:e.target.value}:v))} className="field-input"/></Field>
                  <Field label="Location"><input value={item.location} onChange={e=>update('experience',profile.experience.map((v,i)=>i===index?{...v,location:e.target.value}:v))} className="field-input"/></Field>
                  <div className="grid grid-cols-2 gap-2"><Field label="Start date"><input type="month" value={item.startDate} onChange={e=>update('experience',profile.experience.map((v,i)=>i===index?{...v,startDate:e.target.value}:v))} className="field-input"/></Field><Field label="End date"><input type="month" disabled={item.current} value={item.endDate} onChange={e=>update('experience',profile.experience.map((v,i)=>i===index?{...v,endDate:e.target.value}:v))} className="field-input"/></Field></div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2"><input type="checkbox" checked={item.current} onChange={e=>update('experience',profile.experience.map((v,i)=>i===index?{...v,current:e.target.checked,endDate:e.target.checked?'':v.endDate}:v))}/> I currently work here</label>
                  <Field label="Description"><textarea rows={2} value={item.description} onChange={e=>update('experience',profile.experience.map((v,i)=>i===index?{...v,description:e.target.value}:v))} className="field-input resize-y sm:col-span-2"/></Field>
                </div>
              </div>)}</div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><GraduationCap size={19}/></span><div><h2 className="font-bold">Education</h2><p className="text-xs text-slate-400">Highlight your academic background.</p></div></div><button type="button" onClick={()=>update('education',[...profile.education,emptyEducation()])} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50"><Plus size={15}/> Add</button></div>
              {profile.education.length===0&&<EmptyPanel title="No education added yet" detail="Add your degree, school or other relevant learning."/>}
              <div className="space-y-4">{profile.education.map((item,index)=><div key={index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Education {index+1}</span><button type="button" onClick={()=>update('education',profile.education.filter((_,i)=>i!==index))} aria-label="Remove education" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Institution"><input required maxLength={160} value={item.institution} onChange={e=>update('education',profile.education.map((v,i)=>i===index?{...v,institution:e.target.value}:v))} className="field-input"/></Field>
                  <Field label="Degree"><input required maxLength={120} value={item.degree} onChange={e=>update('education',profile.education.map((v,i)=>i===index?{...v,degree:e.target.value}:v))} className="field-input"/></Field>
                  <Field label="Field of study"><input value={item.fieldOfStudy} onChange={e=>update('education',profile.education.map((v,i)=>i===index?{...v,fieldOfStudy:e.target.value}:v))} className="field-input"/></Field>
                  <div className="grid grid-cols-2 gap-2"><Field label="Start date"><input type="month" value={item.startDate} onChange={e=>update('education',profile.education.map((v,i)=>i===index?{...v,startDate:e.target.value}:v))} className="field-input"/></Field><Field label="End date"><input type="month" value={item.endDate} onChange={e=>update('education',profile.education.map((v,i)=>i===index?{...v,endDate:e.target.value}:v))} className="field-input"/></Field></div>
                  <Field label="Notes"><textarea rows={2} value={item.description} onChange={e=>update('education',profile.education.map((v,i)=>i===index?{...v,description:e.target.value}:v))} className="field-input resize-y sm:col-span-2"/></Field>
                </div>
              </div>)}</div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><FileText size={19}/></span><div><h2 className="font-bold">Your resume</h2><p className="text-xs text-slate-400">PDF · Up to 5 MB</p></div></div>
              {profile.hasResume ? <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3"><div className="flex items-start gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600"/><div className="min-w-0"><p className="break-all text-sm font-semibold text-slate-800">{profile.resumeFileName || 'Resume uploaded'}</p><p className="mt-1 text-xs text-emerald-700">Your resume is securely stored.</p></div></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={resumeBusy} onClick={()=>void handleResumeDownload()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:text-violet-700"><Download size={14}/> View</button><button type="button" disabled={resumeBusy} onClick={()=>void handleResumeDelete()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-600 shadow-sm hover:bg-rose-50"><Trash2 size={14}/> Remove</button></div></div> : <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-4 text-center"><UploadCloud size={24} className="mx-auto text-violet-500"/><p className="mt-2 text-sm font-semibold text-slate-700">No resume uploaded</p><p className="mt-1 text-xs text-slate-400">Add a PDF so recruiters can review your experience.</p></div>}
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50">{resumeBusy?<LoaderCircle size={16} className="animate-spin"/>:<UploadCloud size={16}/>} {profile.hasResume?'Replace resume':'Upload resume'}<input type="file" accept="application/pdf,.pdf" onChange={handleResumeUpload} disabled={resumeBusy} className="sr-only"/></label>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="font-bold">Profile checklist</h2><p className="mt-1 text-xs text-slate-400">A complete profile helps recruiters understand your fit.</p>
              <div className="mt-4 space-y-3">{[
                ['Name',Boolean(profile.name.trim())],['Headline',Boolean(profile.headline.trim())],['Location',Boolean(profile.location.trim())],['Phone',Boolean(profile.phone.trim())],['Summary',Boolean(profile.summary.trim())],['Skills',profile.skills.length>0],['Experience',profile.experience.length>0],['Education',profile.education.length>0],['Resume',profile.hasResume],
              ].map(([label,done])=><div key={String(label)} className="flex items-center justify-between text-sm"><span className={done?'text-slate-700':'text-slate-400'}>{label}</span>{done?<CheckCircle2 size={16} className="text-emerald-500"/>:<span className="h-4 w-4 rounded-full border border-slate-300"/>}</div>)}</div>
            </section>

            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{saving?<LoaderCircle size={17} className="animate-spin"/>:<Save size={17}/>} {saving?'Saving profile…':'Save profile'}</button>
            <Link to="/dashboard" className="flex items-center justify-center gap-1 py-2 text-sm font-semibold text-slate-500 hover:text-violet-700">Back to dashboard <ChevronRight size={15}/></Link>
          </aside>
        </form>
      </main>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-sm font-semibold text-slate-700">{label}{children}</label>;
const EmptyPanel = ({ title, detail }: { title: string; detail: string }) => <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-7 text-center"><p className="text-sm font-semibold text-slate-600">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;

export default CandidateProfile;
