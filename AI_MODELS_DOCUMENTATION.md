# AI Models & Routing Documentation

## Overview
The system implements a **3-tier cost-optimized routing strategy** that prioritizes free models first, then falls back to increasingly expensive options only when necessary.

## Tier System

### TIER 1: H100 Self-Hosted (FREE - Your Hardware)
All models run locally on your H100 GPU at **zero cost**.

### TIER 2: Groq Cloud (FREE - API)
Free cloud-hosted open-source models as fallback.

### TIER 3: DeepSeek R1 (PAID - Ultra Cheap)
Only used as last resort at $0.14 input / $0.28 output per 1K tokens.

## Installed Models by Category

### 🧠 Advanced Reasoning Models (Tier 1 - H100)

#### **AM-Thinking-v1 (32B)**
- **Capabilities**: Text, General, Code, Reasoning, Financial Analysis
- **Quality**: 9.8/10
- **Max Tokens**: 32,768
- **Special**: State-of-the-art reasoning, excels at complex financial analysis
- **Use Cases**: Complex problem solving, financial modeling, code architecture

#### **Mistral Magistral Small (24B)**
- **Capabilities**: Text, General, Code, Reasoning, Chat
- **Quality**: 9.5/10
- **Max Tokens**: 32,768
- **Special**: Balanced model for general and technical tasks
- **Use Cases**: General conversation, coding, technical writing

#### **Qwen2.5-Omni (7B)**
- **Capabilities**: Text, General, Chat, Image, Voice
- **Quality**: 9/10
- **Max Tokens**: 32,768
- **Special**: True multimodal capabilities
- **Use Cases**: Multimodal tasks, voice interactions, image analysis

### 💬 Unrestricted Chat Models (Tier 1 - H100)

#### **MythoMax-L2 (13B)**
- **Capabilities**: Text, Chat, NSFW, Roleplay, Creative
- **Quality**: 9/10
- **Max Tokens**: 8,192
- **Special**: Top-tier roleplay and creative writing
- **Use Cases**: Creative storytelling, character roleplay, adult content

#### **Stheno-LLaMA (13B)**
- **Capabilities**: Text, Chat, NSFW, Creative, Storytelling
- **Quality**: 9.2/10
- **Max Tokens**: 8,192
- **Special**: Exceptional storytelling abilities
- **Use Cases**: Long-form narratives, creative writing, adult fiction

#### **OpenHermes 2.5 Mistral (7B)**
- **Capabilities**: Text, Chat, NSFW, Roleplay, General
- **Quality**: 8.8/10
- **Max Tokens**: 8,192
- **Special**: Well-rounded uncensored model
- **Use Cases**: General chat, roleplay, adult conversations

#### **Pygmalion (7B)**
- **Capabilities**: Text, Chat, NSFW, Roleplay
- **Quality**: 8.5/10
- **Max Tokens**: 4,096
- **Special**: Specialized for character conversations
- **Use Cases**: Character AI, roleplay scenarios

### 🎨 Image Generation Models (Tier 1 - H100)

#### **Stable Cascade 2024**
- **Capabilities**: Image, NSFW
- **Quality**: 9.5/10
- **Special**: Latest architecture, photorealistic results
- **Use Cases**: High-quality photorealistic images, adult content

#### **RevAnimated**
- **Capabilities**: Image, NSFW, Anime, Realistic
- **Quality**: 9.3/10
- **Special**: Hybrid anime/realistic style
- **Use Cases**: Versatile style mixing, character art

#### **Anything v5**
- **Capabilities**: Image, NSFW, Anime
- **Quality**: 9.2/10
- **Special**: Premier anime model
- **Use Cases**: Anime art, waifu generation

#### **EimisAnimeDiffusion**
- **Capabilities**: Image, NSFW, Anime
- **Quality**: 9.1/10
- **Special**: Detailed anime style
- **Use Cases**: High-detail anime illustrations

#### **Stable Diffusion 2.1**
- **Capabilities**: Image, NSFW
- **Quality**: 9/10
- **Special**: Classic reliable model
- **Use Cases**: General image generation

#### **Kandinsky 3 NSFW Fork**
- **Capabilities**: Image, NSFW, Multilingual
- **Quality**: 8.8/10
- **Special**: Multilingual prompt support
- **Use Cases**: International users, diverse styles

#### **Stable Diffusion 1.5**
- **Capabilities**: Image, NSFW
- **Quality**: 8.5/10
- **Special**: Widely compatible, many LoRAs available
- **Use Cases**: Base model for fine-tuning

### 🎬 Video Generation Models (Tier 1 - H100)

#### **Open-Sora**
- **Capabilities**: Video
- **Quality**: 8.5/10
- **Max Tokens**: 2,048
- **Special**: Standard video generation
- **Use Cases**: Safe-for-work video content

#### **VideoCrafter2 NSFW**
- **Capabilities**: Video, NSFW
- **Quality**: 8/10
- **Max Tokens**: 2,048
- **Special**: Adult video generation
- **Use Cases**: Adult video content

