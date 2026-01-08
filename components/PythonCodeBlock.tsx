
import React, { useState } from 'react';

interface PythonCodeBlockProps {
  code: string;
}

export const PythonCodeBlock: React.FC<PythonCodeBlockProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-4 text-xs font-medium text-slate-400 mono">mcdm_model_generator.py</span>
        </div>
        <button
          onClick={handleCopy}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            copied ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto max-h-[600px]">
        <pre className="mono text-sm text-slate-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
      <div className="px-4 py-3 bg-slate-800/50 text-xs text-slate-400 italic">
        Requires: pandas, openpyxl, xlsxwriter
      </div>
    </div>
  );
};
