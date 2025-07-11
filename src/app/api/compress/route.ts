import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const LMSTUDIO_API_URL = 'https://myai-api.loca.lt/v1/chat/completions';

const MODEL_MAP: { [key: string]: string } = {
  'neironka': 'local-model',
  'cypher': 'openrouter/cypher-alpha:free',
  'deepseek': 'deepseek/deepseek-r1-0528:free',
  'qwen3': 'qwen/qwen3-30b-a3b:free',
};

const PROMPTS = {
  ru: 'Сократи этот текст до самого важного:',
  en: 'Summarize this text to the most important:',
};

export async function POST(request: NextRequest) {
  try {
    const { text, language = 'ru', apiKey, modelId = 'neironka' } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    const prompt = `${PROMPTS[language as keyof typeof PROMPTS] || PROMPTS.ru}\n\n${text}`;
    let result = '';
    if (modelId === 'neironka') {
      // LM Studio
      try {
        const response = await fetch(LMSTUDIO_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'local-model',
            messages: [
              { role: 'system', content: PROMPTS[language as keyof typeof PROMPTS] || PROMPTS.ru },
              { role: 'user', content: text },
            ],
            temperature: 0.7,
            max_tokens: 1000,
            stream: false,
          }),
        });
        if (!response.ok) {
          throw new Error('LM Studio connection error');
        }
        const data = await response.json();
        result = data.choices?.[0]?.message?.content || '';
      } catch (err) {
        return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
      }
    } else {
      // OpenAI/OpenRouter
      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
      });
      const completion = await openai.chat.completions.create({
        model: MODEL_MAP[modelId] || 'local-model',
        messages: [
          { role: 'system', content: PROMPTS[language as keyof typeof PROMPTS] || PROMPTS.ru },
          { role: 'user', content: text },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
      result = completion.choices?.[0]?.message?.content || '';
    }
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при сжатии текста' }, { status: 500 });
  }
} 