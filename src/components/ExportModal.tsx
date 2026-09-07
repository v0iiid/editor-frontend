import React, { useState, useEffect } from 'react';
import { X, Download, Film, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { TimelineSchema, ExportStatusResponse } from '../types';
import { api } from '../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: TimelineSchema;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  timeline
}) => {
  const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [fps, setFps] = useState<number>(30);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatusResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setIsExporting(false);
      setJobId(null);
      setExportStatus(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Poll Export Job Status when active jobId exists
  useEffect(() => {
    if (!jobId || !isExporting) return;

    const interval = setInterval(async () => {
      try {
        const status = await api.getExportStatus(jobId);
        setExportStatus(status);

        if (status.status === 'completed') {
          setIsExporting(false);
          clearInterval(interval);
        } else if (status.status === 'failed') {
          setIsExporting(false);
          setErrorMsg(status.error || 'FFmpeg render job failed');
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Failed to poll status', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId, isExporting]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setExportStatus(null);

    // Update canvas settings based on selection
    let width = 1920;
    let height = 1080;
    if (resolution === '720p') {
      width = 1280;
      height = 720;
    } else if (resolution === '480p') {
      width = 854;
      height = 480;
    }

    const updatedTimeline: TimelineSchema = {
      ...timeline,
      canvas: { width, height, fps }
    };

    try {
      const res = await api.exportVideo(updatedTimeline);
      setJobId(res.jobId);
    } catch (err: any) {
      setIsExporting(false);
      setErrorMsg(err.message || 'Failed to start export');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-800 border border-dark-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between bg-dark-800">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <Film className="w-5 h-5 text-indigo-400" />
            <span>Server FFmpeg Export Pipeline</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {!isExporting && !exportStatus?.downloadUrl ? (
            <>
              {/* Preset Selectors */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  Target Canvas Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1080p', label: '1080p Full HD', desc: '1920x1080' },
                    { id: '720p', label: '720p HD', desc: '1280x720' },
                    { id: '480p', label: '480p SD', desc: '854x480' }
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() => setResolution(res.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        resolution === res.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                          : 'bg-dark-900 border-dark-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <p className="text-xs">{res.label}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{res.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Frame Rate (FPS)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[30, 60].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFps(f)}
                      className={`py-2 text-xs font-mono rounded-xl border text-center transition-all ${
                        fps === f
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                          : 'bg-dark-900 border-dark-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f} FPS
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Start Export Action */}
              <button
                onClick={handleStartExport}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 transition-all transform active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Render Video on Server</span>
              </button>
            </>
          ) : isExporting || exportStatus?.status === 'processing' || exportStatus?.status === 'queued' ? (
            /* Render Progress View */
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin stroke-[1.5]" />
                <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-slate-200">
                  {exportStatus?.progress || 0}%
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  Server FFmpeg Render in Progress...
                </p>
                <p className="text-xs text-slate-400">
                  Applying trims, speed changes, text overlays, and filters
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-dark-900 border border-dark-700 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${exportStatus?.progress || 0}%` }}
                />
              </div>
            </div>
          ) : exportStatus?.status === 'completed' && exportStatus.downloadUrl ? (
            /* Render Complete Download View */
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-100">Video Rendered Successfully!</p>
                <p className="text-xs text-slate-400">Your MP4 output file is ready for download.</p>
              </div>

              <a
                href={exportStatus.downloadUrl}
                download
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all transform active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download Processed Video (MP4)</span>
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
