import React, { useState, useMemo } from 'react';
import { MCDMAnalysis, LinguisticScale, ExpertEvaluation } from '../types';

interface Props {
    analysis: MCDMAnalysis;
    onWeightsCalculated: (weights: number[]) => void;
}

// Default linguistic scales
const DEFAULT_TRIANGULAR_SCALE: LinguisticScale[] = [
    { term: 'Very High', fuzzyNumber: [0.7, 0.9, 1.0], crispValue: 0.87 },
    { term: 'High', fuzzyNumber: [0.5, 0.7, 0.9], crispValue: 0.70 },
    { term: 'Medium', fuzzyNumber: [0.3, 0.5, 0.7], crispValue: 0.50 },
    { term: 'Low', fuzzyNumber: [0.1, 0.3, 0.5], crispValue: 0.30 },
    { term: 'Very Low', fuzzyNumber: [0.0, 0.1, 0.3], crispValue: 0.13 },
];

const SAATY_SCALE: LinguisticScale[] = [
    { term: 'Extreme', fuzzyNumber: 9, crispValue: 9 },
    { term: 'Very Strong', fuzzyNumber: 7, crispValue: 7 },
    { term: 'Strong', fuzzyNumber: 5, crispValue: 5 },
    { term: 'Moderate', fuzzyNumber: 3, crispValue: 3 },
    { term: 'Equal', fuzzyNumber: 1, crispValue: 1 },
];

