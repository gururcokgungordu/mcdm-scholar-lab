
import React, { useState } from 'react';
import { Project, User } from '../types';

interface DashboardProps {
  user: User;
  projects: Project[];
  onNewProject: () => void;
  onOpenProject: (p: Project) => void;
  onOpenIdeaTool: () => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onOpenModelBuilder?: () => void;
}

export const UserDashboard: React.FC<DashboardProps> = ({ 
  user, 
  projects, 
  onNewProject, 
  onOpenProject, 
  onOpenIdeaTool,
  onRenameProject,
  onOpenModelBuilder
}) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const handleStartEdit = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation(); 
    setEditingProjectId(p.id);
    setEditNameValue(p.name);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
  };

  const handleSaveEdit = (e: React.MouseEvent | React.FormEvent, projectId: string) => {
    if (e.type === 'submit' || (e as React.MouseEvent).type === 'click') {
      (e as any).preventDefault();
      (e as any).stopPropagation();
    }
    
    if (editNameValue.trim()) {
      onRenameProject(projectId, editNameValue.trim());
    }
    setEditingProjectId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, projectId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(e as any, projectId);
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Welcome, {user.name.split(' ')[0]}</h2>
          <p className="text-slate-500">{user.university} Scholar • {user.school}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={onOpenIdeaTool}
            className="px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center shadow-sm text-sm"
          >
            AI Idea Hub
          </button>
          <button 
            onClick={onOpenModelBuilder}
            className="px-5 py-3 bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition-all flex items-center text-sm shadow-sm"
          >
            Model Architect
          </button>
          <button 
            onClick={onNewProject}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center text-sm"
          >
            Convert Paper
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-slate-800 text-lg">Replicated Models</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{projects.length} Total</span>
          </div>
          {projects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <p className="text-slate-400 font-medium">No models generated yet. Start by converting a research paper.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {projects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => onOpenProject(p)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left flex justify-between items-center group cursor-pointer"
                >
                  <div className="space-y-1 flex-1 mr-4">
                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                    <p className="text-xs text-slate-500">Method: {p.analysis.method} | Logic: {p.analysis.fuzzySystem}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="font-bold text-lg mb-2">Model Lab Stats</h3>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-white/5 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Analyses</span>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hybrids</span>
                <p className="text-2xl font-bold">{projects.filter(p => p.name.includes('Hybrid')).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
            <h4 className="text-amber-900 font-bold mb-2">Architect Mode</h4>
            <p className="text-amber-800 text-xs leading-relaxed">
              Use the Model Builder to mix weighting from one paper with the ranking method of another.
            </p>
            <button 
               onClick={onOpenModelBuilder}
               className="mt-4 text-xs font-black text-amber-600 uppercase hover:underline"
            >
               Open Builder →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
