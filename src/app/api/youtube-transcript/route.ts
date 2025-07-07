import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL не предоставлен' },
        { status: 400 }
      );
    }

    // Извлекаем ID видео из URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Неверный формат YouTube URL' },
        { status: 400 }
      );
    }

    let transcript: any[] = [];
    let videoInfo: any = {};

    try {
      // Попытка 1: Получение транскрипта с таймаутом
      transcript = await Promise.race([
        YoutubeTranscript.fetchTranscript(videoId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Таймаут получения транскрипта')), 10000)
        )
      ]) as any[];

      console.log('Транскрипт успешно получен, сегментов:', transcript.length);

    } catch (transcriptError: any) {
      console.log('Ошибка получения транскрипта:', transcriptError.message);
      
      // Попытка 2: Альтернативный метод с русскими субтитрами
      try {
        transcript = await Promise.race([
          YoutubeTranscript.fetchTranscript(videoId, { lang: 'ru' }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут получения русских субтитров')), 8000)
          )
        ]) as any[];
        
        console.log('Русские субтитры получены, сегментов:', transcript.length);
      } catch (russianError: any) {
        console.log('Русские субтитры недоступны:', russianError.message);
      }
    }

    // Если транскрипт получен, форматируем его
    let transcriptText = '';
    if (transcript && transcript.length > 0) {
      transcriptText = transcript
        .map((item: any) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Если транскрипт недоступен, создаем базовую информацию
    if (!transcriptText || transcriptText.length < 50) {
      transcriptText = `Видео ID: ${videoId}\n\nТранскрипт/субтитры недоступны для этого видео. Возможные причины:\n- Видео не имеет субтитров\n- Субтитры отключены автором\n- Видео приватное или недоступно\n\nПопробуйте другое видео или обратитесь к автору для включения субтитров.`;
      
      videoInfo = {
        title: 'Транскрипт недоступен',
        description: 'Это видео не имеет доступных субтитров или транскрипта',
        videoId: videoId,
        hasTranscript: false
      };
    } else {
      videoInfo = {
        title: 'Транскрипт получен',
        description: `Успешно получен транскрипт из ${transcript.length} сегментов`,
        videoId: videoId,
        hasTranscript: true,
        segments: transcript.length
      };
    }

    return NextResponse.json({
      transcript: transcriptText,
      videoId: videoId,
      videoInfo: videoInfo,
      segments: transcript
    });

  } catch (error: any) {
    console.error('Ошибка обработки запроса:', error);
    
    let errorMessage = 'Ошибка при получении данных видео';
    
    if (error.message.includes('Таймаут')) {
      errorMessage = 'Превышено время ожидания. Сервер YouTube может быть перегружен.';
    } else if (error.message.includes('not found')) {
      errorMessage = 'Видео не найдено или недоступно.';
    } else if (error.message.includes('transcript')) {
      errorMessage = 'Транскрипт недоступен для этого видео.';
    } else if (error.message.includes('private')) {
      errorMessage = 'Видео является приватным или недоступно.';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
} 