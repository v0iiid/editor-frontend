import React from 'react';
import { Sliders, Type, Volume2, Gauge, Palette, Clock, Move } from 'lucide-react';
import { TimelineSchema, Clip, TextOverlay } from '../types';

interface InspectorProps {
  timeline: TimelineSchema;
  selectedClipId: string | null;
  selectedTextOverlayId: string | null;
  onUpdateTimeline: (updatedTimeline: TimelineSchema) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  timeline,
  selectedClipId,
  selectedTextOverlayId,
  onUpdateTimeline
}) => {
  // Find selected clip
  let selectedClip: Clip | null = null;
  let selectedTrackId: string | null = null;

  for (const track of timeline.tracks) {
    const clip = track.clips.find((c) => c.id === selectedClipId);
    if (clip) {
      selectedClip = clip;
      selectedTrackId = track.id;
      break;
    }
  }

  // Find selected text overlay
  const selectedTextOverlay = timeline.textOverlays.find(
    (t) => t.id === selectedTextOverlayId
  );

  // --- HANDLERS FOR CLIP --- //
  const handleClipSpeedChange = (speed: number) => {
    if (!selectedClip || !selectedTrackId) return;
    const newTracks = timeline.tracks.map((t) => {
      if (t.id !== selectedTrackId) return t;
      return {
        ...t,
        clips: t.clips.map((c) => (c.id === selectedClipId ? { ...c, speed } : c))
      };
    });
    onUpdateTimeline({ ...timeline, tracks: newTracks });
  };

  const handleClipVolumeChange = (volume: number) => {
    if (!selectedClip || !selectedTrackId) return;
    const newTracks = timeline.tracks.map((t) => {
      if (t.id !== selectedTrackId) return t;
      return {
        ...t,
        clips: t.clips.map((c) => (c.id === selectedClipId ? { ...c, volume } : c))
      };
    });
    onUpdateTimeline({ ...timeline, tracks: newTracks });
  };

  const handleClipFilterChange = (filter: any) => {
    if (!selectedClip || !selectedTrackId) return;
    const newTracks = timeline.tracks.map((t) => {
      if (t.id !== selectedTrackId) return t;
      return {
        ...t,
        clips: t.clips.map((c) => (c.id === selectedClipId ? { ...c, filter } : c))
      };
    });
    onUpdateTimeline({ ...timeline, tracks: newTracks });
  };

  // --- HANDLERS FOR TEXT OVERLAY --- //
  const handleTextChange = (field: keyof TextOverlay, value: any) => {
    if (!selectedTextOverlayId) return;
    const newOverlays = timeline.textOverlays.map((t) =>
      t.id === selectedTextOverlayId ? { ...t, [field]: value } : t
    );
    onUpdateTimeline({ ...timeline, textOverlays: newOverlays });
  };

  return (
    <div className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col h-full select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-dark-700 flex items-center space-x-2">
        <Sliders className="w-4 h-4 text-indigo-400" />
        <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          Properties Inspector
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {selectedClip ? (
          <>
            {/* Selected Clip Title */}
            <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-700">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                Selected Clip
              </span>
              <p className="text-sm font-medium text-slate-200 truncate mt-0.5">
                {selectedClip.name}
              </p>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Playback Speed</span>
                </span>
                <span className="font-mono text-indigo-400">{selectedClip.speed || 1.0}x</span>
              </label>

              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 1.0, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleClipSpeedChange(s)}
                    className={`py-1.5 text-xs font-mono rounded-lg border transition-all ${
                      (selectedClip?.speed || 1.0) === s
                        ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-md'
                        : 'bg-dark-900 border-dark-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Volume Level</span>
                </span>
                <span className="font-mono text-slate-400">
                  {Math.round((selectedClip.volume ?? 1.0) * 100)}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={selectedClip.volume ?? 1.0}
                onChange={(e) => handleClipVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-dark-700 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            {/* Visual Color Filters */}
            {selectedClip.type === 'video' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Color Filter (FFmpeg Filter)</span>
                </label>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'none', label: 'Normal' },
                    { id: 'grayscale', label: 'Grayscale' },
                    { id: 'sepia', label: 'Sepia Vintage' },
                    { id: 'invert', label: 'Negative' },
                    { id: 'bright', label: 'Vibrant' },
                    { id: 'contrast', label: 'High Contrast' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleClipFilterChange(f.id)}
                      className={`p-2 text-xs text-left rounded-lg border transition-all ${
                        (selectedClip?.filter || 'none') === f.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                          : 'bg-dark-900 border-dark-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : selectedTextOverlay ? (
          <>
            {/* Text Overlay Inspector */}
            <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-700">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                Text Caption Overlay
              </span>
              <p className="text-sm font-medium text-slate-200 truncate mt-0.5">
                "{selectedTextOverlay.text}"
              </p>
            </div>

            {/* Caption Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Caption Text</label>
              <textarea
                value={selectedTextOverlay.text}
                onChange={(e) => handleTextChange('text', e.target.value)}
                rows={2}
                className="w-full bg-dark-900 text-xs text-slate-200 p-2.5 rounded-lg border border-dark-700 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>

            {/* Font Size & Timing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Font Size (px)
                </label>
                <input
                  type="number"
                  min="16"
                  max="120"
                  value={selectedTextOverlay.fontSize}
                  onChange={(e) => handleTextChange('fontSize', parseInt(e.target.value) || 32)}
                  className="w-full bg-dark-900 text-xs font-mono text-slate-200 p-2 rounded-lg border border-dark-700 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Text Color
                </label>
                <input
                  type="color"
                  value={selectedTextOverlay.fontColor}
                  onChange={(e) => handleTextChange('fontColor', e.target.value)}
                  className="w-full h-8 bg-dark-900 border border-dark-700 rounded cursor-pointer p-0.5"
                />
              </div>
            </div>

            {/* Timeline Timing */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Display Duration (Seconds)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Start (s)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedTextOverlay.start}
                    onChange={(e) => handleTextChange('start', parseFloat(e.target.value) || 0)}
                    className="w-full bg-dark-900 text-xs font-mono text-slate-200 p-2 rounded border border-dark-700"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">End (s)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedTextOverlay.end}
                    onChange={(e) => handleTextChange('end', parseFloat(e.target.value) || 1)}
                    className="w-full bg-dark-900 text-xs font-mono text-slate-200 p-2 rounded border border-dark-700"
                  />
                </div>
              </div>
            </div>

            {/* Position Controls */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                <Move className="w-3.5 h-3.5 text-purple-400" />
                <span>Screen Position (X / Y %)</span>
              </label>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400">Vertical Y: {selectedTextOverlay.y}%</span>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={selectedTextOverlay.y}
                    onChange={(e) => handleTextChange('y', parseInt(e.target.value))}
                    className="w-full h-1 bg-dark-700 accent-purple-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <Sliders className="w-8 h-8 mb-2 stroke-[1.5] text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No Item Selected</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Click any clip or text caption on the timeline to edit properties
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
