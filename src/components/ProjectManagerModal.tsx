import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { ProjectRecord } from '../types';
import { api } from '../services/api';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: ProjectRecord) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  onLoadProject
}) => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAllProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-800 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <span>Saved Video Projects</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Project List */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-2.5">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading saved projects...</div>
          ) : projects.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center text-slate-500">
              <FolderOpen className="w-10 h-10 mb-2 text-slate-600 stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-400">No Saved Projects Found</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Save your timeline edits to access projects here
              </p>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  onLoadProject(proj);
                  onClose();
                }}
                className="p-3.5 bg-dark-900/60 hover:bg-dark-700/60 border border-dark-700 hover:border-indigo-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
              >
                <div>
                  <h3 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                    {proj.name}
                  </h3>
                  <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500 mt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span>{new Date(proj.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(proj.id, e)}
                  title="Delete Project"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-dark-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
