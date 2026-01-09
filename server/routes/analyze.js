import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// API keys for fallback
const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_BACKUP
].filter(Boolean);

let currentKeyIndex = 0;

// Get GenAI instance with current key
const getGenAI = () => {
    if (API_KEYS.length === 0) {
        throw new Error('No GEMINI_API_KEY environment variables are set');
    }
    return new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
};

// Try next API key
const rotateApiKey = () => {
    if (API_KEYS.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        console.log(`🔄 Rotating to API key ${currentKeyIndex + 1}`);
        return true;
    }
    return false;
};

// Execute with fallback
const executeWithFallback = async (operation) => {
    let lastError;
    const triedKeys = new Set();

    while (triedKeys.size < API_KEYS.length) {
        try {
            triedKeys.add(currentKeyIndex);
            return await operation(getGenAI());
        } catch (error) {
            lastError = error;
            // Check if it's a quota error (429)
            if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
                console.log(`⚠️ API key ${currentKeyIndex + 1} quota exceeded`);
                if (rotateApiKey() && !triedKeys.has(currentKeyIndex)) {
                    continue; // Try next key
                }
            }
            break; // Non-quota error, don't retry
        }
    }
    throw lastError;
};

const PROMPT_TEMPLATE = `
You are an EXPERT MCDM (Multi-Criteria Decision Making) academic analyst with deep knowledge of fuzzy systems.

YOUR MISSION: Extract the COMPLETE methodology from this research paper.

## STEP 1: READ THE METHODOLOGY SECTION CAREFULLY
Understand:
- What type of fuzzy numbers are used (triangular, spherical, etc.)
- How experts provide evaluations (linguistic terms, pairwise, direct)
- The conversion: Linguistic → Fuzzy → Aggregation → Defuzzification → Crisp
- Which MCDM method is applied (TOPSIS, VIKOR, AHP, etc.)

## STEP 2: EXTRACT ALL TABLES
Papers typically have:
- Linguistic Scale Table (VL, L, M, H, VH definitions)
- Expert Evaluation Tables (raw expert ratings)
- Aggregated Fuzzy Matrix
- Defuzzified/Crisp Matrix
- Weights Table
- Ranking Table

## OUTPUT JSON:
{
  "method": "Full method name (e.g., 'Spherical Fuzzy AHP-WASPAS')",
  "applicationArea": "Specific domain",
  "fuzzySystem": "Exact fuzzy type (e.g., 'Spherical Fuzzy Sets')",
  "numberSet": "Number representation",
  
  "methodologySteps": [
    {"step": 1, "name": "Step name", "description": "Description"}
  ],
  
  "linguisticScale": [
    {"term": "Very High", "abbreviation": "VH", "fuzzyNumber": [0.7, 0.9, 1.0], "crispValue": 0.87},
    {"term": "High", "abbreviation": "H", "fuzzyNumber": [0.5, 0.7, 0.9], "crispValue": 0.70},
    {"term": "Medium", "abbreviation": "M", "fuzzyNumber": [0.3, 0.5, 0.7], "crispValue": 0.50},
    {"term": "Low", "abbreviation": "L", "fuzzyNumber": [0.1, 0.3, 0.5], "crispValue": 0.30},
    {"term": "Very Low", "abbreviation": "VL", "fuzzyNumber": [0, 0.1, 0.3], "crispValue": 0.13}
  ],
  
  "allTables": {
    "linguisticScaleTable": {"tableNumber": "Table X", "data": []},
    "expertEvaluationTables": [{"tableNumber": "Table X", "headers": [], "data": []}],
    "aggregatedMatrix": {"tableNumber": "Table X", "data": []},
    "crispMatrix": {"tableNumber": "Table X", "data": []},
    "weightsTable": {"tableNumber": "Table X", "data": []},
    "rankingTable": {"tableNumber": "Table X", "data": []}
  },
  
  "criteria": [{"name": "Full name", "weight": 0.XX, "direction": "max|min"}],
  "alternatives": ["Full names exactly as in paper"],
  "matrix": [[crisp_values_row1], [crisp_values_row2]],
  "originalRanking": [{"alternative": "Name", "score": 0.XXXX, "rank": 1}],
  
  "expertWeightMatrix": [
    ["Expert/Criterion", "C1", "C2", "C3"],
    ["DM1", "H", "VH", "M"]
  ],
  
  "logicModule": {
    "fuzzyType": "Crisp|Triangular|Spherical|Picture|Neutrosophic|etc",
    "normalization": "Vector|Linear|Max-Min|Sum|None",
    "aggregation": "Distance-to-Ideal|Weighted-Sum|WASPAS|EDAS|CODAS",
    "defuzzification": "Centroid|Score-Function|None",
    "weightingMethod": "AHP|FAHP|BWM|FBWM|CRITIC|Entropy|SWARA|Direct"
  },
  
  "summary": "Detailed methodology description",
  
  "dataQuality": {
    "hasCompleteCriteria": true,
    "hasCompleteMatrix": true,
    "hasWeights": true,
    "hasRanking": true,
    "hasExpertData": true,
    "hasLinguisticScale": true,
    "tablesExtracted": ["Table 3", "Table 4", "Table 5"],
    "missingData": [],
    "notes": ""
  }
}

CRITICAL RULES:
1. Extract EVERY table - don't skip any
2. Understand abbreviations: VL, L, AL, M, H, VH, AH, etc.
3. "matrix" must contain CRISP (defuzzified) values
4. If weights are linguistic, convert to crisp
5. Note BENEFIT (max) vs COST (min) criteria

OUTPUT ONLY VALID JSON.
`;


