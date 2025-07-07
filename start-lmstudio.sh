#!/bin/bash

echo "🚀 Запуск LM Studio с оптимизированными настройками..."

# Проверяем, что LM Studio установлен
LMSTUDIO_PATH="$HOME/lm-studio/LM-Studio-0.3.16-8-x64.AppImage"

if [ ! -f "$LMSTUDIO_PATH" ]; then
    echo "❌ LM Studio не найден по пути: $LMSTUDIO_PATH"
    echo "📥 Скачайте LM Studio с https://lmstudio.ai/"
    exit 1
fi

# Создаем директорию для логов
mkdir -p ~/.lmstudio/logs

# Экспортируем переменные для оптимизации
export CUDA_VISIBLE_DEVICES=0
export OMP_NUM_THREADS=8
export MKL_NUM_THREADS=8

# Запускаем LM Studio с оптимизированными параметрами
echo "🔧 Запуск с параметрами:"
echo "   - GPU: RTX 4060 (8GB VRAM)"
echo "   - CPU: i5-12400F (12 ядер)"
echo "   - RAM: 32GB"
echo "   - GPU Layers: 35"
echo "   - CPU Threads: 8"

# Запускаем LM Studio
$LMSTUDIO_PATH \
    --no-sandbox \
    --disable-gpu-sandbox \
    --disable-dev-shm-usage \
    --disable-web-security \
    --allow-running-insecure-content \
    --disable-features=VizDisplayCompositor \
    --log-level=0 \
    > ~/.lmstudio/logs/lmstudio.log 2>&1 &

echo "✅ LM Studio запущен в фоне"
echo "📊 Логи сохраняются в: ~/.lmstudio/logs/lmstudio.log"
echo "🌐 Откройте http://localhost:1234 для доступа к API"
echo ""
echo "📋 Рекомендуемые модели для скачивания:"
echo "   1. Qwen2.5-7B-Instruct-Q4_K_M.gguf (4.2GB) - ОСНОВНАЯ"
echo "   2. Phi-3.5-3.8B-Instruct-Q4_K_M.gguf (2.3GB) - БЫСТРАЯ"
echo "   3. Qwen2.5-3B-Instruct-Q4_K_M.gguf (1.9GB) - КОМПАКТНАЯ"
echo ""
echo "🔗 Ссылки для скачивания:"
echo "   https://huggingface.co/TheBloke/Qwen2.5-7B-Instruct-GGUF"
echo "   https://huggingface.co/TheBloke/Phi-3.5-3.8B-Instruct-GGUF"
echo "   https://huggingface.co/TheBloke/Qwen2.5-3B-Instruct-GGUF" 