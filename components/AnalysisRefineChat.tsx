
import React, { useState, useRef, useEffect } from 'react';
import { MCDMAnalysis } from '../types';

interface Props {
    analysis: MCDMAnalysis;
    pdfBase64?: string | null;
    onAnalysisUpdate: (newAnalysis: MCDMAnalysis) => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    changes?: string[];
    timestamp: Date;
}

export const AnalysisRefineChat: React.FC<Props> = ({ analysis, pdfBase64, onAnalysisUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: pdfBase64
                ? 'Merhaba! PDF\'i tekrar tarayabilirim. Ne düzeltmemi istiyorsunuz?\n\n• "Makaleyi tekrar tara" - Tüm veriyi yeniden çıkar\n• "Sayfa 5\'teki tablo eksik" - Belirli bir sayfayı tara\n• "Kriter ağırlıkları hatalı" - Ağırlıkları düzelt\n• "Tüm alternatifleri bul" - Eksik alternatifleri ekle'
                : 'Merhaba! Analiz verilerinde eksik veya hatalı gördüğünüz noktaları bana söyleyebilirsiniz.',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Check for data quality issues
    const dataQuality = (analysis as any).dataQuality;
    const hasIssues = dataQuality && (
        !dataQuality.hasCompleteCriteria ||
        !dataQuality.hasCompleteMatrix ||
        (dataQuality.missingData && dataQuality.missingData.length > 0)
    );

    useEffect(() => {
        if (hasIssues && !isOpen) {
            setIsOpen(true);
        }
    }, [hasIssues]);

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        const messageText = inputValue.trim().toLowerCase();
        setInputValue('');
        setIsLoading(true);

        try {
            // Check if user wants to re-scan the PDF
            const wantsRescan =
                messageText.includes('tara') ||
                messageText.includes('scan') ||
                messageText.includes('yeniden') ||
                messageText.includes('tekrar') ||
                messageText.includes('güncelle') ||
                messageText.includes('update') ||
                messageText.includes('bul') ||
                messageText.includes('find') ||
                messageText.includes('eksik') ||
                messageText.includes('missing') ||
                messageText.includes('sayfa') ||
                messageText.includes('page') ||
                messageText.includes('tablo') ||
                messageText.includes('table');

            let response;

            if (wantsRescan && pdfBase64) {
                // Re-analyze PDF with specific instructions
                response = await fetch('/api/reanalyze-with-instructions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pdfBase64,
                        currentAnalysis: analysis,
                        instructions: inputValue.trim()
                    })
                });
            } else {
                // Regular refinement without PDF
                const conversationHistory = messages
                    .slice(-6)
                    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
                    .join('\n');

                response = await fetch('/api/refine-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currentAnalysis: analysis,
                        userMessage: inputValue.trim(),
                        conversationHistory
                    })
                });
            }

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.aiResponse || 'Değişiklikler uygulandı.',
                changes: data.changes,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Update analysis if changes were made
            if (data.updatedAnalysis) {
                const updatedAnalysis = {
                    ...analysis,
                    ...data.updatedAnalysis,
                    matrix: data.updatedAnalysis.matrix || analysis.matrix,
                    criteria: data.updatedAnalysis.criteria || analysis.criteria,
                    alternatives: data.updatedAnalysis.alternatives || analysis.alternatives
                };
                onAnalysisUpdate(updatedAnalysis);
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Üzgünüm, bir hata oluştu. Lütfen daha spesifik bir talimat verin. Örneğin: "Sayfa 3\'teki karar matrisini kontrol et" veya "C5 kriterinin ağırlığı 0.12 olmalı"',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Quick actions - different based on PDF availability
    const quickActions = pdfBase64 ? [
        { label: '🔄 Yeniden Tara', action: 'Makaleyi baştan tekrar tara ve tüm verileri güncelle' },
        { label: '📊 Matrix Bul', action: 'Makaledeki tüm karar matrislerini tara ve güncelle' },
        { label: '⚖️ Ağırlıklar', action: 'Kriter ağırlıklarını makaleden tekrar oku ve düzelt' },
        { label: '📋 Alternatifler', action: 'Tüm alternatifleri bul ve listeye ekle' },
        { label: '🔢 Kriterler', action: 'Eksik kriterleri bul ve ekle' }
    ] : [
        { label: 'Kriter eksik', action: 'Eksik kriterler var, manuel olarak ekleyeceğim.' },
        { label: 'Ağırlık düzelt', action: 'Ağırlıkları normalize et ve 1\'e topla.' },
        { label: 'Alternatif ekle', action: 'Yeni alternatif eklemek istiyorum.' },
        { label: 'Matrix düzelt', action: 'Matrix değerlerini düzeltmem gerekiyor.' }
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-40 transition-all hover:scale-105 ${hasIssues
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white animate-pulse'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    }`}
            >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div className="text-left">
                    <div className="font-bold">AI Düzeltme</div>
                    {pdfBase64 && <div className="text-[10px] opacity-80">PDF tarama aktif</div>}
                    {hasIssues && <div className="text-[10px] opacity-80">⚠️ Eksik veri!</div>}
                </div>
            </button>
        );
    }

    if (isMinimized) {
        return (
            <div
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 w-80 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl shadow-2xl cursor-pointer z-50 hover:opacity-90 transition-all"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">AI Düzeltme Asistanı</span>
                    </div>
                    <span className="text-xs opacity-70">Tıkla: Aç</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[440px] h-[680px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-t-2xl text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold">AI Düzeltme Asistanı</h3>
                        <p className="text-xs text-indigo-200">
                            {pdfBase64 ? '📄 PDF yeniden taranabilir' : 'Manuel düzeltme modu'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Current Data Summary */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mevcut Veri</div>
                <div className="flex gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${(analysis.criteria?.length || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {analysis.criteria?.length || 0} Kriter
                    </span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${(analysis.alternatives?.length || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {analysis.alternatives?.length || 0} Alternatif
                    </span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${(analysis.matrix?.length || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {analysis.matrix?.length || 0}x{analysis.matrix?.[0]?.length || 0} Matrix
                    </span>
                    {pdfBase64 && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
                            📄 PDF Aktif
                        </span>
                    )}
                </div>

                {hasIssues && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-[10px] font-bold text-amber-700">⚠️ Eksik veri:</div>
                        <div className="text-[10px] text-amber-600 mt-1">
                            {dataQuality?.missingData?.join(', ') || 'Bazı veriler eksik'}
                        </div>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                            }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                            {message.changes && message.changes.length > 0 && (
                                <div className={`mt-3 pt-3 border-t ${message.role === 'user' ? 'border-white/20' : 'border-slate-200'}`}>
                                    <p className="text-[10px] font-bold mb-1">✅ Yapılan Değişiklikler:</p>
                                    <ul className="text-[11px] space-y-1">
                                        {message.changes.map((change, i) => (
                                            <li key={i} className="flex items-start gap-1">
                                                <span className={message.role === 'user' ? 'text-green-300' : 'text-green-600'}>•</span>
                                                <span>{change}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <span className="text-xs text-slate-500 ml-2">
                                    {pdfBase64 ? 'PDF taranıyor...' : 'İşleniyor...'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-2">Hızlı Komutlar</div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => setInputValue(action.action)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-medium rounded-full hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 whitespace-nowrap transition-colors"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200">
                <div className="flex gap-2">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={pdfBase64 ? "PDF'i tara veya düzeltme yap..." : "Düzeltme talimatını yazın..."}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="px-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
