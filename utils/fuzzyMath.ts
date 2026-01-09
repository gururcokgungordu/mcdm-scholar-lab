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

// ============================================
// FUZZIFICATION METHODS
// Crisp → Fuzzy conversion
// ============================================

export const Fuzzification = {
    /**
     * Triangular fuzzification with spread percentage
     * Creates a fuzzy number by adding uncertainty around crisp value
     * @param crisp - The crisp value
     * @param spread - Percentage spread (default 20% = 0.2)
     */
    triangularSpread: (crisp: number, spread: number = 0.2): TriangularFuzzyNumber => {
        const delta = crisp * spread;
        return {
            l: Math.max(0, crisp - delta),
            m: crisp,
            u: crisp + delta
        };
    },

    /**
     * Triangular fuzzification with absolute bounds
     * @param crisp - The crisp value (becomes middle)
     * @param lower - Absolute lower bound
     * @param upper - Absolute upper bound
     */
    triangularAbsolute: (crisp: number, lower: number, upper: number): TriangularFuzzyNumber => ({
        l: lower,
        m: crisp,
        u: upper
    }),

    /**
     * Triangular fuzzification based on scale range
     * Useful when you know the min/max of the scale
     * @param crisp - The crisp value
     * @param scaleMin - Minimum possible value in scale
     * @param scaleMax - Maximum possible value in scale
     * @param spreadRatio - Spread as ratio of scale range (default 0.1)
     */
    triangularScaled: (crisp: number, scaleMin: number, scaleMax: number, spreadRatio: number = 0.1): TriangularFuzzyNumber => {
        const range = scaleMax - scaleMin;
        const delta = range * spreadRatio;
        return {
            l: Math.max(scaleMin, crisp - delta),
            m: crisp,
            u: Math.min(scaleMax, crisp + delta)
        };
    },

    /**
     * Gaussian-based triangular fuzzification
     * Uses standard deviation to determine spread
     * @param crisp - The crisp value
     * @param sigma - Standard deviation (spread factor)
     */
    gaussianTriangular: (crisp: number, sigma: number = 0.1): TriangularFuzzyNumber => ({
        l: crisp - 2 * sigma,
        m: crisp,
        u: crisp + 2 * sigma
    }),

    /**
     * Map crisp value to nearest linguistic term's fuzzy number
     * @param crisp - The crisp value (0-1 range typically)
     * @param scale - Linguistic scale with fuzzy numbers
     */
    toLinguistic: (
        crisp: number,
        scale: { term: string; crispValue: number; fuzzyNumber: number[] }[]
    ): TriangularFuzzyNumber => {
        // Find closest linguistic term
        let closest = scale[0];
        let minDiff = Math.abs(crisp - scale[0].crispValue);

        for (const item of scale) {
            const diff = Math.abs(crisp - item.crispValue);
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        }

        return {
            l: closest.fuzzyNumber[0],
            m: closest.fuzzyNumber[1],
            u: closest.fuzzyNumber[2]
        };
    },

    /**
     * Trapezoidal fuzzification
     * Creates 4-tuple fuzzy number
     */
    trapezoidal: (crisp: number, spreadLower: number = 0.2, plateau: number = 0.05): TrapezoidalFuzzyNumber => {
        const deltaL = crisp * spreadLower;
        const deltaP = crisp * plateau;
        return {
            a: Math.max(0, crisp - deltaL),
            b: Math.max(0, crisp - deltaP),
            c: crisp + deltaP,
            d: crisp + deltaL
        };
    }
};

// ============================================
// HYBRID CALCULATION SUPPORT
// Mixed Fuzzy/Crisp data handling
// ============================================

export type MixedValue = number | TriangularFuzzyNumber | string;

export interface HybridMatrixConfig {
    fuzzyColumns: number[];      // Indices of columns that are fuzzy
    crispColumns: number[];      // Indices of columns that are crisp
    linguisticScale?: { term: string; fuzzyNumber: number[]; crispValue: number }[];
    defaultSpread?: number;      // Spread for crispToFuzzy conversion
}

/**
 * Process a mixed matrix containing both fuzzy and crisp values
 * Converts everything to a unified format
 */
export function processHybridMatrix(
    matrix: MixedValue[][],
    config: HybridMatrixConfig,
    outputFormat: 'fuzzy' | 'crisp' = 'fuzzy'
): number[][] | TriangularFuzzyNumber[][] {
    const lookup = config.linguisticScale
        ? createLinguisticLookup(config.linguisticScale as any)
        : new Map<string, TriangularFuzzyNumber>();

    const spread = config.defaultSpread || 0.2;

    if (outputFormat === 'fuzzy') {
        // Convert everything to fuzzy
        return matrix.map(row =>
            row.map((cell, j) => {
                // Already fuzzy
                if (isFuzzy(cell)) return cell;

                // Linguistic term
                if (typeof cell === 'string') {
                    const key = cell.toLowerCase().trim();
                    return lookup.get(key) || Fuzzification.triangularSpread(0.5, spread);
                }

                // Crisp number - fuzzify it
                return Fuzzification.triangularSpread(cell, spread);
            })
        );
    } else {
        // Convert everything to crisp
        return matrix.map(row =>
            row.map((cell, j) => {
                // Already crisp
                if (typeof cell === 'number') return cell;

                // Fuzzy - defuzzify
                if (isFuzzy(cell)) return Defuzzification.centroid(cell);

                // Linguistic term - get crisp value
                if (typeof cell === 'string') {
                    const key = cell.toLowerCase().trim();
                    const fuzzy = lookup.get(key);
                    return fuzzy ? Defuzzification.centroid(fuzzy) : 0.5;
                }

                return 0;
            })
        );
    }
}

