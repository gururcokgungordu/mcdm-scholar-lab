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
# MISSION
You are the "Architect Agent" for the MCDM Scholar Lab platform. Your task is to analyze an academic MCDM paper and extract the methodology into a strict JSON configuration that a TypeScript engine can execute step-by-step.

# YOUR TOOLKIT (AVAILABLE LEGO BLOCKS)
You must ONLY map the paper's logic to these available modules:

## MCDM METHODS
- Ranking: TOPSIS, VIKOR, EDAS, CODAS, MOORA, ARAS, COPRAS, PROMETHEE, MULTIMOORA
- Aggregation: SAW, WPM, WASPAS
- Weighting: AHP, FAHP, ANP, BWM, CRITIC, ENTROPY, SWARA, PIPRECIA

## FUZZY TYPES
Crisp, Triangular, Trapezoidal, Spherical, Intuitionistic, Picture, Pythagorean, Fermatean, Neutrosophic, Type2

## NORMALIZATION TYPES
Vector, LinearMax, MinMax, Sum, Logarithmic

## AGGREGATION OPERATORS
ArithmeticMean, GeometricMean, WeightedSum, WeightedProduct, OWA

## DEFUZZIFICATION METHODS
Centroid, GradedMean, MeanOfMaximum, AlphaCut, ScoreFunction

# CRITICAL RULES
1. **OUTPUT FORMAT:** Return ONLY valid JSON. No markdown, no explanations, no code blocks.
2. **SCALE EXTRACTION:** You MUST extract exact numerical values for ALL linguistic terms found in the paper.
3. **HYBRID LOGIC:** If paper uses AHP for weights + TOPSIS for ranking, create separate steps in execution_pipeline.
4. **DIRECTIONS:** Every criterion MUST have direction: "cost" (minimize) or "benefit" (maximize).
5. **MULTI-STAGE:** Detect if the paper has 2-stage, 3-stage or more complex methodology.

# JSON SCHEMA - EXTRACT EXACTLY THIS STRUCTURE:

