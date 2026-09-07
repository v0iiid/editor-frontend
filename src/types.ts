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

export interface Clip {
  id: string;
  fileId: string;
  name: string;
  type: TrackType;
  start: number;
  duration: number;
  trimIn: number;
  trimOut: number;
  volume?: number;
  speed?: number;
  filter?: 'none' | 'grayscale' | 'sepia' | 'invert' | 'bright' | 'contrast';
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
  x: number;
  y: number;
  fontSize: number;
  fontColor: string;
  backgroundColor?: string;
  fontFamily?: string;
}

export interface TimelineSchema {
  id?: string;
  name: string;
  aspectRatio?: string;
  canvas: {
    width: number;
    height: number;
    fps: number;
  };
  tracks: Track[];
  textOverlays: TextOverlay[];
  transitions: any[];
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
