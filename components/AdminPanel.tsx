
import React, { useState, useEffect, useMemo } from 'react';
import { GlobalMethodology, User, Project } from '../types';

interface AdminPanelProps {
  repository: GlobalMethodology[];
  projects: Project[];
  currentUser: User;
  onBack: () => void;
  onDeleteMethod?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onUpdateUser?: (user: User) => void;
  onDeleteUser?: (id: string) => void;
}

type AdminTab = 'MODELS' | 'PAPERS' | 'USERS' | 'PAYMENTS';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  repository,
  projects,
  currentUser,
  onBack,
  onDeleteMethod,
  onDeleteProject,
  onUpdateUser,
  onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('MODELS');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<GlobalMethodology | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filter States
  const [filterMethod, setFilterMethod] = useState('');
  const [filterAppArea, setFilterAppArea] = useState('');
  const [filterFuzzySystem, setFilterFuzzySystem] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    const allUsers = JSON.parse(localStorage.getItem('mcdm_all_users') || '[]');
    setUsers(allUsers);
  }, []);

  // Compute unique values for filter dropdowns
  const uniqueMethods = useMemo(() => Array.from(new Set(repository.map(r => r.method))), [repository]);
  const uniqueAppAreas = useMemo(() => Array.from(new Set(repository.map(r => r.application))), [repository]);
  const uniqueFuzzySystems = useMemo(() => Array.from(new Set(repository.map(r => r.fuzzySystem))), [repository]);

  // Apply Filters
  const filteredRepo = useMemo(() => {
    return repository.filter(item => {
      const matchMethod = !filterMethod || item.method === filterMethod;
      const matchApp = !filterAppArea || item.application === filterAppArea;
      const matchFuzzy = !filterFuzzySystem || item.fuzzySystem === filterFuzzySystem;
      // Admin sees all, users see only their own
      const matchOwner = isAdmin || item.userId === currentUser?.id;
      return matchMethod && matchApp && matchFuzzy && matchOwner;
    });
  }, [repository, filterMethod, filterAppArea, filterFuzzySystem, isAdmin, currentUser]);

  // Filter projects - admin sees all, users see only their own
  const filteredProjects = useMemo(() => {
    if (isAdmin) return projects;
    return projects.filter(p => p.userId === currentUser?.id);
  }, [projects, isAdmin, currentUser]);

  const totalPro = users.filter(u => u.isPro || u.role === 'PRO').length;

  const handleDeleteMethod = (id: string, paperName: string) => {
    if (confirm(`"${paperName}" metodunu silmek istediğinize emin misiniz?`)) {
      onDeleteMethod?.(id);
      setSelectedMethod(null);
    }
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`"${name}" projesini silmek istediğinize emin misiniz?`)) {
      onDeleteProject?.(id);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) {
      // Remove from localStorage
      const updatedUsers = users.filter(u => u.id !== id);
      localStorage.setItem('mcdm_all_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      onDeleteUser?.(id);
    }
  };

  const handleToggleProStatus = (user: User) => {
    const updatedUser = { ...user, isPro: !user.isPro };
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    localStorage.setItem('mcdm_all_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    onUpdateUser?.(updatedUser);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'MCDM Command Center' : 'My Research Dashboard'}
          </h2>
          <p className="text-slate-500 text-sm">
            {isAdmin ? 'Full administrative access to all resources' : 'Manage your papers and models'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('MODELS')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'MODELS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            Models
          </button>
          <button
            onClick={() => setActiveTab('PAPERS')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'PAPERS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            Papers
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('USERS')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'USERS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'PAYMENTS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                Economics
              </button>
            </>
          )}
          <button onClick={onBack} className="ml-4 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-sm">
            Exit Panel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isAdmin ? 'Total Models' : 'My Models'}
          </span>
          <p className="text-3xl font-black text-slate-900">{filteredRepo.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isAdmin ? 'Total Papers' : 'My Papers'}
          </span>
          <p className="text-3xl font-black text-slate-900">{filteredProjects.length}</p>
        </div>
        {isAdmin ? (
          <>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered Users</span>
              <p className="text-3xl font-black text-amber-500">{users.length + 1}</p>
            </div>
            <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Monthly Yield</span>
              <p className="text-3xl font-black">${totalPro * 49}</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Type</span>
              <p className="text-xl font-black text-amber-500">{currentUser.isPro ? 'PRO' : 'Free'}</p>
            </div>
            <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Member Since</span>
              <p className="text-lg font-black">2024</p>
            </div>
          </>
        )}
      </div>

      {/* MODELS TAB */}
      {activeTab === 'MODELS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Technique</label>
              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Methods</option>
                {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Application Area</label>
              <select
                value={filterAppArea}
                onChange={e => setFilterAppArea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Areas</option>
                {uniqueAppAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Fuzzy System</label>
              <select
                value={filterFuzzySystem}
                onChange={e => setFilterFuzzySystem(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Logic Systems</option>
                {uniqueFuzzySystems.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setFilterMethod(''); setFilterAppArea(''); setFilterFuzzySystem(''); }}
                className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors border border-slate-100 rounded-xl hover:bg-slate-50"
              >
                Reset Filters
              </button>
              <div className="flex-1 py-2 text-center text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
                {filteredRepo.length} MATCHES
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Paper Title</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Technique</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">App Area</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fuzzy System</th>
                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Owner</th>}
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRepo.length > 0 ? filteredRepo.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td
                        className="px-6 py-4 text-sm font-bold text-slate-700 truncate max-w-[200px] cursor-pointer hover:text-indigo-600"
                        onClick={() => setSelectedMethod(entry)}
                      >
                        {entry.paperName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold uppercase">
                          {entry.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{entry.application}</td>
                      <td className="px-6 py-4 text-sm text-amber-600 font-bold">{entry.fuzzySystem}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {entry.userId === 'admin-id' ? 'Admin' : entry.userId?.substring(0, 6) || 'Unknown'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setSelectedMethod(entry)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            View
                          </button>
                          {(isAdmin || entry.userId === currentUser?.id) && (
                            <button
                              onClick={() => handleDeleteMethod(entry.id, entry.paperName)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                        No models found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAPERS TAB */}
      {activeTab === 'PAPERS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Project Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Paper File</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Created</th>
                  {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Owner</th>}
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.length > 0 ? filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 truncate max-w-[200px]">{project.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-[150px]">{project.paperName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase">
                        {project.analysis?.method || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(project.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {project.userId === 'admin-id' ? 'Admin' : project.userId?.substring(0, 6) || 'Unknown'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      {(isAdmin || project.userId === currentUser?.id) && (
                        <button
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                      No papers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USERS TAB - Admin Only */}
      {activeTab === 'USERS' && isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Scholar Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Institution</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Purpose</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tier</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-amber-50/50 font-bold">
                  <td className="px-6 py-4 text-sm">Principal Investigator</td>
                  <td className="px-6 py-4 text-sm text-slate-600">MCDM Global Research</td>
                  <td className="px-6 py-4 text-sm text-indigo-600">admin@admin.edu</td>
                  <td className="px-6 py-4 text-sm text-slate-500">Research</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] uppercase">Admin</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-slate-300 text-xs">Primary Root</span>
                  </td>
                </tr>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{u.university}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 capitalize">{u.purpose}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.isPro ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.isPro ? 'Pro' : 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleToggleProStatus(u)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isPro
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            }`}
                        >
                          {u.isPro ? 'Downgrade' : 'Upgrade'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'PAYMENTS' && isAdmin && (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800">Financial Ledger</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">You have {totalPro} active pro subscriptions generating recurring revenue.</p>
          <div className="mt-8 flex justify-center gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl w-40">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Conversion Rate</span>
              <span className="text-xl font-black text-slate-800">{((totalPro / (users.length + 1)) * 100).toFixed(1)}%</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl w-40">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Churn Ratio</span>
              <span className="text-xl font-black text-slate-800">2.4%</span>
            </div>
          </div>
        </div>
      )}

      {/* Method Detail Modal */}
      {selectedMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMethod(null)}>
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Methodology Details</span>
                  <h3 className="text-xl font-bold mt-1">{selectedMethod.method}</h3>
                  <p className="text-indigo-200 text-sm mt-1">{selectedMethod.paperName}</p>
                </div>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto max-h-[60vh] space-y-6">
              <div className="bg-slate-50 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Application Domain</h4>
                <p className="text-slate-800 font-medium">{selectedMethod.application}</p>
              </div>

              <div className="bg-amber-50 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Fuzzy Logic System</h4>
                <p className="text-slate-800 font-medium">{selectedMethod.fuzzySystem}</p>
                <p className="text-slate-500 text-sm mt-1">Number Set: {selectedMethod.numberSet}</p>
              </div>

              {selectedMethod.logicModule && (
                <div className="bg-indigo-50 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Mathematical Methodology</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Fuzzy Number Type</span>
                      <p className="text-slate-800 font-bold mt-1">{selectedMethod.logicModule.fuzzyType}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {selectedMethod.logicModule.fuzzyType === 'Triangular' && 'μ(x) = max(0, min((x-a)/(b-a), (c-x)/(c-b)))'}
                        {selectedMethod.logicModule.fuzzyType === 'Trapezoidal' && 'μ(x) = max(0, min((x-a)/(b-a), 1, (d-x)/(d-c)))'}
                        {selectedMethod.logicModule.fuzzyType === 'Type-2' && 'Upper/Lower membership with FOU'}
                        {selectedMethod.logicModule.fuzzyType === 'Crisp' && 'Standard crisp values'}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Normalization</span>
                      <p className="text-slate-800 font-bold mt-1">{selectedMethod.logicModule.normalization}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {selectedMethod.logicModule.normalization === 'Vector' && 'rᵢⱼ = xᵢⱼ / √(Σxᵢⱼ²)'}
                        {selectedMethod.logicModule.normalization === 'Linear' && 'rᵢⱼ = (xᵢⱼ - min) / (max - min)'}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Aggregation</span>
                      <p className="text-slate-800 font-bold mt-1">{selectedMethod.logicModule.aggregation}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {selectedMethod.logicModule.aggregation === 'Distance-to-Ideal' && 'TOPSIS: Dᵢ = √(Σwⱼ(rᵢⱼ - r*ⱼ)²)'}
                        {selectedMethod.logicModule.aggregation === 'Weighted-Sum' && 'SAW: Sᵢ = Σwⱼ × rᵢⱼ'}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Defuzzification</span>
                      <p className="text-slate-800 font-bold mt-1">{selectedMethod.logicModule.defuzzification}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {selectedMethod.logicModule.defuzzification === 'Centroid' && 'x* = ∫xμ(x)dx / ∫μ(x)dx'}
                        {selectedMethod.logicModule.defuzzification === 'None' && 'No defuzzification'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-slate-400">
                Indexed: {new Date(selectedMethod.timestamp).toLocaleString('tr-TR')}
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-4 flex justify-end gap-3 border-t border-slate-200">
              {(isAdmin || selectedMethod.userId === currentUser?.id) && (
                <button
                  onClick={() => handleDeleteMethod(selectedMethod.id, selectedMethod.paperName)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setSelectedMethod(null)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
