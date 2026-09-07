import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Volume2,
  VolumeX,
  Plus,
  Type,
  ZoomIn,
  ZoomOut,
  Video,
  Music,
  GripHorizontal
} from 'lucide-react';
import { TimelineSchema, Clip, Track, TextOverlay, MediaFileMetadata } from '../types';

interface TimelineProps {
  timeline: TimelineSchema;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onUpdateTimeline: (updatedTimeline: TimelineSchema) => void;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  selectedTextOverlayId: string | null;
  onSelectTextOverlay: (textId: string | null) => void;
  mediaFiles: MediaFileMetadata[];
  totalDuration: number;
  onAddMediaToTimelineAtTime?: (media: MediaFileMetadata, targetTime: number, trackType: 'video' | 'audio') => void;
}

interface DragState {
  mode: 'move' | 'trim-start' | 'trim-end';
  clipId: string;
  trackId: string;
  initialMouseX: number;
  initialStart: number;
  initialDuration: number;
  initialTrimIn: number;
  initialTrimOut: number;
  sourceMaxDuration: number;
}

// Compact clips on track so they magnetically snap end-to-end without floating gaps
const compactClipsSequence = (clips: Clip[]): Clip[] => {
  let cursor = 0;
  return clips.map((clip) => {
    const updated = { ...clip, start: Math.round(cursor * 100) / 100 };
    cursor += clip.duration;
    return updated;
  });
};

