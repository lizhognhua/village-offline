// AI 模型注册表 — 支持的模型提供商及其配置

export interface AiModelProvider {
  name: string;
  baseUrl: string;
  models: { id: string; label: string }[];
  defaultModel: string;
}

export const AI_PROVIDERS: Record<string, AiModelProvider> = {
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", label: "DeepSeek V3" },
      { id: "deepseek-reasoner", label: "DeepSeek R1" },
    ],
    defaultModel: "deepseek-chat",
  },
  qwen: {
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { id: "qwen-turbo", label: "Qwen Turbo（速度快）" },
      { id: "qwen-plus", label: "Qwen Plus（性价比）" },
      { id: "qwen-max", label: "Qwen Max（最强）" },
    ],
    defaultModel: "qwen-plus",
  },
};

export function getProvider(id: string): AiModelProvider | undefined {
  return AI_PROVIDERS[id];
}

// 构造 OpenAI 兼容的消息请求体
export function buildChatRequest(
  providerId: string,
  model: string,
  systemPrompt: string,
  userMessage: string
) {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`未知的模型提供商: ${providerId}`);

  return {
    url: `${provider.baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      Authorization: "", // 由调用方填入 API Key
    },
    body: {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    },
  };
}
