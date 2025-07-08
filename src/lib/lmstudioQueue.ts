import PQueue from 'p-queue';

// Очередь с одним одновременным запросом
const queue = new PQueue({ concurrency: 1 });

// Функция-обёртка для обращения к LM Studio через очередь
export async function askLMStudioWithQueue<T>(fn: () => Promise<T>): Promise<T> {
  return queue.add(fn) as Promise<T>;
} 