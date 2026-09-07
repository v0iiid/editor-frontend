import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MediaBin } from './components/MediaBin';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Timeline } from './components/Timeline';
import { Inspector } from './components/Inspector';
import { ExportModal } from './components/ExportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { NotificationModal, NotificationState } from './components/NotificationModal';
import { useUndoRedo } from './hooks/useUndoRedo';
import { TimelineSchema, MediaFileMetadata, Clip, ProjectRecord } from './types';
import { api } from './services/api';

const AUTO_SAVE_KEY = 'cinecraft_auto_save_project';

const DEFAULT_TIMELINE: TimelineSchema = {
  name: 'Untitled Video Project',
  aspectRatio: '16:9',
  canvas: { width: 1920, height: 1080, fps: 30 },
  tracks: [
    { id: 'track_v1', type: 'video', name: 'Video Track 1', muted: false, clips: [] },
    { id: 'track_a1', type: 'audio', name: 'Audio Track 1', muted: false, clips: [] }
  ],
  textOverlays: [],
  transitions: []
};

// Initial state loader (restores auto-saved project if present)
const getInitialState = (): { timeline: TimelineSchema; name: string; id?: string } => {
  try {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.timeline && parsed.timeline.tracks) {
        return {
          timeline: parsed.timeline,
          name: parsed.name || 'Untitled Video Project',
          id: parsed.id
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse auto-save cache', err);
  }
  return { timeline: DEFAULT_TIMELINE, name: 'Untitled Video Project' };
};

export const App: React.FC = () => {
  const initialData = getInitialState();

  const {
    state: timeline,
    setState: setTimeline,
    resetState: resetTimeline,
    undo,
    redo,
    canUndo,
    canRedo
  } = useUndoRedo<TimelineSchema>(initialData.timeline);

  const [projectId, setProjectId] = useState<string | undefined>(initialData.id);
  const [projectName, setProjectName] = useState<string>(initialData.name);
  const [mediaFiles, setMediaFiles] = useState<MediaFileMetadata[]>([]);
  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState<string | null>(null);

  // Modal States
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Custom Notification Modal State
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Load uploaded media files from backend on initial mount
  useEffect(() => {
    api.getAllMediaFiles()
      .then((files) => setMediaFiles(files))
      .catch((err) => console.warn('Could not connect to backend upload endpoint:', err));
  }, []);

  // Auto-Save Effect: Automatically persists project changes to localStorage
  useEffect(() => {
    try {
      const payload = {
        id: projectId,
        name: projectName,
        timeline: timeline,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(payload));
      setAutoSaveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Auto-save error', err);
    }
  }, [timeline, projectName, projectId]);

  // Compute total timeline duration from all clips and text overlays
  const totalDuration = Math.max(
    5,
    ...timeline.tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration)),
    ...timeline.textOverlays.map((t) => t.end)
  );

  // Animation Loop for Playhead
  const lastTickRef = useRef<number>(performance.now());
  useEffect(() => {
    let animFrame: number;

    const tick = () => {
      const now = performance.now();
      const deltaSec = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + deltaSec;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animFrame = requestAnimationFrame(tick);
    };

    lastTickRef.current = performance.now();
    animFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, totalDuration]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          setTimeline((prev) => ({
            ...prev,
            tracks: prev.tracks.map((t) => ({
              ...t,
              clips: t.clips.filter((c) => c.id !== selectedClipId)
            }))
          }));
          setSelectedClipId(null);
        } else if (selectedTextOverlayId) {
          e.preventDefault();
          setTimeline((prev) => ({
            ...prev,
            textOverlays: prev.textOverlays.filter((t) => t.id !== selectedTextOverlayId)
          }));
          setSelectedTextOverlayId(null);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, selectedTextOverlayId, undo, redo, setTimeline]);

  // Add Uploaded Media to Timeline Track with Overlap Prevention
  const handleAddMediaToTimeline = (media: MediaFileMetadata) => {
    handleAddMediaToTimelineAtTime(media, currentTime, media.mimeType.startsWith('audio/') ? 'audio' : 'video');
  };

  // Drag & Drop Media onto Timeline at specific timestamp with Overlap Prevention
  const handleAddMediaToTimelineAtTime = (
    media: MediaFileMetadata,
    targetTime: number,
    trackType: 'video' | 'audio'
  ) => {
    const isAudio = media.mimeType.startsWith('audio/');
    const actualType = isAudio ? 'audio' : 'video';
    const clipDuration = media.duration || 5;

    setTimeline((prev) => {
      const tracks = [...prev.tracks];
      let targetTrack = tracks.find((t) => t.type === actualType);

      if (!targetTrack) {
        targetTrack = {
          id: `track_${actualType}_${Date.now()}`,
          type: actualType,
          name: `${actualType === 'video' ? 'Video' : 'Audio'} Track ${tracks.length + 1}`,
          muted: false,
          clips: []
        };
        tracks.push(targetTrack);
      }

      // Calculate non-overlapping start time
      let startTime = Math.max(0, targetTime);
      const sortedClips = [...targetTrack.clips].sort((a, b) => a.start - b.start);

      for (const existing of sortedClips) {
        if (startTime < existing.start + existing.duration && startTime + clipDuration > existing.start) {
          startTime = existing.start + existing.duration;
        }
      }

      const newClip: Clip = {
        id: `clip_${Date.now()}`,
        fileId: media.id,
        name: media.originalName,
        type: actualType,
        start: Math.round(startTime * 100) / 100,
        duration: clipDuration,
        trimIn: 0,
        trimOut: clipDuration,
        volume: 1.0,
        speed: 1.0,
        filter: 'none'
      };

      targetTrack.clips.push(newClip);
      setSelectedClipId(newClip.id);
      return { ...prev, tracks };
    });
  };

  // Manual Save Project to Backend Database
  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      const savedProj = await api.saveProject(projectId, projectName, timeline);
      setProjectId(savedProj.id);
      setNotification({
        isOpen: true,
        title: 'Project Saved',
        message: `Project "${projectName}" saved successfully to backend database.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        isOpen: true,
        title: 'Save Failed',
        message: err.message || 'Could not save project timeline state.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Load Saved Project from DB
  const handleLoadProject = (proj: ProjectRecord) => {
    setProjectId(proj.id);
    setProjectName(proj.name);
    resetTimeline(proj.timeline);
    setSelectedClipId(null);
    setSelectedTextOverlayId(null);
    setCurrentTime(0);
  };

  // Create New Project with Modal Confirmation
  const handleNewProject = () => {
    setNotification({
      isOpen: true,
      title: 'Create New Project?',
      message: 'Are you sure you want to start a new project? Current timeline state will be cleared.',
      type: 'confirm',
      confirmText: 'New Project',
      cancelText: 'Keep Editing',
      onConfirm: () => {
        setProjectId(undefined);
        setProjectName('Untitled Video Project');
        localStorage.removeItem(AUTO_SAVE_KEY);
        resetTimeline(DEFAULT_TIMELINE);
        setSelectedClipId(null);
        setSelectedTextOverlayId(null);
        setCurrentTime(0);
      }
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-900 overflow-hidden select-none">
      {/* Top Header */}
      <Header
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onSaveProject={handleSaveProject}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onNewProject={handleNewProject}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isSaving={isSaving}
        autoSaveTime={autoSaveTime}
      />

      {/* Main Workspace (Media Bin | Preview Player | Properties Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Media Library Panel */}
        <MediaBin
          mediaFiles={mediaFiles}
          onMediaUploaded={(newFile) => setMediaFiles((prev) => [newFile, ...prev])}
          onAddClipToTimeline={handleAddMediaToTimeline}
        />

        {/* Center Preview Player Viewport */}
        <PreviewPlayer
          timeline={timeline}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
          isPlaying={isPlaying}
          onPlayPauseToggle={() => setIsPlaying((p) => !p)}
          mediaFiles={mediaFiles}
          totalDuration={totalDuration}
        />

        {/* Right Properties Inspector */}
        <Inspector
          timeline={timeline}
          selectedClipId={selectedClipId}
          selectedTextOverlayId={selectedTextOverlayId}
          onUpdateTimeline={setTimeline}
        />
      </div>

      {/* Bottom Multi-Track Timeline */}
      <Timeline
        timeline={timeline}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        onUpdateTimeline={setTimeline}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        selectedTextOverlayId={selectedTextOverlayId}
        onSelectTextOverlay={setSelectedTextOverlayId}
        mediaFiles={mediaFiles}
        totalDuration={totalDuration}
        onAddMediaToTimelineAtTime={handleAddMediaToTimelineAtTime}
      />

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        timeline={timeline}
      />

      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        onLoadProject={handleLoadProject}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Global Custom Notification Modal */}
      <NotificationModal
        notification={notification}
        onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
