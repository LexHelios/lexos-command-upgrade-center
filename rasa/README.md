# Rasa Integration for Lexos

This directory contains the Rasa conversational AI framework integration for Lexos, providing advanced natural language understanding and dialogue management with the CALM (Conversational AI with Language Models) approach.

## Overview

Rasa is integrated into Lexos to provide:
- 🎯 Intent recognition and entity extraction
- 💬 Context-aware conversations with memory
- 🔄 Handling of corrections, interruptions, and digressions
- 🎤 Voice-first accessibility features
- 🏠 Self-hosted on H100 infrastructure for data sovereignty

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ VoiceEnabledChat│────▶│  Rasa REST API   │────▶│   Rasa Core     │
│   (Frontend)    │     │ (/api/rasa/*)    │     │  (Port 5005)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Custom Actions  │◀────│ Rasa Action SDK │
                        │ (actions.py)     │     │  (Port 5055)    │
                        └──────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Lexos Backend   │
                        │ (Orchestrator,   │
                        │  Browser, etc.)  │
                        └──────────────────┘
```

## Quick Start

1. **Start Rasa services:**
   ```bash
   ./start-rasa.sh
   ```

2. **Train the model (if needed):**
   ```bash
   docker-compose run --rm rasa train
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## File Structure

```
rasa/
├── config.yml          # Rasa configuration with CALM policies
├── domain.yml          # Intents, entities, actions, and responses
├── credentials.yml     # Channel configurations
├── endpoints.yml       # Service endpoints
├── docker-compose.yml  # Docker services configuration
├── Dockerfile.actions  # Custom actions container
├── data/
│   ├── nlu.yml        # Training examples for NLU
│   ├── stories.yml    # Conversation flows
│   └── rules.yml      # Business rules
├── actions/
│   └── actions.py     # Custom action implementations
└── models/            # Trained models (auto-generated)
```

## Key Features

### 1. Voice Control Intents
- `start_conversation_mode` - Activate continuous listening
- `stop_conversation_mode` - Deactivate continuous listening
- `enable_auto_speak` - Turn on TTS for responses
- `change_voice` - Switch TTS voice

### 2. Task Management
- `create_task` - Create new tasks with natural language
- `list_tasks` - Show current tasks
- `complete_task` - Mark tasks as done

### 3. Browser Control
- `browse_website` - Navigate to websites
- `take_screenshot` - Capture screen
- `click_element` - Interact with page elements

### 4. AI Capabilities
- `ask_question` - General knowledge queries
- `generate_code` - Code generation
- `generate_image` - Image creation
- `analyze_document` - Document analysis

### 5. Accessibility Features
- Continuous conversation mode for hands-free operation
- Auto-speak for vision-impaired users
- Voice selection and speed control
- Natural conversation handling with CALM

## Custom Actions

Actions connect Rasa to Lexos backend services:

```python
class ActionCreateTask(Action):
    def run(self, dispatcher, tracker, domain):
        task_name = tracker.get_slot("task_name")
        # Call Lexos orchestrator API
        response = requests.post(
            "http://localhost:3000/api/orchestrator/tasks",
            json={"name": task_name}
        )
        dispatcher.utter_message(text=f"✅ Task '{task_name}' created!")
```

## CALM Approach

The Conversational AI with Language Models (CALM) approach enables:
- Natural handling of topic changes
- Recovery from misunderstandings
- Context-aware responses
- Seamless integration with LLMs

Configuration in `config.yml`:
```yaml
policies:
  - name: TEDPolicy
    max_history: 10
  - name: UnexpecTEDIntentPolicy
    max_history: 10
  - name: RulePolicy
    core_fallback_threshold: 0.3
```

## Frontend Integration

The VoiceEnabledChat component integrates Rasa:

```typescript
const { sendMessage, checkHealth } = useRasaChat();

// Send message to Rasa
const rasaMessages = await sendMessage(userInput);

// Fall back to AI API if needed
if (!rasaMessages) {
  const response = await sendAIMessage(userInput);
}
```

## Development

### Adding New Intents

1. Add intent to `domain.yml`:
   ```yaml
   intents:
     - new_intent_name
   ```

2. Add training examples to `data/nlu.yml`:
   ```yaml
   - intent: new_intent_name
     examples: |
       - example phrase
       - another example
   ```

3. Create story in `data/stories.yml`:
   ```yaml
   - story: new intent flow
     steps:
     - intent: new_intent_name
     - action: action_new_intent
   ```

4. Implement action in `actions/actions.py`

5. Retrain the model:
   ```bash
   docker-compose run --rm rasa train
   ```

### Testing

Interactive testing:
```bash
docker-compose run --rm rasa shell
```

Test specific intents:
```bash
docker-compose run --rm rasa test
```

## Troubleshooting

### Services not starting
- Check Docker is running: `docker info`
- Check ports are free: `lsof -i :5005,5055,8000`
- View logs: `docker-compose logs`

### Model training issues
- Clear models directory: `rm -rf models/*`
- Retrain: `docker-compose run --rm rasa train`

### Action server errors
- Check action server logs: `docker-compose logs rasa-actions`
- Verify endpoints.yml configuration
- Ensure Lexos backend is running on port 3000

## Production Deployment

For production on H100 infrastructure:

1. Update `docker-compose.yml` for production settings
2. Configure persistent volume for models
3. Set up Redis for conversation tracking
4. Enable SSL/TLS for secure communication
5. Configure monitoring and logging

## Resources

- [Rasa Documentation](https://rasa.com/docs/rasa/)
- [CALM Approach](https://rasa.com/blog/introducing-calm/)
- [Custom Actions](https://rasa.com/docs/rasa/custom-actions)
- [Voice Channels](https://rasa.com/docs/rasa/voice-channels)