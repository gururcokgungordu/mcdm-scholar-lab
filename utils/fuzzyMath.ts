// Fuzzy Mathematics Library for MCDM Calculations

// Types
export interface TriangularFuzzyNumber {
    l: number; // Lower
    m: number; // Middle
    u: number; // Upper
}

export interface TrapezoidalFuzzyNumber {
    a: number;
    b: number;
    c: number;
    d: number;
}

export interface SphericalFuzzyNumber {
    mu: number;  // Membership
    nu: number;  // Non-membership
    pi: number;  // Hesitancy
}

// Parse fuzzy number from various formats
export function parseFuzzyNumber(value: any): TriangularFuzzyNumber | number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const str = value.toString().trim();

    // Format: (0.3, 0.5, 0.7) or [0.3, 0.5, 0.7]
    const match = str.match(/[\(\[]?\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*[\)\]]?/);
    if (match) {
        return {
            l: parseFloat(match[1]),
            m: parseFloat(match[2]),
            u: parseFloat(match[3])
        };
    }

    // Try parsing as number
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

// Check if value is a fuzzy number
export function isFuzzy(value: any): value is TriangularFuzzyNumber {
    return value && typeof value === 'object' && 'l' in value && 'm' in value && 'u' in value;
}

// Defuzzification Methods
export const Defuzzification = {
    // Centroid (Center of Gravity) - Most common
    centroid: (tfn: TriangularFuzzyNumber): number => {
        return (tfn.l + tfn.m + tfn.u) / 3;
    },

    // Graded Mean Integration
    gradedMean: (tfn: TriangularFuzzyNumber): number => {
        return (tfn.l + 4 * tfn.m + tfn.u) / 6;
    },

    // Mean of Maximum
    meanOfMaximum: (tfn: TriangularFuzzyNumber): number => {
        return tfn.m;
    },

    // Alpha-cut (with alpha = 0.5)
    alphaCut: (tfn: TriangularFuzzyNumber, alpha: number = 0.5): number => {
        const lower = tfn.l + alpha * (tfn.m - tfn.l);
        const upper = tfn.u - alpha * (tfn.u - tfn.m);
        return (lower + upper) / 2;
    },

    // Score function for spherical/picture fuzzy
    scoreFunction: (sfn: SphericalFuzzyNumber): number => {
        return (sfn.mu - sfn.nu) * (1 - sfn.pi);
    }
};

// Fuzzy Arithmetic Operations
export const FuzzyArithmetic = {
    // Addition
    add: (a: TriangularFuzzyNumber, b: TriangularFuzzyNumber): TriangularFuzzyNumber => ({
        l: a.l + b.l,
        m: a.m + b.m,
        u: a.u + b.u
    }),

    // Subtraction
    subtract: (a: TriangularFuzzyNumber, b: TriangularFuzzyNumber): TriangularFuzzyNumber => ({
        l: a.l - b.u,
        m: a.m - b.m,
        u: a.u - b.l
    }),

    // Multiplication
    multiply: (a: TriangularFuzzyNumber, b: TriangularFuzzyNumber): TriangularFuzzyNumber => ({
        l: a.l * b.l,
        m: a.m * b.m,
        u: a.u * b.u
    }),

    // Scalar multiplication
    scalarMultiply: (a: TriangularFuzzyNumber, k: number): TriangularFuzzyNumber => ({
        l: a.l * k,
        m: a.m * k,
        u: a.u * k
    }),

    // Division
    divide: (a: TriangularFuzzyNumber, b: TriangularFuzzyNumber): TriangularFuzzyNumber => ({
        l: b.u !== 0 ? a.l / b.u : 0,
        m: b.m !== 0 ? a.m / b.m : 0,
        u: b.l !== 0 ? a.u / b.l : 0
    }),

    // Distance between two fuzzy numbers
    distance: (a: TriangularFuzzyNumber, b: TriangularFuzzyNumber): number => {
        return Math.sqrt(
            Math.pow(a.l - b.l, 2) + Math.pow(a.m - b.m, 2) + Math.pow(a.u - b.u, 2)
        ) / Math.sqrt(3);
    }
};