#### **Open-Sora NSFW**
- **Capabilities**: Video, NSFW
- **Quality**: 7.5/10
- **Max Tokens**: 2,048
- **Special**: NSFW variant of Open-Sora
- **Use Cases**: Adult video generation

#### **Text2Video-Zero NSFW**
- **Capabilities**: Video, NSFW
- **Quality**: 7/10
- **Max Tokens**: 1,024
- **Special**: Zero-shot video generation
- **Use Cases**: Quick adult video prototypes

### 🌐 Groq Models (Tier 2 - Free Cloud)

#### **LLaMA 3.3 70B Versatile**
- **Capabilities**: Text, General, Code, Reasoning
- **Quality**: 8.5/10
- **Max Tokens**: 32,768
- **Special**: Latest LLaMA, very capable
- **Use Cases**: Fallback for general tasks

#### **LLaMA 3.1 8B Instant**
- **Capabilities**: Text, General, Code
- **Quality**: 7/10
- **Max Tokens**: 131,072
- **Special**: Fast responses, huge context
- **Use Cases**: Quick tasks, large documents

#### **Gemma2 9B IT**
- **Capabilities**: Text, General
- **Quality**: 7.5/10
- **Max Tokens**: 8,192
- **Special**: Google's efficient model
- **Use Cases**: General conversation fallback

### 💰 DeepSeek R1 (Tier 3 - Paid Last Resort)

#### **DeepSeek R1**
- **Capabilities**: Text, General, Code, Reasoning, Financial
- **Quality**: 9.5/10
- **Max Tokens**: 131,072
- **Cost**: $0.14 input / $0.28 output per 1K tokens
- **Special**: Extremely capable, huge context window
- **Use Cases**: Only when all free options fail

## Routing Logic

### Task-Based Routing
The system automatically selects the best model based on your task:

1. **Reasoning Tasks**: AM-Thinking-v1 → DeepSeek R1 → Mistral Magistral
2. **Code Tasks**: AM-Thinking-v1 → DeepSeek R1 → LLaMA 3.3 70B
3. **Chat/Roleplay**: Stheno → MythoMax → Pygmalion → OpenHermes
4. **NSFW Content**: MythoMax → Stheno → RevAnimated → Anything v5
5. **Image Generation**: 
   - Anime: Anything v5 → EimisAnimeDiffusion → RevAnimated
   - Realistic: RevAnimated → Stable Cascade → SD 2.1
6. **Video Generation**: Open-Sora → VideoCrafter2 → Text2Video-Zero
7. **Financial Analysis**: AM-Thinking-v1 → DeepSeek R1

### Priority System
1. **Tier 1 (H100)** models are always tried first
2. **Tier 2 (Groq)** models are tried if H100 fails
3. **Tier 3 (DeepSeek)** is only used as last resort
4. Within each tier, task-specific models are prioritized
5. Quality requirements filter out inappropriate models

### Cost Optimization
- **Free models used 99% of the time**
- **DeepSeek R1 only when absolutely necessary**
- **Automatic fallback chain prevents failures**
- **Task-specific routing ensures best results**

## API Endpoints

### Main Chat Endpoint
```
POST /api/ai/chat
{
  "prompt": "Your message",
  "task_type": "general|code|reasoning|chat|image|video|nsfw|roleplay",
  "complexity": "low|medium|high",
  "quality": "basic|standard|premium"
}
```

### H100 Direct Endpoint
```
POST /api/ai/h100
{
  "prompt": "Your message",
  "model": "specific-model-name" (optional)
}
```

## Multimodal Response Support
The chat interface automatically renders:
- **Images**: With fullscreen viewer
- **Videos**: With inline player
- **Charts**: Line, bar, pie charts
- **Diagrams**: Mermaid flowcharts
- **Code**: Syntax-highlighted blocks

## Usage Examples

### Generate Anime Image
**Prompt**: "Generate an anime girl with blue hair in school uniform"
**Routes to**: Anything v5 (Tier 1) → EimisAnimeDiffusion → RevAnimated

### Complex Code Analysis
**Prompt**: "Analyze this codebase and suggest architectural improvements"
**Routes to**: AM-Thinking-v1 32B (Tier 1) → DeepSeek R1 (if needed)

### NSFW Roleplay
**Prompt**: "You are [character description]..."
**Routes to**: Stheno-LLaMA 13B (Tier 1) → MythoMax → Pygmalion

### Financial Modeling
**Prompt**: "Create a DCF model for this company..."
**Routes to**: AM-Thinking-v1 32B (Tier 1) → DeepSeek R1 (if needed)

## Cost Breakdown
- **Tier 1 (H100)**: $0.00 - Your hardware
- **Tier 2 (Groq)**: $0.00 - Free API
- **Tier 3 (DeepSeek)**: $0.14-$0.28 per 1K tokens

**Average cost per request**: < $0.01 (since 99%+ use free models)