export const playSound = (type: 'calling' | 'incoming') => {
  const audio = new Audio();
  
  if (type === 'calling') {
    // আউটগোয়িং কল রিংটোন
    audio.src = 'https://actions.google.com/sounds/v1/telephony/phone_dialing.ogg';
    audio.loop = true;
  } else if (type === 'incoming') {
    // ইনকামিং কল রিংটোন
    audio.src = 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';
    audio.loop = true;
  }

  audio.play().catch(error => console.log("Audio play failed:", error));
  return audio;
};