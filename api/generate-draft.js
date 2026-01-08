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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { analysis } = req.body;

        if (!analysis || !analysis.logicModule) {
            return res.status(400).json({ error: 'Analysis data required' });
        }

        const draft = await executeWithFallback(async (genAI) => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `Write a research paper methodology section for a novel hybrid study using ${analysis.logicModule.fuzzyType} numbers with ${analysis.logicModule.aggregation} method. 
    
The paper uses the following criteria: ${analysis.criteria?.map(c => c.name).join(', ')}.
Application area: ${analysis.applicationArea || 'Multi-criteria decision making'}.

Use academic LaTeX formatting for equations. Structure the output as HTML with proper headings (h1, h2), paragraphs, and formatted equations.`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
            });
            return result.response.text();
        });

        res.json({ draft });
    } catch (error) {
        console.error('Generate draft error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate draft' });
    }
}
