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
3. Extract data from ALL relevant tables - not just one
4. Understand the MATHEMATICAL FLOW from input to final ranking

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
  "logicModule": {
    "fuzzyType": "Crisp/Triangular/etc.",
    "normalization": "Vector/Linear/Max-Min/Sum/None",
    "aggregation": "Distance-to-Ideal/Weighted-Sum/Outranking",
    "defuzzification": "Centroid/None",
    "weightingMethod": "AHP/BWM/CRITIC/Direct/Equal"
  },
  "dataQuality": {
    "hasCompleteCriteria": true/false,
    "hasCompleteMatrix": true/false,
    "hasWeights": true/false,
    "hasRanking": true/false,
    "missingData": ["List any data that couldn't be extracted"],
    "notes": "Any important notes"
  }
}

CRITICAL: Extract ALL data visible in tables. OUTPUT ONLY VALID JSON.
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
