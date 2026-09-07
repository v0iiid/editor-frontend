import React from 'react';
import { Film, Save, FolderOpen, Undo2, Redo2, Download, HelpCircle, Plus, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSaveProject: () => void;
  onOpenProjectManager: () => void;
  onNewProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  isSaving?: boolean;
  autoSaveTime?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  onProjectNameChange,
  onSaveProject,
  onOpenProjectManager,
  onNewProject,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenExport,
  onOpenShortcuts,
  isSaving = false,
  autoSaveTime = null
}) => {
  return (
    <header className="h-14 bg-dark-800 border-b border-dark-700 px-4 flex items-center justify-between z-20 select-none">
      {/* Brand & Project Name */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg tracking-wide">
          <Film className="w-6 h-6 text-indigo-500 animate-pulse" />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            CineCraft Pro
          </span>
        </div>

        <div className="h-5 w-px bg-dark-600" />

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-dark-700 text-sm font-medium text-slate-200 px-2.5 py-1 rounded border border-transparent hover:border-dark-600 focus:border-indigo-500 focus:outline-none transition-colors w-48"
            placeholder="Project Title..."
          />

          {autoSaveTime && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Auto-Saved
            </span>
          )}
        </div>
      </div>

      {/* Center Actions: Undo / Redo / History */}
      <div className="flex items-center space-x-1 bg-dark-900/60 p-1 rounded-lg border border-dark-700">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-dark-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-dark-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right Actions: Projects, Save, Export */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-dark-700 rounded-lg transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onNewProject}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-700 rounded-lg border border-dark-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>

        <button
          onClick={onOpenProjectManager}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-700 rounded-lg border border-dark-600 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Projects</span>
        </button>

        <button
          onClick={onSaveProject}
          disabled={isSaving}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-dark-700 hover:bg-dark-600 text-slate-200 rounded-lg border border-dark-600 transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5 text-indigo-400" />
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center space-x-2 px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
