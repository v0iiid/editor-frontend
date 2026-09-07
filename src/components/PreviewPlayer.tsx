import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Repeat } from 'lucide-react';
import { TimelineSchema, Clip, MediaFileMetadata, TextOverlay } from '../types';

interface PreviewPlayerProps {
  timeline: TimelineSchema;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  mediaFiles: MediaFileMetadata[];
  totalDuration: number;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  timeline,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onPlayPauseToggle,
  mediaFiles,
  totalDuration
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Find active video clip on timeline at current time
  const videoTracks = timeline.tracks.filter((t) => t.type === 'video' && !t.muted);
  let activeVideoClip: Clip | null = null;
  for (const track of videoTracks) {
    const clip = track.clips.find(
      (c) => currentTime >= c.start && currentTime < c.start + c.duration
    );
    if (clip) {
      activeVideoClip = clip;
      break;
    }
  }

  // Find active audio clip at current time
  const audioTracks = timeline.tracks.filter((t) => t.type === 'audio' && !t.muted);
  let activeAudioClip: Clip | null = null;
  for (const track of audioTracks) {
    const clip = track.clips.find(
      (c) => currentTime >= c.start && currentTime < c.start + c.duration
    );
    if (clip) {
      activeAudioClip = clip;
      break;
    }
  }

  // Active text overlays at current time
  const activeTextOverlays = timeline.textOverlays.filter(
    (overlay) => currentTime >= overlay.start && currentTime <= overlay.end
  );

  const activeVideoFile = activeVideoClip
    ? mediaFiles.find((m) => m.id === activeVideoClip?.fileId)
    : null;

  const activeAudioFile = activeAudioClip
    ? mediaFiles.find((m) => m.id === activeAudioClip?.fileId)
    : null;

  // Sync video source & playback time with playhead position
  useEffect(() => {
    if (!videoRef.current || !activeVideoClip || !activeVideoFile) return;

    const sourceOffset = currentTime - activeVideoClip.start;
    const mediaTime = (activeVideoClip.trimIn + sourceOffset) * (activeVideoClip.speed || 1.0);

    if (Math.abs(videoRef.current.currentTime - mediaTime) > 0.3) {
      videoRef.current.currentTime = mediaTime;
    }

    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [currentTime, activeVideoClip, isPlaying, activeVideoFile]);

  // Sync volume & mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume * (activeVideoClip?.volume ?? 1);
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume * (activeAudioClip?.volume ?? 1);
    }
  }, [volume, isMuted, activeVideoClip, activeAudioClip]);

  // Format Timecode HH:MM:SS:FF
  const formatTimecode = (timeSec: number) => {
    const hours = Math.floor(timeSec / 3600);
    const mins = Math.floor((timeSec % 3600) / 60);
    const secs = Math.floor(timeSec % 60);
    const frames = Math.floor((timeSec % 1) * (timeline.canvas.fps || 30));

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  };

  // Get CSS filter rule for visual clip filter
  const getCssFilter = (filterName?: string) => {
    switch (filterName) {
      case 'grayscale':
        return 'grayscale(100%)';
      case 'sepia':
        return 'sepia(100%)';
      case 'invert':
        return 'invert(100%)';
      case 'bright':
        return 'brightness(130%) contrast(110%)';
      case 'contrast':
        return 'contrast(150%)';
      default:
        return 'none';
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex-1 bg-dark-900 flex flex-col h-full select-none overflow-hidden">
      {/* Player Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-4 group"
      >
        {activeVideoFile ? (
          <video
            ref={videoRef}
            src={activeVideoFile.streamUrl}
            className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-75"
            style={{
              filter: getCssFilter(activeVideoClip?.filter)
            }}
            playsInline
            muted={isMuted}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-dark-900/60 rounded-xl border border-dark-800">
            <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-3 text-slate-500">
              <Play className="w-8 h-8 ml-1 stroke-[1.5]" />
            </div>
            <p className="text-sm font-medium text-slate-400">Preview Viewport</p>
            <p className="text-xs text-slate-600 mt-1">
              Add video clips to the timeline to play preview
            </p>
          </div>
        )}

        {/* Hidden Audio Player for audio-only track sync */}
        {activeAudioFile && (
          <audio
            ref={audioRef}
            src={activeAudioFile.streamUrl}
            autoPlay={isPlaying}
            muted={isMuted}
          />
        )}

        {/* Real-time Text Overlay Viewport */}
        {activeTextOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute pointer-events-none transition-all duration-75 font-semibold text-center drop-shadow-md px-3 py-1 rounded"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${overlay.fontSize || 36}px`,
              color: overlay.fontColor || '#ffffff',
              backgroundColor: overlay.backgroundColor || 'transparent',
              fontFamily: overlay.fontFamily || 'sans-serif'
            }}
          >
            {overlay.text}
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="h-12 bg-dark-800 border-t border-dark-700 px-4 flex items-center justify-between z-10">
        {/* Left: Timecode Display */}
        <div className="flex items-center space-x-3">
          <div className="font-mono text-xs text-indigo-400 font-semibold bg-dark-900 px-2.5 py-1 rounded border border-dark-700 tracking-wider">
            {formatTimecode(currentTime)}
          </div>
          <span className="text-slate-600 text-xs font-mono">/</span>
          <div className="font-mono text-xs text-slate-400">
            {formatTimecode(totalDuration)}
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onTimeUpdate(0)}
            title="Jump to Start"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPauseToggle}
            className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-white" />
            )}
          </button>

          <button
            onClick={() => onTimeUpdate(Math.min(totalDuration, currentTime + 5))}
            title="Skip 5s Forward"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            title="Toggle Loop"
            className={`p-1.5 rounded-lg transition-colors ${
              isLooping ? 'text-indigo-400 bg-indigo-950/50' : 'text-slate-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume & Fullscreen */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1 bg-dark-600 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          <div className="h-4 w-px bg-dark-700" />

          <button
            onClick={handleFullscreen}
            title="Fullscreen"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
