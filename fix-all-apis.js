#!/usr/bin/env node

import fs from 'fs';
import path from 'import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename;
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NEXUS API FIXER - NUCLEAR MODE
console.log('🔥 NEXUS API FIXER - GOING NUCLEAR! 💀');

const replacements = [
  // IDEInterface fixes
  { file: 'src/components/IDEInterface.tsx', old: "fetch('http://localhost:3000/api/ide/list'", new: "fetch(`${API_BASE_URL}/ide/list`" },
  { file: 'src/components/IDEInterface.tsx', old: "fetch('http://localhost:3000/api/ide/execute'", new: "fetch(`${API_BASE_URL}/ide/execute`" },
  { file: 'src/components/IDEInterface.tsx', old: "fetch('http://localhost:3000/api/ide/read'", new: "fetch(`${API_BASE_URL}/ide/read`" },
  { file: 'src/components/IDEInterface.tsx', old: "fetch('http://localhost:3000/api/ide/write'", new: "fetch(`${API_BASE_URL}/ide/write`" },
  { file: 'src/components/IDEInterface.tsx', old: "fetch('http://localhost:3000/api/ide/create'", new: "fetch(`${API_BASE_URL}/ide/create`" },
  { file: 'src/components/IDEInterface.tsx', old: "fetch('http://localhost:3000/api/ide/delete'", new: "fetch(`${API_BASE_URL}/ide/delete`" },
  
  // VoiceEnabledChat fixes
  { file: 'src/components/VoiceEnabledChat.tsx', old: "fetch('/api/", new: "fetch(`${API_BASE_URL}/" },
  
  // ShadowAgentChat fixes
  { file: 'src/components/ShadowAgentChat.tsx', old: "fetch('/api/", new: "fetch(`${API_BASE_URL}/" },
  
  // BrowserAgent fixes
  { file: 'src/components/BrowserAgent.tsx', old: "fetch('/api/", new: "fetch(`${API_BASE_URL}/" },
  { file: 'src/components/BrowserAgent.tsx', old: "fetch('http://localhost:3000/api/", new: "fetch(`${API_BASE_URL}/" },
  
  // MultimodalUpload fixes
  { file: 'src/components/MultimodalUpload.tsx', old: "fetch('/api/", new: "fetch(`${API_BASE_URL}/" },
  
  // EnhancedVoiceInterface fixes
  { file: 'src/components/EnhancedVoiceInterface.tsx', old: "fetch('/api/", new: "fetch(`${API_BASE_URL}/" },
  
  // ChatInterface fixes
  { file: 'src/components/ChatInterface.tsx', old: "fetch('/api/", new: "fetch(`${API_BASE_URL}/" },
  
  // H100TestComponent fixes
  { file: 'src/components/H100TestComponent.tsx', old: "fetch('/api/", new: "fetch(`${API_BASE_URL}/" },
  { file: 'src/components/H100TestComponent.tsx', old: "fetch('http://localhost:5000/", new: "fetch('http://localhost:5000/" }, // Keep H100 direct calls
];

const addImports = [
  'src/components/IDEInterface.tsx',
  'src/components/VoiceEnabledChat.tsx', 
  'src/components/ShadowAgentChat.tsx',
  'src/components/BrowserAgent.tsx',
  'src/components/MultimodalUpload.tsx',
  'src/components/EnhancedVoiceInterface.tsx',
  'src/components/ChatInterface.tsx',
  'src/components/H100TestComponent.tsx'
];

// Add API imports to files that need them
addImports.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if import already exists
    if (!content.includes('API_BASE_URL') && !content.includes('API_ENDPOINTS')) {
      // Find the last import line
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && !lines[i].includes('from \'react\'')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, "import { API_BASE_URL } from '@/config/api';");
        content = lines.join('\n');
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Added API import to ${filePath}`);
      }
    }
  }
});

// Apply all replacements
replacements.forEach(({ file, old, new: newStr }) => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(old)) {
      content = content.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newStr);
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed ${file}: ${old} -> ${newStr}`);
    }
  }
});

console.log('🚀 NEXUS API FIXER COMPLETE! ALL APIS SHOULD BE FIXED!');