
import React, { useState, useRef, useEffect } from 'react';
import { MCDMAnalysis } from '../types';
import { generatePaperDraft } from '../services/geminiService';

interface ManuscriptEditorProps {
  analysis: MCDMAnalysis;
  onBack: () => void;
}

export const ManuscriptEditor: React.FC<ManuscriptEditorProps> = ({ analysis, onBack }) => {
  const [content, setContent] = useState<string>('<h1>Click "Generate Draft" to begin your academic manuscript...</h1>');
  const [isGenerating, setIsGenerating] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const draft = await generatePaperDraft(analysis);
      setContent(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  const exportToWord = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
            "xmlns:w='urn:schemas-microsoft-com:office:word' "+
            "xmlns='http://www.w3.org/TR/REC-html40'>"+
            "<head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + (editorRef.current?.innerHTML || "") + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Manuscript_${analysis.method.replace(/\s+/g, '_')}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-20 z-40">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Manuscript Studio</h2>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            {isGenerating ? 'Drafting...' : 'Generate Draft (AI)'}
          </button>
          <button 
            onClick={exportToWord}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            Export to .DOCX
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-2 rounded-xl border border-slate-200 shadow-sm sticky top-36 z-30">
        <button onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-100 rounded text-xs font-bold">B</button>
        <button onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-100 rounded text-xs italic">I</button>
        <button onClick={() => execCommand('underline')} className="p-2 hover:bg-slate-100 rounded text-xs underline">U</button>
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <button onClick={() => execCommand('formatBlock', 'H1')} className="p-2 hover:bg-slate-100 rounded text-xs font-bold">H1</button>
        <button onClick={() => execCommand('formatBlock', 'H2')} className="p-2 hover:bg-slate-100 rounded text-xs font-bold">H2</button>
        <button onClick={() => execCommand('formatBlock', 'P')} className="p-2 hover:bg-slate-100 rounded text-xs">P</button>
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-slate-100 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl min-h-[800px] p-12 md:p-20 relative overflow-hidden">
        {/* Paper texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")'}}></div>
        
        <div 
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="prose prose-slate max-w-none focus:outline-none academic-editor text-slate-800 leading-relaxed"
          onInput={(e) => setContent(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      <style>{`
        .academic-editor h1 { font-size: 2.25rem; font-weight: 900; margin-bottom: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; color: #0f172a; text-align: center; }
        .academic-editor h2 { font-size: 1.5rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; color: #1e293b; border-left: 4px solid #4f46e5; padding-left: 1rem; }
        .academic-editor p { margin-bottom: 1.25rem; font-size: 1.125rem; text-align: justify; }
        .academic-editor ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1.25rem; }
      `}</style>
    </div>
  );
};
