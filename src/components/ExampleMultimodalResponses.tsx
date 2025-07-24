// Example multimodal responses that the AI can generate

export const exampleResponses = {
  diagram: `Here's a flowchart showing the 3-tier AI system architecture:

\`\`\`mermaid
graph TB
    A[User Request] --> B{Tier 1: H100 Models}
    B -->|Success| C[Response]
    B -->|Failure| D{Tier 2: Groq Models}
    D -->|Success| C
    D -->|Failure| E{Tier 3: DeepSeek R1}
    E -->|Success| C
    E -->|Failure| F[Error Response]
    
    B --> B1[AM-Thinking-v1 32B]
    B --> B2[Mistral Magistral 24B]
    B --> B3[Qwen2.5-Omni 7B]
    B --> B4[Stable Diffusion]
    B --> B5[Open-Sora]
    
    D --> D1[Llama 3.3 70B]
    D --> D2[Llama 3.1 8B]
    D --> D3[Gemma2 9B]
    
    E --> E1[DeepSeek R1]
    
    style B fill:#10b981,stroke:#059669
    style D fill:#3b82f6,stroke:#2563eb
    style E fill:#f59e0b,stroke:#d97706
\`\`\`

Each tier provides redundancy and cost optimization.`,

  chart: `Here's your financial analysis with a chart:

\`\`\`chart
{
  "type": "line",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "datasets": [{
      "label": "Revenue",
      "data": [30000, 35000, 32000, 40000, 45000, 50000],
      "borderColor": "rgb(99, 102, 241)",
      "backgroundColor": "rgba(99, 102, 241, 0.2)"
    }, {
      "label": "Expenses",
      "data": [25000, 28000, 26000, 30000, 32000, 35000],
      "borderColor": "rgb(239, 68, 68)",
      "backgroundColor": "rgba(239, 68, 68, 0.2)"
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "title": {
        "display": true,
        "text": "Financial Overview Q1-Q2 2024"
      }
    }
  }
}
\`\`\`

The analysis shows positive growth with increasing profit margins.`,

  imageGeneration: `I've generated an image based on your request:

![AI Generated Landscape](https://example.com/generated-image.jpg)

The image was created using Stable Diffusion 2.1 with the following parameters:
- Steps: 50
- Guidance Scale: 7.5
- Resolution: 1024x1024

Would you like me to generate variations or adjust the style?`,

  videoGeneration: `Your video has been generated successfully:

[Video: Futuristic City Animation](https://example.com/generated-video.mp4)

Created with Open-Sora:
- Duration: 5 seconds
- Resolution: 720p
- FPS: 15

The video shows a dynamic cityscape with moving elements and lighting effects.`,

  complexTree: `Here's the organizational structure you requested:

\`\`\`mermaid
graph TD
    CEO[CEO] --> CTO[CTO]
    CEO --> CFO[CFO]
    CEO --> COO[COO]
    
    CTO --> |manages| ENG[Engineering]
    CTO --> |oversees| PROD[Product]
    
    CFO --> |controls| FIN[Finance]
    CFO --> |audits| ACC[Accounting]
    
    COO --> |runs| OPS[Operations]
    COO --> |handles| HR[Human Resources]
    
    ENG --> BE[Backend Team]
    ENG --> FE[Frontend Team]
    ENG --> ML[ML Team]
    
    PROD --> PM[Product Managers]
    PROD --> UX[UX Designers]
    
    style CEO fill:#e11d48,stroke:#be123c,color:#fff
    style CTO fill:#2563eb,stroke:#1d4ed8,color:#fff
    style CFO fill:#16a34a,stroke:#15803d,color:#fff
    style COO fill:#d97706,stroke:#b45309,color:#fff
\`\`\`

This structure shows clear reporting lines and departmental organization.`,

  pieChart: `Market share analysis:

\`\`\`chart
{
  "type": "pie",
  "data": {
    "labels": ["OpenAI", "Anthropic", "Google", "Meta", "Others"],
    "datasets": [{
      "label": "Market Share %",
      "data": [35, 25, 20, 15, 5],
      "backgroundColor": [
        "rgba(239, 68, 68, 0.8)",
        "rgba(34, 197, 94, 0.8)",
        "rgba(59, 130, 246, 0.8)",
        "rgba(168, 85, 247, 0.8)",
        "rgba(251, 146, 60, 0.8)"
      ],
      "borderColor": [
        "rgb(239, 68, 68)",
        "rgb(34, 197, 94)",
        "rgb(59, 130, 246)",
        "rgb(168, 85, 247)",
        "rgb(251, 146, 60)"
      ],
      "borderWidth": 2
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "legend": {
        "position": "right"
      },
      "title": {
        "display": true,
        "text": "AI Market Share 2024"
      }
    }
  }
}
\`\`\`

OpenAI maintains the lead, but competition is intensifying.`
};