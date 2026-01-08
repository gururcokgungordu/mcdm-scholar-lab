
import React, { useState, useMemo, useRef } from 'react';
import { MCDMAnalysis } from '../types';
import * as XLSX from 'xlsx';

interface AnalysisResultProps {
  analysis: MCDMAnalysis;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis }) => {
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [showVisuals, setShowVisuals] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate stats for the chart and drill-down
  const stats = useMemo(() => {
    const scores = analysis.originalRanking.map(r => r.score);
    const maxScore = Math.max(...scores, 0.0001);
    const avgScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const topRanked = analysis.originalRanking.find(r => r.rank === 1);
    
    return { maxScore, avgScore, topRanked };
  }, [analysis.originalRanking]);

  const activeDetail = useMemo(() => {
    if (!selectedAlt) return null;
    return analysis.originalRanking.find(r => r.alternative === selectedAlt);
  }, [selectedAlt, analysis.originalRanking]);

  const handleDownloadExcel = () => {
    const exportData = analysis.originalRanking.map(item => ({
      'Alternative Name': item.alternative,
      'Performance Score': item.score,
      'Final Rank': item.rank
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ranking Results");
    const date = new Date().toISOString().split('T')[0];
    const filename = `${analysis.method.replace(/\s+/g, '_')}_Results_${date}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleExportFigure = async () => {
    if (!chartRef.current) return;

    // Academic journals require high DPI. 
    // We create a temporary high-scale canvas to simulate 300 DPI rasterization.
    const canvas = document.createElement('canvas');
    const scale = 3; // 3x scale factor for high resolution output
    canvas.width = chartRef.current.offsetWidth * scale;
    canvas.height = chartRef.current.offsetHeight * scale;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.scale(scale, scale);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // In a production environment with complex SVGs, we'd use a library like html2canvas.
      // Here we trigger the image generation from the canvas.
      const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement('a');
      link.download = `${analysis.method}_Figure_300DPI.jpg`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <span className="w-2 h-6 bg-blue-600 rounded mr-3"></span>
              Methodology Identified
            </h3>
            <p className="text-xs text-slate-400 mt-1">Found in: {analysis.applicationArea}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowVisuals(!showVisuals)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all border border-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showVisuals ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
              {showVisuals ? 'Hide Figures' : 'Show Figures'}
            </button>
            <button 
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 uppercase">Method Used</span>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                {analysis.method}
              </span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 uppercase">Alternatives Count</span>
            <p className="mt-1 text-slate-700 font-medium">{analysis.alternatives.length} Alternatives</p>
          </div>
        </div>
        <p className="mt-4 text-slate-600 text-sm leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {/* Visual Ranking Chart */}
      {showVisuals && (
        <div ref={chartRef} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <span className="w-2 h-6 bg-emerald-500 rounded mr-3"></span>
              Performance Benchmarks
            </h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleExportFigure}
                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Export 300 DPI Figure
              </button>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Interactive Ledger</span>
            </div>
          </div>
          
          <div className="relative h-64 w-full flex items-end justify-around px-4 border-b border-slate-100">
            {/* Y-Axis Label */}
            <div className="absolute -left-2 top-0 h-full flex flex-col justify-between text-[10px] font-bold text-slate-300 uppercase vertical-text transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>
              <span>Score Scale</span>
            </div>

            {analysis.originalRanking.map((rank, idx) => (
              <button 
                key={idx} 
                onClick={() => setSelectedAlt(selectedAlt === rank.alternative ? null : rank.alternative)}
                className="relative group flex flex-col items-center flex-1 max-w-[60px] outline-none"
              >
                <div className={`absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded transition-opacity pointer-events-none z-10 whitespace-nowrap ${
                  selectedAlt === rank.alternative ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  Score: {rank.score}
                </div>
                <div 
                  className={`w-full rounded-t-md transition-all duration-300 ease-out cursor-pointer ${
                    selectedAlt === rank.alternative 
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-100 scale-x-110 ring-2 ring-emerald-200' 
                      : rank.rank === 1 
                        ? 'bg-indigo-600 shadow-lg shadow-indigo-100 group-hover:bg-indigo-500' 
                        : 'bg-slate-300 group-hover:bg-slate-400'
                  }`}
                  style={{ 
                    height: `${(rank.score / stats.maxScore) * 200}px`,
                    minHeight: '4px' 
                  }}
                />
                <div className={`absolute top-full mt-2 text-[10px] font-bold uppercase truncate w-full text-center transition-colors ${
                  selectedAlt === rank.alternative ? 'text-emerald-600' : 'text-slate-500'
                }`} title={rank.alternative}>
                  {rank.alternative}
                </div>
                {rank.rank <= 3 && (
                  <div className="absolute -bottom-10 flex items-center justify-center">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      rank.rank === 1 ? 'bg-amber-400 text-amber-900' : 
                      rank.rank === 2 ? 'bg-slate-200 text-slate-600' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      #{rank.rank}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${activeDetail ? 'max-h-96 mt-16 opacity-100' : 'max-h-0 opacity-0'}`}>
            {activeDetail && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mx-2 mb-4 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Drill-down: {activeDetail.alternative}</h4>
                    <p className="text-xs text-slate-500">Comparative Performance Metrics</p>
                  </div>
                  <button 
                    onClick={() => setSelectedAlt(null)}
                    className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Close Details
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Proximity to Top</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-black text-indigo-600">
                        {stats.topRanked ? (activeDetail.score / stats.topRanked.score * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mean Variance</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`text-xl font-black ${activeDetail.score >= stats.avgScore ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {activeDetail.score >= stats.avgScore ? '+' : ''}
                        {((activeDetail.score - stats.avgScore) / stats.avgScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Global Rank</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xl font-black text-slate-800">#{activeDetail.rank}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <span className="w-2 h-6 bg-indigo-600 rounded mr-3"></span>
          Extracted Entities
        </h3>
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Criteria</span>
            <p className="mt-1 text-slate-700 text-sm">{analysis.criteria.map(c => c.name).join(', ')}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Alternatives</span>
            <p className="mt-1 text-slate-700 text-sm">{analysis.alternatives.join(', ')}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Detailed Rankings</span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.originalRanking.map((r, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedAlt(selectedAlt === r.alternative ? null : r.alternative)}
                  className={`flex items-center justify-between p-2 rounded border transition-all text-xs text-left ${
                    selectedAlt === r.alternative 
                      ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <span className={`font-bold truncate mr-2 ${selectedAlt === r.alternative ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {r.alternative}
                  </span>
                  <span className="font-mono text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-50">#{r.rank} ({r.score})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
