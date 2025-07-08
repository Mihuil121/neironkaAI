# Автоматизация поиска и анализа информации с 4 реальных сайтов

## Алгоритм (шаги)

1. **Реальный поиск** — получить 4 настоящие ссылки, где есть информация (а не фейковые).
2. **Для каждой из 4 ссылок:**
   - Извлечь текст с помощью `/api/url-extract` (или своего алгоритма).
   - Отправить этот текст на анализ ИИ (например, через `/api/compress` или сразу в чат с промптом "Проанализируй сайт по теме ...").
   - Сохранить результат анализа для каждой ссылки отдельно.
3. **Финальный шаг:**  
   - Собрать все анализы по сайтам.
   - Отправить их ИИ с промптом:  
     "Пользователь хочет: [запрос]. Вот анализы по сайтам: [анализ1], [анализ2], ... Сформулируй итоговый ответ для пользователя."

---

## Пример кода (Node.js/Next.js, TypeScript, серверная функция)

```typescript
// 1. Получаем 4 реальных ссылки через search API
const links = await realWebSearch(query); // массив из 4 url

// 2. Для каждой ссылки:
const analyses = [];
for (const url of links) {
  // 2.1. Извлекаем текст
  const extractRes = await fetch('http://localhost:3000/api/url-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const { text } = await extractRes.json();
  if (!text) continue;
  // 2.2. Анализируем текст через ИИ
  const compressRes = await fetch('http://localhost:3000/api/compress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language: 'ru', apiKey })
  });
  const { result } = await compressRes.json();
  analyses.push({ url, analysis: result });
}

// 3. Собираем финальный промпт
const finalPrompt = `
Пользователь хочет: ${query}
Вот анализы по сайтам:
${analyses.map((a, i) => `[${i+1}] ${a.url}\n${a.analysis}`).join('\n\n')}
Сформулируй итоговый ответ для пользователя, используя эти данные.
`;

// 4. Отправляем финальный промпт в ИИ и возвращаем ответ пользователю
const finalRes = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: finalPrompt, language: 'ru', apiKey })
});
const { answer } = await finalRes.json();
```

---

## Как получить 4 настоящие ссылки (пример)

- Используй SerpAPI, Bing Web Search API, Google Custom Search API или любой другой search API.
- Пример для SerpAPI:

```typescript
async function realWebSearch(query: string): Promise<string[]> {
  const apiKey = 'ТВОЙ_SERPAPI_KEY';
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=4&engine=google&api_key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  // Вытаскиваем только реальные ссылки с результатами
  return (data.organic_results || [])
    .map((r: any) => r.link)
    .filter((link: string) => link && link.startsWith('http'))
    .slice(0, 4);
}
```

---

## Пример промпта для анализа сайта

- Для анализа каждого сайта:
  - "Проанализируй этот сайт по теме: [запрос пользователя]. Вот текст: [текст сайта]"
- Для финального ответа:
  - "Пользователь хочет: [запрос]. Вот анализы по сайтам: [анализ1], [анализ2], ... Сформулируй итоговый ответ для пользователя."

---

## Советы
- Если какой-то сайт не даёт текст — пропускай его и бери следующий из поиска.
- Можно делать все запросы параллельно (Promise.all), чтобы ускорить обработку.
- Не забывай про лимиты и ошибки API.

---

**Этот файл можно дорабатывать и использовать как шаблон для автоматизации поиска и анализа!** 