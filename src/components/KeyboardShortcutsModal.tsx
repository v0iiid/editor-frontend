import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause Video Preview' },
    { key: 'S', desc: 'Split Selected Clip at Playhead' },
    { key: 'Del / Backspace', desc: 'Delete Selected Clip or Text Caption' },
    { key: 'Ctrl + Z', desc: 'Undo Last Action' },
    { key: 'Ctrl + Y', desc: 'Redo Action' },
    { key: '+ / -', desc: 'Zoom Timeline Ruler In / Out' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-800 border border-dark-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <Command className="w-4 h-4 text-indigo-400" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {shortcuts.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 bg-dark-900/60 rounded-xl border border-dark-700/60 text-xs"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="bg-dark-700 border border-dark-600 text-indigo-300 px-2 py-1 rounded font-mono text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
