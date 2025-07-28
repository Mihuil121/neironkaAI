import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { franc } from 'franc';
// @ts-ignore
import langs from 'langs';

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
      return '__LMSTUDIO_CONNECTION_ERROR__';
    }
    return '__LMSTUDIO_CONNECTION_ERROR__';
  }
}

// Маппинг моделей
const MODEL_MAP: { [key: string]: string } = {
  'neironka': 'local-model',
  'cypher': 'openrouter/cypher-alpha:free',
  'deepseek': 'deepseek/deepseek-r1-0528:free',
  'qwen3': 'qwen/qwen3-30b-a3b:free',
};

// Продвинутые промпты для искусственного мышления
const ADVANCED_THINKING_PROMPTS = {
  // Базовый системный промпт
  baseSystem: `Ты продвинутый ИИ-ассистент с возможностями глубокого анализа. Если в ответе есть код, обязательно используй Markdown форматирование с указанием языка программирования. Например: \`\`\`javascript для JavaScript, \`\`\`python для Python, \`\`\`html для HTML и т.д. Всегда форматируй заголовки с помощью #, жирный текст с **, курсив с *, списки с - или 1., и код с \` для встроенного кода.

Если в ответе есть математические формулы, обязательно оформляй их в формате LaTeX: для встроенных формул используй $...$, для блоковых формул используй $$...$$. Не используй другие способы оформления формул.`,

  // Промпт для глубокого анализа (reasoning)
  deepReasoning: `Ты — эксперт-аналитик. Проведи внутренний анализ запроса пользователя. Этот анализ НЕ будет показан пользователю — он используется только для формирования финального ответа.

🧠 **ГЛУБОКОЕ ПОНИМАНИЕ ЗАДАЧИ:**
- Переформулируй суть запроса своими словами
- Выдели ключевые элементы и скрытые подзадачи
- Определи тип запроса (информационный, аналитический, творческий, практический)

🔍 **ЛОГИЧЕСКОЕ РАЗЛОЖЕНИЕ:**
- Разбей проблему на логические шаги
- Построй цепочку рассуждений от предпосылок к выводам
- Выяви связи между элементами задачи
- Рассмотри альтернативные подходы к решению

📊 **ВЫЧИСЛЕНИЯ И ДАННЫЕ:**
- Проведи необходимые расчёты пошагово
- Проверь корректность данных и формул
- Сделай оценки и приближения где нужно
- Укажи источники неопределённости

⚖️ **КРИТИЧЕСКАЯ ОЦЕНКА:**
- Найди слабые места в рассуждениях
- Рассмотри этические аспекты и ограничения
- Выяви возможные ошибки и неточности
- Оцени достоверность и полноту информации

🎯 **ПОДГОТОВКА ОТВЕТА:**
- Сформулируй 3-5 ключевых тезисов
- Определи наиболее важные выводы
- Продумай структуру финального ответа
- Реши, что включить, а что опустить

Будь максимально подробным в анализе, но сохраняй естественный поток мыслей. Думай вслух, показывай ход мыслей, сомневайся, пересматривай выводы. Не пытайся давать готовый ответ пользователю в этом разделе!`,

  // Промпт для финального ответа
  finalAnswer: `Сформируй финальный ответ пользователю, используя ТОЛЬКО выводы из внутреннего анализа (reasoning):

📝 **Структура ответа:**
1. Краткое переформулирование вопроса (если нужно для ясности)
2. Основной вывод или решение
3. Ключевые обоснования (2-3 самых важных аргумента)
4. Практические детали (расчёты, примеры, инструкции)
5. Важные оговорки или ограничения (если есть)

⚠️ **СТРОГИЕ ПРАВИЛА:**
- НЕ показывай заголовки этапов ([Основной вывод], [Обоснование] и т.д.)
- НЕ упоминай процесс анализа ("на основе анализа", "после рассмотрения")  
- НЕ добавляй информацию, не упомянутую в анализе
- НЕ используй пустые секции или фразы "нет оговорок", "нет расчетов"
- НЕ выводи заголовок без содержимого

Пиши естественно, как будто это твоя спонтанная мысль. Финальный ответ должен выглядеть цельным и органичным, без следов искусственной структуры.`,

  // Специализированные промпты для разных типов задач
  analyticalTask: `Это аналитическая задача. В анализе особое внимание удели:
- Сбору и верификации фактов
- Выявлению причинно-следственных связей  
- Сравнению альтернативных объяснений
- Оценке надёжности источников и данных`,

  creativeTask: `Это творческая задача. В анализе особое внимание удели:
- Генерации множественных идей и подходов
- Оценке оригинальности и практичности решений
- Учёту ограничений и требований заказчика
- Балансу между новизной и выполнимостью`,

  technicalTask: `Это техническая задача. В анализе особое внимание удели:
- Точности технических деталей и терминологии
- Пошаговой проверке алгоритмов и формул
- Рассмотрению граничных случаев и ошибок
- Оценке эффективности и альтернативных решений`,

  ethicalTask: `Задача содержит этические аспекты. В анализе особое внимание удели:
- Выявлению всех заинтересованных сторон
- Анализу потенциальных последствий решений
- Рассмотрению альтернативных этических frameworks
- Поиску компромиссов между конфликтующими ценностями`,

  // Метапромпт для самооценки качества мышления
  selfEvaluation: `После анализа оцени качество своих рассуждений:
- Достаточно ли глубоко я проанализировал проблему?
- Рассмотрел ли я основные альтернативы и контраргументы?  
- Не пропустил ли я важные аспекты или ограничения?
- Логична ли цепочка от анализа к выводам?
- Если нет - проведи дополнительный анализ проблемных мест.`,

  // Функция для автоопределения языка и формирования промптов
  detectLanguageAndGetPrompts: (message: string) => {
    let detectedLang = 'ru';
    let detectedLangName = 'русском';
    
    try {
      const francCode = franc(message || '');
      if (francCode && francCode !== 'und') {
        const langData = langs.where('3', francCode);
        if (langData) {
          detectedLang = langData['1'] || detectedLang;
          detectedLangName = langData.local || langData.name || detectedLangName;
        }
      }
    } catch (error) {
      console.log('Ошибка определения языка:', error);
    }

    // --- Автокоррекция для славянских языков ---
    const cyrillicCount = (message.match(/[а-яё]/gi) || []).length;
    const totalLetters = (message.match(/[a-zа-яё]/gi) || []).length;
    const cyrillicRatio = totalLetters > 0 ? cyrillicCount / totalLetters : 0;
    const slavLangs = ['uk', 'be', 'bg', 'cs', 'pl', 'sk', 'sl', 'hr', 'sr', 'mk'];
    if (slavLangs.includes(detectedLang) && cyrillicRatio > 0.5) {
      detectedLang = 'ru';
      detectedLangName = 'русском';
    }

    // Формируем системный промпт с учетом языка
    let systemPrompt = ADVANCED_THINKING_PROMPTS.baseSystem;
    // Добавляем требование отвечать на языке пользователя, если язык не русский
    if (detectedLang !== 'ru') {
      systemPrompt += `\n\nВНИМАНИЕ: Всегда отвечай только на ${detectedLangName} языке, даже если вопрос был на другом языке.`;
    }

    return {
      detectedLang,
      detectedLangName,
      systemPrompt,
      deepReasoning: ADVANCED_THINKING_PROMPTS.deepReasoning,
      finalAnswer: ADVANCED_THINKING_PROMPTS.finalAnswer
    };
  }
};

