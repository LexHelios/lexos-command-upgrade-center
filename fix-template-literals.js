#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔥 NEXUS TEMPLATE LITERAL FIXER - NUCLEAR MODE! 💀');

// Find all TypeScript/TSX files
function findFiles(dir, extensions = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      if (extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Fix broken template literals
function fixTemplateStrings(content) {
  let fixed = content;
  let changes = 0;
  
  // Fix common patterns where my script broke template literals
  const patterns = [
    // Fix: `${API_BASE_URL}/path', { -> `${API_BASE_URL}/path`, {
    { 
      regex: /`\$\{API_BASE_URL\}\/[^']*',\s*\{/g,
      fix: (match) => match.replace("',", "`,")
    },
    // Fix: `${API_ENDPOINTS.something}', { -> `${API_ENDPOINTS.something}`, {
    { 
      regex: /`\$\{API_ENDPOINTS\.[^']*\}',\s*\{/g,
      fix: (match) => match.replace("',", "`,")
    },
    // Fix any remaining broken template literals
    { 
      regex: /`[^`]*',\s*\{/g,
      fix: (match) => match.replace("',", "`,")
    }
  ];
  
  patterns.forEach(({ regex, fix }) => {
    const matches = fixed.match(regex);
    if (matches) {
      matches.forEach(match => {
        const fixedMatch = fix(match);
        if (fixedMatch !== match) {
          fixed = fixed.replace(match, fixedMatch);
          changes++;
        }
      });
    }
  });
  
  return { content: fixed, changes };
}

// Process all files
const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

let totalChanges = 0;

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: fixedContent, changes } = fixTemplateStrings(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ Fixed ${changes} template literals in ${path.relative(__dirname, filePath)}`);
      totalChanges += changes;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`🚀 NEXUS TEMPLATE LITERAL FIXER COMPLETE! Fixed ${totalChanges} issues!`);