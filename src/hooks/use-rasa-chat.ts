import { useState, useCallback } from 'react';
import { API_BASE_URL } from '@/config/api';

interface RasaMessage {
  text?: string;
  image?: string;
  buttons?: Array<{
    title: string;
    payload: string;
  }>;
  custom?: any;
}

interface UseRasaChatOptions {
  senderId?: string;
  onError?: (error: Error) => void;
}

export const useRasaChat = (options: UseRasaChatOptions = {}) => {
  const { senderId = 'default', onError } = options;
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(senderId);

  const sendMessage = useCallback(async (message: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rasa/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sender: conversationId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message to Rasa');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Rasa chat error:', error);
      onError?.(error as Error);
      
      // Fallback to regular AI API if Rasa is unavailable
      if ((error as any).fallback) {
        return null;
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [conversationId, onError]);

  const getTracker = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rasa/conversations/${conversationId}/tracker`);
      if (!response.ok) {
        throw new Error('Failed to get conversation tracker');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get tracker:', error);
      return null;
    }
  }, [conversationId]);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rasa/health`);
      if (!response.ok) {
        return { core: false, actions: false, status: 'error' };
      }
      return await response.json();
    } catch (error) {
      return { core: false, actions: false, status: 'error' };
    }
  }, []);

  const trainModel = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rasa/model/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to train model');
      }

      return await response.json();
    } catch (error) {
      console.error('Training error:', error);
      onError?.(error as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const resetConversation = useCallback(() => {
    const newId = `user_${Date.now()}`;
    setConversationId(newId);
  }, []);

  return {
    sendMessage,
    getTracker,
    checkHealth,
    trainModel,
    resetConversation,
    loading,
    conversationId
  };
};