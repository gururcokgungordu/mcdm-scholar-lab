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
    const { topic, repository } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const repoContext = repository && repository.length > 0
      ? repository.map(r => `${r.method} with ${r.logicModule?.fuzzyType || r.fuzzySystem}`).join(', ')
      : 'TOPSIS, VIKOR, AHP, PROMETHEE';

    const ideas = await executeWithFallback(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `You are an academic research advisor specializing in Multi-Criteria Decision Making (MCDM).

Topic: ${topic}
Existing techniques in the library: ${repoContext}

Based on the topic and available methodologies, suggest 5 novel and original research combinations. Each suggestion should combine fuzzy systems and ranking methods in innovative ways that could lead to publishable research.

Return a JSON array of exactly 5 strings, each being a complete research idea suggestion.

Example format:
["Idea 1: Combine...", "Idea 2: Apply...", ...]`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.8
        }
      });
      return JSON.parse(result.response.text());
    });

    res.json(ideas);
  } catch (error) {
    console.error('Generate ideas error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate ideas' });
  }
}