export const Timeline: React.FC<TimelineProps> = ({
  timeline,
  currentTime,
  onTimeUpdate,
  onUpdateTimeline,
  selectedClipId,
  onSelectClip,
  selectedTextOverlayId,
  onSelectTextOverlay,
  mediaFiles,
  totalDuration,
  onAddMediaToTimelineAtTime
}) => {
  const [zoomScale, setZoomScale] = useState<number>(30);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const secondsToPx = (sec: number) => sec * zoomScale;
  const pxToSeconds = (px: number) => Math.max(0, px / zoomScale);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.initialMouseX;
      const deltaSec = deltaPx / zoomScale;

      const newTracks = timeline.tracks.map((track) => {
        if (track.id !== dragState.trackId) return track;

        if (dragState.mode === 'move') {
          const currentClipIndex = track.clips.findIndex((c) => c.id === dragState.clipId);
          if (currentClipIndex === -1) return track;

          const currentClip = track.clips[currentClipIndex];
          const proposedCenter = (dragState.initialStart + deltaSec) + currentClip.duration / 2;

          // Reorder sequence based on drag position
          const remainingClips = track.clips.filter((c) => c.id !== dragState.clipId);
          let targetIndex = 0;

          while (
            targetIndex < remainingClips.length &&
            proposedCenter > remainingClips[targetIndex].start + remainingClips[targetIndex].duration / 2
          ) {
            targetIndex++;
          }

          const reordered = [...remainingClips];
          reordered.splice(targetIndex, 0, currentClip);

          // Magnetically compact clips end-to-end
          const compacted = compactClipsSequence(reordered);
          return { ...track, clips: compacted };

        } else if (dragState.mode === 'trim-start') {
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id !== dragState.clipId) return clip;

              const maxTrimDeltaLeft = dragState.initialTrimIn;
              const minAllowedStart = Math.max(0, dragState.initialStart - maxTrimDeltaLeft);
              const maxAllowedStart = dragState.initialStart + dragState.initialDuration - 0.2;

              const proposedStart = dragState.initialStart + deltaSec;
              const clampedStart = Math.max(minAllowedStart, Math.min(maxAllowedStart, proposedStart));
              const trimDelta = clampedStart - dragState.initialStart;

              const newDuration = dragState.initialDuration - trimDelta;
              const newTrimIn = Math.max(0, dragState.initialTrimIn + trimDelta);

              return {
                ...clip,
                start: Math.round(clampedStart * 100) / 100,
                duration: Math.round(newDuration * 100) / 100,
                trimIn: Math.round(newTrimIn * 100) / 100
              };
            })
          };

        } else if (dragState.mode === 'trim-end') {
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id !== dragState.clipId) return clip;

              const maxPossibleDuration = Math.max(0.2, dragState.sourceMaxDuration - (clip.trimIn || 0));
              const proposedDuration = dragState.initialDuration + deltaSec;
              const clampedDuration = Math.max(0.2, Math.min(maxPossibleDuration, proposedDuration));
              const newTrimOut = (clip.trimIn || 0) + clampedDuration;

              return {
                ...clip,
                duration: Math.round(clampedDuration * 100) / 100,
                trimOut: Math.round(newTrimOut * 100) / 100
              };
            })
          };
        }
        return track;
      });

      onUpdateTimeline({ ...timeline, tracks: newTracks });
    };

    const handleMouseUp = () => {
      if (dragState && dragState.mode === 'move') {
        // Compact track clips on release
        const finalizedTracks = timeline.tracks.map((t) => {
          if (t.id === dragState.trackId) {
            return { ...t, clips: compactClipsSequence(t.clips) };
          }
          return t;
        });
        onUpdateTimeline({ ...timeline, tracks: finalizedTracks });
      }
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, timeline, zoomScale, onUpdateTimeline]);

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || dragState) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = pxToSeconds(clickX);
    onTimeUpdate(Math.min(totalDuration || 30, newTime));
  };

  const handleMouseDownScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.clip-box')) return;
    setIsScrubbing(true);
    handleTimelineScrub(e);
  };

  const handleMouseMoveScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isScrubbing && !dragState) handleTimelineScrub(e);
  };

  const handleMouseUpScrub = () => setIsScrubbing(false);

  const handleClipMouseDown = (
    e: React.MouseEvent,
    clip: Clip,
    trackId: string,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    onSelectClip(clip.id);
    onSelectTextOverlay(null);

    const sourceFile = mediaFiles.find((m) => m.id === clip.fileId);
    const sourceMaxDuration = sourceFile ? sourceFile.duration : (clip.trimOut || 300);

    setDragState({
      mode,
      clipId: clip.id,
      trackId,
      initialMouseX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
      initialTrimIn: clip.trimIn || 0,
      initialTrimOut: clip.trimOut || clip.duration,
      sourceMaxDuration
    });
  };

  const handleTrackDrop = (e: React.DragEvent, trackType: 'video' | 'audio') => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData || !timelineRef.current) return;

    try {
      const media: MediaFileMetadata = JSON.parse(rawData);
      const rect = timelineRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const dropTime = Math.round(pxToSeconds(dropX) * 10) / 10;

      if (onAddMediaToTimelineAtTime) {
        onAddMediaToTimelineAtTime(media, dropTime, trackType);
      }
    } catch (err) {
      console.warn('Invalid drop payload', err);
    }
  };

  const handleSplitClipAtPlayhead = () => {
    let targetClipId = selectedClipId;

    if (!targetClipId) {
      for (const track of timeline.tracks) {
        const clipUnderPlayhead = track.clips.find(
          (c) => currentTime >= c.start + 0.1 && currentTime <= c.start + c.duration - 0.1
        );
        if (clipUnderPlayhead) {
          targetClipId = clipUnderPlayhead.id;
          break;
        }
      }
    }

    if (!targetClipId) return;

    let splitOccurred = false;
    const newTracks = timeline.tracks.map((track) => {
      const clipIndex = track.clips.findIndex((c) => c.id === targetClipId);
      if (clipIndex === -1) return track;

      const targetClip = track.clips[clipIndex];
      const splitPoint = currentTime - targetClip.start;

      if (splitPoint <= 0.1 || splitPoint >= targetClip.duration - 0.1) return track;

      const leftDuration = Math.round(splitPoint * 100) / 100;
      const rightDuration = Math.round((targetClip.duration - leftDuration) * 100) / 100;

      const leftClip: Clip = {
        ...targetClip,
        id: `clip_${Date.now()}_1`,
        duration: leftDuration,
        trimOut: (targetClip.trimIn || 0) + leftDuration
      };

      const rightClip: Clip = {
        ...targetClip,
        id: `clip_${Date.now()}_2`,
        start: Math.round((targetClip.start + leftDuration) * 100) / 100,
        duration: rightDuration,
        trimIn: (targetClip.trimIn || 0) + leftDuration
      };

      const updatedClips = [...track.clips];
      updatedClips.splice(clipIndex, 1, leftClip, rightClip);
      splitOccurred = true;

      // Magnetically compact sequence
      return { ...track, clips: compactClipsSequence(updatedClips) };
    });

    if (splitOccurred) {
      onUpdateTimeline({ ...timeline, tracks: newTracks });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedClipId) {
      const newTracks = timeline.tracks.map((t) => ({
        ...t,
        clips: compactClipsSequence(t.clips.filter((c) => c.id !== selectedClipId))
      }));
      onUpdateTimeline({ ...timeline, tracks: newTracks });
      onSelectClip(null);
    } else if (selectedTextOverlayId) {
      const newOverlays = timeline.textOverlays.filter((t) => t.id !== selectedTextOverlayId);
      onUpdateTimeline({ ...timeline, textOverlays: newOverlays });
      onSelectTextOverlay(null);
    }
  };

  const handleToggleTrackMute = (trackId: string) => {
    const newTracks = timeline.tracks.map((t) =>
      t.id === trackId ? { ...t, muted: !t.muted } : t
    );
    onUpdateTimeline({ ...timeline, tracks: newTracks });
  };

  const handleAddTextOverlay = () => {
    const newOverlay: TextOverlay = {
      id: `text_${Date.now()}`,
      text: 'Sample Title',
      start: currentTime,
      end: currentTime + 3.0,
      x: 50,
      y: 80,
      fontSize: 42,
      fontColor: '#ffffff',
      backgroundColor: '#00000080',
      fontFamily: 'sans-serif'
    };
    onUpdateTimeline({
      ...timeline,
      textOverlays: [...timeline.textOverlays, newOverlay]
    });
    onSelectTextOverlay(newOverlay.id);
    onSelectClip(null);
  };

  const rulerTicks = [];
  const displayLength = Math.max(60, Math.ceil(totalDuration + 15));
  for (let i = 0; i <= displayLength; i += 1) {
    rulerTicks.push(i);
  }

  return (
    <div className="h-72 bg-dark-800 border-t border-dark-700 flex flex-col select-none">
      {/* Toolbar */}
      <div className="h-10 bg-dark-800 border-b border-dark-700 px-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSplitClipAtPlayhead}
            title="Split Clip at Playhead (S)"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-dark-700 hover:bg-dark-600 text-xs text-slate-200 transition-colors"
          >
            <Scissors className="w-3.5 h-3.5 text-indigo-400" />
            <span>Split (S)</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={!selectedClipId && !selectedTextOverlayId}
            title="Delete Selected Item (Del)"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-dark-700 hover:bg-red-600/80 text-xs text-slate-200 disabled:opacity-40 disabled:hover:bg-dark-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>

          <div className="h-4 w-px bg-dark-700 mx-1" />

          <button
            onClick={handleAddTextOverlay}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
          >
            <Type className="w-3.5 h-3.5" />
            <span>+ Text Caption</span>
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-slate-400">Zoom Timeline</span>
          <button
            onClick={() => setZoomScale((z) => Math.max(10, z - 5))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-dark-700"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="10"
            max="100"
            value={zoomScale}
            onChange={(e) => setZoomScale(parseInt(e.target.value))}
            className="w-24 h-1 bg-dark-600 accent-indigo-500 rounded cursor-pointer"
          />
          <button
            onClick={() => setZoomScale((z) => Math.min(100, z + 5))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-dark-700"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className="w-48 bg-dark-800 border-r border-dark-700 flex-shrink-0 flex flex-col pt-7 z-10">
          <div className="h-10 px-3 flex items-center justify-between border-b border-dark-700/60 bg-dark-900/40">
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Captions
            </span>
          </div>

          {timeline.tracks.map((track) => (
            <div
              key={track.id}
              className="h-14 px-3 flex items-center justify-between border-b border-dark-700/60 bg-dark-900/20"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {track.type === 'video' ? (
                  <Video className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                ) : (
                  <Music className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-300 truncate">
                  {track.name}
                </span>
              </div>

              <button
                onClick={() => handleToggleTrackMute(track.id)}
                className={`p-1 rounded ${
                  track.muted ? 'text-red-400 bg-red-950/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>

        {/* Tracks Canvas */}
        <div
          ref={timelineRef}
          onMouseDown={handleMouseDownScrub}
          onMouseMove={handleMouseMoveScrub}
          onMouseUp={handleMouseUpScrub}
          className="flex-1 overflow-x-auto overflow-y-hidden relative timeline-grid cursor-pointer"
        >
          <div
            className="relative min-h-full"
            style={{ width: `${secondsToPx(displayLength)}px` }}
          >
            {/* Time Ruler */}
            <div className="h-7 border-b border-dark-700 bg-dark-900/80 flex items-end relative select-none">
              {rulerTicks.map((sec) => (
                <div
                  key={sec}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${secondsToPx(sec)}px` }}
                >
                  <div className="h-2 w-px bg-dark-600 mt-1" />
                  {sec % 5 === 0 && (
                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                      {sec}s
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
              style={{ left: `${secondsToPx(currentTime)}px` }}
            >
              <div className="w-3 h-3 bg-red-500 transform -translate-x-[5px] rotate-45 rounded-sm shadow-md" />
            </div>

            {/* Text Overlays */}
            <div className="h-10 border-b border-dark-700/40 relative bg-purple-950/10">
              {timeline.textOverlays.map((overlay) => {
                const isSelected = overlay.id === selectedTextOverlayId;
                const width = secondsToPx(overlay.end - overlay.start);
                const left = secondsToPx(overlay.start);

                return (
                  <div
                    key={overlay.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTextOverlay(overlay.id);
                      onSelectClip(null);
                    }}
                    className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-xs font-medium border cursor-pointer truncate transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-300 shadow-lg shadow-purple-500/30'
                        : 'bg-purple-900/60 text-purple-200 border-purple-700/60 hover:border-purple-500'
                    }`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    <span className="truncate">{overlay.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Track Clips */}
            {timeline.tracks.map((track) => (
              <div
                key={track.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleTrackDrop(e, track.type)}
                className="h-14 border-b border-dark-700/40 relative bg-dark-900/10 group/track"
              >
                {track.clips.map((clip) => {
                  const isSelected = clip.id === selectedClipId;
                  const isDraggingThisClip = dragState?.clipId === clip.id;
                  const width = secondsToPx(clip.duration);
                  const left = secondsToPx(clip.start);
                  const isVideo = clip.type === 'video';

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'move')}
                      className={`clip-box absolute top-1 bottom-1 rounded-lg border flex flex-col justify-between p-1.5 cursor-grab active:cursor-grabbing transition-all ${
                        isDraggingThisClip
                          ? 'scale-95 border-indigo-300 ring-4 ring-indigo-400 shadow-2xl shadow-indigo-500/50 z-40 opacity-90 backdrop-blur-sm animate-pulse bg-indigo-500 text-white'
                          : isSelected
                          ? 'border-indigo-400 ring-2 ring-indigo-500/50 shadow-indigo-500/20 z-20 ' +
                            (isVideo ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white')
                          : isVideo
                          ? 'bg-indigo-950/80 border-indigo-700/60 text-indigo-200 hover:border-indigo-500'
                          : 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200 hover:border-emerald-500'
                      }`}
                      style={{ left: `${left}px`, width: `${width}px` }}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'trim-start')}
                        title="Drag to trim start"
                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-white/20 hover:bg-white/50 cursor-ew-resize rounded-l-md transition-colors flex items-center justify-center z-10"
                      >
                        <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                      </div>

                      {/* Clip Label */}
                      <div className="flex items-center justify-between text-xs font-medium truncate px-1.5">
                        <span className="truncate flex items-center gap-1">
                          <GripHorizontal className="w-3 h-3 opacity-60 flex-shrink-0" />
                          <span>{clip.name}</span>
                        </span>
                        {clip.speed && clip.speed !== 1.0 && (
                          <span className="text-[10px] font-mono bg-dark-900/60 px-1 rounded">
                            {clip.speed}x
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono opacity-80 px-1.5">
                        <span>{clip.duration.toFixed(1)}s</span>
                        {clip.filter && clip.filter !== 'none' && (
                          <span className="uppercase bg-black/40 px-1 rounded">
                            {clip.filter}
                          </span>
                        )}
                      </div>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'trim-end')}
                        title="Drag to trim end"
                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/20 hover:bg-white/50 cursor-ew-resize rounded-r-md transition-colors flex items-center justify-center z-10"
                      >
                        <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
