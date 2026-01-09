/**
 * Comprehensive MCDM Calculation Engine
 * Supports all major MCDM methods with both Fuzzy and Crisp calculations
 */

import {
    TriangularFuzzyNumber,
    Defuzzification,
    FuzzyArithmetic,
    FuzzyNormalization,
    FuzzyAggregation,
    parseFuzzyNumber,
    isFuzzy
} from './fuzzyMath';

// ============================================
// NORMALIZATION METHODS
// ============================================
export const Normalization = {
    // Vector Normalization (used in TOPSIS)
    vector: (matrix: number[][], directions: ('max' | 'min')[]): number[][] => {
        const numCrit = matrix[0]?.length || 0;
        const normalized: number[][] = matrix.map(row => [...row]);

        for (let j = 0; j < numCrit; j++) {
            const colValues = matrix.map(row => row[j] || 0);
            const sumSquares = Math.sqrt(colValues.reduce((sum, v) => sum + v * v, 0)) || 1;

            for (let i = 0; i < matrix.length; i++) {
                normalized[i][j] = matrix[i][j] / sumSquares;
            }
        }
        return normalized;
    },

    // Linear Max Normalization (used in SAW, WASPAS)
    linearMax: (matrix: number[][], directions: ('max' | 'min')[]): number[][] => {
        const numCrit = matrix[0]?.length || 0;
        const normalized: number[][] = matrix.map(row => [...row]);

        for (let j = 0; j < numCrit; j++) {
            const colValues = matrix.map(row => row[j] || 0);
            const maxVal = Math.max(...colValues) || 1;
            const minVal = Math.min(...colValues.filter(v => v > 0)) || 0.001;

            for (let i = 0; i < matrix.length; i++) {
                if (directions[j] === 'max') {
                    normalized[i][j] = matrix[i][j] / maxVal;
                } else {
                    normalized[i][j] = matrix[i][j] !== 0 ? minVal / matrix[i][j] : 0;
                }
            }
        }
        return normalized;
    },

    // Min-Max Normalization (used in EDAS, CODAS)
    minMax: (matrix: number[][], directions: ('max' | 'min')[]): number[][] => {
        const numCrit = matrix[0]?.length || 0;
        const normalized: number[][] = matrix.map(row => [...row]);

        for (let j = 0; j < numCrit; j++) {
            const colValues = matrix.map(row => row[j] || 0);
            const maxVal = Math.max(...colValues);
            const minVal = Math.min(...colValues);
            const range = maxVal - minVal || 1;

            for (let i = 0; i < matrix.length; i++) {
                if (directions[j] === 'max') {
                    normalized[i][j] = (matrix[i][j] - minVal) / range;
                } else {
                    normalized[i][j] = (maxVal - matrix[i][j]) / range;
                }
            }
        }
        return normalized;
    },

    // Sum Normalization (used in MOORA, COPRAS)
    sum: (matrix: number[][], directions: ('max' | 'min')[]): number[][] => {
        const numCrit = matrix[0]?.length || 0;
        const normalized: number[][] = matrix.map(row => [...row]);

        for (let j = 0; j < numCrit; j++) {
            const colSum = matrix.reduce((sum, row) => sum + (row[j] || 0), 0) || 1;

            for (let i = 0; i < matrix.length; i++) {
                normalized[i][j] = matrix[i][j] / colSum;
            }
        }
        return normalized;
    }
};

// ============================================
// MCDM METHODS
// ============================================

export interface MCDMResult {
    scores: number[];
    ranking: number[];
    intermediateData?: any;
}

// SAW - Simple Additive Weighting (Weighted Sum Model)
export function SAW(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[]
): MCDMResult {
    const normalized = Normalization.linearMax(matrix, directions);

    const scores = normalized.map(row =>
        row.reduce((sum, val, j) => sum + val * (weights[j] || 0), 0)
    );

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { normalized } };
}

// WPM - Weighted Product Method
export function WPM(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[]
): MCDMResult {
    const scores = matrix.map(row => {
        let product = 1;
        row.forEach((val, j) => {
            const power = directions[j] === 'max' ? weights[j] : -weights[j];
            product *= Math.pow(val || 0.001, power);
        });
        return product;
    });

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking };
}

