import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPT_TEMPLATE = `
You are an expert academic analyst specializing in MCDM (Multi-Criteria Decision Making) research papers.
Your task is to FULLY understand and extract the complete methodology flow from this PDF.

IMPORTANT: MCDM papers can have MANY different structures. Be FLEXIBLE and ADAPTIVE.

FLEXIBLE EXTRACTION - Capture whatever the paper contains:
{
  "method": "Complete method name",
  "applicationArea": "Application domain",
  "fuzzySystem": "Fuzzy system type or Crisp",
  "numberSet": "Number representation",
  "methodologySteps": [{"step": 1, "name": "...", "description": "..."}],
  "criteria": [{"name": "...", "weight": 0.XX, "direction": "max/min"}],
  "alternatives": ["Alt1", "Alt2"],
  "matrix": [[values]],
  "originalRanking": [{"alternative": "...", "score": 0.XX, "rank": 1}],
  "summary": "Methodology summary",
  "logicModule": {
    "fuzzyType": "Crisp/Triangular/etc",
    "normalization": "Vector/Linear/etc",
    "aggregation": "Distance-to-Ideal/Weighted-Sum/etc",
    "defuzzification": "Centroid/None/etc",
    "weightingMethod": "AHP/Entropy/etc"
  },
  "dataQuality": {
    "hasCompleteCriteria": true/false,
    "hasCompleteMatrix": true/false,
    "hasWeights": true/false,
    "hasRanking": true/false,
    "missingData": [],
    "notes": ""
  }
}

OUTPUT ONLY VALID JSON.
`;

function validateAndFixAnalysis(analysis) {
    if (!analysis) return null;

    // Ensure arrays exist
    if (!Array.isArray(analysis.criteria)) analysis.criteria = [];
    if (!Array.isArray(analysis.alternatives)) analysis.alternatives = [];
    if (!Array.isArray(analysis.matrix)) analysis.matrix = [];
    if (!Array.isArray(analysis.originalRanking)) analysis.originalRanking = [];

    // Ensure matrix is 2D
    analysis.matrix = analysis.matrix.map(row =>
        Array.isArray(row) ? row.map(v => typeof v === 'number' ? v : parseFloat(v) || 0) : [0]
    );

    // Ensure criteria have proper structure
    analysis.criteria = analysis.criteria.map((c, i) => ({
        name: c?.name || `C${i + 1}`,
        weight: typeof c?.weight === 'number' ? c.weight : parseFloat(c?.weight) || 0,
        direction: c?.direction === 'min' ? 'min' : 'max'
    }));

    // Normalize weights if needed
    const weightSum = analysis.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (weightSum > 0 && (weightSum < 0.9 || weightSum > 1.1)) {
        analysis.criteria = analysis.criteria.map(c => ({
            ...c,
            weight: parseFloat((c.weight / weightSum).toFixed(4))
        }));
    }

    // Ensure logicModule exists
    if (!analysis.logicModule) {
        analysis.logicModule = {
            fuzzyType: 'Crisp',
            normalization: 'Linear',
            aggregation: 'Weighted-Sum',
            defuzzification: 'None',
            weightingMethod: 'Direct'
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
            return res.status(400).json({ error: 'PDF data is required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const pdfPart = {
            inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64
            }
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [pdfPart, { text: PROMPT_TEMPLATE }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        });

        const analysisText = result.response.text();
        let analysis = JSON.parse(analysisText);
        analysis = validateAndFixAnalysis(analysis);

        console.log(`✅ Analyzed: ${analysis.alternatives?.length} alternatives, ${analysis.criteria?.length} criteria`);

        res.status(200).json(analysis);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze paper' });
    }
}