// Расширенный промпт для веб-поиска
const ADVANCED_WEB_SEARCH_SYSTEM_PROMPT = `Ты - интеллектуальный ИИ-ассистент с функцией веб-поиска. Для каждого запроса пользователя:

ЭТАП 1 - АНАЛИЗ ЗАПРОСА:
- Определи тип вопроса (фактический, актуальный, аналитический, творческий)
- Оцени, есть ли у тебя достаточно информации для ответа
- Реши: нужен поиск или можешь ответить из базы знаний

ЭТАП 2 - СТРАТЕГИЯ ПОИСКА (если нужен):
- Сформулируй 1-7 поисковых запроса
- Определи приоритетные источники (новости, википедия, официальные сайты)
- Укажи временные рамки (если важна актуальность)

ЭТАП 3 - АНАЛИЗ РЕЗУЛЬТАТОВ:
- Проверь достоверность источников
- Сопоставь информацию из разных источников
- Выдели ключевые факты

ЭТАП 4 - ФОРМИРОВАНИЕ ОТВЕТА:
- Дай прямой ответ на вопрос пользователя
- Подкрепи фактами из поиска
- Укажи степень уверенности
- Предложи дополнительные аспекты темы

Всегда указывай источники и дату последнего обновления информации.`;


const THINKING_ENHANCERS = {
  // Промпт для принуждения к медленному мышлению
  slowThinking: `Перед ответом обязательно сделай паузу и подумай медленно. Не торопись с выводами. 
Представь, что у тебя есть время обдумать проблему с разных сторон.`,

  // Промпт для игры в "адвоката дьявола"
  devilsAdvocate: `В анализе обязательно сыграй роль "адвоката дьявола" - найди контраргументы 
к своим первоначальным выводам. Что могло бы пойти не так? Какие есть альтернативные объяснения?`,

  // Промпт для проверки логических ошибок
  logicCheck: `Проверь свои рассуждения на типичные логические ошибки:
- Корреляция vs причинность
- Подтверждающая ошибка  
- Ложная дилемма
- Переход от частного к общему
- Апелляция к авторитету без оснований`,

  // Промпт для многоуровневого мышления
  layeredThinking: `Думай на нескольких уровнях одновременно:
- Поверхностный: что лежит на поверхности?
- Системный: как это связано с более широким контекстом?
- Мета-уровень: что говорит сама постановка вопроса?
- Долгосрочный: каковы последствия через месяц/год/десятилетие?`
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

// Функция для создания структурированного плана исследования
async function createResearchPlan(userQuery: string, modelId: string, systemPrompt: string, apiKey?: string) {
  const planPrompt = `Создай структурированный план исследования для запроса пользователя. 

План должен содержать 5-7 конкретных исследовательских вопросов, которые помогут полностью раскрыть тему.

Формат ответа:
(1) [Конкретный вопрос для исследования]
(2) [Конкретный вопрос для исследования]
(3) [Конкретный вопрос для исследования]
...

Пример для запроса "что такое пицца":
(1) Определить, что такое пицца, и ее основные характеристики.
(2) Исследовать историю происхождения пиццы, включая ее корни в Неаполе, Италия, и эволюцию до современного вида.
(3) Выявить ключевые ингредиенты, используемые в приготовлении пиццы, такие как тесто, соус, сыр и типичные начинки.
(4) Изучить различные виды и региональные стили пиццы по всему миру.
(5) Описать традиционные методы приготовления пиццы, включая процесс замешивания теста, добавления начинки и выпекания.
(6) Проанализировать культурное значение пиццы и ее глобальное распространение как популярного блюда.
(7) Исследовать, как пицца обычно подается и с какими напитками или дополнениями.

Запрос пользователя: ${userQuery}`;

  if (modelId === 'neironka') {
    const plan = await askLMStudio([
      { role: 'system', content: ADVANCED_WEB_SEARCH_SYSTEM_PROMPT },
      { role: 'user', content: planPrompt }
    ], 0.7, 800);
    return plan;
  } else {
    const openai = getOpenAI(apiKey);
    const completion = await openai.chat.completions.create({
      model: MODEL_MAP[modelId] || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: planPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });
    return completion.choices[0].message.content || '';
  }
}

// Функция для извлечения пунктов плана
function extractPlanItems(planText: string): string[] {
  const items = planText.match(/\(\d+\)\s*(.+?)(?=\s*\(\d+\)|$)/g);
  if (!items) return [];
  
  return items.map(item => {
    const match = item.match(/\(\d+\)\s*(.+)/);
    return match ? match[1].trim() : item.replace(/^\d+\)\s*/, '').trim();
  }).filter(item => item.length > 10);
}

