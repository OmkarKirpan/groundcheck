export interface ToolCall {
  id?: string;
  function: { name: string; arguments: Record<string, unknown> | string };
}

export interface AssistantMessage {
  role: 'assistant';
  content: string;
  tool_calls?: ToolCall[];
}

export type Message =
  | { role: 'system' | 'user'; content: string }
  | AssistantMessage
  | { role: 'tool'; tool_name: string; content: string };

export interface ToolDef {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/** Everything that decides the model's reply. Record/replay hashes this whole object. */
export interface ChatRequest {
  model: string;
  messages: Message[];
  tools: ToolDef[];
  options: { temperature: number; num_ctx: number; seed: number };
  think: boolean;
}

export interface ChatResponse {
  message: AssistantMessage;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

export interface ModelClient {
  chat(req: ChatRequest): Promise<ChatResponse>;
}
