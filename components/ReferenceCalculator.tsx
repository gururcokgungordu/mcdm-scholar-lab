
import React, { useState, useMemo } from 'react';
import { MCDMAnalysis, Criterion } from '../types';

interface Props {
  baseAnalysis: MCDMAnalysis;
  onBack: () => void;
}

export const ReferenceCalculator: React.FC<Props> = ({ baseAnalysis, onBack }) => {
  const [expertMatrices, setExpertMatrices] = useState<number[][][]>(() => [baseAnalysis.matrix.map(row => [...row])]);
  const [criteria, setCriteria] = useState<Criterion[]>(baseAnalysis.criteria);
  const [alternatives, setAlternatives] = useState<string[]>(baseAnalysis.alternatives);

  const results = useMemo(() => {
    const { fuzzyType, normalization, aggregation } = baseAnalysis.logicModule;
    
    // 1. Aggregation of Experts
    const n = alternatives.length;
    const m = criteria.length;
    const aggregated = Array.from({ length: n }, (_, i) => 
      Array.from({ length: m }, (_, j) => {
        const vals = expertMatrices.map(exp => exp[i][j] || 0.000001);
        return Math.pow(vals.reduce((a, b) => a * b, 1), 1 / expertMatrices.length);
      })
    );

    // 2. Normalization Strategy
    const normMatrix = aggregated.map(row => [...row]);
    if (normalization === 'Vector') {
      for (let j = 0; j < m; j++) {
        const sumSq = Math.sqrt(aggregated.reduce((acc, row) => acc + Math.pow(row[j], 2), 0) || 1);
        for (let i = 0; i < n; i++) normMatrix[i][j] = aggregated[i][j] / sumSq;
      }
    } else {
      for (let j = 0; j < m; j++) {
        const col = aggregated.map(r => r[j]);
        const max = Math.max(...col, 0.0001);
        const min = Math.min(...col, 0.0001);
        for (let i = 0; i < n; i++) {
          normMatrix[i][j] = criteria[j].direction === 'max' ? aggregated[i][j] / max : min / (aggregated[i][j] || 1);
        }
      }
    }

    // 3. Aggregation Logic
    if (aggregation === 'Distance-to-Ideal') {
      const weighted = normMatrix.map(row => row.map((val, j) => val * criteria[j].weight));
      const PIS = Array.from({ length: m }, (_, j) => criteria[j].direction === 'max' ? Math.max(...weighted.map(r => r[j])) : Math.min(...weighted.map(r => r[j])));
      const NIS = Array.from({ length: m }, (_, j) => criteria[j].direction === 'max' ? Math.min(...weighted.map(r => r[j])) : Math.max(...weighted.map(r => r[j])));
      
      const scores = alternatives.map((alt, i) => {
        const dPlus = Math.sqrt(weighted[i].reduce((acc, val, j) => acc + Math.pow(val - PIS[j], 2), 0));
        const dMinus = Math.sqrt(weighted[i].reduce((acc, val, j) => acc + Math.pow(val - NIS[j], 2), 0));
        return { alternative: alt, score: dMinus / (dPlus + dMinus || 1) };
      });
      return scores.sort((a, b) => b.score - a.score).map((s, idx) => ({ ...s, rank: idx + 1 }));
    }

    // Default Weighted Sum
    const scores = alternatives.map((alt, i) => ({
      alternative: alt,
      score: normMatrix[i].reduce((acc, val, j) => acc + val * criteria[j].weight, 0)
    }));
    return scores.sort((a, b) => b.score - a.score).map((s, idx) => ({ ...s, rank: idx + 1 }));
  }, [expertMatrices, criteria, alternatives, baseAnalysis.logicModule]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl flex justify-between items-center">
        <div>
          <button onClick={onBack} className="text-[10px] font-black text-indigo-600 uppercase mb-2">← Back</button>
          <h2 className="text-2xl font-black text-slate-900">{baseAnalysis.method} Synthesis</h2>
          <div className="flex gap-2 mt-2">
            <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded uppercase">{baseAnalysis.logicModule.fuzzyType} Logic</span>
            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded uppercase">{baseAnalysis.logicModule.normalization} Norm</span>
            <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded uppercase">{baseAnalysis.logicModule.aggregation} System</span>
          </div>
        </div>
      </div>
      
      {/* ... (Matrix inputs UI similar to previous, but dynamically adapting to logicModule) */}
      <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl">
         <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6">Scientific Ranking</h3>
         <div className="space-y-4">
           {results.map((res, i) => (
             <div key={res.alternative} className="flex items-center gap-4">
               <span className="text-2xl font-black text-white/20">#{res.rank}</span>
               <div className="flex-1">
                 <div className="flex justify-between text-sm font-bold mb-1">
                   <span>{res.alternative}</span>
                   <span className="text-indigo-400 font-mono">{res.score.toFixed(6)}</span>
                 </div>
                 <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500" style={{width: `${(res.score / (results[0].score || 1)) * 100}%`}}></div>
                 </div>
               </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
};