{
  "meta": {
    "title": "Paper title or short description",
    "primary_method": "Main method name (e.g., Spherical Fuzzy TOPSIS)",
    "fuzzy_type": "Crisp | Triangular | Trapezoidal | Spherical | Intuitionistic | Picture | Pythagorean | Fermatean",
    "is_hybrid": true,
    "stages": ["Weighting with FAHP", "Ranking with TOPSIS"],
    "defuzzification_method": "Centroid | GradedMean | ScoreFunction | None",
    "application_domain": "e.g., Supplier Selection, Energy, Healthcare"
  },

  "linguistic_scales": [
    {
      "name": "Criteria Importance Scale",
      "usage": "For expert evaluation of criteria weights",
      "terms": [
        { "label": "VH", "full_text": "Very High", "fuzzy_value": [0.7, 0.9, 1.0], "crisp_value": 0.87 },
        { "label": "H", "full_text": "High", "fuzzy_value": [0.5, 0.7, 0.9], "crisp_value": 0.70 },
        { "label": "M", "full_text": "Medium", "fuzzy_value": [0.3, 0.5, 0.7], "crisp_value": 0.50 },
        { "label": "L", "full_text": "Low", "fuzzy_value": [0.1, 0.3, 0.5], "crisp_value": 0.30 },
        { "label": "VL", "full_text": "Very Low", "fuzzy_value": [0.0, 0.1, 0.3], "crisp_value": 0.13 }
      ]
    },
    {
      "name": "Alternative Rating Scale",
      "usage": "For rating alternatives against criteria",
      "terms": []
    }
  ],

  "criteria": [
    {
      "code": "C1",
      "name": "Full criterion name from paper",
      "direction": "benefit | cost",
      "category": "Optional category/group",
      "weight": 0.25,
      "weight_source": "calculated | given | expert_input"
    }
  ],

  "alternatives": [
    { "code": "A1", "name": "Full alternative name" }
  ],

  "expert_evaluations": {
    "num_experts": 3,
    "evaluation_type": "linguistic | numeric | pairwise",
    "criteria_evaluations": [
      {
        "expert_id": "DM1",
        "evaluations": { "C1": "VH", "C2": "H", "C3": "M" }
      }
    ],
    "alternative_evaluations": [
      {
        "expert_id": "DM1",
        "matrix": [
          ["A1/C1", "H", "VH", "M"],
          ["A2/C1", "M", "H", "L"]
        ]
      }
    ]
  },

  "decision_matrix": {
    "type": "crisp | fuzzy | linguistic",
    "values": [
      { "alternative": "A1", "scores": [0.7, 0.85, 0.6, 0.9] },
      { "alternative": "A2", "scores": [0.5, 0.7, 0.8, 0.75] }
    ],
    "fuzzy_values": [
      { "alternative": "A1", "scores": [[0.5,0.7,0.9], [0.7,0.85,1.0]] }
    ]
  },

  "execution_pipeline": [
    {
      "step": 1,
      "name": "Expert Linguistic Evaluation",
      "module": "DataCollection",
      "description": "Experts provide linguistic evaluations for criteria and alternatives",
      "input": "expert_evaluations",
      "output": "linguistic_matrix"
    },
    {
      "step": 2,
      "name": "Fuzzification",
      "module": "Fuzzification",
      "method": "LinguisticToFuzzy",
      "config": { "scale_ref": "Criteria Importance Scale" },
      "input": "linguistic_matrix",
      "output": "fuzzy_matrix"
    },
    {
      "step": 3,
      "name": "Expert Aggregation",
      "module": "Aggregation",
      "method": "GeometricMean",
      "input": "fuzzy_matrix",
      "output": "aggregated_fuzzy_matrix"
    },
    {
      "step": 4,
      "name": "Defuzzification",
      "module": "Defuzzification",
      "method": "Centroid",
      "input": "aggregated_fuzzy_matrix",
      "output": "crisp_matrix"
    },
    {
      "step": 5,
      "name": "Weight Calculation",
      "module": "Weighting",
      "method": "AHP | BWM | CRITIC | Entropy | Direct",
      "config": { "consistency_check": true },
      "input": "expert_pairwise | direct_weights",
      "output": "criteria_weights"
    },
    {
      "step": 6,
      "name": "Normalization",
      "module": "Normalization",
      "method": "Vector | LinearMax | MinMax",
      "input": "crisp_matrix",
      "output": "normalized_matrix"
    },
    {
      "step": 7,
      "name": "MCDM Ranking",
      "module": "Ranking",
      "method": "TOPSIS | VIKOR | EDAS | CODAS | MOORA",
      "config": {
        "v_parameter": 0.5,
        "distance_metric": "Euclidean"
      },
      "input": ["normalized_matrix", "criteria_weights"],
      "output": "final_ranking"
    }
  ],

  "original_results": {
    "ranking": [
      { "alternative": "A1", "score": 0.785, "rank": 1 },
      { "alternative": "A2", "score": 0.623, "rank": 2 }
    ],
    "best_alternative": "A1",
    "sensitivity_performed": false
  },

  "extracted_tables": [
    { "table_number": "Table 3", "description": "Linguistic scale", "extracted": true },
    { "table_number": "Table 4", "description": "Expert evaluations", "extracted": true }
  ],

  "data_quality": {
    "completeness": {
      "has_linguistic_scale": true,
      "has_criteria_weights": true,
      "has_decision_matrix": true,
      "has_expert_data": true,
      "has_original_ranking": true
    },
    "missing_elements": [],
    "notes": "Any issues or observations about the extraction"
  }
}

