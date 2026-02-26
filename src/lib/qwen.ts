import { createOpenAI } from '@ai-sdk/openai';

// 通义千问客户端 (兼容 OpenAI SDK)
export const qwen = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 可用模型
export const QWEN_MODELS = {
  // 多模态模型 (用于 OCR 图片识别)
  OCR: 'qwen-vl-max-latest',
  // 文本模型 (用于批改、知识点、组卷)
  CORRECTION: 'qwen-max-latest',
  KNOWLEDGE: 'qwen-max-latest',
  GENERATION: 'qwen-max-latest',
} as const;

// 检查 API Key 是否配置
export function isQwenConfigured(): boolean {
  return !!process.env.DASHSCOPE_API_KEY;
}
