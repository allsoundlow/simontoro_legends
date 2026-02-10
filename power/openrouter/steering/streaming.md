# Items-Based Streaming

OpenRouter SDK uses an items-based streaming model - a key paradigm where items are emitted multiple times with the same ID but progressively updated content.

## Core Concept

**Replace items by ID, don't accumulate chunks.**

Each iteration of `getItemsStream()` yields a complete item with updated content:

```typescript
// Iteration 1: Partial message
{ id: "msg_123", type: "message", content: [{ type: "output_text", text: "Hello" }] }

// Iteration 2: Updated message (replace, don't append)
{ id: "msg_123", type: "message", content: [{ type: "output_text", text: "Hello world" }] }
```

## Traditional vs Items-Based

### Traditional (accumulation required)

```typescript
let text = '';
for await (const chunk of result.getTextStream()) {
  text += chunk;  // Manual accumulation
  updateUI(text);
}
```

### Items-Based (complete replacement)

```typescript
const items = new Map<string, StreamableOutputItem>();
for await (const item of result.getItemsStream()) {
  items.set(item.id, item);  // Replace by ID
  updateUI(items);
}
```

## Benefits of Items-Based Streaming

1. **No manual chunk management** - each item is complete
2. **Handles concurrent outputs** - function calls and messages can stream in parallel
3. **Full TypeScript inference** for all item types
4. **Natural Map-based state** works perfectly with React/UI frameworks

## Item Types

### Message Items

```typescript
{
  id: "msg_123",
  type: "message",
  status: "in_progress" | "completed",
  content: [
    { type: "output_text", text: "Hello world" }
  ]
}
```

### Function Call Items

Arguments stream progressively:

```typescript
// Partial
{ id: "call_456", type: "function_call", name: "get_weather", arguments: "{\"q" }

// Complete
{ 
  id: "call_456", 
  type: "function_call", 
  name: "get_weather", 
  arguments: "{\"query\": \"Paris\"}", 
  status: "completed" 
}
```

### Function Call Output Items

```typescript
{
  id: "output_789",
  type: "function_call_output",
  callId: "call_456",
  output: "{ \"temperature\": 72 }"
}
```

### Reasoning Items (Extended Thinking)

```typescript
{
  id: "reasoning_abc",
  type: "reasoning",
  content: [
    { type: "reasoning_text", text: "Let me think about this..." }
  ]
}
```

## Implementation Pattern

### Basic Streaming

```typescript
const result = client.callModel({
  model: 'openrouter/auto',
  input: [{ role: 'user', content: 'Hello!' }],
});

for await (const item of result.getItemsStream()) {
  switch (item.type) {
    case 'message':
      const text = item.content?.find(c => c.type === 'output_text')?.text;
      console.log('Message:', text);
      break;
    case 'function_call':
      if (item.status === 'completed') {
        console.log('Tool call:', item.name, item.arguments);
      }
      break;
    case 'reasoning':
      const reasoning = item.content?.find(c => c.type === 'reasoning_text')?.text;
      console.log('Thinking:', reasoning);
      break;
  }
}
```

### React State Management

```tsx
const [items, setItems] = useState<Map<string, StreamableOutputItem>>(new Map());

useEffect(() => {
  const onItemUpdate = (item: StreamableOutputItem) => {
    setItems(prev => new Map(prev).set(item.id, item));
  };
  
  agent.on('item:update', onItemUpdate);
  return () => agent.off('item:update', onItemUpdate);
}, []);

// Render items
return (
  <div>
    {Array.from(items.values()).map(item => (
      <ItemRenderer key={item.id} item={item} />
    ))}
  </div>
);
```

### Extracting Final Text

```typescript
let fullText = '';

for await (const item of result.getItemsStream()) {
  if (item.type === 'message') {
    const textContent = item.content?.find(c => c.type === 'output_text');
    if (textContent && 'text' in textContent) {
      fullText = textContent.text;  // Replace, not append
    }
  }
}

// Or use getText() for final result
const finalText = await result.getText();
```

## Handling Concurrent Streams

Items can arrive interleaved (e.g., tool call while message is streaming):

```typescript
const items = new Map<string, StreamableOutputItem>();

for await (const item of result.getItemsStream()) {
  items.set(item.id, item);
  
  // Items are naturally grouped by ID
  // UI can render each item type appropriately
}
```

## Status Tracking

Items have a `status` field:

- `in_progress` - Still streaming
- `completed` - Finished

```typescript
for await (const item of result.getItemsStream()) {
  if (item.type === 'function_call' && item.status === 'completed') {
    // Safe to parse arguments now
    const args = JSON.parse(item.arguments || '{}');
    console.log('Tool ready:', item.name, args);
  }
}
```

## Best Practices

1. **Always use Map for state** - Natural fit for ID-based replacement
2. **Check status before parsing** - Wait for `completed` status on function calls
3. **Handle all item types** - Even if you only care about messages
4. **Use TypeScript** - Full type inference for item properties
5. **Clean up on new request** - Clear items Map when starting new conversation turn
