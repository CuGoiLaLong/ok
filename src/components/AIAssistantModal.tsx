import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Brain,
  Zap,
  Send,
  X,
  Bot,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  RotateCw,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AIMode, ChatMessage, QuizQuestion } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExperimentData: any;
  currentExperimentName: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  currentExperimentData,
  currentExperimentName,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz' | 'arxiv'>('chat');
  const [aiMode, setAiMode] = useState<AIMode>('deep-thinking');
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  // View mode: 'compact' (default: dock/bottom sheet, simulation stays visible), 'minimized' (pill only), 'expanded' (full modal)
  const [viewState, setViewState] = useState<'compact' | 'minimized' | 'expanded'>('compact');

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Xin chào TS. Buoibeo! Tôi là Trợ lý AI PhyLab Pro. Tôi đã kết nối dữ liệu từ trạm thí nghiệm "${currentExperimentName}". Hãy hỏi bất kỳ câu hỏi nào hoặc nhờ tôi giải thích hiện tượng!`,
      timestamp: 'Sẵn sàng',
    },
  ]);

  // Quiz state
  const [quizList, setQuizList] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  // arXiv papers state
  const [arxivArticles, setArxivArticles] = useState<any[]>([]);
  const [arxivLoading, setArxivLoading] = useState(false);
  const [arxivQuery, setArxivQuery] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat' && viewState !== 'minimized') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, viewState]);

  // Handle Send Chat
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
          text: `⚠️ Lỗi xử lý: ${err.message}`,
          timestamp: 'Hiện tại',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Generate Quiz
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

  // Search arXiv
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

  // 1. Minimized State: Sleek floating pill at bottom-right (Zero intrusion on experiments)
  if (viewState === 'minimized') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            playClickSound();
            setViewState('compact');
          }}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-full shadow-2xl shadow-blue-500/30 border border-blue-400/40 text-xs font-bold transition-all hover:scale-105 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>AI Trợ Lý Vật Lý</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <ChevronUp className="w-4 h-4 text-slate-200" />
        </button>
      </div>
    );
  }

  // Determine window layout based on viewState
  // Compact mode: on mobile, docked at bottom (height: 48vh) so top 52% shows the experiment!
  // On desktop: floating card at bottom-right (w: 420px, h: 540px), so canvas is completely visible!
  const containerClass =
    viewState === 'expanded'
      ? 'fixed inset-4 sm:inset-10 z-50 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl text-slate-800 dark:text-slate-100'
      : 'fixed bottom-0 left-0 right-0 sm:left-auto sm:bottom-4 sm:right-4 sm:w-[440px] h-[52vh] sm:h-[560px] z-50 flex flex-col bg-white/95 dark:bg-slate-900/95 border-t sm:border border-slate-200 dark:border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl text-slate-800 dark:text-slate-100';

  return (
    <>
      {/* Subtle backdrop only in expanded mode */}
      {viewState === 'expanded' && (
        <div
          onClick={() => setViewState('compact')}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
        />
      )}

      <div className={containerClass}>
        {/* Clean, Non-suffocating Header */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white text-xs truncate">AI Trợ Lý Vật Lý</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                  {aiMode === 'deep-thinking' ? 'Gemini 4 Argon' : aiMode === 'fast' ? 'Flash Lite' : '3.8 Flash'}
                </span>
              </div>
            </div>
          </div>

          {/* Window control buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Minimize to bottom pill */}
            <button
              onClick={() => {
                playClickSound();
                setViewState('minimized');
              }}
              title="Thu nhỏ để xem thí nghiệm"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Toggle Expand / Compact */}
            <button
              onClick={() => {
                playClickSound();
                setViewState(viewState === 'expanded' ? 'compact' : 'expanded');
              }}
              title={viewState === 'expanded' ? 'Thu gọn góc màn hình' : 'Mở rộng'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {viewState === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              title="Đóng trợ lý"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean, Compact Mode & Tab Bar (Single Airy Row) */}
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs shrink-0 gap-2 overflow-x-auto no-scrollbar">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950/70 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => {
                setActiveTab('chat');
                playClickSound();
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'chat' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'quiz' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'arxiv' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>arXiv</span>
            </button>
          </div>

          {/* AI Mode Selector (Compact) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setAiMode('deep-thinking');
                playClickSound();
              }}
              title="Chế độ suy luận chuyên sâu (Gemini 4 Argon)"
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                aiMode === 'deep-thinking'
                  ? 'bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/50 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🧠 Sâu
            </button>
            <button
              onClick={() => {
                setAiMode('general');
                playClickSound();
              }}
              title="Chế độ chuẩn (Gemini 3.8 Flash)"
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                aiMode === 'general'
                  ? 'bg-blue-50 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/50 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🎯 Chuẩn
            </button>
            <button
              onClick={() => {
                setAiMode('fast');
                playClickSound();
              }}
              title="Chế độ nhanh (Gemini 3.1 Flash Lite)"
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                aiMode === 'fast'
                  ? 'bg-cyan-50 dark:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/50 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ⚡ Nhanh
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
          {activeTab === 'chat' && (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-md bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                    <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400 font-mono">
                      <span>{msg.timestamp}</span>
                      {msg.modelUsed && <span>{msg.modelUsed}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-indigo-600 dark:text-indigo-300 shadow-xs">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="truncate">
                    {aiMode === 'deep-thinking' ? 'Gemini 4 Argon đang suy luận sâu...' : 'AI đang phân tích...'}
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white text-xs">Câu hỏi từ dữ liệu thí nghiệm</span>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading}
                  className="px-2 py-1 rounded bg-blue-600/30 border border-blue-500/40 text-blue-200 text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className={`w-3 h-3 ${quizLoading ? 'animate-spin' : ''}`} />
                  <span>Đổi câu hỏi</span>
                </button>
              </div>

              {quizLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Đang soạn câu hỏi trắc nghiệm...</span>
                </div>
              ) : quizList.length > 0 ? (
                quizList.map((q, idx) => {
                  const chosen = selectedAnswers[q.id];
                  const submitted = quizSubmitted[q.id];
                  const isCorrect = chosen === q.correctIndex;

                  return (
                    <div key={q.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="font-medium text-white text-xs flex items-start gap-1.5">
                        <span className="w-4 h-4 rounded bg-blue-600/30 text-blue-300 font-mono flex items-center justify-center shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{q.question}</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt, optIdx) => {
                          let btnStyle = 'bg-slate-950/80 border-slate-800 text-slate-300';
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
                          Xác Nhận Đáp Án
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
              ) : null}
            </div>
          )}

          {activeTab === 'arxiv' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={arxivQuery}
                  onChange={(e) => setArxivQuery(e.target.value)}
                  placeholder="Tra cứu bài báo arXiv..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
                <button
                  onClick={() => handleSearchArxiv()}
                  disabled={arxivLoading}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  Tìm
                </button>
              </div>

              {arxivLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Đang tra cứu arXiv...</div>
              ) : (
                arxivArticles.map((art) => (
                  <div key={art.id} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
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

        {/* Chat Input & Fast Prompts (Only in chat tab) */}
        {activeTab === 'chat' && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
            {/* Quick chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              {['Phân tích số liệu hiện tại', 'Bảo toàn năng lượng?', 'Công thức vi phân'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  disabled={loading}
                  className="px-2 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-full text-slate-700 dark:text-slate-300 shrink-0 text-[10px] cursor-pointer transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form */}
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
                placeholder="Hỏi AI về hiện tượng vật lý..."
                disabled={loading}
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              />
              <button
                type="submit"
                disabled={loading || !inputPrompt.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};
