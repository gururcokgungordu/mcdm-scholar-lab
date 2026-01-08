import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { pdfBase64, currentAnalysis, instructions } = req.body;

        if (!pdfBase64) {
            return res.status(400).json({ error: 'PDF data required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Re-analyze this MCDM paper PDF.

CURRENT DATA (may be wrong):
${JSON.stringify(currentAnalysis, null, 2)}

USER INSTRUCTIONS:
${instructions}

Return COMPLETE corrected analysis as JSON with all fields.
Include "changesApplied": ["list of changes"]
`;

        const pdfPart = {
            inlineData: { mimeType: 'application/pdf', data: pdfBase64 }
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [pdfPart, { text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        });

        const data = JSON.parse(result.response.text());

        res.status(200).json({
            updatedAnalysis: data,
            changes: data.changesApplied || ['PDF re-analyzed'],
            aiResponse: data.dataQuality?.notes || 'Analiz güncellendi.',
            needsMoreInfo: false
        });
    } catch (error) {
        console.error('Reanalyze error:', error);
        res.status(500).json({ error: error.message });
    }
}
