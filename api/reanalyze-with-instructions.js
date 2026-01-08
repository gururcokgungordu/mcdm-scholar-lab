import { GoogleGenerativeAI } from '@google/generative-ai';

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
                if (API_KEYS.length > 1) {
                    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
                    if (!triedKeys.has(currentKeyIndex)) continue;
                }
            }
            break;
        }
    }
    throw lastError;
};

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { pdfBase64, currentAnalysis, instructions } = req.body;

        if (!pdfBase64) {
            return res.status(400).json({ error: 'PDF data is required for re-analysis' });
        }

        const result = await executeWithFallback(async (genAI) => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const reanalysisPrompt = `
You are re-analyzing a MCDM paper PDF.

CURRENT EXTRACTED DATA (may be incomplete):
${JSON.stringify(currentAnalysis, null, 2)}

USER'S SPECIFIC INSTRUCTIONS:
${instructions}

YOUR TASK:
1. Scan the PDF again carefully
2. Follow the user's instructions to find missing or incorrect data
3. Return the COMPLETE corrected analysis

OUTPUT FORMAT - Return ONLY valid JSON with all analysis fields.
`;

            const pdfPart = {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfBase64
                }
            };

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [pdfPart, { text: reanalysisPrompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.1
                }
            });

            return JSON.parse(result.response.text());
        });

        const validatedResult = validateAndFixAnalysis(result);

        res.json({
            updatedAnalysis: validatedResult,
            changes: result.changesApplied || ['PDF re-analyzed with user instructions'],
            aiResponse: `Analysis updated. ${result.dataQuality?.notes || 'Changes applied.'}`,
            needsMoreInfo: false
        });
    } catch (error) {
        console.error('Re-analyze error:', error);
        res.status(500).json({ error: error.message || 'Failed to re-analyze paper' });
    }
}