// TOPSIS - Technique for Order Preference by Similarity to Ideal Solution
export function TOPSIS(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[]
): MCDMResult {
    const numAlts = matrix.length;
    const numCrit = matrix[0]?.length || 0;

    // Step 1: Vector normalization
    const normalized = Normalization.vector(matrix, directions);

    // Step 2: Weighted normalization
    const weighted = normalized.map(row =>
        row.map((val, j) => val * (weights[j] || 0))
    );

    // Step 3: Ideal solutions
    const pis: number[] = []; // Positive Ideal Solution
    const nis: number[] = []; // Negative Ideal Solution

    for (let j = 0; j < numCrit; j++) {
        const colVals = weighted.map(row => row[j]);
        if (directions[j] === 'max') {
            pis[j] = Math.max(...colVals);
            nis[j] = Math.min(...colVals);
        } else {
            pis[j] = Math.min(...colVals);
            nis[j] = Math.max(...colVals);
        }
    }

    // Step 4: Distance calculations
    const dPlus: number[] = [];
    const dMinus: number[] = [];

    for (let i = 0; i < numAlts; i++) {
        let sumPlus = 0, sumMinus = 0;
        for (let j = 0; j < numCrit; j++) {
            sumPlus += Math.pow(weighted[i][j] - pis[j], 2);
            sumMinus += Math.pow(weighted[i][j] - nis[j], 2);
        }
        dPlus[i] = Math.sqrt(sumPlus);
        dMinus[i] = Math.sqrt(sumMinus);
    }

    // Step 5: Closeness coefficient
    const scores = dPlus.map((dp, i) => dMinus[i] / (dp + dMinus[i] + 0.0001));

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { normalized, weighted, pis, nis, dPlus, dMinus } };
}

// VIKOR - VIseKriterijumska Optimizacija I Kompromisno Resenje
export function VIKOR(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[],
    v: number = 0.5 // Strategy weight (0.5 = consensus)
): MCDMResult {
    const numAlts = matrix.length;
    const numCrit = matrix[0]?.length || 0;

    // Step 1: Find best and worst values
    const fStar: number[] = [];
    const fMinus: number[] = [];

    for (let j = 0; j < numCrit; j++) {
        const colVals = matrix.map(row => row[j] || 0);
        if (directions[j] === 'max') {
            fStar[j] = Math.max(...colVals);
            fMinus[j] = Math.min(...colVals);
        } else {
            fStar[j] = Math.min(...colVals);
            fMinus[j] = Math.max(...colVals);
        }
    }

    // Step 2: Calculate S and R values
    const S: number[] = [];
    const R: number[] = [];

    for (let i = 0; i < numAlts; i++) {
        let sumS = 0;
        let maxR = 0;

        for (let j = 0; j < numCrit; j++) {
            const diff = fStar[j] - matrix[i][j];
            const range = fStar[j] - fMinus[j] || 1;
            const normalized = (weights[j] || 0) * Math.abs(diff) / range;

            sumS += normalized;
            maxR = Math.max(maxR, normalized);
        }

        S[i] = sumS;
        R[i] = maxR;
    }

    // Step 3: Calculate Q values
    const sStar = Math.min(...S);
    const sMinus = Math.max(...S);
    const rStar = Math.min(...R);
    const rMinus = Math.max(...R);

    const Q: number[] = S.map((s, i) => {
        const sNorm = (s - sStar) / (sMinus - sStar || 1);
        const rNorm = (R[i] - rStar) / (rMinus - rStar || 1);
        return v * sNorm + (1 - v) * rNorm;
    });

    // Lower Q is better in VIKOR
    const indexed = Q.map((q, i) => ({ s: -q, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(Q.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores: Q.map(q => 1 - q), ranking, intermediateData: { S, R, Q, fStar, fMinus } };
}

// MOORA - Multi-Objective Optimization by Ratio Analysis
export function MOORA(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[]
): MCDMResult {
    const numCrit = matrix[0]?.length || 0;

    // Ratio System
    const normalized = Normalization.vector(matrix, directions);

    const scores = normalized.map(row => {
        let score = 0;
        for (let j = 0; j < numCrit; j++) {
            const weighted = row[j] * (weights[j] || 0);
            score += directions[j] === 'max' ? weighted : -weighted;
        }
        return score;
    });

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { normalized } };
}

// WASPAS - Weighted Aggregated Sum Product Assessment
export function WASPAS(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[],
    lambda: number = 0.5 // Weight between WSM and WPM
): MCDMResult {
    // WSM component
    const wsmResult = SAW(matrix, weights, directions);

    // WPM component
    const wpmResult = WPM(matrix, weights, directions);

    // Combine
    const scores = wsmResult.scores.map((wsm, i) =>
        lambda * wsm + (1 - lambda) * wpmResult.scores[i]
    );

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { wsm: wsmResult.scores, wpm: wpmResult.scores } };
}

// COPRAS - Complex Proportional Assessment
export function COPRAS(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[]
): MCDMResult {
    const numAlts = matrix.length;
    const numCrit = matrix[0]?.length || 0;

    // Normalize
    const normalized = Normalization.sum(matrix, directions);

    // Calculate S+ and S-
    const sPlus: number[] = [];
    const sMinus: number[] = [];

    for (let i = 0; i < numAlts; i++) {
        let sumPlus = 0, sumMinus = 0;
        for (let j = 0; j < numCrit; j++) {
            const weighted = normalized[i][j] * (weights[j] || 0);
            if (directions[j] === 'max') {
                sumPlus += weighted;
            } else {
                sumMinus += weighted;
            }
        }
        sPlus[i] = sumPlus;
        sMinus[i] = sumMinus;
    }

    // Calculate relative significance Q
    const sMinusSum = sMinus.reduce((a, b) => a + b, 0);
    const Q = sPlus.map((sp, i) => {
        const sm = sMinus[i];
        return sp + (sMinusSum / (sm * sMinus.reduce((sum, s) => sum + 1 / s, 0) || 1));
    });

    // Utility degree
    const qMax = Math.max(...Q);
    const scores = Q.map(q => (q / qMax) * 100);

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { normalized, sPlus, sMinus, Q } };
}

