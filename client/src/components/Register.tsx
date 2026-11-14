import React, { useState } from 'react';
import API from '../services/api';

interface RegisterProps {
  onRegisterSuccess: (user: any) => void;
  switchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, switchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/auth/register', { name, email, password, role });
      localStorage.setItem('userInfo', JSON.stringify(data));
      onRegisterSuccess(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create Account</h2>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="candidate">Candidate</option>
            <option value="hr">HR / Recruiter</option>
          </select>
        </div>
        <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">Register</button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account? <button onClick={switchToLogin} className="text-blue-600 font-medium hover:underline">Login here</button>
      </p>
    </div>
  );
};
