import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// Удалил импорт askLMStudioWithQueue
// import { askLMStudioWithQueue } from '@/lib/lmstudioQueue';

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
    reasoning: `Ты эксперт по анализу и решению задач. Для каждого вопроса:
1. Определи, что именно требуется (тип задачи: логика, этика, паттерн, сентимент и т.д.).
2. Разбей задачу на этапы рассуждения, опиши ход мыслей.
3. Для этических и логических задач — опиши возможные альтернативы и почему выбран именно этот вариант.
4. Для паттернов — объясни, как ты нашёл закономерность.
5. Для сентимент-анализа — выдели ключевые слова, влияющие на тон.
6. Только после анализа дай краткий финальный вывод.
Используй списки, подзаголовки, выделяй ключевые моменты. Не повторяй просто ответ, а делай именно анализ!`,
    reasoningWithAnalysis: "Ты дружелюбный и полезный AI помощник. Отвечай на русском языке, будь вежливым и старайся давать полезные ответы. Используй результаты своего анализа для формирования ответа. Если в ответе есть код, обязательно используй Markdown форматирование с указанием языка программирования.",
    analyzeTask: "Проанализируй эту задачу и объясни, как ты будешь её решать:",
    finalAnswer: `Анализ задачи:
{reasoning}

Теперь, используя этот анализ:
- Используй только выводы из reasoning, не повторяй анализ, не рассуждай, а дай чёткий, лаконичный итог в виде списка, таблицы или короткого текста.
- Если задача — обычное приветствие или бытовой вопрос, просто ответь естественно и кратко, как человек (например: "Всё хорошо, спасибо!").
- Если задача требует инструкции, рецепта или алгоритма — дай пошаговую текстовую инструкцию без кода, если только пользователь явно не просит пример кода.
- Включай код только если пользователь прямо просит: "напиши код", "пример на Python" и т.п.
- Не давай вариантов, не используй списки и код, если это не требуется по смыслу задачи.`
  },
  en: {
    system: "You are a friendly and helpful AI assistant. Respond in English, be polite and try to give useful answers. If your response contains code, always use Markdown formatting with the programming language specified. For example: ```javascript for JavaScript, ```python for Python, ```html for HTML, etc. Always format headings with #, bold text with **, italic text with *, lists with - or 1., and inline code with `.",
    reasoning: "You are an expert at analyzing tasks. Break down the user's task into logical steps and explain your thought process. Respond in English. If your analysis contains code, use Markdown formatting.",
    reasoningWithAnalysis: "You are a friendly and helpful AI assistant. Respond in English, be polite and try to give useful answers. Use the results of your analysis to form your response. If your response contains code, always use Markdown formatting with the programming language specified.",
    analyzeTask: "Analyze this task and explain how you will solve it:",
    finalAnswer: "Task analysis:\n{reasoning}\n\nNow give a final answer based on this analysis."
  }
};

// Функция для определения простых бытовых вопросов (приветствия и small talk)
function isSimpleGreeting(msg: string) {
  return /\b(привет|как дела|здравствуй|добрый день|доброе утро|добрый вечер|hello|hi|how are you|hey|sup|yo)\b/i.test(msg);
}

