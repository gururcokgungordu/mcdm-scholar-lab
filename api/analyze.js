import { GoogleGenerativeAI } from '@google/generative-ai';

// API keys for fallback
const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_BACKUP
].filter(Boolean);

let currentKeyIndex = 0;

const getGenAI = () => {
    if (API_KEYS.length === 0) {
        throw new Error('No GEMINI_API_KEY environment variables are set');
    }
    return new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
};

const rotateApiKey = () => {
    if (API_KEYS.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        return true;
    }
    return false;
};

const executeWithFallback = async (operation) => {
    let lastError;
    const triedKeys = new Set();

    while (triedKeys.size < API_KEYS.length) {
        try {
            triedKeys.add(currentKeyIndex);
            return await operation(getGenAI());
        } catch (error) {
            lastError = error;
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                if (rotateApiKey() && !triedKeys.has(currentKeyIndex)) {
                    continue;
                }
            }
            break;
        }
    }
    throw lastError;
};

const PROMPT_TEMPLATE = `
You are an EXPERT MCDM (Multi-Criteria Decision Making) academic analyst with deep knowledge of fuzzy systems, weighting methods, and ranking algorithms.

YOUR MISSION: Extract the COMPLETE methodology from this research paper. You must understand HOW the analysis flows from raw data to final rankings.

## STEP 1: READ THE METHODOLOGY SECTION CAREFULLY
The methodology section explains:
- What type of fuzzy numbers are used (triangular, trapezoidal, spherical, etc.)
- How experts provide their evaluations (linguistic terms, pairwise comparisons, direct ratings)
- The conversion process: Linguistic → Fuzzy Numbers → Aggregation → Defuzzification → Crisp Values
- Which MCDM method is applied (TOPSIS, VIKOR, AHP, MOORA, WASPAS, etc.)

## STEP 2: EXTRACT ALL TABLES - NOT JUST ONE OR TWO
MCDM papers typically have multiple related tables:
- **Linguistic Scale Table**: Defines terms like VL, L, M, H, VH and their fuzzy number equivalents
- **Expert Evaluation Table(s)**: Raw evaluations from each expert/decision-maker (often using linguistic terms)
- **Aggregated Fuzzy Matrix**: Combined expert opinions (often as fuzzy numbers)
- **Defuzzified/Crisp Matrix**: The final numerical decision matrix
- **Weights Table**: Criteria weights (may be linguistic, fuzzy, or crisp)
- **Normalized Matrix**: Normalized values
- **Ranking/Results Table**: Final alternative rankings

## STEP 3: UNDERSTAND THE CONVERSION FLOW
Example flow in a typical fuzzy MCDM paper:
1. Expert 1 rates Criterion A as "H" (High)
2. "H" = (0.5, 0.7, 0.9) triangular fuzzy number (from linguistic scale table)
3. Multiple expert opinions are aggregated (usually geometric mean)
4. Fuzzy numbers are defuzzified: (l + m + u) / 3 = crisp value
5. Crisp matrix is normalized
6. MCDM method (TOPSIS, etc.) is applied
7. Final ranking is produced

## OUTPUT FORMAT - JSON:
{
  "method": "Full method name (e.g., 'Spherical Fuzzy AHP-WASPAS' or 'Fermatean Fuzzy TOPSIS')",
  "applicationArea": "Specific domain (e.g., 'Supplier Selection', 'Renewable Energy Evaluation')",
  "fuzzySystem": "Exact fuzzy type used - be specific (e.g., 'Spherical Fuzzy Sets', 'Picture Fuzzy Numbers')",
  "numberSet": "How numbers are represented (e.g., '(μ, ν, π) spherical components')",
  
  "methodologySteps": [
    {"step": 1, "name": "Expert Linguistic Evaluation", "description": "Experts evaluate criteria/alternatives using linguistic terms"},
    {"step": 2, "name": "Fuzzy Conversion", "description": "Linguistic terms converted to fuzzy numbers using defined scale"},
    {"step": 3, "name": "Aggregation", "description": "Expert opinions aggregated using geometric mean"},
    {"step": 4, "name": "Defuzzification", "description": "Fuzzy numbers converted to crisp values"},
    {"step": 5, "name": "Weight Calculation", "description": "Criteria weights calculated using [method]"},
    {"step": 6, "name": "MCDM Application", "description": "[Method] applied to rank alternatives"},
    {"step": 7, "name": "Final Ranking", "description": "Alternatives ranked by score"}
  ],
  
  "linguisticScale": [
    {"term": "VH or Very High", "abbreviation": "VH", "fuzzyNumber": [0.7, 0.9, 1.0], "crispValue": 0.87},
    {"term": "H or High", "abbreviation": "H", "fuzzyNumber": [0.5, 0.7, 0.9], "crispValue": 0.70},
    {"term": "M or Medium", "abbreviation": "M", "fuzzyNumber": [0.3, 0.5, 0.7], "crispValue": 0.50},
    {"term": "AL or Absolutely Low", "abbreviation": "AL", "fuzzyNumber": [0, 0, 0.1], "crispValue": 0.03}
  ],
  
  "allTables": {
    "linguisticScaleTable": {
      "tableNumber": "Table X",
      "description": "Linguistic scale definition",
      "data": [["Term", "Fuzzy Number"], ["VH", "(0.7, 0.9, 1.0)"]]
    },
    "expertEvaluationTables": [
      {
        "tableNumber": "Table X",
        "description": "Expert evaluations for criteria/alternatives",
        "evaluationType": "linguistic|numeric|pairwise",
        "headers": ["Expert/DM", "C1", "C2", "C3"],
        "data": [["DM1", "H", "VH", "M"], ["DM2", "M", "H", "H"]]
      }
    ],
    "aggregatedMatrix": {
      "tableNumber": "Table X",
      "description": "Aggregated fuzzy values",
      "data": [["Alt/Criterion", "C1", "C2"], ["A1", "(0.5,0.7,0.9)", "(0.3,0.5,0.7)"]]
    },
    "crispMatrix": {
      "tableNumber": "Table X",
      "description": "Defuzzified decision matrix",
      "data": [[1.66, 2.5, 4], [0.8, 1.2, 3.5]]
    },
    "weightsTable": {
      "tableNumber": "Table X",
      "data": [["Criterion", "Weight"], ["C1", 0.35], ["C2", 0.25]]
    },
    "rankingTable": {
      "tableNumber": "Table X",
      "data": [["Alternative", "Score", "Rank"], ["A1", 0.785, 1]]
    }
  },
  
  "criteria": [
    {"name": "Full criterion name from paper", "weight": 0.XX, "direction": "max|min", "category": "optional category"}
  ],
  
  "alternatives": ["Full alternative names exactly as in paper"],
  
  "matrix": [
    [crisp_numeric_values_for_alt1],
    [crisp_numeric_values_for_alt2]
  ],
  
  "originalRanking": [
    {"alternative": "Name", "score": 0.XXXX, "rank": 1}
  ],
  
  "expertWeightMatrix": [
    ["Expert/Criterion", "C1", "C2", "C3", "..."],
    ["DM1 or Expert 1", "linguistic_or_numeric_value", "...", "..."],
    ["DM2 or Expert 2", "...", "...", "..."]
  ],
  
  "logicModule": {
    "fuzzyType": "Crisp|Triangular|Trapezoidal|Type-2|Intuitionistic|Pythagorean|Fermatean|Spherical|Picture|Neutrosophic",
    "normalization": "Vector|Linear|Max-Min|Sum|Logarithmic|None",
    "aggregation": "Distance-to-Ideal|Weighted-Sum|Outranking|WASPAS|COPRAS|EDAS|CODAS",
    "defuzzification": "Centroid|Mean-of-Maximum|Alpha-cut|Graded-Mean|Score-Function|None",
    "weightingMethod": "AHP|FAHP|ANP|BWM|FBWM|CRITIC|Entropy|SWARA|PIPRECIA|Direct|Equal"
  },
  
  "summary": "Detailed description of the complete methodology flow in 2-3 sentences",
  
  "dataQuality": {
    "hasCompleteCriteria": true,
    "hasCompleteMatrix": true,
    "hasWeights": true,
    "hasRanking": true,
    "hasExpertData": true,
    "hasLinguisticScale": true,
    "tablesExtracted": ["Table 3", "Table 4", "Table 5", "Table 6", "Table 7"],
    "missingData": [],
    "notes": "Any issues or notes about extraction"
  }
}

## CRITICAL EXTRACTION RULES:
1. READ THE ENTIRE METHODOLOGY SECTION before extracting
2. Extract EVERY table mentioned in the paper - don't skip any
3. Understand abbreviations: VL=Very Low, L=Low, AL=Absolutely Low, M=Medium, H=High, VH=Very High, etc.
4. If tables show fuzzy numbers like (0.3, 0.5, 0.7), extract them AND their defuzzified values
5. The "matrix" field should contain CRISP (defuzzified) values for calculation
6. If weights are linguistic, convert to crisp using the linguistic scale
7. Pay attention to which criteria are BENEFIT (max) vs COST (min) type
8. Extract original paper's ranking to compare against calculated results

OUTPUT ONLY VALID JSON. No explanation text.
`;



