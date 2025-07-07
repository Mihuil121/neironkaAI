import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Используем API ключ из запроса или дефолтный
const getOpenAI = (apiKey?: string) => new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey || "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",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Fox AI Chat",
  },
});

// Система защиты от злоупотреблений
const userRequestLimits = new Map<string, { count: number, lastReset: number, lastRequest: number }>();

function checkUserLimit(userId: string): boolean {
  const now = Date.now();
  const userData = userRequestLimits.get(userId);
  
  // Сброс лимитов каждый час
  if (!userData || now - userData.lastReset > 3600000) {
    userRequestLimits.set(userId, { count: 1, lastReset: now, lastRequest: now });
    return true;
  }
  
  // Защита от слишком частых запросов (минимум 2 секунды между запросами)
  if (now - userData.lastRequest < 2000) {
    return false;
  }
  
  // Максимум 50 запросов в час на пользователя
  if (userData.count >= 50) {
    return false;
  }
  
  userData.count++;
  userData.lastRequest = now;
  return true;
}

const LMSTUDIO_API_URL = 'https://myai-api.loca.lt/v1/chat/completions';
// Функция для работы с LM Studio API
async function askLMStudio(messages: any[], temperature: number = 0.7, maxTokens: number = 1000) {
  try {
    // Ограничиваем историю сообщений для LM Studio (максимум 4 сообщения)
    const limitedMessages = messages.slice(-4);
    
    // Создаем AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 секунд таймаут
    
    const response = await fetch(LMSTUDIO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "local-model",
        messages: limitedMessages,
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
      return 'Превышено время ожидания ответа от модели. Попробуйте еще раз.';
    }
    return `Ошибка при обращении к модели. Проверьте, что LM Studio доступен по адресу ${LMSTUDIO_API_URL}`;
  }
}

// Маппинг моделей
const MODEL_MAP: { [key: string]: string } = {
  'neironka': 'local-model',
  'cypher': 'openrouter/cypher-alpha:free',
  'deepseek': 'deepseek/deepseek-r1-0528:free',
  'qwen3': 'qwen/qwen3-30b-a3b:free',
};

