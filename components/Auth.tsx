
import React, { useState } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    university: '',
    school: '',
    purpose: 'education' as User['purpose']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Hardcoded Admin Logic
    if (!isRegistering) {
      if (formData.email === 'admin@admin.edu' && formData.password === 'admin') {
        const adminUser: User = {
          id: 'admin-id',
          name: 'Principal Investigator',
          email: 'admin@admin.edu',
          university: 'MCDM Global Research',
          school: 'Management Science',
          purpose: 'research',
          role: 'ADMIN',
          isPro: true
        };
        onLogin(adminUser);
        return;
      } else if (formData.email === 'user@user.com' && formData.password === 'user') {
          // Quick test user
          onLogin({
              id: 'test-user',
              name: 'John Scholar',
              email: 'user@user.com',
              university: 'Oxford',
              school: 'Engineering',
              purpose: 'education',
              role: 'USER',
              isPro: false
          });
          return;
      } else {
        setError('Invalid credentials. Use admin@admin.edu / admin.');
        return;
      }
    }

    // Standard Registration Logic
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      email: formData.email,
      university: formData.university,
      school: formData.school,
      purpose: formData.purpose,
      role: 'USER',
      isPro: false
    };
    
    // Save to global user list for admin panel simulation
    const users = JSON.parse(localStorage.getItem('mcdm_all_users') || '[]');
    localStorage.setItem('mcdm_all_users', JSON.stringify([...users, newUser]));
    
    onLogin(newUser);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 21a9.956 9.956 0 008.332-4.513l.054.091M12 11V3m0 8c2.148 0 4.148.815 5.657 2.143M12 11a10.04 10.04 0 00-5.657 2.143m0 0a8.966 8.966 0 011.89-1.757m0 0a8.966 8.966 0 014.074-1.25" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{isRegistering ? 'Scholar Registration' : 'Researcher Login'}</h2>
          <p className="text-slate-500 text-sm mt-2">Access the global MCDM replication laboratory</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">University</label>
                  <input required type="text" value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">School</label>
                  <input required type="text" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
            <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          
          <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            {isRegistering ? 'Initialize Profile' : 'Enter Dashboard'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {isRegistering ? 'Member? Sign In' : "New Researcher? Create Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};