// Fuzzy Aggregation Methods
export const FuzzyAggregation = {
    // Arithmetic Mean
    arithmeticMean: (numbers: TriangularFuzzyNumber[]): TriangularFuzzyNumber => {
        const n = numbers.length;
        if (n === 0) return { l: 0, m: 0, u: 0 };

        return {
            l: numbers.reduce((sum, fn) => sum + fn.l, 0) / n,
            m: numbers.reduce((sum, fn) => sum + fn.m, 0) / n,
            u: numbers.reduce((sum, fn) => sum + fn.u, 0) / n
        };
    },

    // Geometric Mean - Preferred for fuzzy AHP
    geometricMean: (numbers: TriangularFuzzyNumber[]): TriangularFuzzyNumber => {
        const n = numbers.length;
        if (n === 0) return { l: 0, m: 0, u: 0 };

        return {
            l: Math.pow(numbers.reduce((prod, fn) => prod * (fn.l || 0.001), 1), 1 / n),
            m: Math.pow(numbers.reduce((prod, fn) => prod * (fn.m || 0.001), 1), 1 / n),
            u: Math.pow(numbers.reduce((prod, fn) => prod * (fn.u || 0.001), 1), 1 / n)
        };
    },

    // Weighted Average
    weightedAverage: (numbers: TriangularFuzzyNumber[], weights: number[]): TriangularFuzzyNumber => {
        const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

        return {
            l: numbers.reduce((sum, fn, i) => sum + fn.l * (weights[i] || 0), 0) / totalWeight,
            m: numbers.reduce((sum, fn, i) => sum + fn.m * (weights[i] || 0), 0) / totalWeight,
            u: numbers.reduce((sum, fn, i) => sum + fn.u * (weights[i] || 0), 0) / totalWeight
        };
    }
};

// Fuzzy Normalization
export const FuzzyNormalization = {
    // Linear normalization for benefit criteria
    linearBenefit: (value: TriangularFuzzyNumber, max: number): TriangularFuzzyNumber => ({
        l: max !== 0 ? value.l / max : 0,
        m: max !== 0 ? value.m / max : 0,
        u: max !== 0 ? value.u / max : 0
    }),

    // Linear normalization for cost criteria
    linearCost: (value: TriangularFuzzyNumber, min: number): TriangularFuzzyNumber => ({
        l: value.u !== 0 ? min / value.u : 0,
        m: value.m !== 0 ? min / value.m : 0,
        u: value.l !== 0 ? min / value.l : 0
    }),

    // Vector normalization
    vector: (value: TriangularFuzzyNumber, sumOfSquares: number): TriangularFuzzyNumber => {
        const denom = Math.sqrt(sumOfSquares) || 1;
        return {
            l: value.l / denom,
            m: value.m / denom,
            u: value.u / denom
        };
    }
};

// Fuzzy TOPSIS Implementation
export function fuzzyTOPSIS(
    matrix: TriangularFuzzyNumber[][],
    weights: TriangularFuzzyNumber[] | number[],
    directions: ('max' | 'min')[]
): { scores: number[]; ranking: number[] } {
    const numAlts = matrix.length;
    const numCrit = matrix[0]?.length || 0;

    if (numAlts === 0 || numCrit === 0) return { scores: [], ranking: [] };

    // Convert weights to fuzzy if crisp
    const fuzzyWeights: TriangularFuzzyNumber[] = weights.map(w =>
        typeof w === 'number' ? { l: w, m: w, u: w } : w
    );

    // Step 1: Normalize the fuzzy decision matrix
    const normalizedMatrix: TriangularFuzzyNumber[][] = [];

    for (let i = 0; i < numAlts; i++) {
        normalizedMatrix[i] = [];
        for (let j = 0; j < numCrit; j++) {
            const colValues = matrix.map(row => row[j]);

            if (directions[j] === 'max') {
                const maxU = Math.max(...colValues.map(v => v.u));
                normalizedMatrix[i][j] = FuzzyNormalization.linearBenefit(matrix[i][j], maxU);
            } else {
                const minL = Math.min(...colValues.map(v => v.l).filter(v => v > 0));
                normalizedMatrix[i][j] = FuzzyNormalization.linearCost(matrix[i][j], minL);
            }
        }
    }

    // Step 2: Calculate weighted normalized matrix
    const weightedMatrix: TriangularFuzzyNumber[][] = normalizedMatrix.map(row =>
        row.map((val, j) => FuzzyArithmetic.multiply(val, fuzzyWeights[j]))
    );

    // Step 3: Determine fuzzy positive and negative ideal solutions
    const FPIS: TriangularFuzzyNumber[] = []; // Fuzzy Positive Ideal Solution
    const FNIS: TriangularFuzzyNumber[] = []; // Fuzzy Negative Ideal Solution

    for (let j = 0; j < numCrit; j++) {
        const colValues = weightedMatrix.map(row => row[j]);

        if (directions[j] === 'max') {
            FPIS[j] = {
                l: Math.max(...colValues.map(v => v.l)),
                m: Math.max(...colValues.map(v => v.m)),
                u: Math.max(...colValues.map(v => v.u))
            };
            FNIS[j] = {
                l: Math.min(...colValues.map(v => v.l)),
                m: Math.min(...colValues.map(v => v.m)),
                u: Math.min(...colValues.map(v => v.u))
            };
        } else {
            FPIS[j] = {
                l: Math.min(...colValues.map(v => v.l)),
                m: Math.min(...colValues.map(v => v.m)),
                u: Math.min(...colValues.map(v => v.u))
            };
            FNIS[j] = {
                l: Math.max(...colValues.map(v => v.l)),
                m: Math.max(...colValues.map(v => v.m)),
                u: Math.max(...colValues.map(v => v.u))
            };
        }
    }

    // Step 4: Calculate distances
    const dPlus: number[] = [];
    const dMinus: number[] = [];

    for (let i = 0; i < numAlts; i++) {
        let sumPlus = 0;
        let sumMinus = 0;

        for (let j = 0; j < numCrit; j++) {
            sumPlus += FuzzyArithmetic.distance(weightedMatrix[i][j], FPIS[j]);
            sumMinus += FuzzyArithmetic.distance(weightedMatrix[i][j], FNIS[j]);
        }

        dPlus[i] = sumPlus;
        dMinus[i] = sumMinus;
    }

    // Step 5: Calculate closeness coefficient
    const scores = dPlus.map((dp, i) => {
        const dm = dMinus[i];
        return dm / (dp + dm + 0.0001);
    });

    // Step 6: Rank
    const indexed = scores.map((s, i) => ({ score: s, index: i }));
    indexed.sort((a, b) => b.score - a.score);

    const ranking = new Array(numAlts);
    indexed.forEach((item, rank) => {
        ranking[item.index] = rank + 1;
    });

    return { scores, ranking };
}

