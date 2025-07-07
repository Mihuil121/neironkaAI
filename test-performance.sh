#!/bin/bash

echo "🧪 Тестирование производительности LM Studio..."

# Проверяем, что сервер запущен
if ! curl -s http://localhost:1234/v1/models > /dev/null; then
    echo "❌ LM Studio сервер не запущен на порту 1234"
    echo "🚀 Запустите: ./start-lmstudio.sh"
    exit 1
fi

echo "✅ Сервер LM Studio доступен"

# Тестовый запрос
echo "📝 Отправка тестового запроса..."

TEST_REQUEST='{
  "model": "local-model",
  "messages": [
    {"role": "system", "content": "Ты Fox AI - дружелюбный помощник. Отвечай кратко на русском языке."},
    {"role": "user", "content": "Привет! Как дела?"}
  ],
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
}'

# Измеряем время ответа
START_TIME=$(date +%s.%N)

RESPONSE=$(curl -s -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "$TEST_REQUEST")

END_TIME=$(date +%s.%N)

# Вычисляем время выполнения
ELAPSED_TIME=$(echo "$END_TIME - $START_TIME" | bc -l)

echo "⏱️  Время ответа: ${ELAPSED_TIME} секунд"

# Извлекаем ответ
RESPONSE_TEXT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content' 2>/dev/null)

if [ "$RESPONSE_TEXT" != "null" ] && [ -n "$RESPONSE_TEXT" ]; then
    echo "✅ Ответ получен:"
    echo "📄 $RESPONSE_TEXT"
    
    # Подсчитываем токены
    TOKEN_COUNT=$(echo "$RESPONSE_TEXT" | wc -w)
    TOKENS_PER_SECOND=$(echo "scale=2; $TOKEN_COUNT / $ELAPSED_TIME" | bc -l)
    
    echo "📊 Статистика:"
    echo "   - Токенов в ответе: $TOKEN_COUNT"
    echo "   - Скорость: ${TOKENS_PER_SECOND} токенов/сек"
    
    if (( $(echo "$TOKENS_PER_SECOND > 20" | bc -l) )); then
        echo "🚀 Отличная производительность!"
    elif (( $(echo "$TOKENS_PER_SECOND > 10" | bc -l) )); then
        echo "✅ Хорошая производительность"
    else
        echo "⚠️  Низкая производительность, проверьте настройки"
    fi
else
    echo "❌ Ошибка получения ответа"
    echo "🔍 Ответ сервера:"
    echo "$RESPONSE"
fi

echo ""
echo "🔧 Рекомендации по оптимизации:"
echo "   1. Увеличьте GPU Layers до 35-40"
echo "   2. Установите CPU Threads = 8"
echo "   3. Используйте Q4_K_M квантизацию"
echo "   4. Закройте другие приложения" 