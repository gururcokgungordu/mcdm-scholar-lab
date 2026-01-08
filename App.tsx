
import React, { useState, useEffect } from 'react';
import { AnalysisStatus, MCDMAnalysis, User, Project, AppView, GlobalMethodology } from './types';
import { analyzePaper } from './services/geminiService';
import { MCDMCalculator } from './components/MCDMCalculator';
import { Auth } from './components/Auth';
import { UserDashboard } from './components/UserDashboard';
import { AIIdeaTool } from './components/AIIdeaTool';
import { Settings } from './components/Settings';
import { AdminPanel } from './components/AdminPanel';
import { ModelBuilder } from './components/ModelBuilder';
import { ManuscriptEditor } from './components/ManuscriptEditor';
import { NewStudyBuilder } from './components/NewStudyBuilder';
import { SensitivityAnalysis } from './components/SensitivityAnalysis';
import { AnalysisRefineChat } from './components/AnalysisRefineChat';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>('AUTH');
  const [projects, setProjects] = useState<Project[]>([]);
  const [repository, setRepository] = useState<GlobalMethodology[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [analysis, setAnalysis] = useState<MCDMAnalysis | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Persistence
  useEffect(() => {
    const savedUser = localStorage.getItem('mcdm_user');
    const savedProjects = localStorage.getItem('mcdm_projects');
    const savedRepo = localStorage.getItem('mcdm_global_repo');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
    if (savedRepo) {
      setRepository(JSON.parse(savedRepo));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('mcdm_user', JSON.stringify(user));
    setView('DASHBOARD');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('mcdm_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mcdm_user');
    setView('AUTH');
    setIsMenuOpen(false);
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId ? { ...p, name: newName } : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('mcdm_projects', JSON.stringify(updatedProjects));
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Please upload a valid PDF file.");
      setStatus(AnalysisStatus.ERROR);
      return;
    }

    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setAnalysis(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setPdfBase64(base64); // Store for re-analysis
        try {
          const result = await analyzePaper(base64);

          if (!result.matrix || result.matrix.length === 0) {
            throw new Error("No decision matrix could be found in the document.");
          }

          const newProject: Project = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Research Model - ${result.method}`,
            createdAt: Date.now(),
            paperName: file.name,
            analysis: result,
            userId: currentUser?.id
          };

          const updatedProjects = [newProject, ...projects];
          setProjects(updatedProjects);
          localStorage.setItem('mcdm_projects', JSON.stringify(updatedProjects));

          // Fix: LogicModule was required but missing in the repoEntry creation
          const repoEntry: GlobalMethodology = {
            id: Math.random().toString(36).substr(2, 9),
            paperName: file.name,
            method: result.method,
            application: result.applicationArea,
            fuzzySystem: result.fuzzySystem,
            numberSet: result.numberSet,
            timestamp: Date.now(),
            logicModule: result.logicModule,
            userId: currentUser?.id
          };
          const updatedRepo = [repoEntry, ...repository];
          setRepository(updatedRepo);
          localStorage.setItem('mcdm_global_repo', JSON.stringify(updatedRepo));

          setAnalysis(result);
          setCurrentProject(newProject);
          setStatus(AnalysisStatus.SUCCESS);
        } catch (err: any) {
          setError(err.message || "Failed to analyze paper.");
          setStatus(AnalysisStatus.ERROR);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Error reading file.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const openProject = (p: Project) => {
    setCurrentProject(p);
    setAnalysis(p.analysis);
    setView('ANALYZER');
    setStatus(AnalysisStatus.SUCCESS);
  };

  const handleBuildHybrid = (newProject: Project) => {
    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    localStorage.setItem('mcdm_projects', JSON.stringify(updatedProjects));
    openProject(newProject);
  };

  const handleDeleteMethod = (methodId: string) => {
    const updatedRepo = repository.filter(r => r.id !== methodId);
    setRepository(updatedRepo);
    localStorage.setItem('mcdm_global_repo', JSON.stringify(updatedRepo));
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    localStorage.setItem('mcdm_projects', JSON.stringify(updatedProjects));
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      {view !== 'AUTH' && currentUser && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <button onClick={() => setView('DASHBOARD')} className="flex items-center space-x-3 group">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="text-lg font-bold text-slate-900 leading-none">MCDM Scholar</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Laboratory Environment</p>
              </div>
            </button>

            <nav className="hidden lg:flex items-center space-x-6 mr-auto ml-12">
              <button onClick={() => setView('DASHBOARD')} className={`text-xs font-bold uppercase tracking-wider ${view === 'DASHBOARD' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Repository</button>
              <button onClick={() => { setView('ANALYZER'); setStatus(AnalysisStatus.IDLE); }} className={`text-xs font-bold uppercase tracking-wider ${view === 'ANALYZER' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Analyzer</button>
              <button onClick={() => setView('MODEL_BUILDER')} className={`text-xs font-bold uppercase tracking-wider ${view === 'MODEL_BUILDER' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Model Builder</button>
              <button onClick={() => setView('IDEA_TOOL')} className={`text-xs font-bold uppercase tracking-wider ${view === 'IDEA_TOOL' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Idea Hub</button>
            </nav>

            <div className="flex items-center space-x-6">
              {isAdmin && (
                <button
                  onClick={() => setView('ADMIN_PANEL')}
                  className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-full hover:bg-slate-800 transition-all flex items-center tracking-widest"
                >
                  ADMIN PANEL
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-3 p-1 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                    {currentUser.name.charAt(0)}
                  </div>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in zoom-in-95 duration-200 overflow-hidden">
                    <button onClick={() => { setView('DASHBOARD'); setIsMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">My Projects</button>
                    <button onClick={() => { setView('ADMIN_PANEL'); setIsMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">My Resources</button>
                    <button onClick={() => { setView('MODEL_BUILDER'); setIsMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-indigo-600 font-bold hover:bg-indigo-50">Model Builder</button>
                    <button onClick={() => { setView('SETTINGS'); setIsMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Settings</button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 font-medium">Logout</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {view === 'AUTH' && <Auth onLogin={handleLogin} />}

        {view === 'DASHBOARD' && currentUser && (
          <UserDashboard
            user={currentUser}
            projects={projects}
            onNewProject={() => { setView('ANALYZER'); setStatus(AnalysisStatus.IDLE); }}
            onOpenProject={openProject}
            onOpenIdeaTool={() => setView('IDEA_TOOL')}
            onRenameProject={handleRenameProject}
            onOpenModelBuilder={() => setView('MODEL_BUILDER')}
          />
        )}

        {view === 'MODEL_BUILDER' && (
          <ModelBuilder
            projects={projects}
            onBuild={handleBuildHybrid}
            onBack={() => setView('DASHBOARD')}
          />
        )}

        {view === 'WRITER' && analysis && (
          <ManuscriptEditor
            analysis={analysis}
            onBack={() => setView('ANALYZER')}
          />
        )}

        {view === 'NEW_STUDY' && analysis && (
          <NewStudyBuilder
            baseModel={analysis}
            onBack={() => setView('ANALYZER')}
          />
        )}

        {view === 'SENSITIVITY' && analysis && (
          <SensitivityAnalysis
            analysis={analysis}
            onBack={() => setView('ANALYZER')}
          />
        )}

        {view === 'IDEA_TOOL' && <AIIdeaTool repository={repository} />}

        {view === 'SETTINGS' && currentUser && (
          <Settings user={currentUser} onUpdateUser={handleUpdateUser} onBack={() => setView('DASHBOARD')} />
        )}

        {view === 'ADMIN_PANEL' && currentUser && (
          <AdminPanel
            repository={repository}
            projects={projects}
            currentUser={currentUser}
            onBack={() => setView('DASHBOARD')}
            onDeleteMethod={handleDeleteMethod}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {view === 'ANALYZER' && (
          <>
            {(status === AnalysisStatus.IDLE || status === AnalysisStatus.ERROR) && (
              <div className="max-w-2xl mx-auto mt-16 text-center">
                <button onClick={() => setView('DASHBOARD')} className="text-sm font-bold text-indigo-600 mb-8 hover:underline flex items-center mx-auto">Back to Projects</button>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Start New Replication</h2>

                {status === AnalysisStatus.ERROR && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <div
                  className="relative group mt-8"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-3xl transition-all cursor-pointer shadow-xl group ${isDragging
                      ? 'border-indigo-600 bg-indigo-50 shadow-indigo-100 ring-4 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-400'
                      }`}
                  >
                    <div className="flex flex-col items-center justify-center p-12 pointer-events-none">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragging ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-lg font-bold text-slate-700 mb-2">
                        {isDragging ? 'Drop Manuscript Here' : 'Drop PDF or Click to Upload'}
                      </p>
                      <p className="text-sm text-slate-400">AI will rebuild the mathematical logic automatically.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {status === AnalysisStatus.ANALYZING && (
              <div className="max-w-xl mx-auto mt-24 text-center">
                <div className="relative w-32 h-32 mx-auto mb-10">
                  <div className="absolute inset-0 border-[6px] border-slate-100 rounded-full"></div>
                  <div className="absolute inset-0 border-[6px] border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Decoding Academic Matrix...</h3>
                <p className="text-slate-500 mt-4 animate-pulse">Scanning tables and mathematical weights...</p>
              </div>
            )}

            {status === AnalysisStatus.SUCCESS && analysis && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                  <button onClick={() => setView('DASHBOARD')} className="text-sm font-bold text-slate-400 hover:text-indigo-600 flex items-center">Back to Laboratory</button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('NEW_STUDY')}
                      className="bg-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      Reference for New Study
                    </button>
                    <button
                      onClick={() => setView('WRITER')}
                      className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Write Paper Draft
                    </button>
                    <button
                      onClick={() => setView('SENSITIVITY')}
                      className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Sensitivity Analysis
                    </button>
                    <div className="bg-indigo-50 px-4 py-1.5 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-widest border border-indigo-100">Active Model: {analysis.method}</div>
                  </div>
                </div>
                <MCDMCalculator key={JSON.stringify(analysis)} initialData={analysis} />
                <AnalysisRefineChat analysis={analysis} pdfBase64={pdfBase64} onAnalysisUpdate={setAnalysis} />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="py-8 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">© 2024 MCDM Scholar Lab • Secure Academic Computation</p>
      </footer>
    </div>
  );
};

export default App;