// Функция для выполнения поиска по одному пункту плана
async function researchPlanItem(item: string, request: NextRequest, modelId: string, systemPrompt: string, apiKey?: string) {
  console.log(`[AI] Исследуем пункт: ${item}`);
  
  // 1. Создаем поисковый запрос для этого пункта
  let searchQuery = item;
  if (item.length > 100) {
    try {
      const queryPrompt = `Создай короткий поисковый запрос (до 50 символов) для поиска информации по теме: ${item}`;
      if (modelId === 'neironka') {
        searchQuery = await askLMStudio([
          { role: 'system', content: ADVANCED_WEB_SEARCH_SYSTEM_PROMPT },
          { role: 'user', content: queryPrompt }
        ], 0.5, 50);
      } else {
        const openai = getOpenAI(apiKey);
        const completion = await openai.chat.completions.create({
          model: MODEL_MAP[modelId] || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: queryPrompt }
          ],
          max_tokens: 50,
          temperature: 0.5,
        });
        searchQuery = completion.choices[0].message.content || item;
      }
    } catch {
      searchQuery = item;
    }
  }

  // 2. Выполняем поиск
  const webSearchRes = await fetch(`${request.nextUrl.origin}/api/web-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: searchQuery })
  });
  
  if (!webSearchRes.ok) {
    return { item, summary: 'Не удалось найти информацию по этому пункту.' };
  }

  const webSearchData = await webSearchRes.json();
  if (!webSearchData.results || !Array.isArray(webSearchData.results) || webSearchData.results.length === 0) {
    return { item, summary: 'Не найдено релевантной информации.' };
  }

  // 3. Извлекаем и анализируем информацию с 2 лучших сайтов
  const links = webSearchData.results.slice(0, 2);
  const summaries: string[] = [];
  
  for (const link of links) {
    try {
      // Извлекаем текст
      const extractRes = await fetch(`${request.nextUrl.origin}/api/url-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link.url })
      });
      
      if (!extractRes.ok) continue;
      
      const extractData = await extractRes.json();
      if (!extractData.text || extractData.text.length < 200) continue;

      // Анализируем текст относительно пункта плана
      const analysisPrompt = `Проанализируй следующий текст и создай краткое резюме (до 200 символов) по теме: "${item}"

Текст: ${extractData.text.slice(0, 2000)}

Резюме должно содержать только самую важную информацию по данному пункту плана.`;

      let summary = '';
      if (modelId === 'neironka') {
        summary = await askLMStudio([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt }
        ], 0.5, 200);
      } else {
        const openai = getOpenAI(apiKey);
        const completion = await openai.chat.completions.create({
          model: MODEL_MAP[modelId] || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: analysisPrompt }
          ],
          max_tokens: 200,
          temperature: 0.5,
        });
        summary = completion.choices[0].message.content || '';
      }

      if (summary && summary.length > 20) {
        summaries.push(summary);
      }
    } catch (error) {
      console.error(`[AI] Ошибка при анализе сайта ${link.url}:`, error);
    }
  }

  return {
    item,
    summary: summaries.length > 0 ? summaries.join(' ') : 'Информация не найдена.',
    sources: links.map((link: any) => ({
      title: link.title,
      url: link.url,
      favicon: link.favicon
    }))
  };
}

