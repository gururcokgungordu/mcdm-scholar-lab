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
        const { currentAnalysis, userMessage, conversationHistory } = req.body;

        if (!currentAnalysis || !userMessage) {
            return res.status(400).json({ error: 'Current analysis and user message are required' });
        }

        const refinedData = await executeWithFallback(async (genAI) => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const systemPrompt = `
You are an AI assistant helping to correct and refine MCDM analysis data.

CURRENT EXTRACTED DATA:
${JSON.stringify(currentAnalysis, null, 2)}

CONVERSATION HISTORY:
${conversationHistory || 'No previous messages'}

USER'S CORRECTION REQUEST:
${userMessage}

YOUR TASK:
1. Understand what the user is asking to correct or add
2. Apply the correction to the data
3. Return the COMPLETE updated analysis object

RESPONSE FORMAT (JSON only):
{
  "updatedAnalysis": { /* Complete updated analysis object */ },
  "changes": ["List of changes made"],
  "aiResponse": "Natural language explanation of what was corrected",
  "needsMoreInfo": false
}
`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.2
                }
            });
            return JSON.parse(result.response.text());
        });

        if (refinedData.updatedAnalysis) {
            refinedData.updatedAnalysis = validateAndFixAnalysis(refinedData.updatedAnalysis);
        }

        res.json(refinedData);
    } catch (error) {
        console.error('Refine analysis error:', error);
        res.status(500).json({ error: error.message || 'Failed to refine analysis' });
    }
}