// Промпты на разных языках
const PROMPTS = {
  ru: {
    system: "Ты дружелюбный и полезный AI помощник. Отвечай на русском языке, будь вежливым и старайся давать полезные ответы. Если в ответе есть код, обязательно используй Markdown форматирование с указанием языка программирования. Например: ```javascript для JavaScript, ```python для Python, ```html для HTML и т.д. Всегда форматируй заголовки с помощью #, жирный текст с **, курсив с *, списки с - или 1., и код с ` для встроенного кода.",
    reasoning: "Ты эксперт по анализу задач. Разбей задачу пользователя на логические шаги и объясни свой ход мыслей. Отвечай на русском языке. Если в анализе есть код, используй Markdown форматирование.",
    reasoningWithAnalysis: "Ты дружелюбный и полезный AI помощник. Отвечай на русском языке, будь вежливым и старайся давать полезные ответы. Используй результаты своего анализа для формирования ответа. Если в ответе есть код, обязательно используй Markdown форматирование с указанием языка программирования.",
    analyzeTask: "Проанализируй эту задачу и объясни, как ты будешь её решать:",
    finalAnswer: "Анализ задачи:\n{reasoning}\n\nТеперь дай финальный ответ на основе этого анализа."
  },
  en: {
    system: "You are a friendly and helpful AI assistant. Respond in English, be polite and try to give useful answers. If your response contains code, always use Markdown formatting with the programming language specified. For example: ```javascript for JavaScript, ```python for Python, ```html for HTML, etc. Always format headings with #, bold text with **, italic text with *, lists with - or 1., and inline code with `.",
    reasoning: "You are an expert at analyzing tasks. Break down the user's task into logical steps and explain your thought process. Respond in English. If your analysis contains code, use Markdown formatting.",
    reasoningWithAnalysis: "You are a friendly and helpful AI assistant. Respond in English, be polite and try to give useful answers. Use the results of your analysis to form your response. If your response contains code, always use Markdown formatting with the programming language specified.",
    analyzeTask: "Analyze this task and explain how you will solve it:",
    finalAnswer: "Task analysis:\n{reasoning}\n\nNow give a final answer based on this analysis."
  }
};

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], modelId = 'neironka', reasoningEnabled = false, language = 'ru', webSearchEnabled = false, apiKey } = await request.json();

    // Получаем IP пользователя для защиты от злоупотреблений
    const userIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    
    // Проверяем лимиты для Neironka (LM Studio)
    if (modelId === 'neironka' && !checkUserLimit(userIP)) {
      const userData = userRequestLimits.get(userIP);
      const timeSinceLastRequest = userData ? Date.now() - userData.lastRequest : 0;
      
      if (timeSinceLastRequest < 2000) {
        return NextResponse.json(
          { error: 'Слишком частые запросы. Подождите 2 секунды между запросами.' },
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          { error: 'Превышен лимит запросов. Максимум 50 запросов в час. Попробуйте позже или используйте другую модель.' },
          { status: 429 }
        );
      }
    }

    if (!message) {
      return NextResponse.json(
        { error: language === 'en' ? 'Message is required' : 'Сообщение обязательно' },
        { status: 400 }
      );
    }

    // Защита от слишком длинных сообщений
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Сообщение слишком длинное. Максимум 5000 символов.' },
        { status: 400 }
      );
    }

    // Защита от спама - проверяем повторяющиеся символы
    const repeatedChars = message.match(/(.)\1{10,}/g);
    if (repeatedChars) {
      return NextResponse.json(
        { error: 'Сообщение содержит слишком много повторяющихся символов.' },
        { status: 400 }
      );
    }

    const selectedModel = MODEL_MAP[modelId] || 'local-model';
    const prompts = PROMPTS[language as keyof typeof PROMPTS] || PROMPTS.ru;

    // Явно инициализируем searchSources
    let searchSources: any[] = [];
    let webSearchSummary = '';
    let webSearchSnippets = '';
    
    if (webSearchEnabled) {
      try {
        console.log('Получаем ссылки для веб-поиска:', message);
        const searchResponse = await fetch(`${request.nextUrl.origin}/api/web-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
            apiKey: apiKey
          })
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          searchSources = searchData.results?.map((result: any, index: number) => ({
            title: result.title,
            url: result.url,
            favicon: result.favicon
          })) || [];
          webSearchSummary = searchData.summary || '';
          // Собираем сниппеты
          if (searchData.results && Array.isArray(searchData.results)) {
            webSearchSnippets = searchData.results.map((r: any, i: number) => `Источник [${i+1}]: ${r.title}\n${r.snippet || r.content || ''}`).join('\n\n');
          }
          console.log('[AI] Найдены сайты для поиска:', (searchSources as any[]).map((s: any) => s.url));
        } else {
          console.log('Ошибка получения ссылок:', searchResponse.status);
        }
      } catch (error) {
        console.error('Ошибка при получении ссылок:', error);
      }
      // Если ссылки не получены или пусты, генерируем фейковые
      if (!searchSources || searchSources.length === 0) {
        searchSources = [
          {
            title: `Результат поиска по запросу "${message}"`,
            url: `https://www.google.com/search?q=${encodeURIComponent(message)}`,
            favicon: 'https://www.google.com/favicon.ico'
          },
          {
            title: `Wikipedia: ${message}`,
            url: `https://ru.wikipedia.org/wiki/${encodeURIComponent(message)}`,
            favicon: 'https://ru.wikipedia.org/favicon.ico'
          },
          {
            title: `Новости по теме "${message}"`,
            url: `https://news.yandex.ru/yandsearch?text=${encodeURIComponent(message)}`,
            favicon: 'https://news.yandex.ru/favicon.ico'
          }
        ];
        webSearchSummary = `По результатам поиска по запросу "${message}" найдена некоторая информация.`;
        webSearchSnippets = '';
        console.log('[AI] Использованы фейковые сайты для поиска:', (searchSources as any[]).map((s: any) => s.url));
      }
    }

    if (reasoningEnabled) {
      // Если включено reasoning, сначала получаем reasoning
      let contextBlock = '';
      if (webSearchEnabled && (webSearchSummary || webSearchSnippets)) {
        contextBlock = `\n\nВот результаты веб-поиска по вашему запросу:\n${webSearchSummary}\n\n${webSearchSnippets}`;
      }
      const reasoningMessages = [
        {
          role: "system",
          content: prompts.reasoning + (contextBlock ? '\n' + contextBlock : '')
        },
        ...conversationHistory,
        {
          role: "user",
          content: `${prompts.analyzeTask} ${message}` + (contextBlock ? '\n' + contextBlock : '')
        }
      ];

      let reasoning: string;
      
      if (modelId === 'neironka') {
        // ВАЖНО: Для LM Studio (modelId === 'neironka') используем только сообщения текущего чата (conversationHistory)
        // Не передавайте сообщения из других чатов!
        // conversationHistory формируется на фронте только из currentChat.messages
        console.log('[AI] Отправка reasoning prompt в LM Studio:', JSON.stringify(reasoningMessages, null, 2));
        reasoning = await askLMStudio(reasoningMessages, 0.7, 800);
        console.log('[AI] Получен reasoning:', reasoning);
      } else {
        const openai = getOpenAI(apiKey);
        const reasoningCompletion = await openai.chat.completions.create({
          model: selectedModel,
          messages: reasoningMessages,
          max_tokens: 800,
          temperature: 0.7,
        });
        reasoning = reasoningCompletion.choices[0].message.content || '';
        console.log('[AI] Получен reasoning (OpenAI):', reasoning);
      }

      // Обрезаем reasoning для prompt финального ответа
      const shortReasoning = reasoning ? reasoning.slice(0, 1000) : '';
      // Теперь reasoning отправляется как новый user prompt
      let answerContextBlock = '';
      if (webSearchEnabled && (webSearchSummary || webSearchSnippets)) {
        answerContextBlock = `\n\nВот результаты веб-поиска по вашему запросу:\n${webSearchSummary}\n\n${webSearchSnippets}`;
      }
      const answerMessages = [
        {
          role: "system",
          content: prompts.reasoningWithAnalysis + (answerContextBlock ? '\n' + answerContextBlock : '')
        },
        ...conversationHistory,
        {
          role: "user",
          content: shortReasoning + (answerContextBlock ? '\n' + answerContextBlock : '')
        }
      ];

      let answer: string = '';
      let attempts = 0;
      while (attempts < 2 && !answer) {
        if (modelId === 'neironka') {
          console.log(`[AI] Попытка ${attempts + 1}: отправка финального prompt в LM Studio:`);
          console.log(JSON.stringify(answerMessages, null, 2));
          answer = await askLMStudio(answerMessages, 0.7, 1000);
          console.log(`[AI] Ответ LM Studio (попытка ${attempts + 1}):`, answer);
        } else {
          const openai = getOpenAI(apiKey);
          const answerCompletion = await openai.chat.completions.create({
            model: selectedModel,
            messages: answerMessages,
            max_tokens: 1000,
            temperature: 0.7,
          });
          answer = answerCompletion.choices[0].message.content || '';
          console.log(`[AI] Ответ OpenAI (попытка ${attempts + 1}):`, answer);
        }
        attempts++;
      }
      if (!answer) {
        answer = 'AI не смог сгенерировать финальный ответ.';
        console.log('[AI] Не удалось получить финальный ответ после 2 попыток.');
      } else {
        console.log('[AI] Финальный ответ:', answer);
      }

      return NextResponse.json({
        reasoning,
        answer,
        role: 'assistant',
        searchSources
      });
    } else {
      // Обычный ответ без reasoning
      const messages = [
        {
          role: "system",
          content: prompts.system
        },
        ...conversationHistory,
        {
          role: "user",
          content: message
        }
      ];

      let aiResponse: any;
      
      if (modelId === 'neironka') {
        // Для Neironka используем только LM Studio
        const content = await askLMStudio(messages, 0.7, 1000);
        aiResponse = { content, role: 'assistant' };
      } else {
        const openai = getOpenAI(apiKey);
        const completion = await openai.chat.completions.create({
          model: selectedModel,
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        });
        aiResponse = completion.choices[0].message;
      }

      return NextResponse.json({
        reasoning: null,
        answer: aiResponse.content,
        role: aiResponse.role,
        searchSources
      });
    }
  } catch (error) {
    console.error('Ошибка чата:', error);
    return NextResponse.json(
      { error: 'Ошибка при обработке запроса' },
      { status: 500 }
    );
  }
} 