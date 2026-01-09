import { GoogleGenerativeAI } from '@google/generative-ai';

// API keys for fallback
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

const rotateApiKey = () => {
  if (API_KEYS.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return true;
  }
  return false;
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
        if (rotateApiKey() && !triedKeys.has(currentKeyIndex)) {
          continue;
        }
      }
      break;
    }
  }
  throw lastError;
};

const PROMPT_TEMPLATE = `
You are an EXPERT MCDM (Multi-Criteria Decision Making) academic analyst. Extract the COMPLETE methodology from this research paper.

## CRITICAL: YOU MUST EXTRACT THE DECISION MATRIX
The decision matrix is the core data table showing alternatives (rows) vs criteria (columns) with numerical values.
If you cannot find a complete numerical matrix, look for:
- Tables with alternatives on rows and criteria on columns
- Fuzzy number tables like (0.3, 0.5, 0.7) - convert using centroid: (l+m+u)/3
- Linguistic evaluation tables - convert using the paper's linguistic scale

## REQUIRED OUTPUT - JSON FORMAT:

{
  "meta": {
    "title": "Paper title",
    "methodology_summary": "Brief description of the methodology",
    "main_fuzzy_type": "Crisp | Triangular | Trapezoidal | Spherical",
    "weighting_method": "AHP | BWM | CRITIC | Entropy | Direct | FAHP",
    "ranking_method": "TOPSIS | VIKOR | EDAS | CODAS | MOORA | SAW | WASPAS",
    "application_domain": "e.g., Supplier Selection, Energy"
  },

  "linguistic_scales": [
    { "label": "VH", "full_text": "Very High", "value": [0.7, 0.9, 1.0], "crisp": 0.87 },
    { "label": "H", "full_text": "High", "value": [0.5, 0.7, 0.9], "crisp": 0.70 },
    { "label": "M", "full_text": "Medium", "value": [0.3, 0.5, 0.7], "crisp": 0.50 },
    { "label": "L", "full_text": "Low", "value": [0.1, 0.3, 0.5], "crisp": 0.30 },
    { "label": "VL", "full_text": "Very Low", "value": [0.0, 0.1, 0.3], "crisp": 0.13 }
  ],

  "criteria": [
    {
      "code": "C1",
      "name": "Full criterion name",
      "direction": "benefit | cost",
      "weight": 0.25
    }
  ],

  "alternatives": [
    { "code": "A1", "name": "Full alternative name" }
  ],

  "decision_matrix": {
    "type": "crisp | fuzzy",
    "rows": [
      { "alternative": "A1", "values": [0.7, 0.85, 0.6, 0.9] },
      { "alternative": "A2", "values": [0.5, 0.7, 0.8, 0.75] }
    ],
    "fuzzy_rows": [
      { "alternative": "A1", "values": [[0.5,0.7,0.9], [0.7,0.85,1.0], [0.4,0.6,0.8]] }
    ]
  },

  "original_results": {
    "ranking": [
      { "alternative": "A1", "score": 0.785, "rank": 1 },
      { "alternative": "A2", "score": 0.623, "rank": 2 }
    ]
  },

  "execution_pipeline": [
    { "step_id": 1, "operation": "ConstructDecisionMatrix", "description": "Build decision matrix" },
    { "step_id": 2, "operation": "NormalizeMatrix", "description": "Normalize using vector method" },
    { "step_id": 3, "operation": "CalculateWeights", "description": "Calculate criteria weights" },
    { "step_id": 4, "operation": "RankAlternatives", "description": "Apply TOPSIS ranking" }
  ]
}

## EXTRACTION RULES:
1. **DECISION MATRIX IS MANDATORY** - Extract numerical values for each alternative-criterion pair
2. If fuzzy numbers like (0.3, 0.5, 0.7) exist, put them in fuzzy_rows AND calculate crisp values for rows
3. criteria.direction: "benefit" if higher is better, "cost" if lower is better
4. Extract ALL criteria with their weights if provided
5. Extract ALL alternatives with their names

## FOR FUZZY PAPERS:
- If values are triangular fuzzy numbers (l, m, u), include in fuzzy_rows
- Also provide defuzzified crisp values in rows using: (l + m + u) / 3
- Extract the linguistic scale table with exact fuzzy number definitions

OUTPUT ONLY VALID JSON. NO MARKDOWN, NO EXPLANATION.
`;




