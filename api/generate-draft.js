import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { analysis, repository } = req.body;

        if (!analysis) {
            return res.status(400).json({ error: 'Analysis data required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Generate an academic paper draft based on this MCDM analysis:

Method: ${analysis.method}
Application: ${analysis.applicationArea}
Criteria: ${analysis.criteria?.length || 0}
Alternatives: ${analysis.alternatives?.length || 0}
Summary: ${analysis.summary}

Write sections: Introduction, Methodology, Results, Discussion, Conclusion.
Use academic LaTeX formatting for equations.
Output as HTML with proper headings.
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
        });

        const draft = result.response.text();
        res.status(200).json({ draft });
    } catch (error) {
        console.error('Generate draft error:', error);
        res.status(500).json({ error: error.message });
    }
}
