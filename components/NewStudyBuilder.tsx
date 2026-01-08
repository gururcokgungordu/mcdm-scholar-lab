
import React, { useState, useMemo, useRef } from 'react';
import { MCDMAnalysis } from '../types';
import * as XLSX from 'xlsx';

interface Props {
    baseModel: MCDMAnalysis;
    onBack: () => void;
}

interface CustomCriterion {
    id: string;
    name: string;
    weight: number;
    direction: 'max' | 'min';
}

interface CustomAlternative {
    id: string;
    name: string;
}

const CHART_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'
];

export const NewStudyBuilder: React.FC<Props> = ({ baseModel, onBack }) => {
    // Setup state
    const [step, setStep] = useState<'setup' | 'build'>('setup');
    const [numCriteria, setNumCriteria] = useState(3);
    const [numAlternatives, setNumAlternatives] = useState(5);

    // Dynamic data state
    const [criteria, setCriteria] = useState<CustomCriterion[]>([]);
    const [alternatives, setAlternatives] = useState<CustomAlternative[]>([]);
    const [matrix, setMatrix] = useState<number[][]>([]);
    const [studyTitle, setStudyTitle] = useState('My New Study');

    const chartRef = useRef<HTMLDivElement>(null);

    // Initialize the study with user-defined dimensions
    const initializeStudy = () => {
        // Create criteria array
        const newCriteria: CustomCriterion[] = Array.from({ length: numCriteria }, (_, i) => ({
            id: `C${i + 1}`,
            name: `Criterion ${i + 1}`,
            weight: parseFloat((1 / numCriteria).toFixed(4)),
            direction: 'max'
        }));

        // Create alternatives array
        const newAlternatives: CustomAlternative[] = Array.from({ length: numAlternatives }, (_, i) => ({
            id: `A${i + 1}`,
            name: `Alternative ${i + 1}`
        }));

        // Create empty matrix
        const newMatrix: number[][] = Array.from({ length: numAlternatives }, () =>
            Array.from({ length: numCriteria }, () => 0)
        );

        setCriteria(newCriteria);
        setAlternatives(newAlternatives);
        setMatrix(newMatrix);
        setStep('build');
    };

    // Calculate results based on the base model's logic
    const results = useMemo(() => {
        if (matrix.length === 0 || criteria.length === 0) return [];

        const numAlts = matrix.length;
        const numCrit = criteria.length;
        const logic = baseModel.logicModule;

        // Step 1: Normalize matrix based on base model's normalization type
        const normalizedMatrix = matrix.map(row => [...row]);

        for (let j = 0; j < numCrit; j++) {
            const colValues = matrix.map(row => row[j] || 0);
            const maxVal = Math.max(...colValues, 0.0001);
            const minVal = Math.min(...colValues.filter(v => v > 0), 0.0001);
            const sumSquares = Math.sqrt(colValues.reduce((sum, v) => sum + v * v, 0)) || 0.0001;

            for (let i = 0; i < numAlts; i++) {
                const value = matrix[i][j] || 0;

                if (logic?.normalization === 'Vector') {
                    // Vector normalization: x / sqrt(sum of x^2)
                    normalizedMatrix[i][j] = value / sumSquares;
                } else {
                    // Linear normalization (default)
                    if (criteria[j].direction === 'max') {
                        normalizedMatrix[i][j] = value / maxVal;
                    } else {
                        normalizedMatrix[i][j] = value !== 0 ? minVal / value : 0;
                    }
                }
            }
        }

        // Step 2: Calculate weighted scores based on aggregation type
        let scores: { alternative: string; score: number }[] = [];

        if (logic?.aggregation === 'Distance-to-Ideal') {
            // TOPSIS-style: Calculate distance to ideal and anti-ideal
            const idealPositive = criteria.map((_, j) =>
                Math.max(...normalizedMatrix.map(row => row[j] * criteria[j].weight))
            );
            const idealNegative = criteria.map((_, j) =>
                Math.min(...normalizedMatrix.map(row => row[j] * criteria[j].weight))
            );

            scores = matrix.map((_, i) => {
                let dPlus = 0, dMinus = 0;
                for (let j = 0; j < numCrit; j++) {
                    const weighted = normalizedMatrix[i][j] * criteria[j].weight;
                    dPlus += Math.pow(weighted - idealPositive[j], 2);
                    dMinus += Math.pow(weighted - idealNegative[j], 2);
                }
                dPlus = Math.sqrt(dPlus);
                dMinus = Math.sqrt(dMinus);
                const closeness = dMinus / (dPlus + dMinus + 0.0001);

                return {
                    alternative: alternatives[i]?.name || `A${i + 1}`,
                    score: parseFloat(closeness.toFixed(6))
                };
            });
        } else {
            // Weighted Sum (SAW) - default
            scores = matrix.map((_, i) => {
                let score = 0;
                for (let j = 0; j < numCrit; j++) {
                    score += normalizedMatrix[i][j] * criteria[j].weight;
                }
                return {
                    alternative: alternatives[i]?.name || `A${i + 1}`,
                    score: parseFloat(score.toFixed(6))
                };
            });
        }

        return scores
            .sort((a, b) => b.score - a.score)
            .map((s, idx) => ({ ...s, rank: idx + 1 }));
    }, [matrix, criteria, alternatives, baseModel.logicModule]);

    // Handlers
    const handleCriterionNameChange = (index: number, name: string) => {
        const updated = [...criteria];
        updated[index] = { ...updated[index], name };
        setCriteria(updated);
    };

    const handleCriterionWeightChange = (index: number, weight: number) => {
        const updated = [...criteria];
        updated[index] = { ...updated[index], weight };
        setCriteria(updated);
    };

    const handleCriterionDirectionToggle = (index: number) => {
        const updated = [...criteria];
        updated[index] = {
            ...updated[index],
            direction: updated[index].direction === 'max' ? 'min' : 'max'
        };
        setCriteria(updated);
    };

    const handleAlternativeNameChange = (index: number, name: string) => {
        const updated = [...alternatives];
        updated[index] = { ...updated[index], name };
        setAlternatives(updated);
    };

    const handleMatrixChange = (row: number, col: number, value: string) => {
        const num = value === '' ? 0 : parseFloat(value);
        const updated = matrix.map((r, i) =>
            i === row ? r.map((c, j) => j === col ? (isNaN(num) ? 0 : num) : c) : r
        );
        setMatrix(updated);
    };

    const addCriterion = () => {
        const newId = `C${criteria.length + 1}`;
        setCriteria([...criteria, { id: newId, name: `Criterion ${criteria.length + 1}`, weight: 0.1, direction: 'max' }]);
        setMatrix(matrix.map(row => [...row, 0]));
    };

    const removeCriterion = (index: number) => {
        if (criteria.length <= 1) return;
        setCriteria(criteria.filter((_, i) => i !== index));
        setMatrix(matrix.map(row => row.filter((_, j) => j !== index)));
    };

    const addAlternative = () => {
        const newId = `A${alternatives.length + 1}`;
        setAlternatives([...alternatives, { id: newId, name: `Alternative ${alternatives.length + 1}` }]);
        setMatrix([...matrix, Array(criteria.length).fill(0)]);
    };

    const removeAlternative = (index: number) => {
        if (alternatives.length <= 1) return;
        setAlternatives(alternatives.filter((_, i) => i !== index));
        setMatrix(matrix.filter((_, i) => i !== index));
    };

    const normalizeWeights = () => {
        const sum = criteria.reduce((acc, c) => acc + c.weight, 0);
        if (sum > 0) {
            setCriteria(criteria.map(c => ({ ...c, weight: parseFloat((c.weight / sum).toFixed(4)) })));
        }
    };

    // Export functions
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const data: any[][] = [
            [studyTitle],
            [`Based on: ${baseModel.method}`],
            [`Logic: ${baseModel.logicModule?.fuzzyType} | ${baseModel.logicModule?.normalization} | ${baseModel.logicModule?.aggregation}`],
            [`Generated: ${new Date().toLocaleString()}`],
            [],
            ['CRITERIA SETTINGS'],
            ['ID', 'Name', 'Weight', 'Direction'],
            ...criteria.map(c => [c.id, c.name, c.weight, c.direction]),
            [],
            ['DECISION MATRIX'],
            ['Alternative', ...criteria.map(c => c.name)],
            ...matrix.map((row, i) => [alternatives[i]?.name || `A${i + 1}`, ...row]),
            [],
            ['RANKING RESULTS'],
            ['Rank', 'Alternative', 'Score'],
            ...results.map(r => [r.rank, r.alternative, r.score])
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Study Results');
        XLSX.writeFile(wb, `${studyTitle.replace(/\s+/g, '_')}_Results.xlsx`);
    };

    const exportChartAsJPEG = async () => {
        if (!chartRef.current) return;

        const scale = 300 / 96;
        const width = chartRef.current.offsetWidth * scale;
        const height = chartRef.current.offsetHeight * scale;

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
        ctx.fillText(studyTitle, 20, 30);

        // Subtitle
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillText(`Method: ${baseModel.method} | ${new Date().toLocaleString()}`, 20, 48);

        const chartStartY = 70;
        const barHeight = 32;
        const maxBarWidth = chartRef.current.offsetWidth - 180;
        const maxScore = Math.max(...results.map(r => r.score), 0.0001);

        results.forEach((res, i) => {
            const y = chartStartY + i * (barHeight + 8);
            const barWidth = (res.score / maxScore) * maxBarWidth;

            // Bar background
            ctx.fillStyle = '#f1f5f9';
            ctx.beginPath();
            ctx.roundRect(120, y, maxBarWidth, barHeight, 5);
            ctx.fill();

            // Bar
            ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
            ctx.beginPath();
            ctx.roundRect(120, y, barWidth, barHeight, 5);
            ctx.fill();

            // Rank
            ctx.fillStyle = i === 0 ? '#6366f1' : '#94a3b8';
            ctx.beginPath();
            ctx.arc(22, y + barHeight / 2, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${res.rank}`, 22, y + barHeight / 2 + 4);

            // Name
            ctx.textAlign = 'left';
            ctx.fillStyle = '#334155';
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.fillText(res.alternative.substring(0, 14), 42, y + barHeight / 2 + 4);

            // Score
            if (barWidth > 50) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px Inter, system-ui, sans-serif';
                ctx.fillText(res.score.toFixed(4), 130, y + barHeight / 2 + 4);
            }
        });

        // Footer
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MCDM Scholar Lab - New Study Analysis', chartRef.current.offsetWidth / 2, chartRef.current.offsetHeight - 10);

        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${studyTitle.replace(/\s+/g, '_')}_Chart_300dpi.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }, 'image/jpeg', 0.95);
    };

    const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 1;

    // SETUP SCREEN
    if (step === 'setup') {
        return (
            <div className="max-w-xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-4">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-8 hover:underline">
                    ← Back to Model
                </button>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">New Study with Same Model</h2>
                        <p className="text-slate-500 text-sm">Apply the <span className="font-bold text-indigo-600">{baseModel.method}</span> methodology to your own research problem</p>
                    </div>

                    {/* Model Info */}
                    <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Base Model Logic</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">{baseModel.logicModule?.fuzzyType}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">{baseModel.logicModule?.normalization} Norm</span>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">{baseModel.logicModule?.aggregation}</span>
                        </div>
                    </div>

                    {/* Study Title */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Study Title</label>
                        <input
                            type="text"
                            value={studyTitle}
                            onChange={(e) => setStudyTitle(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Enter your study title"
                        />
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Number of Criteria</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={numCriteria}
                                onChange={(e) => setNumCriteria(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Number of Alternatives</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={numAlternatives}
                                onChange={(e) => setNumAlternatives(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={initializeStudy}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        Create Study Framework →
                    </button>
                </div>
            </div>
        );
    }

    // BUILD & ANALYZE SCREEN
    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button onClick={() => setStep('setup')} className="text-sm font-bold text-indigo-600 mb-2 hover:underline">← Reconfigure</button>
                    <h2 className="text-2xl font-bold text-slate-900">{studyTitle}</h2>
                    <p className="text-slate-500 text-sm">Using {baseModel.method} methodology</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">{baseModel.logicModule?.fuzzyType}</span>
                    <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">{baseModel.logicModule?.normalization}</span>
                    <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">{baseModel.logicModule?.aggregation}</span>
                </div>
            </div>

            {/* Export Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-sm text-slate-500">
                    <span className="font-bold text-slate-700">{criteria.length}</span> criteria × <span className="font-bold text-slate-700">{alternatives.length}</span> alternatives
                </div>
                <div className="flex gap-3">
                    <button onClick={normalizeWeights} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200">
                        Normalize Weights
                    </button>
                    <button onClick={exportToExcel} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                        Export Excel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Criteria Panel */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-xs uppercase">Criteria</h3>
                            <button onClick={addCriterion} className="text-indigo-600 text-xs font-bold hover:underline">+ Add</button>
                        </div>
                        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                            {criteria.map((c, i) => (
                                <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{c.id}</span>
                                        <input
                                            type="text"
                                            value={c.name}
                                            onChange={(e) => handleCriterionNameChange(i, e.target.value)}
                                            className="flex-1 text-xs font-medium bg-transparent border-none outline-none"
                                            placeholder="Criterion name"
                                        />
                                        <button
                                            onClick={() => handleCriterionDirectionToggle(i)}
                                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${c.direction === 'max' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}
                                        >
                                            {c.direction === 'max' ? 'MAX' : 'MIN'}
                                        </button>
                                        <button onClick={() => removeCriterion(i)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={c.weight}
                                        onChange={(e) => handleCriterionWeightChange(i, parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono outline-none"
                                        placeholder="Weight"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alternatives Panel */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-xs uppercase">Alternatives</h3>
                            <button onClick={addAlternative} className="text-indigo-600 text-xs font-bold hover:underline">+ Add</button>
                        </div>
                        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                            {alternatives.map((a, i) => (
                                <div key={a.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{a.id}</span>
                                    <input
                                        type="text"
                                        value={a.name}
                                        onChange={(e) => handleAlternativeNameChange(i, e.target.value)}
                                        className="flex-1 text-xs font-medium bg-transparent border-none outline-none"
                                        placeholder="Alternative name"
                                    />
                                    <button onClick={() => removeAlternative(i)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
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
                                        {criteria.map((c) => (
                                            <th key={c.id} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase border-b text-center min-w-[90px]" title={c.name}>
                                                {c.id}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {matrix.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80">
                                            <td className="px-4 py-2 text-xs font-bold text-slate-700 border-r sticky left-0 bg-white z-10" title={alternatives[i]?.name}>
                                                {alternatives[i]?.id}
                                            </td>
                                            {row.map((cell, j) => (
                                                <td key={j} className="p-1">
                                                    <input
                                                        type="number"
                                                        value={cell || ''}
                                                        onChange={(e) => handleMatrixChange(i, j, e.target.value)}
                                                        className="w-full text-center bg-transparent focus:bg-indigo-50 rounded py-2 font-mono text-xs outline-none"
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
                    <div
                        ref={chartRef}
                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
                        style={{ minHeight: `${Math.max(280, results.length * 45 + 100)}px` }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase">Results Chart</h3>
                            <button
                                onClick={exportChartAsJPEG}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Export Figure (300 DPI)
                            </button>
                        </div>

                        <div className="space-y-3">
                            {results.map((res, i) => (
                                <div key={res.alternative} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-indigo-600' : i === 1 ? 'bg-purple-500' : i === 2 ? 'bg-pink-500' : 'bg-slate-400'
                                        }`}>
                                        {res.rank}
                                    </div>
                                    <div className="w-28 text-xs font-medium text-slate-600 truncate flex-shrink-0" title={res.alternative}>
                                        {res.alternative}
                                    </div>
                                    <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                                        <div
                                            className="h-full rounded-lg transition-all duration-500 flex items-center"
                                            style={{
                                                width: `${Math.max((res.score / maxScore) * 100, 5)}%`,
                                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                                            }}
                                        >
                                            <span className="text-white text-[10px] font-bold ml-2">{res.score.toFixed(4)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Winner */}
                    {results.length > 0 && (
                        <div className="bg-slate-900 p-6 rounded-xl text-white">
                            <h3 className="text-xs font-black text-indigo-400 uppercase mb-3">Selected Alternative</h3>
                            <div className="text-2xl font-black mb-1">{results[0]?.alternative}</div>
                            <p className="text-slate-400 text-xs">Score: <span className="font-mono text-indigo-400">{results[0]?.score.toFixed(6)}</span></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
