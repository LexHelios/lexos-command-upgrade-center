
import { API_BASE_URL } from '@/config/api';

export interface H100ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  description?: string;
}

export const useH100Api = () => {
  // Get available models from H100 backend
  const getModels = async (): Promise<ModelInfo[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/h100/ai/models`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching H100 models:', error);
      return [];
    }
  };

  // Send chat message to H100 backend
  const sendChat = async (message: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<H100ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/h100/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          model: options?.model || 'auto',
          temperature: options?.temperature || 0.7,
          maxTokens: options?.maxTokens || 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Request failed' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error sending chat to H100:', error);
      return { success: false, error: 'Failed to send message' };
    }
  };

  // Upload file to H100 backend
  const uploadFile = async (file: File): Promise<H100ApiResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/h100/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Upload failed' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error uploading file to H100:', error);
      return { success: false, error: 'Failed to upload file' };
    }
  };

  // Get system monitoring data
  const getMonitoring = async (): Promise<H100ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/h100/monitoring`);
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Request failed' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching H100 monitoring:', error);
      return { success: false, error: 'Failed to fetch monitoring data' };
    }
  };

  // Get tasks from H100 backend
  const getTasks = async (): Promise<H100ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/h100/tasks`);
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Request failed' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching H100 tasks:', error);
      return { success: false, error: 'Failed to fetch tasks' };
    }
  };

  return {
    getModels,
    sendChat,
    uploadFile,
    getMonitoring,
    getTasks,
  };
};