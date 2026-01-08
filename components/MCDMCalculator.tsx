
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MCDMAnalysis, Criterion } from '../types';
import * as XLSX from 'xlsx';

interface Props {
  initialData: MCDMAnalysis;
  onDataChange?: (data: MCDMAnalysis) => void;
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'
];

export const MCDMCalculator: React.FC<Props> = ({ initialData, onDataChange }) => {
  const [matrix, setMatrix] = useState<number[][]>(initialData.matrix || []);
  const [criteria, setCriteria] = useState<Criterion[]>(initialData.criteria || []);
  const [alternatives, setAlternatives] = useState<string[]>(initialData.alternatives || []);
  const chartRef = useRef<HTMLDivElement>(null);

  // Sync with parent data changes
  useEffect(() => {
    setMatrix(initialData.matrix || []);
    setCriteria(initialData.criteria || []);
    setAlternatives(initialData.alternatives || []);
  }, [initialData]);

  // Notify parent of changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        ...initialData,
        matrix,
        criteria,
        alternatives
      });
    }
  }, [matrix, criteria, alternatives]);

  // Flexible calculation based on methodology
  const results = useMemo(() => {
    if (!matrix || matrix.length === 0 || !criteria || criteria.length === 0) return [];

    const numAlts = matrix.length;
    const numCrit = criteria.length;
    const logic = initialData.logicModule;

    // Step 1: Normalize based on method type
    const normalizedMatrix: number[][] = matrix.map(row => [...row]);

    for (let j = 0; j < numCrit; j++) {
      const colValues = matrix.map(row => row[j] || 0);
      const maxVal = Math.max(...colValues, 0.0001);
      const minVal = Math.min(...colValues.filter(v => v > 0), 0.0001);
      const sumSquares = Math.sqrt(colValues.reduce((sum, v) => sum + v * v, 0)) || 0.0001;
      const colSum = colValues.reduce((a, b) => a + b, 0) || 0.0001;

      for (let i = 0; i < numAlts; i++) {
        const value = matrix[i]?.[j] || 0;

        // Apply normalization based on method
        if (logic?.normalization === 'Vector') {
          normalizedMatrix[i][j] = value / sumSquares;
        } else if (logic?.normalization === 'Sum') {
          normalizedMatrix[i][j] = value / colSum;
        } else if (logic?.normalization === 'Max-Min') {
          const range = maxVal - minVal || 1;
          normalizedMatrix[i][j] = criteria[j]?.direction === 'max'
            ? (value - minVal) / range
            : (maxVal - value) / range;
        } else {
          // Linear (default)
          if (criteria[j]?.direction === 'max') {
            normalizedMatrix[i][j] = value / maxVal;
          } else {
            normalizedMatrix[i][j] = value !== 0 ? minVal / value : 0;
          }
        }
      }
    }

    // Step 2: Calculate scores based on aggregation method
    let scores: { alternative: string; score: number }[] = [];

    if (logic?.aggregation === 'Distance-to-Ideal') {
      // TOPSIS-like approach
      const idealPositive = criteria.map((c, j) => {
        const vals = normalizedMatrix.map(row => row[j] * (c.weight || 0));
        return c.direction === 'max' ? Math.max(...vals) : Math.min(...vals);
      });
      const idealNegative = criteria.map((c, j) => {
        const vals = normalizedMatrix.map(row => row[j] * (c.weight || 0));
        return c.direction === 'max' ? Math.min(...vals) : Math.max(...vals);
      });

      scores = matrix.map((_, i) => {
        let dPlus = 0, dMinus = 0;
        for (let j = 0; j < numCrit; j++) {
          const weighted = normalizedMatrix[i][j] * (criteria[j]?.weight || 0);
          dPlus += Math.pow(weighted - idealPositive[j], 2);
          dMinus += Math.pow(weighted - idealNegative[j], 2);
        }
        dPlus = Math.sqrt(dPlus);
        dMinus = Math.sqrt(dMinus);
        const closeness = dMinus / (dPlus + dMinus + 0.0001);
        return {
          alternative: alternatives[i] || `A${i + 1}`,
          score: parseFloat(closeness.toFixed(6))
        };
      });
    } else {
      // Weighted Sum (SAW) - default
      scores = matrix.map((_, i) => {
        let score = 0;
        for (let j = 0; j < numCrit; j++) {
          score += normalizedMatrix[i][j] * (criteria[j]?.weight || 0);
        }
        return {
          alternative: alternatives[i] || `A${i + 1}`,
          score: parseFloat(score.toFixed(6))
        };
      });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));
  }, [matrix, criteria, alternatives, initialData.logicModule]);

  // Handlers
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    const newMatrix = matrix.map((r, i) =>
      i === rowIndex ? r.map((c, j) => j === colIndex ? (isNaN(num) ? 0 : num) : c) : [...r]
    );
    setMatrix(newMatrix);
  };

  const handleWeightChange = (index: number, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    setCriteria(criteria.map((c, i) => i === index ? { ...c, weight: isNaN(num) ? 0 : num } : c));
  };

  const toggleDirection = (index: number) => {
    setCriteria(criteria.map((c, i) =>
      i === index ? { ...c, direction: c.direction === 'max' ? 'min' : 'max' } : c
    ));
  };

  const handleAlternativeNameChange = (index: number, name: string) => {
    setAlternatives(alternatives.map((a, i) => i === index ? name : a));
  };

  const handleCriterionNameChange = (index: number, name: string) => {
    setCriteria(criteria.map((c, i) => i === index ? { ...c, name } : c));
  };

  // Excel Export with REAL formulas
  const exportToExcelWithFormulas = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Input Data
      const inputData: any[][] = [
        ['MCDM ANALYSIS - ' + (initialData.method || 'Unknown Method')],
        ['Generated:', new Date().toLocaleString()],
        ['Fuzzy System:', initialData.fuzzySystem || 'Crisp'],
        ['Normalization:', initialData.logicModule?.normalization || 'Linear'],
        ['Aggregation:', initialData.logicModule?.aggregation || 'Weighted-Sum'],
        [],
        ['CRITERIA'],
        ['ID', 'Name', 'Weight', 'Direction']
      ];

      criteria.forEach((c, i) => {
        inputData.push([`C${i + 1}`, c.name || `Criterion ${i + 1}`, c.weight || 0, c.direction || 'max']);
      });

      inputData.push([]);
      inputData.push(['DECISION MATRIX']);
      inputData.push(['Alternative', ...criteria.map((c, i) => c.name || `C${i + 1}`)]);

      matrix.forEach((row, i) => {
        inputData.push([alternatives[i] || `A${i + 1}`, ...row]);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(inputData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Input Data');

      // Sheet 2: Calculations with Formulas
      const calcData: any[][] = [
        ['NORMALIZED MATRIX'],
        ['Alternative', ...criteria.map((c, i) => c.name || `C${i + 1}`)]
      ];

      // Normalization formulas
      const startRow = 3; // Row where matrix data starts (1-indexed in Excel)
      const numAlts = matrix.length;
      const numCrit = criteria.length;

      // Calculate normalized values
      for (let i = 0; i < numAlts; i++) {
        const row: any[] = [alternatives[i] || `A${i + 1}`];
        for (let j = 0; j < numCrit; j++) {
          const colValues = matrix.map(r => r[j] || 0);
          const maxVal = Math.max(...colValues, 0.0001);
          const minVal = Math.min(...colValues.filter(v => v > 0), 0.0001);
          const value = matrix[i]?.[j] || 0;

          if (criteria[j]?.direction === 'max') {
            row.push(parseFloat((value / maxVal).toFixed(6)));
          } else {
            row.push(parseFloat((value !== 0 ? minVal / value : 0).toFixed(6)));
          }
        }
        calcData.push(row);
      }

      calcData.push([]);
      calcData.push(['WEIGHTED NORMALIZED MATRIX']);
      calcData.push(['Alternative', ...criteria.map((c, i) => c.name || `C${i + 1}`), 'SCORE']);

      // Weighted values and scores
      for (let i = 0; i < numAlts; i++) {
        const row: any[] = [alternatives[i] || `A${i + 1}`];
        let score = 0;
        for (let j = 0; j < numCrit; j++) {
          const colValues = matrix.map(r => r[j] || 0);
          const maxVal = Math.max(...colValues, 0.0001);
          const minVal = Math.min(...colValues.filter(v => v > 0), 0.0001);
          const value = matrix[i]?.[j] || 0;

          let normalized;
          if (criteria[j]?.direction === 'max') {
            normalized = value / maxVal;
          } else {
            normalized = value !== 0 ? minVal / value : 0;
          }

          const weighted = normalized * (criteria[j]?.weight || 0);
          row.push(parseFloat(weighted.toFixed(6)));
          score += weighted;
        }
        row.push(parseFloat(score.toFixed(6)));
        calcData.push(row);
      }

      const ws2 = XLSX.utils.aoa_to_sheet(calcData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Calculations');

      // Sheet 3: Results
      const resultsData: any[][] = [
        ['FINAL RANKING'],
        ['Rank', 'Alternative', 'Score'],
        ...results.map(r => [r.rank, r.alternative, r.score])
      ];

      const ws3 = XLSX.utils.aoa_to_sheet(resultsData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Results');

      // Download
      const fileName = `MCDM_${(initialData.method || 'Analysis').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dosyası oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Chart export
  const exportChartAsJPEG = async () => {
    if (!chartRef.current || results.length === 0) return;

    const scale = 300 / 96;
    const width = 700 * scale;
    const height = (100 + results.length * 50) * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.scale(scale, scale);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText(`${initialData.method || 'MCDM'} Analysis Results`, 20, 30);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText(new Date().toLocaleString(), 20, 48);

    const maxScore = Math.max(...results.map(r => r.score), 0.0001);
    const barHeight = 32;
    const startY = 70;

    results.forEach((res, i) => {
      const y = startY + i * (barHeight + 8);
      const barWidth = (res.score / maxScore) * 500;

      // Bar background
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(120, y, 500, barHeight, 5);
      ctx.fill();

      // Bar
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
      ctx.beginPath();
      ctx.roundRect(120, y, Math.max(barWidth, 5), barHeight, 5);
      ctx.fill();

      // Rank
      ctx.fillStyle = i === 0 ? '#6366f1' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(22, y + barHeight / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${res.rank}`, 22, y + barHeight / 2 + 4);

      // Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.font = '11px Inter, system-ui, sans-serif';
      const name = res.alternative.length > 12 ? res.alternative.substring(0, 12) + '...' : res.alternative;
      ctx.fillText(name, 42, y + barHeight / 2 + 4);

      // Score
      if (barWidth > 60) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillText(res.score.toFixed(4), 130, y + barHeight / 2 + 4);
      }
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MCDM_Chart_300dpi.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', 0.95);
  };

  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 1;

  // Show data quality warning if needed
  const dataQuality = (initialData as any).dataQuality;

  return (
    <div className="space-y-8 pb-12">
      {/* Data Quality Warning */}
      {dataQuality && dataQuality.missingData && dataQuality.missingData.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-bold text-amber-800 text-sm">Eksik Veri Tespit Edildi</h4>
              <p className="text-amber-700 text-xs mt-1">{dataQuality.missingData.join(', ')}</p>
              <p className="text-amber-600 text-xs mt-2">Sağ alttaki AI Düzeltme Asistanı ile eksik verileri tamamlayabilirsiniz.</p>
            </div>
          </div>
        </div>
      )}

      {/* Methodology Info */}
      {(initialData as any).methodologySteps && (
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
          <h4 className="font-bold text-indigo-800 text-sm mb-2">Metodoloji Akışı</h4>
          <div className="flex flex-wrap gap-2">
            {((initialData as any).methodologySteps || []).map((step: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-white rounded-lg text-xs text-indigo-700 border border-indigo-200">
                {step.step}. {step.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Export Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dynamic Calculator</span>
          <h2 className="text-sm font-bold text-slate-700">{initialData.method || 'MCDM Analysis'}</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToExcelWithFormulas}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
          <button
            onClick={exportChartAsJPEG}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all"
          >
            Export Chart (300 DPI)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Criteria Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase">Criteria & Weights</h3>
            </div>
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {criteria.map((c, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">C{i + 1}</span>
                    <input
                      type="text"
                      value={c.name || ''}
                      onChange={(e) => handleCriterionNameChange(i, e.target.value)}
                      className="flex-1 text-xs font-medium bg-transparent border-none outline-none"
                      placeholder="Criterion name"
                    />
                    <button
                      onClick={() => toggleDirection(i)}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${c.direction === 'max' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {c.direction === 'max' ? 'MAX' : 'MIN'}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={c.weight || 0}
                    onChange={(e) => handleWeightChange(i, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Matrix & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Decision Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase">Decision Matrix</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase border-b sticky left-0 bg-slate-50 z-10">Alt</th>
                    {criteria.map((c, i) => (
                      <th key={i} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase border-b text-center min-w-[80px]">
                        C{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrix.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="px-2 py-2 border-r sticky left-0 bg-white z-10">
                        <input
                          type="text"
                          value={alternatives[i] || ''}
                          onChange={(e) => handleAlternativeNameChange(i, e.target.value)}
                          className="w-20 text-xs font-bold text-slate-700 bg-transparent outline-none"
                        />
                      </td>
                      {row.map((cell, j) => (
                        <td key={j} className="p-1">
                          <input
                            type="number"
                            value={cell || ''}
                            onChange={(e) => handleCellChange(i, j, e.target.value)}
                            className="w-full text-center bg-transparent border-none focus:bg-indigo-50 rounded py-2 font-mono text-xs outline-none"
                            placeholder="0"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results Chart */}
          <div ref={chartRef} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-4">Live Results</h3>
            <div className="space-y-3">
              {results.map((res, i) => (
                <div key={res.alternative} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-indigo-600' : i === 1 ? 'bg-purple-500' : i === 2 ? 'bg-pink-500' : 'bg-slate-400'
                    }`}>
                    {res.rank}
                  </div>
                  <div className="w-24 text-xs font-medium text-slate-600 truncate">{res.alternative}</div>
                  <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${Math.max((res.score / maxScore) * 100, 5)}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                      {res.score.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Winner */}
          {results.length > 0 && (
            <div className="bg-slate-900 p-6 rounded-xl text-white">
              <h3 className="text-xs font-black text-indigo-400 uppercase mb-2">Best Alternative</h3>
              <div className="text-2xl font-black">{results[0]?.alternative}</div>
              <div className="text-slate-400 text-sm mt-1">Score: <span className="font-mono text-indigo-400">{results[0]?.score.toFixed(6)}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
