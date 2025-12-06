// সাউন্ড প্লে করার হেল্পার ফাংশন
export const playSound = (type: 'message' | 'calling' | 'incoming') => {
  const sounds = {
    message: 'https://cdn.pixabay.com/audio/2022/10/30/audio_50239f60f6.mp3', // Pop sound
    calling: 'https://cdn.pixabay.com/audio/2024/05/17/audio_f62b160233.mp3', // Trring Trring
    incoming: 'https://cdn.pixabay.com/audio/2021/08/11/audio_c97693e29e.mp3', // Ringtone
  };

  const audio = new Audio(sounds[type]);
  audio.loop = type === 'calling' || type === 'incoming'; // কলিং হলে বাজতেই থাকবে
  audio.play().catch(e => console.log("Audio play failed:", e));
  return audio; // অডিও অবজেক্ট ফেরত দেব যাতে পরে বন্ধ করা যায়
};