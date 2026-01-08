
import { MCDMAnalysis, GlobalMethodology } from "../types";

const API_BASE = '/api';

export const analyzePaper = async (pdfBase64: string): Promise<MCDMAnalysis> => {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64 })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze paper');
  }

  return response.json();
};

export const generatePaperDraft = async (analysis: MCDMAnalysis): Promise<string> => {
  const response = await fetch(`${API_BASE}/generate-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate draft');
  }

  const data = await response.json();
  return data.draft;
};

export const generateResearchIdeas = async (topic: string, repository: GlobalMethodology[]): Promise<string[]> => {
  const response = await fetch(`${API_BASE}/generate-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, repository })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate ideas');
  }

  return response.json();
};