function validateAndFixAnalysis(analysis) {
  // Handle new MCDM Logic Compiler schema format
  if (analysis.meta) {
    // Transform new schema to compatible format for frontend
    const transformed = {
      method: analysis.meta.ranking_method || analysis.meta.methodology_summary?.split(' ')[0] || 'Unknown Method',
      applicationArea: analysis.meta.application_domain || '',
      fuzzySystem: analysis.meta.main_fuzzy_type || 'Crisp',
      numberSet: '',

      // Map criteria from new format
      criteria: (analysis.criteria || []).map((c, i) => ({
        name: c.name || c.code || `Criterion ${i + 1} `,
        weight: parseFloat(c.weight) || 0,
        direction: c.direction === 'cost' ? 'min' : 'max',
        code: c.code || `C${i + 1} `,
        category: c.category || ''
      })),

      // Map alternatives from new format
      alternatives: (analysis.alternatives || []).map(a =>
        typeof a === 'string' ? a : (a.name || a.code || 'Unknown')
      ),

      // Extract matrix from decision_matrix
      matrix: [],

      // Map original ranking
      originalRanking: (analysis.original_results?.ranking || []).map(r => ({
        alternative: r.alternative,
        score: r.score,
        rank: r.rank
      })),

      // Methodology steps from execution_pipeline (new format with step_id and operation)
      methodologySteps: (analysis.execution_pipeline || []).map(step => ({
        step: step.step_id || step.step,
        name: step.operation || step.name,
        description: step.description || '',
        module: step.operation,
        method: step.config?.method_name || step.config?.aggregation_func || ''
      })),

      // Linguistic scales (new flat format)
      linguisticScale: [],

      // Logic module
      logicModule: {
        fuzzyType: analysis.meta.main_fuzzy_type || 'Crisp',
        normalization: 'Linear',
        aggregation: 'Weighted-Sum',
        defuzzification: 'Centroid',
        weightingMethod: analysis.meta.weighting_method || 'Direct',
        rankingMethod: analysis.meta.ranking_method || 'TOPSIS'
      },

      // Pipeline for execution (preserve original format)
      executionPipeline: analysis.execution_pipeline || [],

      // Data quality
      dataQuality: {
        hasCompleteCriteria: (analysis.criteria?.length || 0) > 0,
        hasCompleteMatrix: (analysis.decision_matrix?.rows?.length || 0) > 0,
        hasWeights: analysis.criteria?.some(c => c.weight > 0) || false,
        hasRanking: (analysis.original_results?.ranking?.length || 0) > 0,
        hasExpertData: false,
        hasLinguisticScale: (analysis.linguistic_scales?.length || 0) > 0,
        tablesExtracted: (analysis.extracted_tables || []).map(t => t.table_id),
        missingData: [],
        notes: ''
      },

      summary: analysis.meta.methodology_summary || `${analysis.meta.ranking_method} applied to ${analysis.meta.application_domain} `,

      // Keep original new format data
      _rawAnalysis: analysis
    };

    // Extract matrix values from new format (rows instead of values)
    if (analysis.decision_matrix?.rows) {
      transformed.matrix = analysis.decision_matrix.rows.map(row => {
        const values = row.values || [];
        // If values are arrays (fuzzy), defuzzify them
        return values.map(v => {
          if (Array.isArray(v)) {
            return (v[0] + v[1] + v[2]) / 3; // Centroid defuzzification
          }
          return typeof v === 'number' ? v : 0;
        });
      });
    } else if (analysis.decision_matrix?.values) {
      transformed.matrix = analysis.decision_matrix.values.map(row => {
        const values = row.scores || row.values || [];
        return values.map(v => {
          if (Array.isArray(v)) {
            return (v[0] + v[1] + v[2]) / 3;
          }
          return typeof v === 'number' ? v : 0;
        });
      });
    }

    // Extract fuzzy matrix if available
    if (analysis.decision_matrix?.fuzzy_rows) {
      transformed.fuzzyMatrix = analysis.decision_matrix.fuzzy_rows.map(row => {
        const values = row.values || [];
        return values.map(v => {
          if (Array.isArray(v) && v.length >= 3) {
            return { l: v[0], m: v[1], u: v[2] };
          }
          const num = typeof v === 'number' ? v : 0;
          return { l: num, m: num, u: num };
        });
      });
    }

    // Detect criteria data types (crisp vs fuzzy)
    if (analysis.criteria && analysis.decision_matrix) {
      transformed.criteriaDataTypes = analysis.criteria.map((c, idx) => {
        // Check if this criterion has fuzzy data
        const hasFuzzy = analysis.decision_matrix?.fuzzy_rows?.some(row => {
          const val = row.values?.[idx];
          return Array.isArray(val) && val.length >= 3;
        });
        return hasFuzzy ? 'fuzzy' : 'crisp';
      });
    }

    // Extract linguistic scales (new flat format)
    if (analysis.linguistic_scales && Array.isArray(analysis.linguistic_scales)) {
      for (const scale of analysis.linguistic_scales) {
        // New format: each item is a term directly
        if (scale.label || scale.short_code) {
          transformed.linguisticScale.push({
            term: scale.full_text || scale.label,
            abbreviation: scale.short_code || scale.label,
            fuzzyNumber: scale.value || [0, 0, 0],
            crispValue: scale.crisp || 0
          });
        }
        // Old format: nested terms array
        else if (scale.terms) {
          for (const term of scale.terms) {
            transformed.linguisticScale.push({
              term: term.full_text,
              abbreviation: term.label,
              fuzzyNumber: term.fuzzy_value || [0, 0, 0],
              crispValue: term.crisp_value || 0
            });
          }
        }
      }
    }

    // Detect normalization from pipeline
    const normStep = (analysis.execution_pipeline || []).find(s => s.operation === 'NormalizeMatrix');
    if (normStep?.config?.normalization_formula) {
      const norm = normStep.config.normalization_formula.split('|')[0].trim().replace('_', '');
      transformed.logicModule.normalization = norm;
    }

    // Detect defuzzification from pipeline
    const defuzzStep = (analysis.execution_pipeline || []).find(s => s.operation === 'Defuzzify');
    if (defuzzStep?.config?.method) {
      transformed.logicModule.defuzzification = defuzzStep.config.method;
    }

    return transformed;
  }


  // Legacy format validation (backward compatibility)
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
    name: c.name || `Criterion ${i + 1} `,
    weight: parseFloat(c.weight) || 0,
    direction: c.direction === 'min' || c.direction === 'cost' ? 'min' : 'max'
  }));

  const weightSum = analysis.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (weightSum > 0 && (weightSum < 0.9 || weightSum > 1.1)) {
    analysis.criteria = analysis.criteria.map(c => ({
      ...c,
      weight: parseFloat((c.weight / weightSum).toFixed(4))
    }));
  }

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
      return res.status(400).json({ error: 'No PDF data provided' });
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
          temperature: 0.1
        }
      });

      let responseText = result.response.text();

      // Clean up response - remove markdown code blocks if present
      responseText = responseText.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.slice(7);
      } else if (responseText.startsWith('```')) {
        responseText = responseText.slice(3);
      }
      if (responseText.endsWith('```')) {
        responseText = responseText.slice(0, -3);
      }
      responseText = responseText.trim();

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
        console.error('Response text (first 500 chars):', responseText.substring(0, 500));

        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        throw new Error('Failed to parse AI response as JSON');
      }
    });

    const validatedAnalysis = validateAndFixAnalysis(analysis);
    res.json(validatedAnalysis);
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze PDF',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

