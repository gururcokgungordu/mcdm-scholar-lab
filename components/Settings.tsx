
import React, { useState } from 'react';
import { User } from '../types';

interface SettingsProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser, onBack }) => {
  const [formData, setFormData] = useState<User>({ ...user });
  const [saveStatus, setSaveStatus] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(formData);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-bold text-slate-400 hover:text-indigo-600 flex items-center transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Scholar Profile & Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    disabled
                    value={formData.email}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">University</label>
                  <input 
                    type="text" 
                    value={formData.university}
                    onChange={e => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">School / Department</label>
                  <input 
                    type="text" 
                    value={formData.school}
                    onChange={e => setFormData({ ...formData, school: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Primary Research Purpose</label>
                <select 
                  value={formData.purpose}
                  onChange={e => setFormData({ ...formData, purpose: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="education">Education / Teaching</option>
                  <option value="research">Academic Research</option>
                  <option value="commercial">Commercial Analysis</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button 
                  type="submit"
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Save Changes
                </button>
                {saveStatus && (
                  <span className="text-green-600 text-sm font-bold animate-in fade-in slide-in-from-right-2">
                    ✓ Profile updated successfully
                  </span>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Subscription Sidebar */}
        <div className="space-y-6">
          <div className={`p-8 rounded-3xl border shadow-sm ${formData.isPro ? 'bg-indigo-900 border-indigo-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-bold text-lg">Subscription</h3>
              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${formData.isPro ? 'bg-amber-400 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                {formData.isPro ? 'Pro Member' : 'Free Tier'}
              </span>
            </div>
            
            <p className={`text-sm mb-8 leading-relaxed ${formData.isPro ? 'text-indigo-200' : 'text-slate-500'}`}>
              {formData.isPro 
                ? 'Your account has unlimited access to high-fidelity PDF extraction and advanced hybrid model logic.' 
                : 'Upgrade to unlock bulk paper analysis, private repository access, and priority Gemini-3-Pro inference.'}
            </p>

            {!formData.isPro && (
              <button 
                onClick={() => onUpdateUser({ ...formData, isPro: true })}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-100 hover:scale-[1.02] transition-all"
              >
                UPGRADE TO PRO
              </button>
            )}
            
            {formData.isPro && (
              <div className="space-y-4">
                <div className="flex items-center text-xs text-indigo-300 font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Priority Processing Active
                </div>
                <button 
                  onClick={() => onUpdateUser({ ...formData, isPro: false })}
                  className="w-full py-2 text-xs text-indigo-400 hover:text-white font-bold transition-colors"
                >
                  Manage Billing
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
            <h4 className="font-bold text-slate-800 mb-2 text-sm">Account Security</h4>
            <p className="text-xs text-slate-500 mb-4">Update your password or manage two-factor authentication.</p>
            <button className="text-xs font-bold text-indigo-600 hover:underline">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};