// POST /api/analyze - Analyze PDF with Gemini
router.post('/analyze', upload.single('pdf'), async (req, res) => {
    try {
        let pdfBase64;

        // Check if file was uploaded via multer
        if (req.file) {
            pdfBase64 = req.file.buffer.toString('base64');
        }
        // Check if base64 was sent in body
        else if (req.body.pdfBase64) {
            pdfBase64 = req.body.pdfBase64;
        } else {
            return res.status(400).json({ error: 'No PDF file provided' });
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

        // Validate and fix data consistency
        const validatedAnalysis = validateAndFixAnalysis(analysis);

        res.json(validatedAnalysis);
    } catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze PDF' });
    }
});

// Validation and auto-fix function
function validateAndFixAnalysis(analysis) {
    // Ensure arrays exist
    if (!Array.isArray(analysis.criteria)) analysis.criteria = [];
    if (!Array.isArray(analysis.alternatives)) analysis.alternatives = [];
    if (!Array.isArray(analysis.matrix)) analysis.matrix = [];
    if (!Array.isArray(analysis.originalRanking)) analysis.originalRanking = [];

    // Fix matrix - ensure it's 2D array of numbers
    analysis.matrix = analysis.matrix.map(row => {
        if (!Array.isArray(row)) return [0];
        return row.map(cell => {
            const num = parseFloat(cell);
            return isNaN(num) ? 0 : num;
        });
    });

    // Ensure criteria have proper structure
    analysis.criteria = analysis.criteria.map((c, i) => ({
        name: c.name || `Criterion ${i + 1}`,
        weight: parseFloat(c.weight) || 0,
        direction: c.direction === 'min' ? 'min' : 'max'
    }));

    // Normalize weights if they don't sum to ~1
    const weightSum = analysis.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (weightSum > 0 && (weightSum < 0.9 || weightSum > 1.1)) {
        analysis.criteria = analysis.criteria.map(c => ({
            ...c,
            weight: parseFloat((c.weight / weightSum).toFixed(4))
        }));
    }

    // Fix dimension mismatch between criteria and matrix columns
    const numCriteria = analysis.criteria.length;
    const numAlternatives = analysis.alternatives.length;

    if (analysis.matrix.length > 0) {
        const matrixCols = analysis.matrix[0]?.length || 0;

        // If matrix has more columns than criteria, add missing criteria
        if (matrixCols > numCriteria) {
            for (let i = numCriteria; i < matrixCols; i++) {
                analysis.criteria.push({
                    name: `Criterion ${i + 1}`,
                    weight: 1 / matrixCols,
                    direction: 'max'
                });
            }
        }

        // If matrix has fewer columns than criteria, pad with zeros
        if (matrixCols < numCriteria) {
            analysis.matrix = analysis.matrix.map(row => {
                const newRow = [...row];
                while (newRow.length < numCriteria) newRow.push(0);
                return newRow;
            });
        }

        // If matrix has more rows than alternatives, add missing alternatives
        if (analysis.matrix.length > numAlternatives) {
            for (let i = numAlternatives; i < analysis.matrix.length; i++) {
                analysis.alternatives.push(`Alternative ${i + 1}`);
            }
        }
    }

    // Ensure logicModule exists
    if (!analysis.logicModule) {
        analysis.logicModule = {
            fuzzyType: 'Crisp',
            normalization: 'Linear',
            aggregation: 'Weighted-Sum',
            defuzzification: 'None'
        };
    }

    console.log(`✅ Validated: ${analysis.alternatives.length} alternatives, ${analysis.criteria.length} criteria, matrix ${analysis.matrix.length}x${analysis.matrix[0]?.length || 0}`);

    return analysis;
}

