# Model Discovery and Selection

OpenRouter provides access to 300+ models. This guide covers how to discover and select the right model for your use case.

## The Models API

**Never hardcode model IDs** - they change frequently. Use the API:

```typescript
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  top_provider?: { is_moderated: boolean };
}

async function fetchModels(): Promise<OpenRouterModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  return data.data;
}
```

## Filtering Models

### By Provider

```typescript
async function findModelsByProvider(provider: string): Promise<OpenRouterModel[]> {
  const models = await fetchModels();
  return models.filter(m => m.id.startsWith(`${provider}/`));
}

// Examples
const anthropicModels = await findModelsByProvider('anthropic');
const openaiModels = await findModelsByProvider('openai');
const googleModels = await findModelsByProvider('google');
const metaModels = await findModelsByProvider('meta-llama');
```

### By Context Length

```typescript
async function findLongContextModels(minContext: number): Promise<OpenRouterModel[]> {
  const models = await fetchModels();
  return models.filter(m => m.context_length >= minContext);
}

// Get models with 100k+ context
const longContextModels = await findLongContextModels(100000);
```

### By Price

```typescript
async function findCheapModels(maxPromptPrice: number): Promise<OpenRouterModel[]> {
  const models = await fetchModels();
  return models.filter(m => {
    const price = parseFloat(m.pricing.prompt);
    return price <= maxPromptPrice;
  });
}

// Get models under $0.0005 per 1k tokens
const cheapModels = await findCheapModels(0.0005);
```

### Combined Filters

```typescript
async function findModels(filter: {
  provider?: string;
  minContext?: number;
  maxPromptPrice?: number;
}): Promise<OpenRouterModel[]> {
  const models = await fetchModels();

  return models.filter((m) => {
    if (filter.provider && !m.id.startsWith(`${filter.provider}/`)) return false;
    if (filter.minContext && m.context_length < filter.minContext) return false;
    if (filter.maxPromptPrice) {
      const price = parseFloat(m.pricing.prompt);
      if (price > filter.maxPromptPrice) return false;
    }
    return true;
  });
}

// Find cheap Claude models with long context
const models = await findModels({
  provider: 'anthropic',
  minContext: 100000,
  maxPromptPrice: 0.01,
});
```

## Using openrouter/auto

For simplicity, use `openrouter/auto` which automatically selects the best model:

```typescript
const agent = createAgent({
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'openrouter/auto',  // Auto-selects best model
});
```

Benefits:
- Automatic fallback if a model is unavailable
- Cost-optimized selection
- No need to track model updates

## Dynamic Model Selection

```typescript
async function createAgentWithBestModel(requirements: {
  provider?: string;
  minContext?: number;
  maxPrice?: number;
}) {
  const models = await findModels({
    provider: requirements.provider,
    minContext: requirements.minContext,
    maxPromptPrice: requirements.maxPrice,
  });

  if (models.length === 0) {
    throw new Error('No models match requirements');
  }

  // Sort by context length (prefer larger)
  models.sort((a, b) => b.context_length - a.context_length);

  return createAgent({
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: models[0].id,
  });
}

// Create agent with best Anthropic model under $0.01
const agent = await createAgentWithBestModel({
  provider: 'anthropic',
  maxPrice: 0.01,
});
```

## Popular Model Providers

| Provider | Prefix | Notable Models |
|----------|--------|----------------|
| Anthropic | `anthropic/` | Claude 3.5 Sonnet, Claude 3 Opus |
| OpenAI | `openai/` | GPT-4o, GPT-4 Turbo |
| Google | `google/` | Gemini Pro, Gemini Ultra |
| Meta | `meta-llama/` | Llama 3.1 405B, Llama 3.1 70B |
| Mistral | `mistralai/` | Mistral Large, Mixtral |
| Cohere | `cohere/` | Command R+ |

## Model Selection Strategy

### For Chat Applications
- Use `openrouter/auto` for general chat
- Use Claude or GPT-4 for complex reasoning
- Use smaller models for simple Q&A

### For Code Generation
- Claude 3.5 Sonnet excels at code
- GPT-4 Turbo for complex codebases
- Codestral for fast code completion

### For Long Documents
- Gemini Pro (1M context)
- Claude 3 (200k context)
- GPT-4 Turbo (128k context)

### For Cost Optimization
- Use `openrouter/auto` with budget constraints
- Smaller models for simple tasks
- Cache responses when possible

## Resources

- [Browse Models](https://openrouter.ai/models)
- [Models API](https://openrouter.ai/api/v1/models)
- [Pricing](https://openrouter.ai/docs/pricing)
