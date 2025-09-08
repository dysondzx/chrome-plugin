# TTS朗读功能修复说明

## 问题描述
用户反馈：点击朗读按钮报错：
```
content.js:257 speak 功能执行失败: TypeError: Cannot read properties of undefined (reading 'speak')
```

## 问题原因
`chrome.tts` API 在 content script 中不可用，只能在 background script 或 service worker 中使用。

## 修复方案

### 1. 创建 Background Script
创建了 `background.js` 文件来处理 TTS 功能：

```javascript
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
```

### 2. 更新 Manifest.json
添加了 background service worker 配置：

```json
{
  "background": {
    "service_worker": "background.js"
  }
}
```

### 3. 修改 Content Script
更新了 `content.js` 中的朗读功能：

```javascript
async function handleSpeak() {
  // 检测文本语言
  const isChinese = /[\u4e00-\u9fa5]/.test(selectedText);
  const lang = isChinese ? 'zh-CN' : 'en-US';
  
  try {
    // 通过消息传递调用background script中的TTS功能
    const response = await chrome.runtime.sendMessage({
      type: 'SPEAK_TEXT',
      text: selectedText,
      options: {
        lang: lang,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      }
    });
    
    if (response && response.success) {
      showSpeakResult(lang);
    } else {
      throw new Error(response ? response.error : 'TTS调用失败');
    }
  } catch (error) {
    console.error('TTS调用失败:', error);
    // 如果TTS不可用，使用Web Speech API作为备选方案
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(selectedText);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        speechSynthesis.speak(utterance);
        showSpeakResult(lang);
      } else {
        throw new Error('浏览器不支持语音合成功能');
      }
    } catch (fallbackError) {
      console.error('备选TTS方案也失败:', fallbackError);
      throw new Error('语音朗读功能不可用，请检查浏览器设置');
    }
  }
}
```

### 4. 添加TTS控制函数
添加了播放、暂停、停止控制函数：

```javascript
// TTS控制函数
async function speakText(text, lang) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SPEAK_TEXT',
      text: text,
      options: {
        lang: lang,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      }
    });
    
    if (!response || !response.success) {
      throw new Error('TTS调用失败');
    }
  } catch (error) {
    console.error('TTS播放失败:', error);
    // 使用Web Speech API作为备选方案
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      speechSynthesis.speak(utterance);
    }
  }
}

async function pauseTTS() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TTS_PAUSE'
    });
    
    if (!response || !response.success) {
      throw new Error('TTS暂停失败');
    }
  } catch (error) {
    console.error('TTS暂停失败:', error);
    // 使用Web Speech API作为备选方案
    if ('speechSynthesis' in window) {
      speechSynthesis.pause();
    }
  }
}

async function stopTTS() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TTS_STOP'
    });
    
    if (!response || !response.success) {
      throw new Error('TTS停止失败');
    }
  } catch (error) {
    console.error('TTS停止失败:', error);
    // 使用Web Speech API作为备选方案
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
}
```

## 双重保障机制

### 1. Chrome TTS API（主要方案）
- 通过 background script 调用 Chrome 内置 TTS API
- 支持更多语言和更好的语音质量
- 需要 "tts" 权限

### 2. Web Speech API（备选方案）
- 如果 Chrome TTS 不可用，自动切换到 Web Speech API
- 浏览器原生支持，无需额外权限
- 兼容性更好，但功能相对有限

## 测试步骤

1. **重新加载插件**
   - 在 `chrome://extensions/` 页面点击"重新加载"按钮
   - 确保 `background.js` 已正确加载

2. **测试朗读功能**
   - 选中任意文本
   - 点击朗读按钮
   - 观察控制台是否有错误信息

3. **测试控制按钮**
   - 点击播放按钮
   - 点击暂停按钮
   - 点击停止按钮

## 预期结果

- 朗读功能正常工作，不再报错
- 控制按钮（播放、暂停、停止）正常工作
- 支持中英文朗读
- 如果 Chrome TTS 不可用，自动使用 Web Speech API

## 故障排除

### 如果仍然报错
1. 检查 `background.js` 是否正确加载
2. 查看控制台是否有其他错误信息
3. 确认插件权限设置正确

### 如果朗读不工作
1. 检查系统音量设置
2. 确认浏览器支持语音功能
3. 查看控制台是否有备选方案的错误信息

## 更新文件列表
- `background.js` - 新增，处理TTS功能
- `content.js` - 修改，更新朗读功能实现
- `manifest.json` - 修改，添加background service worker
- `TTS功能修复说明.md` - 本说明文档

---

**修复版本**：v1.0.3  
**修复时间**：2024年1月  
**修复状态**：已完成TTS功能修复
