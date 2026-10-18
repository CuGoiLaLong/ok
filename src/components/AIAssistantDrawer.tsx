import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  RotateCw,
  HelpCircle,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { AIMode, ChatMessage, QuizQuestion } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentExperimentData: any;
  currentExperimentName: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentExperimentData,
  currentExperimentName,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz' | 'arxiv'>('chat');
  const [aiMode, setAiMode] = useState<AIMode>('deep-thinking');
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Xin chào TS. Buoibeo! Tôi đã kết nối dữ liệu từ trạm thí nghiệm "${currentExperimentName}". Hãy hỏi bất kỳ câu hỏi nào để cùng phân tích hiện tượng và công thức vật lý!`,
      timestamp: 'Sẵn sàng',
    },
  ]);

  const [quizList, setQuizList] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  const [arxivArticles, setArxivArticles] = useState<any[]>([]);
  const [arxivLoading, setArxivLoading] = useState(false);
  const [arxivQuery, setArxivQuery] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === 'chat' && isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || loading) return;

    playClickSound();

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode: aiMode,
          experimentData: currentExperimentData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi gọi trợ lý AI.');

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.text,
        mode: aiMode,
        modelUsed: data.modelUsed,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: `⚠️ Lỗi: ${err.message}`,
          timestamp: 'Hiện tại',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    playClickSound();
    try {
      const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentType: currentExperimentName,
          parameters: currentExperimentData,
        }),
      });
      const data = await res.json();
      if (data.quiz && data.quiz.length > 0) {
        setQuizList(data.quiz);
        setSelectedAnswers({});
        setQuizSubmitted({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSearchArxiv = async (q?: string) => {
    setArxivLoading(true);
    playClickSound();
    try {
      const queryStr = q || arxivQuery || currentExperimentName;
      const res = await fetch(`/api/science/arxiv?q=${encodeURIComponent(queryStr)}`);
      const data = await res.json();
      if (data.articles) {
        setArxivArticles(data.articles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setArxivLoading(false);
    }
  };

  if (!isOpen) return null;

  // Minimized floating pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => {
            playClickSound();
            setIsMinimized(false);
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg text-xs font-semibold cursor-pointer transition-all hover:scale-105"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
          <span>Mở Trợ Lý AI</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 lg:hidden"
      />

      {/* Slide-out Sidebar Drawer on Desktop / Bottom Sheet on Mobile */}
      <aside className="fixed bottom-0 right-0 z-40 w-full sm:w-[420px] lg:w-[400px] h-[65vh] sm:h-auto sm:top-14 sm:bottom-0 bg-slate-900 border-t sm:border-t-0 sm:border-l border-slate-800 flex flex-col shadow-2xl transition-all">
        {/* Drawer Header */}
        <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-blue-600/30 text-cyan-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white text-xs truncate block">Trợ Lý AI Vật Lý</span>
              <span className="text-[10px] text-slate-400 truncate block">
                {currentExperimentName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Minimize button */}
            <button
              onClick={() => {
                playClickSound();
                setIsMinimized(true);
              }}
              title="Thu nhỏ thành nút nổi"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            {/* Close button */}
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              title="Đóng trợ lý"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab & Mode Switcher */}
        <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('chat');
                playClickSound();
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
                activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('quiz');
                playClickSound();
                if (quizList.length === 0) handleGenerateQuiz();
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
                activeTab === 'quiz' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              <span>Trắc nghiệm</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('arxiv');
                playClickSound();
                if (arxivArticles.length === 0) handleSearchArxiv();
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
                activeTab === 'arxiv' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>arXiv</span>
            </button>
          </div>

          {/* Model Mode Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setAiMode('deep-thinking');
                playClickSound();
              }}
              title="Gemini 4 Argon (Suy luận cao)"
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                aiMode === 'deep-thinking' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sâu
            </button>
            <button
              onClick={() => {
                setAiMode('general');
                playClickSound();
              }}
              title="Gemini 3.8 Flash (Chuẩn)"
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                aiMode === 'general' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chuẩn
            </button>
            <button
              onClick={() => {
                setAiMode('fast');
                playClickSound();
              }}
              title="Gemini 3.1 Flash Lite (Nhanh)"
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                aiMode === 'fast' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nhanh
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {activeTab === 'chat' && (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div className="mt-1 text-[9px] text-slate-400 font-mono text-right">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 p-2.5 bg-slate-800/80 rounded-xl text-xs text-indigo-300">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>
                    {aiMode === 'deep-thinking' ? 'Gemini 4 Argon đang suy luận sâu...' : 'AI đang xử lý...'}
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200 text-xs">Trắc nghiệm tư duy</span>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading}
                  className="px-2 py-1 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className={`w-3 h-3 ${quizLoading ? 'animate-spin' : ''}`} />
                  <span>Bộ mới</span>
                </button>
              </div>

              {quizLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tạo câu hỏi...</span>
                </div>
              ) : (
                quizList.map((q, idx) => {
                  const chosen = selectedAnswers[q.id];
                  const submitted = quizSubmitted[q.id];
                  const isCorrect = chosen === q.correctIndex;

                  return (
                    <div key={q.id} className="bg-slate-800/70 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="font-medium text-white text-xs">
                        {idx + 1}. {q.question}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt, optIdx) => {
                          let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300';
                          if (submitted) {
                            if (optIdx === q.correctIndex) {
                              btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold';
                            } else if (chosen === optIdx && !isCorrect) {
                              btnStyle = 'bg-rose-950/70 border-rose-500 text-rose-200';
                            }
                          } else if (chosen === optIdx) {
                            btnStyle = 'bg-blue-600/30 border-blue-500 text-blue-200 font-semibold';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (!submitted) {
                                  setSelectedAnswers({ ...selectedAnswers, [q.id]: optIdx });
                                  playClickSound();
                                }
                              }}
                              disabled={submitted}
                              className={`w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${btnStyle}`}
                            >
                              <span className="w-4 h-4 rounded bg-slate-800 font-mono text-center text-[10px] text-slate-400 shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="truncate">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {!submitted && chosen !== undefined && (
                        <button
                          onClick={() => {
                            setQuizSubmitted({ ...quizSubmitted, [q.id]: true });
                            if (chosen === q.correctIndex) playSuccessChime();
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        >
                          Xác nhận
                        </button>
                      )}

                      {submitted && (
                        <div
                          className={`p-2 rounded-lg border text-[11px] leading-relaxed ${
                            isCorrect
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          <strong>{isCorrect ? '✓ Chính xác!' : '✗ Chưa đúng!'}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'arxiv' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={arxivQuery}
                  onChange={(e) => setArxivQuery(e.target.value)}
                  placeholder="Tra cứu bài báo arXiv..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
                <button
                  onClick={() => handleSearchArxiv()}
                  disabled={arxivLoading}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  Tìm
                </button>
              </div>

              {arxivLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Đang tìm bài báo...</div>
              ) : (
                arxivArticles.map((art) => (
                  <div key={art.id} className="bg-slate-800/70 border border-slate-800 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-semibold text-blue-300 text-xs leading-snug">{art.title}</span>
                      {art.link && (
                        <a href={art.link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-300">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{art.published}</div>
                    <p className="text-[11px] text-slate-300 line-clamp-2">{art.summary}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        {activeTab === 'chat' && (
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              {['Phân tích dữ liệu', 'Bảo toàn năng lượng?', 'Công thức vi phân'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  disabled={loading}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-400 hover:text-slate-200 shrink-0 text-[10px] cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Đặt câu hỏi vật lý..."
                disabled={loading}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !inputPrompt.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
};