/**
 * Detect data type for each column in a matrix
 */
export function detectColumnTypes(
    matrix: MixedValue[][]
): ('fuzzy' | 'crisp' | 'linguistic' | 'mixed')[] {
    if (matrix.length === 0) return [];

    const numCols = matrix[0].length;
    const types: ('fuzzy' | 'crisp' | 'linguistic' | 'mixed')[] = [];

    for (let j = 0; j < numCols; j++) {
        const colValues = matrix.map(row => row[j]);

        let hasFuzzy = false;
        let hasCrisp = false;
        let hasLinguistic = false;

        for (const val of colValues) {
            if (isFuzzy(val)) hasFuzzy = true;
            else if (typeof val === 'number') hasCrisp = true;
            else if (typeof val === 'string') hasLinguistic = true;
        }

        const count = [hasFuzzy, hasCrisp, hasLinguistic].filter(Boolean).length;

        if (count > 1) types.push('mixed');
        else if (hasFuzzy) types.push('fuzzy');
        else if (hasLinguistic) types.push('linguistic');
        else types.push('crisp');
    }

    return types;
}

/**
 * Calculate uncertainty/spread measure for a fuzzy matrix
 * Higher values indicate more uncertainty in the data
 */
export function calculateUncertainty(matrix: TriangularFuzzyNumber[][]): number {
    let totalSpread = 0;
    let count = 0;

    for (const row of matrix) {
        for (const cell of row) {
            const spread = (cell.u - cell.l) / (cell.m || 1);
            totalSpread += spread;
            count++;
        }
    }

    return count > 0 ? totalSpread / count : 0;
}

/**
 * Default linguistic scales for common MCDM applications
 */
export const DEFAULT_SCALES = {
    // Standard 5-level triangular scale (0-1)
    triangular5: [
        { term: 'Very Low', abbreviation: 'VL', fuzzyNumber: [0, 0.1, 0.3], crispValue: 0.13 },
        { term: 'Low', abbreviation: 'L', fuzzyNumber: [0.1, 0.3, 0.5], crispValue: 0.30 },
        { term: 'Medium', abbreviation: 'M', fuzzyNumber: [0.3, 0.5, 0.7], crispValue: 0.50 },
        { term: 'High', abbreviation: 'H', fuzzyNumber: [0.5, 0.7, 0.9], crispValue: 0.70 },
        { term: 'Very High', abbreviation: 'VH', fuzzyNumber: [0.7, 0.9, 1.0], crispValue: 0.87 }
    ],

    // 7-level scale
    triangular7: [
        { term: 'Absolutely Low', abbreviation: 'AL', fuzzyNumber: [0, 0, 0.1], crispValue: 0.03 },
        { term: 'Very Low', abbreviation: 'VL', fuzzyNumber: [0, 0.1, 0.3], crispValue: 0.13 },
        { term: 'Low', abbreviation: 'L', fuzzyNumber: [0.1, 0.3, 0.5], crispValue: 0.30 },
        { term: 'Medium', abbreviation: 'M', fuzzyNumber: [0.3, 0.5, 0.7], crispValue: 0.50 },
        { term: 'High', abbreviation: 'H', fuzzyNumber: [0.5, 0.7, 0.9], crispValue: 0.70 },
        { term: 'Very High', abbreviation: 'VH', fuzzyNumber: [0.7, 0.9, 1.0], crispValue: 0.87 },
        { term: 'Absolutely High', abbreviation: 'AH', fuzzyNumber: [0.9, 1.0, 1.0], crispValue: 0.97 }
    ],

    // Saaty AHP scale (1-9, crisp for AHP)
    saaty9: [
        { term: 'Equal', abbreviation: '1', fuzzyNumber: [1, 1, 1], crispValue: 1 },
        { term: 'Moderate', abbreviation: '3', fuzzyNumber: [2, 3, 4], crispValue: 3 },
        { term: 'Strong', abbreviation: '5', fuzzyNumber: [4, 5, 6], crispValue: 5 },
        { term: 'Very Strong', abbreviation: '7', fuzzyNumber: [6, 7, 8], crispValue: 7 },
        { term: 'Extreme', abbreviation: '9', fuzzyNumber: [8, 9, 9], crispValue: 9 }
    ],

    // Fuzzy AHP triangular scale
    fuzzyAHP: [
        { term: 'Equal', abbreviation: 'E', fuzzyNumber: [1, 1, 1], crispValue: 1 },
        { term: 'Weak', abbreviation: 'W', fuzzyNumber: [1, 2, 3], crispValue: 2 },
        { term: 'Moderate', abbreviation: 'M', fuzzyNumber: [2, 3, 4], crispValue: 3 },
        { term: 'Strong', abbreviation: 'S', fuzzyNumber: [3, 4, 5], crispValue: 4 },
        { term: 'Very Strong', abbreviation: 'VS', fuzzyNumber: [4, 5, 6], crispValue: 5 },
        { term: 'Demonstrated', abbreviation: 'D', fuzzyNumber: [5, 6, 7], crispValue: 6 },
        { term: 'Extreme', abbreviation: 'EX', fuzzyNumber: [7, 8, 9], crispValue: 8 }
    ]
};