// Convert linguistic scale to fuzzy lookup
export function createLinguisticLookup(
    scale: { term: string; abbreviation?: string; fuzzyNumber: number[]; crispValue: number }[]
): Map<string, TriangularFuzzyNumber> {
    const lookup = new Map<string, TriangularFuzzyNumber>();

    for (const item of scale) {
        const fuzzy: TriangularFuzzyNumber = {
            l: item.fuzzyNumber[0],
            m: item.fuzzyNumber[1],
            u: item.fuzzyNumber[2]
        };

        // Add by full term
        lookup.set(item.term.toLowerCase(), fuzzy);

        // Add by abbreviation
        if (item.abbreviation) {
            lookup.set(item.abbreviation.toLowerCase(), fuzzy);
        }
    }

    // Add common abbreviations
    const commonAbbrevs: Record<string, string> = {
        'vh': 'very high', 'vg': 'very good', 'ah': 'absolutely high',
        'h': 'high', 'g': 'good',
        'm': 'medium', 'f': 'fair', 'mp': 'more or less good',
        'l': 'low', 'p': 'poor',
        'vl': 'very low', 'vp': 'very poor', 'al': 'absolutely low'
    };

    for (const [abbrev, full] of Object.entries(commonAbbrevs)) {
        if (!lookup.has(abbrev) && lookup.has(full)) {
            lookup.set(abbrev, lookup.get(full)!);
        }
    }

    return lookup;
}

// Convert linguistic matrix to fuzzy matrix
export function linguisticToFuzzyMatrix(
    linguisticMatrix: (string | number)[][],
    lookup: Map<string, TriangularFuzzyNumber>
): TriangularFuzzyNumber[][] {
    return linguisticMatrix.map(row =>
        row.map(cell => {
            if (typeof cell === 'number') {
                return { l: cell, m: cell, u: cell };
            }
            const key = cell.toString().toLowerCase().trim();
            return lookup.get(key) || { l: 0.5, m: 0.5, u: 0.5 };
        })
    );
}

// Aggregate expert evaluations to single fuzzy matrix
export function aggregateExpertEvaluations(
    expertMatrices: TriangularFuzzyNumber[][][],
    method: 'geometric' | 'arithmetic' = 'geometric'
): TriangularFuzzyNumber[][] {
    if (expertMatrices.length === 0) return [];

    const numAlts = expertMatrices[0].length;
    const numCrit = expertMatrices[0][0]?.length || 0;

    const aggregated: TriangularFuzzyNumber[][] = [];

    for (let i = 0; i < numAlts; i++) {
        aggregated[i] = [];
        for (let j = 0; j < numCrit; j++) {
            const expertValues = expertMatrices.map(matrix => matrix[i][j]);

            if (method === 'geometric') {
                aggregated[i][j] = FuzzyAggregation.geometricMean(expertValues);
            } else {
                aggregated[i][j] = FuzzyAggregation.arithmeticMean(expertValues);
            }
        }
    }

    return aggregated;
}
