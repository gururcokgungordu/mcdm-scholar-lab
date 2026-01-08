
import React, { useState } from 'react';
import { generateResearchIdeas } from '../services/geminiService';
import { GlobalMethodology } from '../types';

interface Props {
  repository: GlobalMethodology[];
}

export const AIIdeaTool: React.FC<Props> = ({ repository }) => {
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const result = await generateResearchIdeas(topic, repository);
      setIdeas(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Knowledge-Aware AI Advisor</h2>
            <p className="text-slate-500 text-sm">Generating suggestions based on {repository.length} learned papers.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input 
            type="text" 
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Healthcare Logistics, E-Commerce Strategy"
            className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Consulting DB...' : 'Generate Ideas'}
          </button>
        </div>
      </div>

      {ideas.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 ml-2">Advisor Recommendations</h3>
          <div className="grid grid-cols-1 gap-4">
            {ideas.map((idea, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-amber-300 transition-all group">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold text-xs">0{i+1}</span>
                  <p className="text-slate-700 font-medium leading-relaxed">{idea}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