export const ExpertEvaluationPanel: React.FC<Props> = ({ analysis, onWeightsCalculated }) => {
    const [activeScale, setActiveScale] = useState<'paper' | 'triangular' | 'saaty'>('paper');
    const [expertMatrix, setExpertMatrix] = useState<(string | number)[][]>(
        analysis.expertWeightMatrix || []
    );
    const [showEditor, setShowEditor] = useState(false);
    const [numExperts, setNumExperts] = useState(3);

    // Get the active linguistic scale
    const linguisticScale = useMemo(() => {
        if (activeScale === 'paper' && analysis.linguisticScale?.length) {
            return analysis.linguisticScale;
        } else if (activeScale === 'saaty') {
            return SAATY_SCALE;
        }
        return DEFAULT_TRIANGULAR_SCALE;
    }, [activeScale, analysis.linguisticScale]);

    // Convert linguistic term to crisp value
    const termToCrisp = (term: string | number): number => {
        if (typeof term === 'number') return term;

        const normalizedTerm = term.toString().toLowerCase().trim();

        // Check scale for match
        for (const scale of linguisticScale) {
            if (scale.term.toLowerCase() === normalizedTerm) {
                return scale.crispValue;
            }
        }

        // Common abbreviations
        const abbrevMap: Record<string, string> = {
            'vh': 'very high', 'vg': 'very good', 'vl': 'very low',
            'h': 'high', 'g': 'good', 'm': 'medium', 'l': 'low',
            'mp': 'medium positive', 'mn': 'medium negative'
        };

        const expanded = abbrevMap[normalizedTerm] || normalizedTerm;
        for (const scale of linguisticScale) {
            if (scale.term.toLowerCase() === expanded) {
                return scale.crispValue;
            }
        }

        // Try parsing as number
        const num = parseFloat(term.toString());
        return isNaN(num) ? 0.5 : num;
    };

    // Calculate weights from expert matrix
    const calculatedWeights = useMemo(() => {
        if (!expertMatrix || expertMatrix.length < 2) return [];

        const headers = expertMatrix[0] as string[];
        const criteriaCount = headers.length - 1; // First column is expert name
        const expertRows = expertMatrix.slice(1);

        if (criteriaCount <= 0 || expertRows.length === 0) return [];

        // Convert all values to crisp and aggregate
        const crispValues: number[][] = expertRows.map(row =>
            row.slice(1).map(val => termToCrisp(val))
        );

        // Aggregate using geometric mean (common in fuzzy MCDM)
        const aggregated: number[] = [];
        for (let j = 0; j < criteriaCount; j++) {
            const columnValues = crispValues.map(row => row[j] || 0.5);
            const geoMean = Math.pow(
                columnValues.reduce((prod, val) => prod * (val || 0.001), 1),
                1 / columnValues.length
            );
            aggregated.push(geoMean);
        }

        // Normalize to sum = 1
        const sum = aggregated.reduce((a, b) => a + b, 0) || 1;
        return aggregated.map(v => parseFloat((v / sum).toFixed(4)));
    }, [expertMatrix, linguisticScale]);

    // Initialize empty matrix for manual entry
    const initializeMatrix = () => {
        const criteriaNames = analysis.criteria.map(c => c.name);
        const headers = ['Expert', ...criteriaNames];
        const rows = [headers];

        for (let i = 1; i <= numExperts; i++) {
            rows.push([`Expert ${i}`, ...criteriaNames.map(() => 'Medium')]);
        }

        setExpertMatrix(rows);
        setShowEditor(true);
    };

    // Handle cell change
    const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
        const newMatrix = expertMatrix.map((row, i) =>
            i === rowIdx ? row.map((cell, j) => j === colIdx ? value : cell) : [...row]
        );
        setExpertMatrix(newMatrix);
    };

    // Apply calculated weights
    const applyWeights = () => {
        if (calculatedWeights.length > 0) {
            onWeightsCalculated(calculatedWeights);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Uzman Değerlendirmeleri</h3>
                        <p className="text-xs text-slate-500 mt-1">Dilsel ölçekle kriter ağırlıklarını belirleyin</p>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={activeScale}
                            onChange={(e) => setActiveScale(e.target.value as any)}
                            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
                        >
                            <option value="paper">Makaledeki Ölçek</option>
                            <option value="triangular">Triangular Fuzzy</option>
                            <option value="saaty">Saaty 1-9</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Linguistic Scale Display */}
                <div className="bg-slate-50 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-slate-600 mb-2">Aktif Dilsel Ölçek</h4>
                    <div className="flex flex-wrap gap-2">
                        {linguisticScale.map((scale, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                                <span className="text-xs font-medium text-slate-700">{scale.term}</span>
                                <span className="text-[10px] text-slate-400">=</span>
                                <span className="text-xs font-mono text-indigo-600">
                                    {Array.isArray(scale.fuzzyNumber)
                                        ? `(${scale.fuzzyNumber.join(', ')})`
                                        : scale.fuzzyNumber}
                                </span>
                                <span className="text-[10px] text-slate-400">→</span>
                                <span className="text-xs font-bold text-emerald-600">{scale.crispValue}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Expert Matrix from Paper */}
                {analysis.expertWeightMatrix && analysis.expertWeightMatrix.length > 0 && !showEditor && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-slate-600">Makaleden Çıkarılan Uzman Değerlendirmeleri</h4>
                            <button
                                onClick={() => {
                                    setExpertMatrix(analysis.expertWeightMatrix || []);
                                    setShowEditor(true);
                                }}
                                className="text-xs text-indigo-600 hover:underline"
                            >
                                Düzenle
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100">
                                        {(analysis.expertWeightMatrix[0] || []).map((header, i) => (
                                            <th key={i} className="px-3 py-2 text-left font-bold text-slate-600 border border-slate-200">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.expertWeightMatrix.slice(1).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            {row.map((cell, j) => (
                                                <td key={j} className="px-3 py-2 border border-slate-200">
                                                    <span className={j === 0 ? 'font-medium text-slate-700' : 'text-purple-600'}>
                                                        {cell}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Manual Entry / Editor */}
                {showEditor && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-slate-600">Uzman Değerlendirme Matrisi</h4>
                            <button
                                onClick={() => setShowEditor(false)}
                                className="text-xs text-slate-500 hover:text-slate-700"
                            >
                                Kapat
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100">
                                        {(expertMatrix[0] || []).map((header, i) => (
                                            <th key={i} className="px-3 py-2 text-left font-bold text-slate-600 border border-slate-200">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {expertMatrix.slice(1).map((row, rowIdx) => (
                                        <tr key={rowIdx}>
                                            {row.map((cell, colIdx) => (
                                                <td key={colIdx} className="p-1 border border-slate-200">
                                                    {colIdx === 0 ? (
                                                        <span className="font-medium text-slate-700 px-2">{cell}</span>
                                                    ) : (
                                                        <select
                                                            value={cell.toString()}
                                                            onChange={(e) => handleCellChange(rowIdx + 1, colIdx, e.target.value)}
                                                            className="w-full px-2 py-1 text-xs border-none bg-transparent text-purple-600 font-medium"
                                                        >
                                                            {linguisticScale.map((scale, i) => (
                                                                <option key={i} value={scale.term}>{scale.term}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* No data - initialize */}
                {(!analysis.expertWeightMatrix || analysis.expertWeightMatrix.length === 0) && !showEditor && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-500 mb-3">Uzman değerlendirmesi bulunamadı</p>
                        <div className="flex items-center justify-center gap-3">
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={numExperts}
                                onChange={(e) => setNumExperts(parseInt(e.target.value) || 3)}
                                className="w-16 text-center border border-slate-200 rounded px-2 py-1 text-sm"
                            />
                            <span className="text-xs text-slate-500">uzman ile</span>
                            <button
                                onClick={initializeMatrix}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                            >
                                Manuel Giriş Başlat
                            </button>
                        </div>
                    </div>
                )}

                {/* Calculated Weights */}
                {calculatedWeights.length > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-emerald-800">Hesaplanan Kriter Ağırlıkları</h4>
                            <button
                                onClick={applyWeights}
                                className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                            >
                                Ağırlıkları Uygula
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {calculatedWeights.map((weight, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-emerald-200">
                                    <span className="text-xs font-medium text-slate-600">
                                        {analysis.criteria[i]?.name || `C${i + 1}`}
                                    </span>
                                    <span className="text-sm font-bold text-emerald-700">{weight.toFixed(4)}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-emerald-600 mt-2">
                            * Geometrik ortalama ile agregasyon yapılmıştır
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
