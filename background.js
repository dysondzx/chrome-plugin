// Background Script - 处理TTS功能
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SPEAK_TEXT') {
    try {
      // 使用Chrome TTS API
      chrome.tts.speak(request.text, {
        lang: request.options.lang,
        rate: request.options.rate,
        pitch: request.options.pitch,
        volume: request.options.volume
      }, () => {
        // TTS开始播放
        sendResponse({ success: true });
      });
      
      // 返回true表示异步响应
      return true;
    } catch (error) {
      console.error('TTS错误:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (request.type === 'TTS_PAUSE') {
    try {
      chrome.tts.pause();
      sendResponse({ success: true });
    } catch (error) {
      console.error('TTS暂停错误:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (request.type === 'TTS_STOP') {
    try {
      chrome.tts.stop();
      sendResponse({ success: true });
    } catch (error) {
      console.error('TTS停止错误:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
});
