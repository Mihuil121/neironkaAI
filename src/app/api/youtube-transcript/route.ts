import { NextRequest, NextResponse } from 'next/server';
const YoutubeTranscript = require('youtube-transcript').YouTubeTranscript;

function extractVideoID(url: string): string | null {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL не предоставлен' }, { status: 400 });
    }
    const videoID = extractVideoID(url);
    if (!videoID) {
      return NextResponse.json({ error: 'Неверный формат YouTube URL' }, { status: 400 });
    }
    let transcript: any[] = [];
    try {
      // Пробуем получить русские субтитры
      transcript = await YoutubeTranscript.fetchTranscript(videoID, { lang: 'ru' });
      if (!transcript || transcript.length === 0) {
        // Если русские недоступны, пробуем английские
        transcript = await YoutubeTranscript.fetchTranscript(videoID, { lang: 'en' });
      }
    } catch (err) {
      // Если ошибка — пробуем английские субтитры
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoID, { lang: 'en' });
      } catch (err2) {
        transcript = [];
      }
    }
    let transcriptText = '';
    if (transcript && transcript.length > 0) {
      transcriptText = transcript.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
    }
    if (!transcriptText || transcriptText.length < 50) {
      transcriptText = `Видео ID: ${videoID}\n\nТранскрипт/субтитры недоступны для этого видео. Возможные причины:\n- Видео не имеет субтитров\n- Субтитры отключены автором\n- Видео приватное или недоступно\n\nПопробуйте другое видео или обратитесь к автору для включения субтитров.`;
    }
    return NextResponse.json({ transcript: transcriptText, videoId: videoID });
  } catch (error: any) {
    return NextResponse.json({ error: 'Ошибка при получении субтитров YouTube: ' + (error.message || 'Неизвестная ошибка') }, { status: 500 });
  }
} 