// EDAS - Evaluation Based on Distance from Average Solution
export function EDAS(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[]
): MCDMResult {
    const numAlts = matrix.length;
    const numCrit = matrix[0]?.length || 0;

    // Calculate average solution
    const avg: number[] = [];
    for (let j = 0; j < numCrit; j++) {
        avg[j] = matrix.reduce((sum, row) => sum + row[j], 0) / numAlts;
    }

    // Calculate PDA and NDA
    const PDA: number[][] = matrix.map(row => row.map(() => 0));
    const NDA: number[][] = matrix.map(row => row.map(() => 0));

    for (let i = 0; i < numAlts; i++) {
        for (let j = 0; j < numCrit; j++) {
            const diff = matrix[i][j] - avg[j];
            if (directions[j] === 'max') {
                PDA[i][j] = Math.max(0, diff) / (avg[j] || 1);
                NDA[i][j] = Math.max(0, -diff) / (avg[j] || 1);
            } else {
                PDA[i][j] = Math.max(0, -diff) / (avg[j] || 1);
                NDA[i][j] = Math.max(0, diff) / (avg[j] || 1);
            }
        }
    }

    // Weighted sum of PDA and NDA
    const SP = PDA.map(row => row.reduce((sum, val, j) => sum + val * (weights[j] || 0), 0));
    const SN = NDA.map(row => row.reduce((sum, val, j) => sum + val * (weights[j] || 0), 0));

    // Normalize
    const maxSP = Math.max(...SP) || 1;
    const maxSN = Math.max(...SN) || 1;
    const NSP = SP.map(sp => sp / maxSP);
    const NSN = SN.map(sn => 1 - sn / maxSN);

    // Appraisal score
    const scores = NSP.map((nsp, i) => (nsp + NSN[i]) / 2);

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { avg, PDA, NDA, SP, SN, NSP, NSN } };
}

// CODAS - Combinative Distance-based Assessment
export function CODAS(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[],
    tau: number = 0.02 // Threshold parameter
): MCDMResult {
    const numAlts = matrix.length;
    const numCrit = matrix[0]?.length || 0;

    // Normalize using linear
    const normalized = Normalization.linearMax(matrix, directions);

    // Weighted normalized
    const weighted = normalized.map(row => row.map((val, j) => val * (weights[j] || 0)));

    // Negative ideal solution
    const nis = weighted[0].map((_, j) => Math.min(...weighted.map(row => row[j])));

    // Euclidean and Taxicab distances
    const E: number[] = [];
    const T: number[] = [];

    for (let i = 0; i < numAlts; i++) {
        let sumE = 0, sumT = 0;
        for (let j = 0; j < numCrit; j++) {
            const diff = weighted[i][j] - nis[j];
            sumE += diff * diff;
            sumT += Math.abs(diff);
        }
        E[i] = Math.sqrt(sumE);
        T[i] = sumT;
    }

    // Relative assessment matrix
    const H: number[][] = [];
    for (let i = 0; i < numAlts; i++) {
        H[i] = [];
        for (let k = 0; k < numAlts; k++) {
            const eDiff = E[i] - E[k];
            const psi = Math.abs(eDiff) >= tau ? 1 : 0;
            H[i][k] = eDiff + psi * (T[i] - T[k]);
        }
    }

    // Assessment score
    const scores = H.map(row => row.reduce((sum, val) => sum + val, 0));

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { normalized, weighted, nis, E, T, H } };
}

