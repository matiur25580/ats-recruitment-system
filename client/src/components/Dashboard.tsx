import React, { useState, useEffect } from 'react';
import API from '../services/api';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [skills, setSkills] = useState('');

  const fetchJobs = async () => {
    try {
      const { data } = await API.get('/jobs');
      setJobs(data.data);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = skills.split(',').map(s => s.trim());
      await API.post('/jobs', { title, description, company, location, salary, skillsRequired: skillsArray });
      setTitle(''); setDescription(''); setCompany(''); setLocation(''); setSalary(''); setSkills('');
      setMessage('Job posted successfully!');
      fetchJobs();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to post job');
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile || !selectedJob) return;

    const formData = new FormData();
    formData.append('resume', resumeFile);

    try {
      setUploading(true);
      const { data } = await API.post(`/applications/${selectedJob._id}/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`Application submitted successfully! ATS Score: ${data.data.atsScore}%`);
      setUploading(false);
      setResumeFile(null);
      setSelectedJob(null);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Application failed');
      setUploading(false);
    }
  };

  const fetchApplications = async (jobId: string) => {
    try {
      const { data } = await API.get(`/applications/${jobId}`);
      setApplications(data.data);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    }
  };

  const handleViewResume = async (appId: string) => {
    const resumeWindow = window.open('about:blank', '_blank');
    if (!resumeWindow) {
      setMessage('Allow pop-ups to open the resume.');
      return;
    }
    resumeWindow.opener = null;
    try {
      const { data } = await API.get(`/applications/${appId}/resume`);
      resumeWindow.location.href = data.url;
    } catch (err: any) {
      resumeWindow.close();
      setMessage(err.response?.data?.message || 'Failed to open resume');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">ATS Recruitment Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {user.name} ({user.role.toUpperCase()})</p>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Logout</button>
      </nav>

      <div className="max-w-4xl mx-auto mt-6 px-4">
        {message && <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded text-sm">{message}</div>}

        {user.role !== 'candidate' && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Post a New Job</h2>
            <form onSubmit={handleCreateJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Job Title" value={title} onChange={e => setTitle(e.target.value)} required className="p-2 border rounded" />
              <input type="text" placeholder="Company Name" value={company} onChange={e => setCompany(e.target.value)} required className="p-2 border rounded" />
              <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} required className="p-2 border rounded" />
              <input type="text" placeholder="Salary (e.g. $50k-$70k)" value={salary} onChange={e => setSalary(e.target.value)} className="p-2 border rounded" />
              <input type="text" placeholder="Skills Required (comma separated)" value={skills} onChange={e => setSkills(e.target.value)} required className="p-2 border rounded md:col-span-2" />
              <textarea placeholder="Job Description" value={description} onChange={e => setDescription(e.target.value)} required className="p-2 border rounded md:col-span-2" rows={3}></textarea>
              <button type="submit" className="md:col-span-2 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">Post Job</button>
            </form>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4 text-gray-800">Available Jobs</h2>
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job._id} className="bg-white p-5 rounded-lg shadow-md border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                <p className="text-sm text-gray-600">{job.company} • {job.location} • <span className="font-medium text-green-600">{job.salary || 'Competitive'}</span></p>
                <p className="text-sm text-gray-500 mt-2">{job.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {job.skillsRequired.map((skill: string, idx: number) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">{skill}</span>
                  ))}
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex gap-2">
                {user.role === 'candidate' ? (
                  <button onClick={() => setSelectedJob(job)} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700">Apply with Resume</button>
                ) : (
                  <button onClick={() => fetchApplications(job._id)} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700">View Applicants</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedJob && user.role === 'candidate' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h3 className="text-lg font-bold mb-2">Apply for {selectedJob.title}</h3>
              <p className="text-sm text-gray-600 mb-4">Upload your Resume in PDF format to get an instant AI ATS score.</p>
              <form onSubmit={handleApply} className="space-y-4">
                <input type="file" accept="application/pdf" onChange={e => setResumeFile(e.target.files?.[0] || null)} required className="w-full p-2 border rounded text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setSelectedJob(null)} className="px-4 py-2 bg-gray-300 rounded text-sm">Cancel</button>
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700">{uploading ? 'Analyzing...' : 'Submit Application'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {applications.length > 0 && user.role !== 'candidate' && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Applicants (Sorted by ATS Score)</h3>
            <div className="space-y-3">
              {applications.map(app => (
                <div key={app._id} className="p-4 border rounded flex justify-between items-center bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-800">{app.candidate?.name} ({app.candidate?.email})</p>
                    <p className="text-xs text-gray-500">Matched Skills: {app.matchedSkills.join(', ') || 'None'}</p>
                    <button type="button" onClick={() => handleViewResume(app._id)} className="text-xs text-blue-600 underline mt-1 inline-block">View Resume PDF</button>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">{app.atsScore}%</span>
                    <p className="text-xs text-gray-500 uppercase">{app.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