// Функция для определения бытовых вопросов с приветствием и действием
function isGreetingWithAction(msg: string) {
  return /\b(привет|здравствуй|добрый день|доброе утро|добрый вечер|hello|hi)\b/i.test(msg) &&
         /как (приготовить|сделать|собрать|написать|решить|получить|выучить|создать|построить|запустить|начать|попасть|достичь|узнать|найти|попробовать|использовать|проверить|поменять|заменить|открыть|закрыть|поменять|обновить|удалить|добавить|сохранить|отправить|загрузить|скачать|установить|подключить|разобрать|собрать|поменять|передать|показать|объяснить|рассказать|описать|помочь|помоги|подскажи)/i.test(msg);
}

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

    // --- Новый алгоритм: webSearchEnabled ---
    let searchMessage = message;
    if (webSearchEnabled && message.length > 100) {
      // 1. Сформулировать поисковый запрос через LLM
      try {
        const searchQuery = await askLMStudio([
            { role: 'system', content: 'Ты помощник, который умеет формулировать поисковые запросы для поиска в интернете. Сформулируй короткий и максимально релевантный поисковый запрос по теме, не повторяй исходный текст полностью.' },
            { role: 'user', content: `Преобразуй следующий текст в короткий поисковый запрос для поиска в интернете:\n\n${message}` }
          ], 0.5, 50);
        if (searchQuery && typeof searchQuery === 'string' && searchQuery.length > 3 && searchQuery.length < 100) {
          searchMessage = searchQuery.trim();
        }
      } catch {
        // fallback к исходному message
        searchMessage = message;
      }
    }
    if (webSearchEnabled) {
      // 1. Получаем 4 настоящие ссылки через /api/web-search
      const webSearchRes = await fetch(`${request.nextUrl.origin}/api/web-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchMessage })
      });
      const webSearchData = await webSearchRes.json();
      if (!webSearchRes.ok || !webSearchData.results || !Array.isArray(webSearchData.results) || webSearchData.results.length === 0) {
        return NextResponse.json({ error: 'Не удалось найти сайты для поиска' }, { status: 500 });
      }
      const links = webSearchData.results;
      // 2. Для каждой ссылки — извлекаем текст и анализируем ИИ по чанкам
      const analyses: { url: string, title: string, analysis: string }[] = [];
      const CHUNK_SIZE = 2000;
      let chunkProgressArr: { site: number, totalSites: number, chunk: number, totalChunks: number }[] = [];
      let siteIdx = 0;
      let triedSites = 0;
      const maxTries = Math.min(8, links.length); // максимум 8 сайтов подряд
      while (siteIdx < links.length && analyses.length < 4 && triedSites < maxTries) {
        const link = links[siteIdx];
        siteIdx++;
        triedSites++;
        // 2.1. Извлекаем текст
        let text = '';
        try {
          const extractRes = await fetch(`${request.nextUrl.origin}/api/url-extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: link.url })
          });
          const extractData = await extractRes.json();
          if (extractRes.ok && extractData.text && extractData.text.length > 500) {
            text = extractData.text;
          } else {
            continue; // если не удалось извлечь текст — пробуем следующий сайт
          }
        } catch {
          continue;
        }
        // 2.2. Разбиваем текст на чанки
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
          chunks.push(text.slice(i, i + CHUNK_SIZE));
        }
        let chunkAnalyses: string[] = [];
        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
          const chunk = chunks[chunkIdx];
          // Для фронта: сохраняем прогресс (можно отправлять через SSE или WebSocket, если нужно)
          chunkProgressArr.push({ site: analyses.length + 1, totalSites: links.length, chunk: chunkIdx + 1, totalChunks: chunks.length });
          // 2.3. Анализируем каждый чанк
          let chunkAnalysis = '';
          try {
            let analysisPrompt = `Проанализируй этот фрагмент сайта по теме: ${message}\n\nВот фрагмент текста:\n${chunk}\n\nСформулируй, что важного/полезного ты понял из этого фрагмента. Не используй внешние знания, только этот текст.`;
            if (modelId === 'neironka') {
              chunkAnalysis = await askLMStudio([
                { role: 'system', content: prompts.system },
                { role: 'user', content: analysisPrompt }
              ], 0.7, 600);
            } else {
              const openai = getOpenAI(apiKey);
              const completion = await openai.chat.completions.create({
                model: selectedModel,
                messages: [
                  { role: 'system', content: prompts.system },
                  { role: 'user', content: analysisPrompt }
                ],
                max_tokens: 600,
                temperature: 0.7,
              });
              chunkAnalysis = completion.choices[0].message.content || '';
            }
          } catch {
            chunkAnalysis = '[Ошибка анализа фрагмента сайта]';
          }
          chunkAnalyses.push(chunkAnalysis);
        }
        // 2.4. Объединяем выводы по чанкам в итог по сайту
        let siteAnalysis = '';
        try {
          let mergePrompt = `Вот выводы по частям сайта:\n${chunkAnalyses.map((a, i) => `[Часть ${i+1}]: ${a}`).join('\n')}\n\nОбъедини эти выводы в единый итог по сайту, не добавляй ничего лишнего.`;
          if (modelId === 'neironka') {
            siteAnalysis = await askLMStudio([
              { role: 'system', content: prompts.system },
              { role: 'user', content: mergePrompt }
            ], 0.7, 800);
          } else {
            const openai = getOpenAI(apiKey);
            const completion = await openai.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: 'system', content: prompts.system },
                { role: 'user', content: mergePrompt }
              ],
              max_tokens: 800,
              temperature: 0.7,
            });
            siteAnalysis = completion.choices[0].message.content || '';
          }
        } catch {
          siteAnalysis = chunkAnalyses.join('\n');
        }
        analyses.push({ url: link.url, title: link.title, analysis: siteAnalysis });
      }
      // 3. Собираем финальный промпт
      const finalPrompt = `Пользователь хочет: ${message}\n\nВот что удалось узнать из сайтов:\n${analyses.map((a, i) => `[${i+1}] ${a.title} (${a.url})\n${a.analysis}`).join('\n\n')}\n\nСформулируй итоговый ответ для пользователя, строго опираясь только на эти выводы.`;
      let answer = '';
      let reasoning = null;
      if (webSearchEnabled && reasoningEnabled) {
        // Сначала получаем финальный ответ по сайтам
        let sitesAnswer = '';
        if (modelId === 'neironka') {
          sitesAnswer = await askLMStudio([
            { role: 'system', content: prompts.system },
            { role: 'user', content: finalPrompt }
          ], 0.7, 1000);
        } else {
          const openai = getOpenAI(apiKey);
          const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
              { role: 'system', content: prompts.system },
              { role: 'user', content: finalPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.7,
          });
          sitesAnswer = completion.choices[0].message.content || '';
        }
        // Теперь reasoning-промпт по этому ответу
        const reasoningPrompt = `${prompts.reasoning}\n\nВот информация, которую удалось собрать по вашему запросу из сайтов:\n${sitesAnswer}\n\nПроанализируй эти данные, объясни логику, сделай пошаговый разбор и только потом дай финальный вывод.`;
        if (modelId === 'neironka') {
          reasoning = await askLMStudio([
            { role: 'system', content: prompts.reasoning },
            { role: 'user', content: reasoningPrompt }
          ], 0.7, 1000);
        } else {
          const openai = getOpenAI(apiKey);
          const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
              { role: 'system', content: prompts.reasoning },
              { role: 'user', content: reasoningPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.7,
          });
          reasoning = completion.choices[0].message.content || '';
        }
        answer = sitesAnswer;
      } else {
        // Обычный финальный ответ (поиск без reasoning)
        if (modelId === 'neironka') {
          answer = await askLMStudio([
            { role: 'system', content: prompts.system },
            { role: 'user', content: finalPrompt }
          ], 0.7, 1000);
        } else {
          const openai = getOpenAI(apiKey);
          const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
              { role: 'system', content: prompts.system },
              { role: 'user', content: finalPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.7,
          });
          answer = completion.choices[0].message.content || '';
        }
      }
      return NextResponse.json({
        reasoning,
        answer,
        role: 'assistant',
        searchSources: analyses.map(a => ({ title: a.title, url: a.url }))
      });
    }

    // --- Старое поведение (без webSearchEnabled) ---
    // Если webSearchEnabled=false, то:
    // 1. Получаем ссылки для веб-поиска (если включен)
    // 2. Если ссылки не получены или пусты, генерируем фейковые
    // 3. Если webSearchEnabled=false, то searchSources будет пустым или содержать фейковые
    // 4. Если isSimpleGreeting или isGreetingWithAction — используем короткий промпт
    // 5. Если reasoningEnabled — получаем reasoning, формируем финальный ответ
    // 6. Если reasoningEnabled=false — обычный ответ

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

    if (isSimpleGreeting(message)) {
      // Для простых бытовых вопросов используем короткий промпт
      const messages: { role: "system" | "user"; content: string }[] = [
        {
          role: "system",
          content: "Ответь только одной короткой фразой, как обычный человек в чате. Запрещено давать варианты, анализ, пояснения, код, списки, подзаголовки, благодарности, вступления, рассуждения. Только одна короткая фраза-ответ."
        },
        {
          role: "user",
          content: message
        }
      ];
      let aiResponse: any;
      if (modelId === 'neironka') {
        const content = await askLMStudio(messages, 0.7, 100);
        aiResponse = { content, role: 'assistant' };
      } else {
        const openai = getOpenAI(apiKey);
        const completion = await openai.chat.completions.create({
          model: selectedModel,
          messages,
          max_tokens: 100,
          temperature: 0.7,
        });
        aiResponse = completion.choices[0].message;
      }
      // Пост-обработка: обрезаем до первой строки или 120 символов
      function postprocessShortAnswer(answer: string) {
        const firstLine = answer.split(/[.!?\n]/)[0];
        return firstLine.length > 5 ? firstLine.trim() : answer.slice(0, 120).trim();
      }
      const shortAnswer = postprocessShortAnswer(aiResponse.content);
      return NextResponse.json({
        reasoning: null,
        answer: shortAnswer,
        role: aiResponse.role,
        searchSources
      });
    }

    if (isGreetingWithAction(message)) {
      // Для бытовых вопросов с приветствием и действием используем дружелюбный промпт с краткой инструкцией
      const messages: { role: "system" | "user"; content: string }[] = [
        {
          role: "system",
          content: "Ты дружелюбный человек. Ответь с приветствием и кратко объясни, как выполнить действие, о котором спрашивает пользователь, в 1-2 предложениях. Не давай длинных инструкций или рецептов, если пользователь не просит подробно. Если пользователь попросит подробнее — тогда дай полный пошаговый ответ."
        },
        {
          role: "user",
          content: message
        }
      ];
      let aiResponse: any;
      if (modelId === 'neironka') {
        const content = await askLMStudio(messages, 0.7, 120);
        aiResponse = { content, role: 'assistant' };
      } else {
        const openai = getOpenAI(apiKey);
        const completion = await openai.chat.completions.create({
          model: selectedModel,
          messages,
          max_tokens: 120,
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

    if (reasoningEnabled) {
      // Если включено reasoning, сначала получаем reasoning
      let contextBlock = '';
      if (webSearchEnabled && (webSearchSummary || webSearchSnippets)) {
        contextBlock = `\n\nВот результаты веб-поиска по вашему запросу:\n${webSearchSummary}\n\n${webSearchSnippets}`;
      }
      let reasoning = '';
      let reasoningError = null;
      let reasoningPrompt = `${prompts.analyzeTask} ${message}` + (contextBlock ? '\n' + contextBlock : '');
      // Ограничение длины reasoning-промпта
      if (reasoningPrompt.length > 8000) {
        try {
          let compressPrompt = `Сожми этот текст до 8000 символов, сохранив суть:\n\n${reasoningPrompt}`;
          if (modelId === 'neironka') {
            reasoningPrompt = await askLMStudio([
              { role: 'system', content: prompts.system },
              { role: 'user', content: compressPrompt }
            ], 0.5, 800);
          } else {
            const openai = getOpenAI(apiKey);
            const completion = await openai.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: 'system', content: prompts.system },
                { role: 'user', content: compressPrompt }
              ],
              max_tokens: 800,
              temperature: 0.5,
            });
            reasoningPrompt = completion.choices[0].message.content || '';
          }
          if (reasoningPrompt.length > 8000) {
            reasoningPrompt = reasoningPrompt.slice(0, 8000);
          }
        } catch (err) {
          reasoningPrompt = reasoningPrompt.slice(0, 8000);
        }
      }
      let reasoningAttempts = 0;
      let reasoning400Error = false;
      while (reasoningAttempts < 2 && !reasoning) {
        try {
          if (modelId === 'neironka') {
            reasoning = await askLMStudio([
              { role: 'system', content: prompts.reasoning + (contextBlock ? '\n' + contextBlock : '') },
              ...conversationHistory,
              { role: 'user', content: reasoningPrompt }
            ], 0.7, 800);
          } else {
            const openai = getOpenAI(apiKey);
            const reasoningCompletion = await openai.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: 'system', content: prompts.reasoning + (contextBlock ? '\n' + contextBlock : '') },
                ...conversationHistory,
                { role: 'user', content: reasoningPrompt }
              ],
              max_tokens: 800,
              temperature: 0.7,
            });
            reasoning = reasoningCompletion.choices[0].message.content || '';
          }
        } catch (err) {
          // Если ошибка 400 и reasoningPrompt длинный — разбить на чанки и собрать reasoning по частям
          if (err instanceof Error && err.message.includes('Status: 400') && reasoningPrompt.length > 4000 && !reasoning400Error) {
            reasoning400Error = true;
            const chunkSize = 4000;
            const chunks = [];
            for (let i = 0; i < reasoningPrompt.length; i += chunkSize) {
              chunks.push(reasoningPrompt.slice(i, i + chunkSize));
            }
            const chunkReasonings = [];
            for (const chunk of chunks) {
              try {
                let chunkRes = '';
                if (modelId === 'neironka') {
                  chunkRes = await askLMStudio([
                    { role: 'system', content: prompts.reasoning },
                    { role: 'user', content: chunk }
                  ], 0.7, 800);
                } else {
                  const openai = getOpenAI(apiKey);
                  const completion = await openai.chat.completions.create({
                    model: selectedModel,
                    messages: [
                      { role: 'system', content: prompts.reasoning },
                      { role: 'user', content: chunk }
                    ],
                    max_tokens: 800,
                    temperature: 0.7,
                  });
                  chunkRes = completion.choices[0].message.content || '';
                }
                chunkReasonings.push(chunkRes);
              } catch {}
            }
            // Объединить выводы по чанкам
            try {
              const mergePrompt = `Объедини эти рассуждения в единый итог:\n${chunkReasonings.map((r, i) => `[Часть ${i+1}]: ${r}`).join('\n')}`;
              if (modelId === 'neironka') {
                reasoning = await askLMStudio([
                  { role: 'system', content: prompts.reasoning },
                  { role: 'user', content: mergePrompt }
                ], 0.7, 800);
              } else {
                const openai = getOpenAI(apiKey);
                const completion = await openai.chat.completions.create({
                  model: selectedModel,
                  messages: [
                    { role: 'system', content: prompts.reasoning },
                    { role: 'user', content: mergePrompt }
                  ],
                  max_tokens: 800,
                  temperature: 0.7,
                });
                reasoning = completion.choices[0].message.content || '';
              }
            } catch {}
          } else {
            reasoningError = err instanceof Error ? err.message : String(err);
            reasoning = '';
          }
        }
        reasoningAttempts++;
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
          content: prompts.finalAnswer.replace('{reasoning}', shortReasoning) + (answerContextBlock ? '\n' + answerContextBlock : '')
        }
      ];

      let answer: string = '';
      let answerAttempts = 0;
      while (answerAttempts < 2 && !answer) {
        if (modelId === 'neironka') {
          console.log(`[AI] Попытка ${answerAttempts + 1}: отправка финального prompt в LM Studio:`);
          console.log(JSON.stringify(answerMessages, null, 2));
          answer = await askLMStudio(answerMessages, 0.7, 1000);
          console.log(`[AI] Ответ LM Studio (попытка ${answerAttempts + 1}):`, answer);
        } else {
          const openai = getOpenAI(apiKey);
          const answerCompletion = await openai.chat.completions.create({
            model: selectedModel,
            messages: answerMessages,
            max_tokens: 1000,
            temperature: 0.7,
          });
          answer = answerCompletion.choices[0].message.content || '';
          console.log(`[AI] Ответ OpenAI (попытка ${answerAttempts + 1}):`, answer);
        }
        answerAttempts++;
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