// ARAS - Additive Ratio Assessment
export function ARAS(
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[]
): MCDMResult {
    const numCrit = matrix[0]?.length || 0;

    // Create optimal alternative (A0)
    const optimal: number[] = [];
    for (let j = 0; j < numCrit; j++) {
        const colVals = matrix.map(row => row[j]);
        optimal[j] = directions[j] === 'max' ? Math.max(...colVals) : Math.min(...colVals);
    }

    // Extended matrix with optimal
    const extMatrix = [optimal, ...matrix];

    // Normalize
    const normalized = Normalization.sum(extMatrix, directions);

    // Weighted normalized
    const weighted = normalized.map(row => row.map((val, j) => val * (weights[j] || 0)));

    // Optimization function value
    const S = weighted.map(row => row.reduce((sum, val) => sum + val, 0));

    // Utility degree
    const S0 = S[0];
    const scores = S.slice(1).map(s => s / (S0 || 1));

    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const ranking = new Array(scores.length);
    indexed.forEach((item, rank) => ranking[item.i] = rank + 1);

    return { scores, ranking, intermediateData: { optimal, normalized, weighted, S } };
}

// ============================================
// DYNAMIC METHOD SELECTOR
// ============================================

export type MCDMMethodName =
    | 'SAW' | 'WSM' | 'WPM' | 'TOPSIS' | 'VIKOR' | 'MOORA'
    | 'WASPAS' | 'COPRAS' | 'EDAS' | 'CODAS' | 'ARAS';

export function calculateMCDM(
    methodName: MCDMMethodName | string,
    matrix: number[][],
    weights: number[],
    directions: ('max' | 'min')[],
    options: Record<string, any> = {}
): MCDMResult {
    const normalizedMethod = methodName.toUpperCase().replace(/[- ]/g, '').replace('WSM', 'SAW');

    switch (normalizedMethod) {
        case 'SAW':
        case 'WSM':
        case 'WEIGHTEDSUM':
            return SAW(matrix, weights, directions);

        case 'WPM':
        case 'WEIGHTEDPRODUCT':
            return WPM(matrix, weights, directions);

        case 'TOPSIS':
            return TOPSIS(matrix, weights, directions);

        case 'VIKOR':
            return VIKOR(matrix, weights, directions, options.v || 0.5);

        case 'MOORA':
        case 'MULTIMOORA':
            return MOORA(matrix, weights, directions);

        case 'WASPAS':
            return WASPAS(matrix, weights, directions, options.lambda || 0.5);

        case 'COPRAS':
            return COPRAS(matrix, weights, directions);

        case 'EDAS':
            return EDAS(matrix, weights, directions);

        case 'CODAS':
            return CODAS(matrix, weights, directions, options.tau || 0.02);

        case 'ARAS':
            return ARAS(matrix, weights, directions);

        default:
            // Default to TOPSIS for unknown methods
            console.log(`Unknown MCDM method: ${methodName}, defaulting to TOPSIS`);
            return TOPSIS(matrix, weights, directions);
    }
}

// Detect method from analysis data
export function detectMCDMMethod(analysis: any): MCDMMethodName {
    const methodStr = (analysis.method || '').toUpperCase();
    const aggregation = (analysis.logicModule?.aggregation || '').toUpperCase();

    if (methodStr.includes('TOPSIS')) return 'TOPSIS';
    if (methodStr.includes('VIKOR')) return 'VIKOR';
    if (methodStr.includes('MOORA')) return 'MOORA';
    if (methodStr.includes('WASPAS')) return 'WASPAS';
    if (methodStr.includes('COPRAS')) return 'COPRAS';
    if (methodStr.includes('EDAS')) return 'EDAS';
    if (methodStr.includes('CODAS')) return 'CODAS';
    if (methodStr.includes('ARAS')) return 'ARAS';
    if (methodStr.includes('SAW') || methodStr.includes('WSM')) return 'SAW';
    if (methodStr.includes('WPM')) return 'WPM';

    // Fallback based on aggregation type
    if (aggregation.includes('DISTANCE')) return 'TOPSIS';
    if (aggregation.includes('WEIGHTED') && aggregation.includes('SUM')) return 'SAW';

    return 'TOPSIS'; // Default
}
