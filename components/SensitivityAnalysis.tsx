
import React, { useState, useMemo, useRef } from 'react';
import { MCDMAnalysis, Criterion } from '../types';

interface Props {
    analysis: MCDMAnalysis;
    onBack: () => void;
}

interface SensitivityResult {
    scenario: string;
    weights: number[];
    rankings: { alternative: string; score: number; rank: number }[];
    changedCriterion?: string;
    changePercent?: number;
}

const CHART_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'
];

export const SensitivityAnalysis: React.FC<Props> = ({ analysis, onBack }) => {
    const [scenarios, setScenarios] = useState<SensitivityResult[]>([]);
    const [analysisType, setAnalysisType] = useState<'oat' | 'percentage' | 'extreme'>('oat');
    const [percentageChange, setPercentageChange] = useState(20);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    // Calculate scores using the same logic
    const calculateScores = (matrix: number[][], criteria: Criterion[]): { alternative: string; score: number; rank: number }[] => {
        const numAlts = matrix.length;
        const numCrit = criteria.length;
        if (numAlts === 0 || numCrit === 0) return [];

        const normalizedMatrix = matrix.map(row => [...row]);
        for (let j = 0; j < numCrit; j++) {
            const colValues = matrix.map(row => row[j] || 0);
            const maxVal = Math.max(...colValues, 0.0001);
            const minVal = Math.min(...colValues.filter(v => v > 0), 0.0001);

            for (let i = 0; i < numAlts; i++) {
                if (criteria[j].direction === 'max') {
                    normalizedMatrix[i][j] = matrix[i][j] / maxVal;
                } else {
                    normalizedMatrix[i][j] = matrix[i][j] !== 0 ? minVal / matrix[i][j] : 0;
                }
            }
        }

        const logic = analysis.logicModule;
        let scores: { alternative: string; score: number }[] = [];

        if (logic?.aggregation === 'Distance-to-Ideal') {
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
                return {
                    alternative: analysis.alternatives[i] || `A${i + 1}`,
                    score: parseFloat((dMinus / (dPlus + dMinus + 0.0001)).toFixed(6))
                };
            });
        } else {
            scores = matrix.map((_, i) => {
                let score = 0;
                for (let j = 0; j < numCrit; j++) {
                    score += normalizedMatrix[i][j] * criteria[j].weight;
                }
                return {
                    alternative: analysis.alternatives[i] || `A${i + 1}`,
                    score: parseFloat(score.toFixed(6))
                };
            });
        }

        return scores
            .sort((a, b) => b.score - a.score)
            .map((s, idx) => ({ ...s, rank: idx + 1 }));
    };

    // Run sensitivity analysis
    const runAnalysis = () => {
        setIsAnalyzing(true);
        const results: SensitivityResult[] = [];
        const baseCriteria = analysis.criteria;
        const baseWeights = baseCriteria.map(c => c.weight);

        // Base scenario
        const baseResult = calculateScores(analysis.matrix, baseCriteria);
        results.push({
            scenario: 'Base Case (Original)',
            weights: baseWeights,
            rankings: baseResult
        });

        if (analysisType === 'oat') {
            // One-at-a-Time: Increase each criterion by 50%, others proportionally decreased
            baseCriteria.forEach((criterion, idx) => {
                const newWeights = [...baseWeights];
                const increase = newWeights[idx] * 0.5;
                newWeights[idx] += increase;

                // Proportionally decrease others
                const othersSum = baseWeights.reduce((sum, w, i) => i !== idx ? sum + w : sum, 0);
                if (othersSum > 0) {
                    for (let i = 0; i < newWeights.length; i++) {
                        if (i !== idx) {
                            newWeights[i] -= (baseWeights[i] / othersSum) * increase;
                        }
                    }
                }

                // Normalize
                const sum = newWeights.reduce((a, b) => a + b, 0);
                const normalizedWeights = newWeights.map(w => w / sum);

                const modifiedCriteria = baseCriteria.map((c, i) => ({
                    ...c,
                    weight: normalizedWeights[i]
                }));

                results.push({
                    scenario: `Increase ${criterion.name} (+50%)`,
                    weights: normalizedWeights,
                    rankings: calculateScores(analysis.matrix, modifiedCriteria),
                    changedCriterion: criterion.name,
                    changePercent: 50
                });
            });
        } else if (analysisType === 'percentage') {
            // Systematic percentage changes
            const changes = [-percentageChange, percentageChange];

            baseCriteria.forEach((criterion, idx) => {
                changes.forEach(change => {
                    const newWeights = [...baseWeights];
                    const delta = newWeights[idx] * (change / 100);
                    newWeights[idx] += delta;

                    // Proportionally adjust others
                    const othersSum = baseWeights.reduce((sum, w, i) => i !== idx ? sum + w : sum, 0);
                    if (othersSum > 0) {
                        for (let i = 0; i < newWeights.length; i++) {
                            if (i !== idx) {
                                newWeights[i] -= (baseWeights[i] / othersSum) * delta;
                            }
                        }
                    }

                    // Ensure non-negative and normalize
                    const clampedWeights = newWeights.map(w => Math.max(0, w));
                    const sum = clampedWeights.reduce((a, b) => a + b, 0);
                    const normalizedWeights = clampedWeights.map(w => w / sum);

                    const modifiedCriteria = baseCriteria.map((c, i) => ({
                        ...c,
                        weight: normalizedWeights[i]
                    }));

                    results.push({
                        scenario: `${criterion.name} ${change > 0 ? '+' : ''}${change}%`,
                        weights: normalizedWeights,
                        rankings: calculateScores(analysis.matrix, modifiedCriteria),
                        changedCriterion: criterion.name,
                        changePercent: change
                    });
                });
            });
        } else if (analysisType === 'extreme') {
            // Extreme scenarios: Each criterion at 50% weight
            baseCriteria.forEach((criterion, idx) => {
                const newWeights = baseCriteria.map((_, i) => i === idx ? 0.5 : 0.5 / (baseCriteria.length - 1));

                const modifiedCriteria = baseCriteria.map((c, i) => ({
                    ...c,
                    weight: newWeights[i]
                }));

                results.push({
                    scenario: `${criterion.name} Dominant (50%)`,
                    weights: newWeights,
                    rankings: calculateScores(analysis.matrix, modifiedCriteria),
                    changedCriterion: criterion.name,
                    changePercent: 100
                });
            });

            // Equal weights scenario
            const equalWeight = 1 / baseCriteria.length;
            const equalCriteria = baseCriteria.map(c => ({ ...c, weight: equalWeight }));
            results.push({
                scenario: 'Equal Weights',
                weights: baseCriteria.map(() => equalWeight),
                rankings: calculateScores(analysis.matrix, equalCriteria)
            });
        }

        setScenarios(results);
        setIsAnalyzing(false);
    };

    // Analyze rank changes
    const rankAnalysis = useMemo(() => {
        if (scenarios.length < 2) return null;

        const baseRanks = scenarios[0].rankings;
        const alternatives = baseRanks.map(r => r.alternative);

        // Track rank changes for each alternative
        const rankChanges: { [alt: string]: number[] } = {};
        alternatives.forEach(alt => { rankChanges[alt] = []; });

        scenarios.forEach(scenario => {
            scenario.rankings.forEach(r => {
                if (rankChanges[r.alternative]) {
                    rankChanges[r.alternative].push(r.rank);
                }
            });
        });

        // Find critical criteria (those that cause rank #1 to change)
        const criticalCriteria: string[] = [];
        const originalWinner = baseRanks[0].alternative;

        scenarios.slice(1).forEach(scenario => {
            if (scenario.rankings[0].alternative !== originalWinner && scenario.changedCriterion) {
                if (!criticalCriteria.includes(scenario.changedCriterion)) {
                    criticalCriteria.push(scenario.changedCriterion);
                }
            }
        });

        // Calculate stability for each alternative
        const stability: { [alt: string]: { min: number; max: number; range: number } } = {};
        Object.entries(rankChanges).forEach(([alt, ranks]) => {
            const min = Math.min(...ranks);
            const max = Math.max(...ranks);
            stability[alt] = { min, max, range: max - min };
        });

        return { rankChanges, criticalCriteria, stability, originalWinner };
    }, [scenarios]);

    // Generate academic text
    const generateAcademicText = () => {
        if (!rankAnalysis || scenarios.length < 2) return '';

        const { criticalCriteria, stability, originalWinner } = rankAnalysis;
        const numScenarios = scenarios.length - 1;
        const stableAlternatives = Object.entries(stability as Record<string, { min: number; max: number; range: number }>)
            .filter(([_, s]) => s.range === 0)
            .map(([alt]) => alt);

        let text = `**Sensitivity Analysis Results**\n\n`;
        text += `A comprehensive sensitivity analysis was conducted to evaluate the robustness of the MCDM results. `;
        text += `The analysis employed the ${analysisType === 'oat' ? 'One-at-a-Time (OAT)' : analysisType === 'percentage' ? `systematic weight variation (±${percentageChange}%)` : 'extreme scenario'} method `;
        text += `to assess the impact of criteria weight changes on the final ranking.\n\n`;

        text += `**Methodology**\n\n`;
        text += `The sensitivity analysis was performed by systematically modifying the weights of each criterion while proportionally adjusting the remaining criteria weights to maintain normalization. `;
        text += `A total of ${numScenarios} scenarios were evaluated in addition to the base case.\n\n`;

        text += `**Key Findings**\n\n`;
        text += `1. **Original Ranking Stability**: The original best alternative (${originalWinner}) `;

        if (criticalCriteria.length === 0) {
            text += `maintained its first-place position across all tested scenarios, demonstrating high robustness.\n\n`;
        } else {
            text += `was sensitive to changes in ${criticalCriteria.join(', ')}, indicating that these criteria are critical for the decision outcome.\n\n`;
        }

        text += `2. **Critical Criteria**: `;
        if (criticalCriteria.length > 0) {
            text += `The following criteria were identified as critical: ${criticalCriteria.join(', ')}. Changes in these criteria weights led to rank reversals.\n\n`;
        } else {
            text += `No critical criteria were identified that would cause rank reversals, suggesting a stable decision model.\n\n`;
        }

        text += `3. **Alternative Stability**:\n`;
        Object.entries(stability as Record<string, { min: number; max: number; range: number }>).forEach(([alt, s]) => {
            text += `   - ${alt}: Rank range [${s.min}-${s.max}], stability index: ${s.range === 0 ? 'Stable' : s.range <= 2 ? 'Moderately Stable' : 'Sensitive'}\n`;
        });

        text += `\n**Conclusion**\n\n`;
        text += `The sensitivity analysis confirms that the selected alternative (${originalWinner}) is `;
        text += criticalCriteria.length === 0 ? 'robust and reliable under various weight scenarios.' :
            `sensitive to certain criteria weight variations. Decision-makers should carefully consider the weights assigned to ${criticalCriteria.join(' and ')} when finalizing their decision.`;

        return text;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Text copied to clipboard!');
    };

    const exportChartAsJPEG = async () => {
        if (!chartRef.current || scenarios.length === 0) return;

        const scale = 300 / 96;
        const width = 800 * scale;
        const height = 600 * scale;

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
        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.fillText('Sensitivity Analysis Results', 30, 35);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText(`Method: ${analysis.method} | ${new Date().toLocaleString()}`, 30, 55);

        // Draw rank comparison chart
        const chartY = 80;
        const barHeight = 20;
        const alternatives = analysis.alternatives;
        const numScenarios = Math.min(scenarios.length, 10);

        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Rank by Scenario', 30, chartY);

        scenarios.slice(0, numScenarios).forEach((scenario, sIdx) => {
            const y = chartY + 20 + sIdx * (barHeight + 5);

            // Scenario label
            ctx.fillStyle = '#64748b';
            ctx.font = '9px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(scenario.scenario.substring(0, 20), 150, y + 14);

            // Rank bars for each alternative
            scenario.rankings.forEach((r, rIdx) => {
                const x = 160 + rIdx * 60;
                const altIdx = alternatives.indexOf(r.alternative);
                ctx.fillStyle = CHART_COLORS[altIdx % CHART_COLORS.length];
                ctx.fillRect(x, y, 50, barHeight);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`#${r.rank}`, x + 25, y + 14);
            });
        });

        // Legend
        const legendY = chartY + 20 + numScenarios * (barHeight + 5) + 30;
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Legend:', 30, legendY);

        alternatives.slice(0, 8).forEach((alt, i) => {
            const x = 30 + (i % 4) * 180;
            const y = legendY + 20 + Math.floor(i / 4) * 20;
            ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
            ctx.fillRect(x, y - 10, 12, 12);
            ctx.fillStyle = '#334155';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.fillText(alt.substring(0, 20), x + 18, y);
        });

        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Sensitivity_Analysis_${analysis.method}_300dpi.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }, 'image/jpeg', 0.95);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button onClick={onBack} className="text-sm font-bold text-indigo-600 mb-2 hover:underline">← Back to Results</button>
                    <h2 className="text-2xl font-bold text-slate-900">Sensitivity Analysis</h2>
                    <p className="text-slate-500 text-sm">{analysis.method} - Weight Variation Analysis</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                        {analysis.criteria.length} Criteria
                    </span>
                    <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                        {analysis.alternatives.length} Alternatives
                    </span>
                </div>
            </div>

            {/* Analysis Type Selection */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Analysis Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${analysisType === 'oat' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="type" checked={analysisType === 'oat'} onChange={() => setAnalysisType('oat')} className="hidden" />
                        <div className="font-bold text-slate-800">One-at-a-Time (OAT)</div>
                        <div className="text-xs text-slate-500 mt-1">Increase each criterion by 50%, adjust others proportionally</div>
                    </label>
                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${analysisType === 'percentage' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="type" checked={analysisType === 'percentage'} onChange={() => setAnalysisType('percentage')} className="hidden" />
                        <div className="font-bold text-slate-800">Percentage Variation</div>
                        <div className="text-xs text-slate-500 mt-1">±{percentageChange}% change for each criterion</div>
                    </label>
                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${analysisType === 'extreme' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="type" checked={analysisType === 'extreme'} onChange={() => setAnalysisType('extreme')} className="hidden" />
                        <div className="font-bold text-slate-800">Extreme Scenarios</div>
                        <div className="text-xs text-slate-500 mt-1">Each criterion at 50% dominance + equal weights</div>
                    </label>
                </div>

                {analysisType === 'percentage' && (
                    <div className="flex items-center gap-4 mb-4">
                        <label className="text-sm text-slate-600">Variation Percentage:</label>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            step="5"
                            value={percentageChange}
                            onChange={(e) => setPercentageChange(parseInt(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm font-bold text-indigo-600 w-12">±{percentageChange}%</span>
                    </div>
                )}

                <button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                    {isAnalyzing ? 'Analyzing...' : 'Run Sensitivity Analysis'}
                </button>
            </div>

            {/* Results */}
            {scenarios.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Charts & Results - 2/3 width */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Rank Comparison Chart */}
                        <div ref={chartRef} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-700">Rank Comparison Across Scenarios</h3>
                                <button
                                    onClick={exportChartAsJPEG}
                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                                >
                                    Export Chart (300 DPI)
                                </button>
                            </div>

                            {/* Visual chart */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-2 px-2 font-bold text-slate-500">Scenario</th>
                                            {analysis.alternatives.slice(0, 8).map((alt, i) => (
                                                <th key={alt} className="text-center py-2 px-1">
                                                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: CHART_COLORS[i] }}></div>
                                                    <span className="text-[9px] text-slate-400 truncate block max-w-[60px]">{alt}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {scenarios.map((scenario, sIdx) => (
                                            <tr key={sIdx} className={sIdx === 0 ? 'bg-indigo-50' : 'hover:bg-slate-50'}>
                                                <td className="py-2 px-2 font-medium text-slate-700 max-w-[150px] truncate" title={scenario.scenario}>
                                                    {scenario.scenario}
                                                </td>
                                                {analysis.alternatives.slice(0, 8).map((alt, aIdx) => {
                                                    const ranking = scenario.rankings.find(r => r.alternative === alt);
                                                    const rank = ranking?.rank || '-';
                                                    const baseRank = scenarios[0]?.rankings.find(r => r.alternative === alt)?.rank;
                                                    const changed = sIdx > 0 && rank !== baseRank;
                                                    return (
                                                        <td key={alt} className="text-center py-2 px-1">
                                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${rank === 1 ? 'bg-indigo-600 text-white' :
                                                                changed ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {rank}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Stability Chart */}
                        {rankAnalysis && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-4">Alternative Stability Analysis</h3>
                                <div className="space-y-3">
                                    {Object.entries(rankAnalysis.stability as Record<string, { min: number; max: number; range: number }>).map(([alt, s], i) => (
                                        <div key={alt} className="flex items-center gap-3">
                                            <div className="w-24 text-xs font-medium text-slate-600 truncate">{alt}</div>
                                            <div className="flex-1 h-6 bg-slate-100 rounded-lg relative">
                                                <div
                                                    className="absolute h-full rounded-lg"
                                                    style={{
                                                        left: `${((s.min - 1) / analysis.alternatives.length) * 100}%`,
                                                        width: `${((s.range + 1) / analysis.alternatives.length) * 100}%`,
                                                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                                        opacity: 0.7
                                                    }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                                    {s.range === 0 ? 'Stable' : `Rank ${s.min}-${s.max}`}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[9px] font-bold ${s.range === 0 ? 'bg-green-100 text-green-700' :
                                                s.range <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {s.range === 0 ? 'Stable' : s.range <= 2 ? 'Moderate' : 'Sensitive'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Explanation Panel - 1/3 width */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* What is Sensitivity Analysis */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-2xl text-white">
                            <h3 className="text-sm font-bold mb-3">What is Sensitivity Analysis?</h3>
                            <p className="text-xs text-indigo-100 leading-relaxed">
                                Sensitivity analysis in MCDM evaluates how changes in criteria weights affect the final ranking of alternatives.
                                It helps identify <strong>critical criteria</strong> that significantly impact decisions and validates the
                                <strong> robustness</strong> of results.
                            </p>
                            <div className="mt-4 pt-4 border-t border-white/20 text-xs text-indigo-200">
                                <div className="mb-2"><strong>OAT:</strong> One-at-a-Time analysis - varies single criterion</div>
                                <div className="mb-2"><strong>Percentage:</strong> Systematic ± changes to each weight</div>
                                <div><strong>Extreme:</strong> Tests dominance scenarios</div>
                            </div>
                        </div>

                        {/* Key Findings */}
                        {rankAnalysis && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-4">Key Findings</h3>

                                <div className="space-y-3">
                                    <div className="p-3 bg-emerald-50 rounded-xl">
                                        <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Best Alternative</div>
                                        <div className="text-lg font-bold text-emerald-800">{rankAnalysis.originalWinner}</div>
                                    </div>

                                    <div className="p-3 bg-amber-50 rounded-xl">
                                        <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">Critical Criteria</div>
                                        <div className="text-sm font-medium text-amber-800">
                                            {rankAnalysis.criticalCriteria.length > 0 ?
                                                rankAnalysis.criticalCriteria.join(', ') :
                                                'None identified (Robust)'
                                            }
                                        </div>
                                    </div>

                                    <div className="p-3 bg-indigo-50 rounded-xl">
                                        <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Stability Assessment</div>
                                        <div className="text-sm font-medium text-indigo-800">
                                            {rankAnalysis.criticalCriteria.length === 0 ?
                                                'High - Results are robust' :
                                                rankAnalysis.criticalCriteria.length <= 2 ?
                                                    'Moderate - Some sensitivity' :
                                                    'Low - Results are sensitive'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Academic Text */}
                        {scenarios.length > 1 && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-700">Academic Text</h3>
                                    <button
                                        onClick={() => copyToClipboard(generateAcademicText().replace(/\*\*/g, ''))}
                                        className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200"
                                    >
                                        Copy Text
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto text-xs text-slate-600 leading-relaxed prose prose-xs">
                                    <pre className="whitespace-pre-wrap font-sans">{generateAcademicText().replace(/\*\*/g, '')}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