// POST /api/generate-draft - Generate paper draft
router.post('/generate-draft', async (req, res) => {
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
});

// POST /api/generate-ideas - Generate research ideas
router.post('/generate-ideas', async (req, res) => {
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
});

// POST /api/refine-analysis - Chat-based analysis refinement
router.post('/refine-analysis', async (req, res) => {
    try {
        const { currentAnalysis, userMessage, conversationHistory } = req.body;

        if (!currentAnalysis || !userMessage) {
            return res.status(400).json({ error: 'Current analysis and user message are required' });
        }

        const refinedData = await executeWithFallback(async (genAI) => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const systemPrompt = `
You are an AI assistant helping to correct and refine MCDM (Multi-Criteria Decision Making) analysis data.

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
4. Also provide a brief explanation of what you changed

IMPORTANT:
- If user says "page X has Y data", extract and add that data
- If user says "criterion Z is missing", add it with appropriate structure
- If user says "weight is wrong", update the weight
- If user says "alternative X should be added", add it to alternatives and extend matrix
- Keep ALL existing data unless explicitly asked to remove

RESPONSE FORMAT (JSON only):
{
  "updatedAnalysis": { /* Complete updated analysis object with all fields */ },
  "changes": ["List of changes made"],
  "aiResponse": "Natural language explanation of what was corrected",
  "needsMoreInfo": false // Set to true if you need more information from user
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

        // Validate and fix the updated analysis
        if (refinedData.updatedAnalysis) {
            refinedData.updatedAnalysis = validateAndFixAnalysis(refinedData.updatedAnalysis);
        }

        res.json(refinedData);
    } catch (error) {
        console.error('Refine analysis error:', error);
        res.status(500).json({ error: error.message || 'Failed to refine analysis' });
    }
});

// POST /api/reanalyze-with-instructions - Re-analyze PDF with specific instructions
router.post('/reanalyze-with-instructions', async (req, res) => {
    try {
        const { pdfBase64, currentAnalysis, instructions } = req.body;

        if (!pdfBase64) {
            return res.status(400).json({ error: 'PDF data is required for re-analysis' });
        }

        const result = await executeWithFallback(async (genAI) => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const reanalysisPrompt = `
You are re-analyzing a MCDM (Multi-Criteria Decision Making) paper PDF.

CURRENT EXTRACTED DATA (may be incomplete or incorrect):
${JSON.stringify(currentAnalysis, null, 2)}

USER'S SPECIFIC INSTRUCTIONS FOR RE-ANALYSIS:
${instructions}

YOUR TASK:
1. Scan the PDF again carefully
2. Follow the user's specific instructions to find missing or incorrect data
3. Update ALL fields that need correction
4. Return the COMPLETE corrected analysis

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "method": "Complete method name",
  "applicationArea": "Application domain",
  "fuzzySystem": "Fuzzy system type or Crisp",
  "numberSet": "Number representation",
  "criteria": [{"name": "...", "weight": 0.XX, "direction": "max/min"}],
  "alternatives": ["Alt1", "Alt2", ...],
  "matrix": [[row1], [row2], ...],
  "originalRanking": [{"alternative": "...", "score": X.XX, "rank": N}],
  "summary": "Methodology summary",
  "logicModule": {
    "fuzzyType": "...",
    "normalization": "...",
    "aggregation": "...",
    "defuzzification": "...",
    "weightingMethod": "..."
  },
  "dataQuality": {
    "hasCompleteCriteria": true/false,
    "hasCompleteMatrix": true/false,
    "hasWeights": true/false,
    "hasRanking": true/false,
    "missingData": [],
    "notes": "What was corrected based on user instructions"
  },
  "changesApplied": ["List of changes made based on user instructions"]
}
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

        // Validate and fix
        const validatedResult = validateAndFixAnalysis(result);

        res.json({
            updatedAnalysis: validatedResult,
            changes: result.changesApplied || ['PDF re-analyzed with user instructions'],
            aiResponse: `Makaledeki veri güncellendi. ${result.dataQuality?.notes || 'Değişiklikler uygulandı.'}`,
            needsMoreInfo: false
        });
    } catch (error) {
        console.error('Re-analyze error:', error);
        res.status(500).json({ error: error.message || 'Failed to re-analyze paper' });
    }
});

export default router;
