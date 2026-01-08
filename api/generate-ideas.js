import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { topic, repository } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const repoContext = repository?.length > 0
            ? repository.map(r => `${r.method} - ${r.fuzzySystem}`).join(', ')
            : 'TOPSIS, VIKOR, AHP, PROMETHEE';

        const prompt = `
Generate 5 innovative MCDM research ideas for: "${topic}"

Existing methods in repository: ${repoContext}

Return JSON array:
{
  "ideas": [
    {
      "title": "Research title",
      "description": "Brief description",
      "methods": ["Method1", "Method2"],
      "novelty": "What makes it novel",
      "potentialImpact": "Expected impact"
    }
  ]
}
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.8 }
        });

        const ideas = JSON.parse(result.response.text());
        res.status(200).json(ideas);
    } catch (error) {
        console.error('Generate ideas error:', error);
        res.status(500).json({ error: error.message });
    }
}
