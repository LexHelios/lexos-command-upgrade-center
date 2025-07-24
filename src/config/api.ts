// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://159.26.94.14:3000/api';

// API Endpoints
export const API_ENDPOINTS = {
  ai: {
    chat: `${API_BASE_URL}/ai/chat`,
    h100: `${API_BASE_URL}/ai/h100`
  },
  browserAgent: {
    execute: `${API_BASE_URL}/browser-agent/execute`
  },
  tts: {
    generate: `${API_BASE_URL}/tts/generate`
  },
  stt: {
    transcribe: `${API_BASE_URL}/stt/transcribe`
  },
  image: {
    generate: 'http://localhost:5002/generate/image'
  },
  orchestrator: {
    route: `${API_BASE_URL}/orchestrator/route`
  },
  search: {
    web: `${API_BASE_URL}/search/web`
  }
};