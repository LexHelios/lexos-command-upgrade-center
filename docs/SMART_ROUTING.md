# Smart AI Routing System

## Overview

The Smart AI Routing System intelligently analyzes incoming requests and routes them to the most appropriate AI model. This ensures optimal performance, cost efficiency, and response quality.

## How It Works

### Request Flow

```
User Input → Rasa (Intent Recognition) → Smart Router → Model Selection → Response
                     ↓                         ↓
                (fallback)              (Gemma 2 analyzes)
                     ↓                         ↓
                Smart Router ←────────── Route to best model
```

### Routing Process

1. **Rasa First**: Simple conversational commands go to Rasa for fast, intent-based responses
2. **Smart Analysis**: Complex requests are analyzed by Gemma 2 27B to determine:
   - Task type (code, reasoning, creative, etc.)
   - Complexity level
   - Context requirements
   - Optimal model selection

3. **Model Selection**: Based on analysis, routes to:
   - **Command R+**: Complex reasoning, long context (131K tokens)
   - **Gemma 2 27B**: Efficient general tasks
   - **AM Thinking**: Step-by-step reasoning
   - **Specialized models**: For specific tasks (image, video, NSFW, etc.)

## API Endpoints

### `/api/smart-router/route`
Main routing endpoint that analyzes and executes requests.

```typescript
POST /api/smart-router/route
{
  "prompt": "Build a web scraper in Python",
  "preferred_model": "command-r-plus" // optional
}

Response:
{
  "result": "Here's a Python web scraper...",
  "model_used": {
    "model": "command-r-plus",
    "provider": "h100",
    "tokens": 1523
  },
  "routing_info": {
    "analysis_time_ms": 245,
    "routing_time_ms": 1890,
    "decision": {
      "task_type": "code",
      "complexity": "high",
      "recommended_model": "command-r-plus",
      "confidence": 0.95
    }
  }
}
```

### `/api/smart-router/analyze`
Analyzes a request without executing it.

```typescript
POST /api/smart-router/analyze
{
  "prompt": "What is quantum computing?"
}

Response:
{
  "analysis": {
    "task_type": "reasoning",
    "complexity": "high",
    "requires_context": false,
    "requires_creativity": false,
    "requires_accuracy": true,
    "is_conversational": false,
    "estimated_tokens": 2000,
    "recommended_model": "am-thinking-v1-32b",
    "confidence": 0.92
  }
}
```

### `/api/smart-router/conversation`
Routes multi-turn conversations with context awareness.

```typescript
POST /api/smart-router/conversation
{
  "messages": [
    {"role": "user", "content": "Explain recursion"},
    {"role": "assistant", "content": "Recursion is..."},
    {"role": "user", "content": "Show me an example in Python"}
  ]
}
```

## Frontend Integration

### React Hook Usage

```typescript
import { useSmartRouter } from '@/hooks/use-smart-router';

function MyComponent() {
  const { sendMessage, routingInfo, loading } = useSmartRouter();
  
  const handleSubmit = async (prompt: string) => {
    const response = await sendMessage(prompt, {
      show_routing: true // Shows routing toast
    });
    
    console.log('Model used:', response.routing_info?.decision.recommended_model);
  };
}
```

## Task Type Routing

| Task Type | Primary Models | Characteristics |
|-----------|---------------|-----------------|
| **reasoning** | Command R+, AM Thinking, Gemma 2 | Complex logic, analysis |
| **code** | Command R+, Gemma 2, AM Thinking | Programming, debugging |
| **chat** | Gemma 2, Qwen 2.5, Mistral | Conversational, quick |
| **creative** | Command R+, Stheno, Mythomax | Stories, fiction |
| **financial** | Command R+, AM Thinking | Market analysis, calculations |
| **image** | Stable Diffusion variants | Visual generation |
| **video** | Open-Sora variants | Video generation |
| **voice** | Qwen 2.5 Omni | Voice interactions |

## Routing Decision Factors

1. **Task Complexity**
   - Low: Simple queries, basic chat → Lighter models
   - Medium: Standard tasks → Balanced models
   - High: Complex reasoning → Premium models

2. **Context Requirements**
   - Long documents → Command R+ (131K context)
   - Short queries → Any model

3. **Accuracy Needs**
   - Financial/Medical → High-accuracy models
   - Creative/Chat → More flexible models

4. **Response Time**
   - Real-time chat → Fast models (Gemma 2)
   - Deep analysis → Slower, accurate models

## Benefits

1. **Optimal Performance**: Each request uses the best-suited model
2. **Cost Efficiency**: Lighter models for simple tasks
3. **Quality Assurance**: Complex tasks get premium models
4. **Transparency**: Shows routing decisions and confidence
5. **Flexibility**: Can override with preferred models

## Configuration

The router uses Gemma 2 27B for analyzing requests. This provides:
- Fast analysis (typically <300ms)
- Accurate task classification
- Intelligent model recommendations

## Fallback Behavior

If smart routing fails:
1. First fallback: Direct to general AI endpoint
2. Second fallback: Keyword-based routing
3. Final fallback: Default to Command R+

## Monitoring

The system logs:
- Routing decisions
- Model performance
- Response times
- Confidence scores

This helps optimize routing rules and model selection over time.