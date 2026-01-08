import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { currentAnalysis, userMessage, conversationHistory } = req.body;

        if (!currentAnalysis || !userMessage) {
            return res.status(400).json({ error: 'Current analysis and user message required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
You are an AI assistant helping to correct MCDM analysis data.

CURRENT DATA:
${JSON.stringify(currentAnalysis, null, 2)}

CONVERSATION:
${conversationHistory || 'None'}

USER REQUEST:
${userMessage}

Apply the correction and return complete JSON:
{
  "updatedAnalysis": { /* complete corrected analysis */ },
  "changes": ["list of changes"],
  "aiResponse": "explanation in Turkish",
  "needsMoreInfo": false
}
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        });

        const data = JSON.parse(result.response.text());
        res.status(200).json(data);
    } catch (error) {
        console.error('Refine error:', error);
        res.status(500).json({ error: error.message });
    }
}
