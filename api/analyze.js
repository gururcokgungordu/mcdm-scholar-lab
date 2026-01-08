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
You are an expert academic analyst specializing in MCDM (Multi-Criteria Decision Making) research papers.
Your task is to FULLY understand and extract the complete methodology flow from this PDF.

IMPORTANT: MCDM papers can have MANY different structures. Be FLEXIBLE and ADAPTIVE.

YOUR ANALYSIS APPROACH:
1. First, READ the entire paper methodology section carefully
2. Identify ALL stages/steps of the MCDM process described
3. Extract data from ALL relevant tables - including EXPERT EVALUATION TABLES
4. Extract the LINGUISTIC SCALE used (if any) - e.g., "Very High = (0.7, 0.9, 1.0)"
5. Understand the MATHEMATICAL FLOW from input to final ranking

Return a JSON object with:
{
  "method": "Complete method name",
  "applicationArea": "The specific application domain",
  "fuzzySystem": "Fuzzy system type or 'Crisp'",
  "numberSet": "Description of number representation used",
  "methodologySteps": [{"step": 1, "name": "Step name", "description": "Description"}],
  "criteria": [{"name": "Criterion name", "weight": 0.XX, "direction": "max or min"}],
  "alternatives": ["Alternative 1", "Alternative 2"],
  "matrix": [[numeric_values_row_1], [numeric_values_row_2]],
  "originalRanking": [{"alternative": "Name", "score": 0.XXXX, "rank": 1}],
  "summary": "Comprehensive summary of the methodology",
  
  "linguisticScale": [
    {"term": "Very High", "fuzzyNumber": [0.7, 0.9, 1.0], "crispValue": 0.87},
    {"term": "High", "fuzzyNumber": [0.5, 0.7, 0.9], "crispValue": 0.70},
    {"term": "Medium", "fuzzyNumber": [0.3, 0.5, 0.7], "crispValue": 0.50},
    {"term": "Low", "fuzzyNumber": [0.1, 0.3, 0.5], "crispValue": 0.30},
    {"term": "Very Low", "fuzzyNumber": [0, 0.1, 0.3], "crispValue": 0.13}
  ],
  
  "expertEvaluations": [
    {
      "expertId": "E1",
      "expertName": "Expert 1 (or DM1)",
      "evaluations": {
        "Criterion1": "High",
        "Criterion2": "Very High"
      }
    }
  ],
  
  "expertWeightMatrix": [
    ["Expert/Criterion", "C1", "C2", "C3"],
    ["Expert 1", "High", "Medium", "Very High"],
    ["Expert 2", "Medium", "High", "High"]
  ],
  
  "logicModule": {
    "fuzzyType": "Crisp/Triangular/Trapezoidal/Type-2/Intuitionistic/Spherical",
    "normalization": "Vector/Linear/Max-Min/Sum/None",
    "aggregation": "Distance-to-Ideal/Weighted-Sum/Outranking",
    "defuzzification": "Centroid/Mean-of-Maximum/Alpha-cut/None",
    "weightingMethod": "AHP/ANP/BWM/CRITIC/Entropy/SWARA/Direct/FAHP/FBWM"
  },
  
  "dataQuality": {
    "hasCompleteCriteria": true/false,
    "hasCompleteMatrix": true/false,
    "hasWeights": true/false,
    "hasRanking": true/false,
    "hasExpertData": true/false,
    "hasLinguisticScale": true/false,
    "missingData": ["List any data that couldn't be extracted"],
    "notes": "Any important notes"
  }
}

EXPERT EVALUATION EXTRACTION RULES:
1. Look for tables with expert opinions/evaluations on criteria or alternatives
2. Expert tables often have headers like "DM1, DM2, DM3" or "Expert 1, Expert 2"
3. Values can be linguistic terms (VH, H, M, L, VL) or numbers (1-9 scale, 0-1 scale)
4. If linguistic scale is defined in the paper, extract EXACTLY as written
5. If not defined, use common triangular fuzzy scale as default
6. Convert any abbreviations: VH=Very High, H=High, M=Medium, L=Low, VL=Very Low

CRITICAL: Extract ALL data visible in tables including expert evaluations. OUTPUT ONLY VALID JSON.
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
