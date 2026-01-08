
import React, { useState } from 'react';
import { Project, MCDMAnalysis, MethodologyModule } from '../types';

interface ModelBuilderProps {
  projects: Project[];
  onBuild: (newProject: Project) => void;
  onBack: () => void;
}

export const ModelBuilder: React.FC<ModelBuilderProps> = ({ projects, onBuild, onBack }) => {
  const [modelName, setModelName] = useState('New Hybrid Study');
  const [parts, setParts] = useState({
    weightSource: '',
    fuzzySource: '',
    rankingSource: ''
  });

  const handleBuild = () => {
    const wProj = projects.find(p => p.id === parts.weightSource);
    const fProj = projects.find(p => p.id === parts.fuzzySource);
    const rProj = projects.find(p => p.id === parts.rankingSource);

    if (!wProj || !fProj || !rProj) return;

    const hybridModule: MethodologyModule = {
      fuzzyType: fProj.analysis.logicModule.fuzzyType,
      normalization: rProj.analysis.logicModule.normalization,
      aggregation: rProj.analysis.logicModule.aggregation,
      defuzzification: fProj.analysis.logicModule.defuzzification
    };

    const analysis: MCDMAnalysis = {
      method: `Hybrid ${fProj.analysis.logicModule.fuzzyType}-${wProj.analysis.method}-${rProj.analysis.method}`,
      applicationArea: "Cross-Synthesis Research",
      fuzzySystem: fProj.analysis.fuzzySystem,
      numberSet: fProj.analysis.numberSet,
      criteria: [...wProj.analysis.criteria],
      alternatives: [...rProj.analysis.alternatives],
      matrix: [...rProj.analysis.matrix],
      originalRanking: [],
      summary: `Novel hybrid model combining atomic units from ${wProj.paperName}, ${fProj.paperName}, and ${rProj.paperName}.`,
      logicModule: hybridModule
    };

    onBuild({
      id: Math.random().toString(36).substr(2, 9),
      name: modelName,
      createdAt: Date.now(),
      paperName: "Cross-Synthesis Result",
      analysis
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-indigo-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2v20c-5.07 0-9.22-3.84-9.92-8.74L1 13H0v-2h1l.08-.26C1.78 5.84 5.93 2 11 2zm2 0c5.07 0 9.22 3.84 9.92 8.74L23 11h1v2h-1l-.08.26C22.22 18.16 18.07 22 13 22V2z"/></svg>
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Hybrid Synthesis Laboratory</h2>
        <p className="text-indigo-300 font-medium">Mix and match mathematical DNA from different research papers.</p>
        
        <input 
          value={modelName}
          onChange={e => setModelName(e.target.value)}
          className="mt-8 w-full bg-white/10 border-b-2 border-white/20 text-2xl font-bold py-2 focus:border-indigo-400 outline-none transition-all"
          placeholder="Hybrid Study Name..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Weights */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 space-y-4">
          <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase">Step 01</span>
          <h4 className="font-bold text-slate-800">Criteria Weighting</h4>
          <p className="text-xs text-slate-400">Select paper for criteria & weights</p>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={e => setParts({...parts, weightSource: e.target.value})}
          >
            <option value="">Select Paper...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.analysis.method} ({p.paperName})</option>)}
          </select>
        </div>

        {/* Step 2: Fuzzy Set */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 space-y-4">
          <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase">Step 02</span>
          <h4 className="font-bold text-slate-800">Bulanık Mantık Sistemi</h4>
          <p className="text-xs text-slate-400">Select paper for fuzzy number type</p>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500"
            onChange={e => setParts({...parts, fuzzySource: e.target.value})}
          >
            <option value="">Select Logic...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.analysis.logicModule.fuzzyType} ({p.analysis.fuzzySystem})</option>)}
          </select>
        </div>

        {/* Step 3: Ranking Method */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 space-y-4">
          <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-3 py-1 rounded-full uppercase">Step 03</span>
          <h4 className="font-bold text-slate-800">Ranking Algorithm</h4>
          <p className="text-xs text-slate-400">Select paper for evaluation logic</p>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500"
            onChange={e => setParts({...parts, rankingSource: e.target.value})}
          >
            <option value="">Select Method...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.analysis.logicModule.aggregation} ({p.analysis.method})</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={handleBuild}
          disabled={!parts.weightSource || !parts.fuzzySource || !parts.rankingSource}
          className="px-20 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all transform hover:-translate-y-1 disabled:opacity-30 disabled:grayscale"
        >
          GENERATE SYNTHETIC MODEL
        </button>
      </div>
    </div>
  );
};
