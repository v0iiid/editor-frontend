export interface MediaFileMetadata {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  resolution?: string;
  hasAudio: boolean;
  thumbnailUrl: string;
  streamUrl: string;
  createdAt: string;
}

export type TrackType = 'video' | 'audio';

export interface TransformOptions {
  x: number;
  y: number;
  scale: number;
}

export interface Clip {
  id: string;
  fileId: string;
  name: string;
  type: TrackType;
  start: number;      // Timeline start in seconds
  duration: number;   // Visual duration on timeline
  trimIn: number;     // Crop start point in source file
  trimOut: number;    // Crop end point in source file
  volume?: number;    // 0.0 to 2.0
  speed?: number;     // 0.25 to 4.0
  filter?: 'none' | 'grayscale' | 'sepia' | 'invert' | 'bright' | 'contrast';
  transform?: TransformOptions;
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  muted: boolean;
  clips: Clip[];
}

export interface TextOverlay {
  id: string;
  text: string;
  start: number;
  end: number;
  x: number;          // 0 to 100 percentage
  y: number;          // 0 to 100 percentage
  fontSize: number;   // In pixels
  fontColor: string;  // Hex color #ffffff
  backgroundColor?: string; // Hex color or transparent
  fontFamily?: string;
}

export interface Transition {
  id: string;
  type: 'crossfade' | 'fadein' | 'fadeout' | 'wipeleft' | 'wiperight';
  fromClipId: string;
  toClipId: string;
  duration: number;
}

export interface CanvasSettings {
  width: number;
  height: number;
  fps: number;
}

export interface TimelineSchema {
  id?: string;
  name: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  canvas: CanvasSettings;
  tracks: Track[];
  textOverlays: TextOverlay[];
  transitions: Transition[];
  transcript?: any;
  aiMetadata?: any;
}

export interface ExportStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineSchema;
}
