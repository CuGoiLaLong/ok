import React, { useState, useEffect } from 'react';
import { BookOpen, X, Plus, Download, Trash2, Calendar, FileText } from 'lucide-react';
import { LabNote, ExperimentType } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface LabJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExperimentId: ExperimentType;
  currentExperimentName: string;
  currentTelemetryData: any;
}

export const LabJournalModal: React.FC<LabJournalModalProps> = ({
  isOpen,
  onClose,
  currentExperimentId,
  currentExperimentName,
  currentTelemetryData,
}) => {
  const [notes, setNotes] = useState<LabNote[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Load notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('phylab_notes');
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const saveNotes = (updated: LabNote[]) => {
    setNotes(updated);
    try {
      localStorage.setItem('phylab_notes', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleAddNote = () => {
    if (!newTitle.trim()) return;
    playClickSound();

    const newNote: LabNote = {
      id: `note_${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      experimentId: currentExperimentId,
      title: newTitle.trim(),
      parameters: currentTelemetryData || {},
      notes: newContent.trim(),
    };

    saveNotes([newNote, ...notes]);
    setNewTitle('');
    setNewContent('');
    playSuccessChime();
  };

  const handleDeleteNote = (id: string) => {
    playClickSound();
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
  };

  const handleExportCSV = () => {
    playSuccessChime();
    const headers = ['ID', 'Thời Gian', 'Mã Thí Nghiệm', 'Tiêu Đề', 'Ghi Chú', 'Dữ Liệu Đo Đạc (JSON)'];
    const rows = notes.map((n) => [
      n.id,
      `"${n.timestamp}"`,
      n.experimentId,
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.notes.replace(/"/g, '""')}"`,
      `"${JSON.stringify(n.parameters).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PhyLab_Notes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-800 dark:text-slate-100 transition-colors animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Sổ Tay Báo Cáo Thí Nghiệm
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ghi chép và lưu trữ dữ liệu thực nghiệm TS. Buoibeo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>
            )}
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form New Note */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Snapshot số liệu hiện tại:</span>
            <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{currentExperimentName}</span>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tiêu đề mẫu thử (ví dụ: Lần đo 1 - Góc lệch 30 độ, chiều dài 1.5m)..."
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Nhận xét hiện tượng, sai số đo được, kết luận thực nghiệm..."
            rows={2}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex justify-end">
            <button
              onClick={handleAddNote}
              disabled={!newTitle.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Lưu Vào Sổ Tay Nghiên Cứu</span>
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có bản ghi thí nghiệm nào. Hãy tạo snapshot đo đạc ở trên để lưu lại.
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{note.title}</h4>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{note.timestamp}</span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-cyan-400 font-semibold">{note.experimentId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {note.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {note.notes}
                  </p>
                )}

                {note.parameters && Object.keys(note.parameters).length > 0 && (
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
                    <pre>{JSON.stringify(note.parameters, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
