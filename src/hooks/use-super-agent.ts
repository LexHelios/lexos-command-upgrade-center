import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string;
  stack: string[];
  features: string[];
  database?: string;
  auth?: string;
  status: string;
  deployment?: {
    url: string;
    domain: string;
    provider: string;
  };
  files: string[];
}

export const useSuperAgent = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const API_BASE_URL = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:3000/api/super-agent`
    : 'http://localhost:3000/api/super-agent';

  const createProject = async (projectData: {
    name: string;
    description: string;
    stack: string[];
    features: string[];
    database?: string;
    auth?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create project');
      }

      toast({
        title: "Project Created",
        description: `${data.project.name} has been created successfully.`,
      });

      return data.project;
    } catch (error) {
      console.error('Create project error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create project',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async (request: {
    projectId: string;
    prompt: string;
    fileType: 'react' | 'node' | 'database' | 'config' | 'test';
    context: {
      features: string[];
      stack: string[];
      database?: string;
      auth?: string;
    };
  }) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate code');
      }

      return data.file;
    } catch (error) {
      console.error('Generate code error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate code',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deployProject = async (request: {
    projectId: string;
    provider: 'lexos-cloud' | 'vercel' | 'netlify' | 'self-host';
    domain?: string;
    environment?: Record<string, string>;
  }) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to deploy project');
      }

      toast({
        title: "Deployment Successful",
        description: `Your project is now live at ${data.deployment.url}`,
      });

      return data.deployment;
    } catch (error) {
      console.error('Deploy project error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to deploy project',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch project');
      }

      return data.project;
    } catch (error) {
      console.error('Get project error:', error);
      throw error;
    }
  };

  const listProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      return data.projects;
    } catch (error) {
      console.error('List projects error:', error);
      throw error;
    }
  };

  return {
    loading,
    createProject,
    generateCode,
    deployProject,
    getProject,
    listProjects,
  };
};