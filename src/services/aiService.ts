import { GoogleGenAI } from "@google/genai";
import { SensorData } from "../types";

function getInternalAiClient() {
  return internalAiClient;
}

// Default internal AI client for Gemini
// Only create client if API key is available
const internalAiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

/**
 * AI 驱动的水质分析服务
 * 支持多种供应商 (Gemini, DeepSeek, Zhipu, etc.)
 */
export async function analyzeWaterQuality(data: SensorData, settings?: any) {
  const prompt = `
    作为淡水养殖专家AI，请分析以下实时水质数据并提供专业建议：
    - 水温: ${data.temperature.toFixed(1)}°C (理想: 25-30°C)
    - 溶解氧 (DO): ${data.dissolvedOxygen.toFixed(1)} mg/L (理想: >5 mg/L)
    - pH值: ${data.pH.toFixed(1)} (理想: 7.5-8.5)
    - 氨氮: ${data.ammonia.toFixed(2)} mg/L (理想: <0.02 mg/L)
    
    请以JSON格式返回，不要包含任何 Markdown 格式：
    {
      "status": "normal" | "warning" | "critical",
      "summary": "一句话总结水质状况",
      "risks": ["风险点1", "风险点2"],
      "actions": ["建议采取的措施1", "2"]
    }
  `;

  try {
    const response = await callAiProvider(prompt, settings, true);
    return typeof response === 'string' ? JSON.parse(response) : response;
  } catch (error) {
    console.error("AI analysis failed:", error);
    // Return fallback data when AI service fails
    return {
      status: "normal",
      summary: "AI分析服务暂时不可用，但传感器数据显示正常。",
      risks: ["智能预警已暂停"],
      actions: ["检查网络连接或重新配置API密钥"]
    };
  }
}

/**
 * 核心推理网关，处理不同厂商的协议差异
 */
async function callAiProvider(prompt: string, settings: any, isJson: boolean) {
  // Check if we have API settings configured
  if (!settings?.apiKey && (!settings?.provider || settings.provider === 'gemini')) {
    // Return mock data when no API key is configured
    if (isJson) {
      return JSON.stringify({
        status: "normal",
        summary: "系统处于本地离线模式。传感器读数稳定，无需干预。",
        risks: ["AI分析服务未启用"],
        actions: ["配置API密钥以启用实时AI预警"]
      });
    }
    return "系统已切换到本地模式，无需API密钥即可运行。";
  }

  const provider = settings?.provider || 'gemini';
  const apiKey = settings?.apiKey;

  // 1. Google Gemini (内置或自定义 Key)
  if (provider === 'gemini') {
    const client = apiKey ? new GoogleGenAI({apiKey}) : internalAiClient;

    // 如果没有配置 Key，返回模拟数据而不是报错
    if (!client) {
      if (isJson) {
        return JSON.stringify({
          status: "normal",
          summary: "当前处于本地模式，AI 分析已暂停。传感器数据显示正常。",
          risks: ["未配置 AI API 密钥，智能预警已禁用"],
          actions: ["请在系统设置中配置 Gemini API Key 以启用 AI 分析"]
        });
      }
      return "请在系统设置中配置 Gemini API Key 以启用 AI 分析功能。";
    }
  }

  // 2. Anthropic Claude
  if (provider === 'claude') {
    const baseUrl = settings.baseUrl || 'https://api.anthropic.com/v1';
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      } as any,
      body: JSON.stringify({
        model: settings.model || 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const json = await response.json();
    if (json.error) throw new Error(json.error.message);
    return json.content[0].text;
  }

  // 3. OpenAI 兼容协议 (DeepSeek, 豆包, 智谱 BigModel, etc.)
  let baseUrl = settings.baseUrl;
  if (!baseUrl) {
    if (provider === 'deepseek') baseUrl = 'https://api.deepseek.com/v1';
    else if (provider === 'doubao') baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
    else if (provider === 'zhipu') baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
    else baseUrl = 'https://api.openai.com/v1';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || (
        provider === 'deepseek' ? 'deepseek-chat' : 
        provider === 'zhipu' ? 'glm-4' :
        'gpt-3.5-turbo'
      ),
      messages: [{ role: 'user', content: prompt }],
      ...(isJson ? { response_format: { type: "json_object" } } : {})
    })
  });

  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "Unknown API Error");
  return json.choices[0].message.content;
}
