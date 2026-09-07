import React, { useState, useRef } from 'react';
import { Upload, Video, Music, Plus, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { MediaFileMetadata } from '../types';
import { api } from '../services/api';

interface MediaBinProps {
  mediaFiles: MediaFileMetadata[];
  onMediaUploaded: (newFile: MediaFileMetadata) => void;
  onAddClipToTimeline: (media: MediaFileMetadata) => void;
}

export const MediaBin: React.FC<MediaBinProps> = ({
  mediaFiles,
  onMediaUploaded,
  onAddClipToTimeline
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await processUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const processUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg(null);

    try {
      const uploadedMedia = await api.uploadFile(file, (pct) => {
        setUploadProgress(pct);
      });
      onMediaUploaded(uploadedMedia);
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-80 bg-dark-800 border-r border-dark-700 flex flex-col h-full select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Video className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Media Library
          </h2>
        </div>
        <span className="text-xs font-mono bg-dark-700 px-2 py-0.5 rounded text-slate-400">
          {mediaFiles.length} files
        </span>
      </div>

      {/* Drop Zone / Upload Action */}
      <div className="p-3 border-b border-dark-700">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-dark-600 hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-dark-900/40 hover:bg-dark-700/30 transition-all group"
        >
          <div className="p-2.5 bg-dark-700 rounded-full group-hover:bg-indigo-600/20 group-hover:text-indigo-400 text-slate-400 transition-all mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-300 group-hover:text-white">
            Click to upload media
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">MP4, MOV, MP3, WAV, JPG, PNG</p>
        </div>

        {/* Uploading Progress State */}
        {isUploading && (
          <div className="mt-3 p-2.5 bg-dark-900/80 rounded-lg border border-dark-700">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span>Uploading media...</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-dark-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-2.5 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Media Cards List (Draggable into timeline) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {mediaFiles.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <Video className="w-8 h-8 mb-2 stroke-[1.5] text-slate-600" />
            <p className="text-xs">No media files in project</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Upload video, audio, or image files to begin editing
            </p>
          </div>
        ) : (
          mediaFiles.map((media) => {
            const isVideo = media.mimeType.startsWith('video/');
            const isAudio = media.mimeType.startsWith('audio/');

            return (
              <div
                key={media.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(media));
                }}
                className="group relative bg-dark-900/70 border border-dark-700 hover:border-dark-600 rounded-xl p-2 flex items-center space-x-3 transition-all hover:shadow-md cursor-grab active:cursor-grabbing"
              >
                {/* Thumbnail Snapshot */}
                <div className="relative w-20 h-14 bg-dark-800 rounded-lg overflow-hidden flex-shrink-0 border border-dark-700 flex items-center justify-center">
                  {isVideo && media.thumbnailUrl ? (
                    <img
                      src={media.thumbnailUrl}
                      alt={media.originalName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : isAudio ? (
                    <div className="w-full h-full bg-indigo-950/40 flex items-center justify-center text-indigo-400">
                      <Music className="w-6 h-6" />
                    </div>
                  ) : (
                    <img
                      src={media.thumbnailUrl || media.streamUrl}
                      alt={media.originalName}
                      className="w-full h-full object-cover"
                    />
                  )}

                  <span className="absolute bottom-1 right-1 bg-dark-900/90 text-[10px] font-mono px-1 py-0.5 rounded text-slate-300 border border-dark-700">
                    {formatDuration(media.duration)}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                    {media.originalName}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase bg-dark-800 px-1.5 py-0.5 rounded">
                      {isVideo ? 'Video' : isAudio ? 'Audio' : 'Image'}
                    </span>
                    {media.resolution && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {media.resolution}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Add Button */}
                <button
                  onClick={() => onAddClipToTimeline(media)}
                  title="Add to Timeline"
                  className="p-1.5 bg-dark-700 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