# EXTRACTION PRIORITY
1. First, identify the PRIMARY METHOD (what MCDM technique is used for final ranking?)
2. Second, identify WEIGHTING METHOD (how are criteria weights determined?)
3. Third, extract ALL LINGUISTIC SCALES with exact fuzzy number values
4. Fourth, identify all CRITERIA with their directions (cost/benefit)
5. Fifth, extract DECISION MATRIX (prefer crisp values, but capture fuzzy if that's what paper has)
6. Sixth, map the EXECUTION PIPELINE step by step

OUTPUT ONLY THE JSON OBJECT. NO OTHER TEXT.
`;




function validateAndFixAnalysis(analysis) {
  // Handle new schema format
  if (analysis.meta) {
    // Transform new schema to compatible format for frontend
    const transformed = {
      method: analysis.meta.primary_method || 'Unknown Method',
      applicationArea: analysis.meta.application_domain || '',
      fuzzySystem: analysis.meta.fuzzy_type || 'Crisp',
      numberSet: '',

      // Map criteria from new format
      criteria: (analysis.criteria || []).map((c, i) => ({
        name: c.name || c.code || `Criterion ${i + 1}`,
        weight: parseFloat(c.weight) || 0,
        direction: c.direction === 'cost' ? 'min' : 'max',
        code: c.code || `C${i + 1}`,
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

      // Methodology steps from execution_pipeline
      methodologySteps: (analysis.execution_pipeline || []).map(step => ({
        step: step.step,
        name: step.name,
        description: step.description || '',
        module: step.module,
        method: step.method
      })),

      // Linguistic scales
      linguisticScale: [],

      // Logic module
      logicModule: {
        fuzzyType: analysis.meta.fuzzy_type || 'Crisp',
        normalization: 'Linear',
        aggregation: 'Weighted-Sum',
        defuzzification: analysis.meta.defuzzification_method || 'None',
        weightingMethod: 'Direct'
      },

      // Expert data
      expertEvaluations: analysis.expert_evaluations || null,

      // Pipeline for execution
      executionPipeline: analysis.execution_pipeline || [],

      // Data quality
      dataQuality: {
        hasCompleteCriteria: analysis.data_quality?.completeness?.has_criteria_weights || false,
        hasCompleteMatrix: analysis.data_quality?.completeness?.has_decision_matrix || false,
        hasWeights: analysis.data_quality?.completeness?.has_criteria_weights || false,
        hasRanking: analysis.data_quality?.completeness?.has_original_ranking || false,
        hasExpertData: analysis.data_quality?.completeness?.has_expert_data || false,
        hasLinguisticScale: analysis.data_quality?.completeness?.has_linguistic_scale || false,
        tablesExtracted: (analysis.extracted_tables || []).map(t => t.table_number),
        missingData: analysis.data_quality?.missing_elements || [],
        notes: analysis.data_quality?.notes || ''
      },

      summary: `${analysis.meta.primary_method} applied to ${analysis.meta.application_domain}`,

      // Keep original new format data
      _rawAnalysis: analysis
    };

    // Extract matrix values
    if (analysis.decision_matrix?.values) {
      transformed.matrix = analysis.decision_matrix.values.map(row => row.scores || []);
    }

    // Extract linguistic scales
    if (analysis.linguistic_scales) {
      for (const scale of analysis.linguistic_scales) {
        for (const term of (scale.terms || [])) {
          transformed.linguisticScale.push({
            term: term.full_text,
            abbreviation: term.label,
            fuzzyNumber: term.fuzzy_value || [0, 0, 0],
            crispValue: term.crisp_value || 0
          });
        }
      }
    }

    // Detect weighting method from pipeline
    const weightStep = (analysis.execution_pipeline || []).find(s => s.module === 'Weighting');
    if (weightStep) {
      transformed.logicModule.weightingMethod = weightStep.method?.split('|')[0]?.trim() || 'Direct';
    }

    // Detect normalization from pipeline
    const normStep = (analysis.execution_pipeline || []).find(s => s.module === 'Normalization');
    if (normStep) {
      transformed.logicModule.normalization = normStep.method?.split('|')[0]?.trim() || 'Linear';
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
    name: c.name || `Criterion ${i + 1}`,
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
          temperature: 0.0
        }
      });
      return JSON.parse(result.response.text());
    });

    const validatedAnalysis = validateAndFixAnalysis(analysis);
    res.json(validatedAnalysis);
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze PDF' });
  }
}