function validateAndFixAnalysis(analysis) {
    if (!Array.isArray(analysis.criteria)) analysis.criteria = [];
    if (!Array.isArray(analysis.alternatives)) analysis.alternatives = [];
    if (!Array.isArray(analysis.matrix)) analysis.matrix = [];
    if (!Array.isArray(analysis.originalRanking)) analysis.originalRanking = [];

    analysis.matrix = analysis.matrix.map(row => {
        if (!Array.isArray(row)) return [0];
        return row.map(cell => {
            const num = parseFloat(cell);
            return isNaN(num) ? 0 : num;
        });
    });

    analysis.criteria = analysis.criteria.map((c, i) => ({
        name: c.name || `Criterion ${i + 1}`,
        weight: parseFloat(c.weight) || 0,
        direction: c.direction === 'min' ? 'min' : 'max'
    }));

    const weightSum = analysis.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (weightSum > 0 && (weightSum < 0.9 || weightSum > 1.1)) {
        analysis.criteria = analysis.criteria.map(c => ({
            ...c,
            weight: parseFloat((c.weight / weightSum).toFixed(4))
        }));
    }

    if (!analysis.logicModule) {
        analysis.logicModule = {
            fuzzyType: 'Crisp',
            normalization: 'Linear',
            aggregation: 'Weighted-Sum',
            defuzzification: 'None'
        };
    }

    return analysis;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { pdfBase64 } = req.body;

        if (!pdfBase64) {
            return res.status(400).json({ error: 'No PDF data provided' });
        }

        const analysis = await executeWithFallback(async (genAI) => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { text: PROMPT_TEMPLATE },
                        {
                            inlineData: {
                                mimeType: 'application/pdf',
                                data: pdfBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.0
                }
            });
            return JSON.parse(result.response.text());
        });

        const validatedAnalysis = validateAndFixAnalysis(analysis);
        res.json(validatedAnalysis);
    } catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze PDF' });
    }
}
