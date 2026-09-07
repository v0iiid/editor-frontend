import { MediaFileMetadata, TimelineSchema, ExportStatusResponse, ProjectRecord } from '../types';

const API_BASE = '/api';

export const api = {
  // Upload Media File
  async uploadFile(file: File, onProgress?: (percent: number) => void): Promise<MediaFileMetadata> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload`, true);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          resolve(res.file);
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload'));
      xhr.send(formData);
    });
  },

  // Fetch all media files
  async getAllMediaFiles(): Promise<MediaFileMetadata[]> {
    const res = await fetch(`${API_BASE}/uploads`);
    if (!res.ok) throw new Error('Failed to fetch media files');
    const data = await res.json();
    return data.files;
  },

  // Start Video Export
  async exportVideo(timeline: TimelineSchema): Promise<{ jobId: string; statusUrl: string }> {
    const res = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timeline)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit export job');
    }
    return await res.json();
  },

  // Check Export Status
  async getExportStatus(jobId: string): Promise<ExportStatusResponse> {
    const res = await fetch(`${API_BASE}/export/${jobId}/status`);
    if (!res.ok) throw new Error('Failed to fetch job status');
    return await res.json();
  },

  // Project CRUD
  async saveProject(id: string | undefined, name: string, timeline: TimelineSchema): Promise<ProjectRecord> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, timeline })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save project');
    }
    const data = await res.json();
    return data.project;
  },

  async getAllProjects(): Promise<ProjectRecord[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    return data.projects;
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  }
};
