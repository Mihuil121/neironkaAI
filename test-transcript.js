const { YoutubeTranscript } = require('youtube-transcript');

async function testTranscript() {
  const testVideos = [
    'dQw4w9WgXcQ', // Rick Astley - популярное видео с субтитрами
    'NE71zcpIbAo'  // Ваше видео
  ];
  
  for (const videoId of testVideos) {
    console.log(`\nТестируем видео: ${videoId}`);
    
    try {
      // Попытка получить транскрипт
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      console.log('✅ Транскрипт получен!');
      console.log('Количество сегментов:', transcript.length);
      console.log('Первые 200 символов:', transcript.slice(0, 3).map(t => t.text).join(' ').substring(0, 200));
      
    } catch (error) {
      console.log('❌ Ошибка получения транскрипта:', error.message);
      
      // Попытка с русскими субтитрами
      try {
        console.log('Пробуем русские субтитры...');
        const russianTranscript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ru' });
        console.log('✅ Русские субтитры получены!');
        console.log('Количество сегментов:', russianTranscript.length);
      } catch (russianError) {
        console.log('❌ Русские субтитры тоже недоступны:', russianError.message);
      }
    }
  }
}

testTranscript().catch(console.error); 