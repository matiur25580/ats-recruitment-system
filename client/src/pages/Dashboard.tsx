import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast'; // Toast ইম্পোর্ট
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- রিক্রুটার স্টেট ---
  const [formData, setFormData] = useState({ title: '', description: '', requirements: '', location: '', salary: '', jobType: 'Full-time', experienceLevel: 'Entry' });
  const [selectedJobApplicants, setSelectedJobApplicants] = useState<any[] | null>(null);

  // --- ক্যান্ডিডেট স্টেট ---
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchJobs(parsedUser);
      if (parsedUser.role === 'candidate') {
        fetchMyApplications();
      } else if (parsedUser.role === 'recruiter') {
        fetchStats();
      }
    } else { navigate('/login'); }
  }, [navigate]);

  const fetchJobs = async (currentUser: any) => {
    try {
      const res = await api.get('/jobs');
      if (currentUser.role === 'recruiter') {
        const myJobs = res.data.filter((job: any) => job.recruiter._id === currentUser._id);
        setJobs(myJobs);
      } else { setJobs(res.data); }
    } catch (error) { console.error('Error fetching jobs', error); }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await api.get('/applications/my-applications');
      setMyApplications(res.data);
    } catch (error) { console.error('Error fetching my applications', error); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats/recruiter');
      setStats(res.data);
    } catch (error) { console.error('Error fetching stats', error); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login');
  };

  // --- রিক্রুটার ফাংশন ---
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const jobData = { ...formData, salary: Number(formData.salary), requirements: formData.requirements.split(',').map(req => req.trim()) };
      await api.post('/jobs', jobData);
      toast.success('Job posted successfully!');
      setFormData({ title: '', description: '', requirements: '', location: '', salary: '', jobType: 'Full-time', experienceLevel: 'Entry' });
      fetchJobs(user);
      fetchStats();
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to post job'); 
    } finally { setLoading(false); }
  };

  const handleViewApplicants = async (jobId: string) => {
    setLoading(true); setSelectedJobApplicants(null); 
    try {
      const res = await api.get(`/applications/${jobId}`);
      setSelectedJobApplicants(res.data);
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to load applicants'); 
    } finally { setLoading(false); }
  };

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      await api.put(`/applications/${appId}/status`, { status });
      toast.success(`Application marked as ${status}`);
      if (selectedJobApplicants && selectedJobApplicants.length > 0) {
        const jobId = selectedJobApplicants[0].job._id || selectedJobApplicants[0].job;
        handleViewApplicants(jobId);
      }
      fetchStats();
    } catch (error: any) { 
      toast.error('Failed to update status'); 
    }
  };

  // --- ক্যান্ডিডেট ফাংশন ---
  const handleApplyJob = async (jobId: string) => {
    if (!resumeFile) { 
      toast.error('Please select a resume file (PDF/Word) to apply.'); 
      return; 
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('coverLetter', coverLetter);
      formData.append('resume', resumeFile);

      await api.post(`/applications/${jobId}`, formData);
      toast.success('Application submitted successfully!');
      setApplyJobId(null); setCoverLetter(''); setResumeFile(null);
      fetchMyApplications();
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to apply'); 
    } finally { setLoading(false); }
  };

  const handleOpenResume = async (appId: string) => {
    const resumeWindow = window.open('about:blank', '_blank');
    if (!resumeWindow) {
      toast.error('Allow pop-ups to open the resume.');
      return;
    }
    resumeWindow.opener = null;
    try {
      const { data } = await api.get(`/applications/${appId}/resume`);
      resumeWindow.location.href = data.url;
    } catch (error: any) {
      resumeWindow.close();
      toast.error(error.response?.data?.message || 'Failed to open resume');
    }
  };

  if (!user) return null;

  const COLORS = ['#FBBF24', '#10B981', '#EF4444'];

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-12">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold capitalize">{user.role} Dashboard</h1>
            <p className="text-gray-600">Welcome, {user.name}</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">Logout</button>
        </div>

        {/* রিক্রুটার অ্যানালিটিক্স */}
        {user.role === 'recruiter' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-center items-center border-l-4 border-blue-500">
              <h3 className="text-gray-500 font-medium mb-2">Total Posted Jobs</h3>
              <p className="text-4xl font-bold text-blue-600">{stats.totalJobs}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-center items-center border-l-4 border-purple-500">
              <h3 className="text-gray-500 font-medium mb-2">Total Applications</h3>
              <p className="text-4xl font-bold text-purple-600">{stats.totalApplications}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-center items-center border-l-4 border-green-500">
              <h3 className="text-gray-500 font-medium mb-2">Avg AI Match Score</h3>
              <p className="text-4xl font-bold text-green-600">{stats.averageMatchScore}%</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
              <h3 className="text-lg font-bold mb-4 text-center">Application Status Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {stats.statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-bold mb-4 text-center">Status Overview</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* রিক্রুটার ভিউ */}
          {user.role === 'recruiter' && (
            <>
              <div className="bg-white p-6 rounded-lg shadow-md md:col-span-1 h-fit">
                <h2 className="text-xl font-bold mb-4">Post a New Job</h2>
                <form onSubmit={handlePostJob} className="space-y-3">
                  <input type="text" placeholder="Job Title" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                  <textarea placeholder="Job Description" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" rows={3}></textarea>
                  <input type="text" placeholder="Requirements (comma separated)" required value={formData.requirements} onChange={(e) => setFormData({...formData, requirements: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Location" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-1/2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="number" placeholder="Salary" required value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} className="w-1/2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">Post Job</button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
                <h2 className="text-xl font-bold mb-4">My Posted Jobs</h2>
                {jobs.length === 0 ? <p className="text-gray-500 text-sm">You haven't posted any jobs yet.</p> : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {jobs.map((job) => (
                      <div key={job._id} className="p-4 border rounded-md bg-gray-50 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">{job.title}</h3>
                          <p className="text-sm text-gray-600">{job.location} • {job.jobType}</p>
                        </div>
                        <button onClick={() => handleViewApplicants(job._id)} className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-black transition">View Applicants</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedJobApplicants !== null && (
                <div className="md:col-span-3 bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Applicants List</h2>
                    <button onClick={() => setSelectedJobApplicants(null)} className="text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded">✕ Close</button>
                  </div>
                  {selectedJobApplicants.length === 0 ? <p className="text-gray-500">No one has applied yet.</p> : (
                    <div className="space-y-4">
                      {selectedJobApplicants.map((app: any) => (
                        <div key={app._id} className="p-4 border rounded-md flex flex-col md:flex-row justify-between bg-gray-50">
                          <div className="w-full">
                            <h3 className="font-bold text-lg">{app.candidate?.name}</h3>
                            <p className="text-sm text-gray-600">{app.candidate?.email}</p>
                            <p className="text-sm text-gray-700 italic mt-1">"{app.coverLetter}"</p>
                            {app.resumePublicId && (
                              <button type="button" onClick={() => handleOpenResume(app._id)} className="text-blue-600 text-sm underline mt-1 block font-medium">View Resume</button>
                            )}
                            {app.matchScore !== undefined && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md max-w-lg">
                                <p className="text-sm font-bold text-blue-800">🤖 AI Match Score: {app.matchScore}%</p>
                                <p className="text-xs text-gray-700 mt-1 italic">"{app.aiSummary}"</p>
                              </div>
                            )}
                            {app.aiAnalysisStatus === 'unavailable' && (
                              <p className="mt-3 text-xs text-gray-600">AI analysis unavailable. Review the resume manually.</p>
                            )}
                            <p className="text-xs mt-3 font-semibold">Status: <span className="text-blue-600">{app.status}</span></p>
                          </div>
                          <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end items-end">
                            <button onClick={() => handleUpdateStatus(app._id, 'Accepted')} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 transition h-10">Accept</button>
                            <button onClick={() => handleUpdateStatus(app._id, 'Rejected')} className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition h-10">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ক্যান্ডিডেট ভিউ */}
          {user.role === 'candidate' && (
            <>
              <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Available Jobs</h2>
                {jobs.length === 0 ? <p className="text-gray-500">No jobs available right now.</p> : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {jobs.map((job) => (
                      <div key={job._id} className="p-4 border rounded-md bg-gray-50 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{job.title}</h3>
                          <p className="text-sm text-gray-700 mb-2">{job.description}</p>
                          <p className="text-sm text-gray-600"><strong>Location:</strong> {job.location} | <strong>Salary:</strong> ${job.salary}</p>
                        </div>
                        <div className="mt-4 border-t pt-3">
                          {applyJobId === job._id ? (
                            <div className="space-y-2">
                              <textarea placeholder="Write a short cover letter..." value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
                              <div className="bg-white p-2 border rounded-md">
                                <label className="block text-xs text-gray-500 mb-1">Upload Resume (PDF)</label>
                                <input type="file" accept="application/pdf,.pdf" onChange={(e) => { if (e.target.files) setResumeFile(e.target.files[0]); }} className="text-sm w-full" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleApplyJob(job._id)} disabled={loading} className="bg-green-600 text-white px-3 py-2 rounded text-sm w-full hover:bg-green-700 transition disabled:bg-green-300">{loading ? 'Analyzing...' : 'Submit'}</button>
                                <button onClick={() => setApplyJobId(null)} className="bg-gray-400 text-white px-3 py-2 rounded text-sm w-full hover:bg-gray-500 transition">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setApplyJobId(job._id)} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">Apply Now</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md md:col-span-1 border-t-4 border-blue-500 h-fit">
                <h2 className="text-xl font-bold mb-4">My Applications</h2>
                {myApplications.length === 0 ? (
                  <p className="text-gray-500 text-sm">You haven't applied to any jobs yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {myApplications.map((app: any) => (
                      <div key={app._id} className="p-3 border rounded-md bg-gray-50">
                        <h3 className="font-bold text-md">{app.job?.title || 'Job Removed'}</h3>
                        <p className="text-xs text-gray-600 mb-2">{app.job?.location || 'N/A'}</p>
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            app.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                            app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {app.status}
                          </span>
                          {app.matchScore !== undefined && (
                            <span className="text-xs font-bold text-blue-600">🤖 {app.matchScore}% Match</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