// Функция для создания финального отчета
async function createFinalReport(userQuery: string, researchResults: any[], modelId: string, systemPrompt: string, detectedLangName: string, apiKey?: string) {
  const reportPrompt = `Создай подробный и структурированный отчет на основе проведенного исследования.

ВНИМАНИЕ: Всегда формируй итоговый отчёт только на ${detectedLangName} языке, даже если часть информации была найдена на других языках. Переводи все цитаты и выдержки на ${detectedLangName} язык.

Исходный запрос пользователя: ${userQuery}

Результаты исследования:
${researchResults.map((result, index) => `${index + 1}. ${result.item}\n   Результат: ${result.summary}`).join('\n\n')}

Создай подробный отчет, который:
1. Полностью отвечает на запрос пользователя
2. Структурирован и легко читается
3. Содержит всю найденную информацию
4. Написан естественным языком
5. Не содержит технических деталей процесса исследования

Отчет должен быть информативным и полезным для пользователя.`;

  if (modelId === 'neironka') {
    return await askLMStudio([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: reportPrompt }
    ], 0.7, 1500);
  } else {
    const openai = getOpenAI(apiKey);
    const completion = await openai.chat.completions.create({
      model: MODEL_MAP[modelId] || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: reportPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });
    return completion.choices[0].message.content || '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], modelId = 'neironka', reasoningEnabled = false, language = 'ru', webSearchEnabled = false, apiKey, fileContent, fileName } = await request.json();

    // Получаем IP пользователя для защиты от злоупотреблений
    const userIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    
    // Автоматическое определение языка и получение промптов
    const languageData = ADVANCED_THINKING_PROMPTS.detectLanguageAndGetPrompts(message);
    const { detectedLang, detectedLangName, systemPrompt } = languageData;
    
    console.log({ detectedLang, detectedLangName, systemPrompt, message });

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

    // --- Новый структурированный алгоритм веб-поиска ---
    if (webSearchEnabled) {
      console.log('[AI] Запускаем структурированный веб-поиск для:', message);
      
      try {
        // 1. Создаем план исследования
        console.log('[AI] Создаем план исследования...');
        const researchPlan = await createResearchPlan(message, modelId, systemPrompt, apiKey);
        if (!researchPlan || researchPlan.includes('__LMSTUDIO_CONNECTION_ERROR__')) {
          return NextResponse.json({ error: 'Не удалось создать план исследования. Попробуйте позже.' }, { status: 503 });
        }
        
        // 2. Извлекаем пункты плана
        const planItems = extractPlanItems(researchPlan);
        if (planItems.length === 0) {
          return NextResponse.json({ error: 'Не удалось создать план исследования.' }, { status: 500 });
        }
        
        console.log(`[AI] Создан план из ${planItems.length} пунктов:`, planItems);
        
        // 3. Исследуем каждый пункт плана
        const researchResults = [];
        for (let i = 0; i < planItems.length; i++) {
          console.log(`[AI] Исследуем пункт ${i + 1}/${planItems.length}`);
          const result = await researchPlanItem(planItems[i], request, modelId, systemPrompt, apiKey);
          researchResults.push(result);
          
          // Небольшая пауза между запросами
          if (i < planItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // 4. Создаем финальный отчет
        console.log('[AI] Создаем финальный отчет...');
        const finalReport = await createFinalReport(message, researchResults, modelId, systemPrompt, detectedLangName, apiKey);
        
        if (!finalReport || finalReport.includes('__LMSTUDIO_CONNECTION_ERROR__')) {
          return NextResponse.json({ error: 'Не удалось создать финальный отчет. Попробуйте позже.' }, { status: 503 });
        }
        
        // 5. Если включен reasoning, создаем reasoning на основе отчета
        let reasoning = null;
        if (reasoningEnabled) {
          console.log('[AI] Создаем reasoning на основе отчета...');
          const reasoningPrompt = `${languageData.deepReasoning}\n\nВот подробный отчет по вашему запросу:\n${finalReport}\n\nПроанализируй этот отчет, объясни логику исследования, сделай пошаговый разбор и дай финальный вывод.`;
          
          if (modelId === 'neironka') {
            reasoning = await askLMStudio([
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
              { role: 'user', content: reasoningPrompt }
            ], 0.7, 800);
            if (reasoning === '__LMSTUDIO_CONNECTION_ERROR__') {
              return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
            }
          } else {
            const openai = getOpenAI(apiKey);
            const completion = await openai.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory,
                { role: 'user', content: reasoningPrompt }
              ],
              max_tokens: 800,
              temperature: 0.7,
            });
            reasoning = completion.choices[0].message.content || '';
          }
        }
        
        console.log('[AI] Структурированный веб-поиск завершен успешно');
        // Собираем все реальные источники из результатов исследования
        const allSources = researchResults
          .filter(result => result.sources && Array.isArray(result.sources))
          .flatMap(result => result.sources)
          .slice(0, 6); // Ограничиваем до 6 источников для UI

        return NextResponse.json({
          reasoning,
          answer: finalReport,
          role: 'assistant',
          searchSources: allSources.length > 0 ? allSources : researchResults.map(result => ({ 
            title: result.item, 
            url: 'research-item' 
          }))
        });
        
      } catch (error) {
        console.error('[AI] Ошибка в структурированном веб-поиске:', error);
        return NextResponse.json({ 
          error: 'Ошибка при выполнении веб-поиска: ' + (error instanceof Error ? error.message : String(error)) 
        }, { status: 500 });
      }
    }

    // --- Формируем промпт для LLM с учётом файла ---
    let prompt = '';
    if (fileContent && fileName) {
      prompt = `Пользователь хочет: ${message}\n\nСодержимое файла \"${fileName}\":\n${fileContent}`;
    } else if (fileContent) {
      prompt = `Пользователь хочет: ${message}\n\nСодержимое файла:\n${fileContent}`;
    } else {
      prompt = message;
    }

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

    // Проверяем простые приветствия только если reasoning НЕ включен
    if (!reasoningEnabled && isSimpleGreeting(message)) {
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

    if (!reasoningEnabled && isGreetingWithAction(message)) {
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

    // --- reasoningEnabled ---
    if (reasoningEnabled) {
      // Если включено reasoning, сначала получаем reasoning
      let contextBlock = '';
      if (webSearchEnabled && (webSearchSummary || webSearchSnippets)) {
        contextBlock = `\n\nВот результаты веб-поиска по вашему запросу:\n${webSearchSummary}\n\n${webSearchSnippets}`;
      }
      let reasoning = '';
      let reasoningError = null;
      let reasoningPrompt = `Проведи внутренний анализ для запроса: ${message}` + (contextBlock ? `\nКонтекст:\n${contextBlock}` : '');
      // Ограничение длины reasoning-промпта
      if (reasoningPrompt.length > 8000) {
        try {
          let compressPrompt = `Сожми этот текст до 8000 символов, сохранив суть:\n\n${reasoningPrompt}`;
          if (modelId === 'neironka') {
            reasoningPrompt = await askLMStudio([
              { role: 'system', content: systemPrompt },
              { role: 'user', content: compressPrompt }
            ], 0.5, 800);
            if (reasoningPrompt === '__LMSTUDIO_CONNECTION_ERROR__') {
              return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
            }
          } else {
            const openai = getOpenAI(apiKey);
            const completion = await openai.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: 'system', content: systemPrompt },
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
              { role: 'system', content: systemPrompt + (contextBlock ? '\n' + contextBlock : '') },
              ...conversationHistory,
              { role: 'user', content: reasoningPrompt }
            ], 0.7, 800);
            if (reasoning === '__LMSTUDIO_CONNECTION_ERROR__') {
              return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
            }
          } else {
            const openai = getOpenAI(apiKey);
            const reasoningCompletion = await openai.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: 'system', content: systemPrompt + (contextBlock ? '\n' + contextBlock : '') },
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
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: chunk }
                  ], 0.7, 800);
                  if (chunkRes === '__LMSTUDIO_CONNECTION_ERROR__') {
                    return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
                  }
                } else {
                  const openai = getOpenAI(apiKey);
                  const completion = await openai.chat.completions.create({
                    model: selectedModel,
                    messages: [
                      { role: 'system', content: systemPrompt },
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
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: mergePrompt }
                ], 0.7, 800);
                if (reasoning === '__LMSTUDIO_CONNECTION_ERROR__') {
                  return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
                }
              } else {
                const openai = getOpenAI(apiKey);
                const completion = await openai.chat.completions.create({
                  model: selectedModel,
                  messages: [
                    { role: 'system', content: systemPrompt },
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
      let reasoningText = '';
      if (reasoningEnabled) {
        reasoningText = reasoning;
      }
      const answerMessages = [
        {
          role: "system",
          content: systemPrompt + (answerContextBlock ? '\n' + answerContextBlock : '')
        },
        ...conversationHistory,
        {
          role: "user",
          content: `Сформируй ответ по строгому шаблону:\n${languageData.finalAnswer}\n\nВот твой внутренний анализ:\n${reasoningText}\n\nВопрос пользователя: ${message}` + (answerContextBlock ? '\n' + answerContextBlock : '')
        }
      ];

      let answer: string = '';
      let answerAttempts = 0;
      while (answerAttempts < 2 && !answer) {
        if (modelId === 'neironka') {
          console.log(`[AI] Попытка ${answerAttempts + 1}: отправка финального prompt в LM Studio:`);
          console.log(JSON.stringify(answerMessages, null, 2));
          answer = await askLMStudio(answerMessages, 0.7, 1000);
          if (answer === '__LMSTUDIO_CONNECTION_ERROR__') {
            return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
          }
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
          content: systemPrompt
        },
        ...conversationHistory,
        {
          role: "user",
          content: prompt
        }
      ];

      let aiResponse: any;
      
      if (modelId === 'neironka') {
        // Для Neironka используем только LM Studio
        const content = await askLMStudio(messages, 0.7, 1000);
        if (content === '__LMSTUDIO_CONNECTION_ERROR__') {
          return NextResponse.json({ error: 'У вас нестабильное соединение с моделью. Попробуйте позже.' }, { status: 503 });
        }
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