import { NextRequest, NextResponse } from 'next/server';

// Функция для работы с LM Studio API с таймаутом
async function askLMStudioWithTimeout(messages: any[], temperature: number = 0.2, maxTokens: number = 2048, timeoutMs: number = 30000) {
  try {
    // Создаем AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch('https://myai-api.loca.lt/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "local-model",
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: false,
        stop: ["</s>", "Human:", "Assistant:", "User:", "Bot:"]
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`LM Studio HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('Ошибка LM Studio API:', error);
    if (error.name === 'AbortError') {
      return '__LMSTUDIO_TIMEOUT__';
    }
    return '__LMSTUDIO_CONNECTION_ERROR__';
  }
}

// Fallback на OpenAI API
async function askOpenAI(messages: any[], temperature: number = 0.2, maxTokens: number = 2048) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || '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'}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('Ошибка OpenAI API:', error);
    return '__OPENAI_ERROR__';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, language } = await req.json();
    if (!text || !language) {
      return NextResponse.json({ error: 'Missing text or language' }, { status: 400 });
    }

    // Ограничиваем размер текста для перевода
    const maxTextLength = 10000;
    if (text.length > maxTextLength) {
      return NextResponse.json({ 
        error: `Text too long. Maximum ${maxTextLength} characters allowed.` 
      }, { status: 400 });
    }

    const userPrompt = `Переведи следующий текст на ${language}, максимально сохраняя смысл, стиль, структуру и контекст оригинала. Используй естественные выражения, идиомы и грамматические конструкции, характерные для языка перевода. Если в языке есть особенности передачи формального/неформального стиля, культурные нюансы или устойчивые выражения — обязательно учитывай их. Не добавляй пояснений, форматирования, комментариев, приветствий, markdown и кавычек. В ответе должен быть только чистый перевод:\n\n${text}`;
    
    const messages = [
      { role: 'system', content: 'Ты профессиональный переводчик. Всегда отвечай только переводом, без пояснений, без форматирования, без комментариев, без приветствий, без markdown, без кавычек, только чистый перевод.' },
      { role: 'user', content: userPrompt }
    ];

    let translated = '';
    let lastError = null;

    // Попытка 1: LM Studio с таймаутом
    console.log('[translate-book] Попытка 1: LM Studio');
    translated = await askLMStudioWithTimeout(messages, 0.2, 2048, 30000);
    
    if (translated && !translated.startsWith('__')) {
      return NextResponse.json({ translation: translated });
    }

    // Попытка 2: LM Studio с увеличенным таймаутом
    if (translated === '__LMSTUDIO_TIMEOUT__') {
      console.log('[translate-book] Попытка 2: LM Studio с увеличенным таймаутом');
      await new Promise(resolve => setTimeout(resolve, 2000)); // пауза 2 секунды
      translated = await askLMStudioWithTimeout(messages, 0.2, 2048, 60000);
      
      if (translated && !translated.startsWith('__')) {
        return NextResponse.json({ translation: translated });
      }
    }

    // Попытка 3: OpenAI как fallback
    console.log('[translate-book] Попытка 3: OpenAI fallback');
    translated = await askOpenAI(messages, 0.2, 2048);
    
    if (translated && !translated.startsWith('__')) {
      return NextResponse.json({ translation: translated });
    }

    // Если все попытки неудачны
    const errorMessage = translated.startsWith('__') ? translated : 'Unknown error';
    console.error('[translate-book] Все попытки неудачны:', errorMessage);
    
    return NextResponse.json({ 
      error: `Translation failed. Please try again later. Error: ${errorMessage}` 
    }, { status: 503 });

  } catch (err) {
    console.error('[translate-book] Критическая ошибка:', err);
    return NextResponse.json({ 
      error: 'Internal server error. Please try again later.' 
    }, { status: 500 });
  }
} 