// 内容脚本 - 处理页面文本选择和悬浮弹窗
(function() {
  'use strict';
  
  // 全局变量
  let floatingPanel = null; // 悬浮面板元素
  let selectedText = ''; // 选中的文本
  let selectionRange = null; // 选中文本的范围
  let isPanelVisible = false; // 面板是否可见
  let currentConfig = null; // 当前配置
  let debounceTimer = null; // 防抖定时器
  let isProcessing = false; // 是否正在处理功能请求
  let hideTimer = null; // 隐藏定时器
  let panelObserver = null; // 面板状态观察器
  
  // 初始化
  init();
  
  /**
   * 初始化插件
   */
  function init() {
    // 加载配置
    loadConfig();
    
    // 监听文本选择事件
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);
    
    // 监听点击事件，用于隐藏面板
    document.addEventListener('click', handleDocumentClick);
    
    // 监听ESC键，用于隐藏面板
    document.addEventListener('keydown', handleKeyDown);
    
    // 监听来自popup的消息（保留用于其他功能）
    chrome.runtime.onMessage.addListener(handleMessage);
  }
  
  /**
   * 加载配置
   */
  async function loadConfig() {
    try {
      // 直接使用config.js中的配置
      if (typeof KIMI_CONFIG !== 'undefined') {
        currentConfig = {
          apiKey: KIMI_CONFIG.API_KEY,
          apiUrl: KIMI_CONFIG.API_BASE_URL
        };
        console.log('使用config.js配置:', currentConfig);
      } else {
        // 如果config.js未加载，使用默认配置
        currentConfig = {
          apiKey: '',
          apiUrl: 'https://api.moonshot.cn/v1'
        };
        console.warn('config.js未加载，使用默认配置');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      currentConfig = {
        apiKey: '',
        apiUrl: 'https://api.moonshot.cn/v1'
      };
    }
  }
  
  /**
   * 处理文本选择事件
   * @param {Event} event - 事件对象
   */
  function handleTextSelection(event) {
    // 清除之前的防抖定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // 设置防抖，300ms后执行
    debounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        // 有选中文本
        selectedText = text;
        selectionRange = selection.getRangeAt(0);
        showFloatingPanel(event);
      } else {
        // 没有选中文本，隐藏面板
        hideFloatingPanel();
      }
    }, 300);
  }
  
  /**
   * 显示悬浮面板
   * @param {Event} event - 触发事件
   */
  function showFloatingPanel(event) {
    if (isPanelVisible) {
      updatePanelPosition();
      return;
    }
    
    // 创建悬浮面板
    createFloatingPanel();
    
    // 设置面板位置
    updatePanelPosition();
    
    // 显示面板
    floatingPanel.style.display = 'block';
    isPanelVisible = true;
    
    // 添加淡入动画
    setTimeout(() => {
      floatingPanel.classList.add('show');
    }, 10);
  }
  
  /**
   * 创建悬浮面板
   */
  function createFloatingPanel() {
    if (floatingPanel) {
      floatingPanel.remove();
    }
    
    floatingPanel = document.createElement('div');
    floatingPanel.id = 'text-assistant-panel';
    floatingPanel.className = 'text-assistant-panel';
    
    // 面板HTML结构
    floatingPanel.innerHTML = `
      <div class="panel-header">
        <button class="function-btn" data-function="explain" title="解释">
          <span class="icon">📖</span>
          <span class="text">解释</span>
        </button>
        <button class="function-btn" data-function="translate" title="翻译">
          <span class="icon">🌐</span>
          <span class="text">翻译</span>
        </button>
        <button class="function-btn" data-function="speak" title="朗读">
          <span class="icon">🔊</span>
          <span class="text">朗读</span>
        </button>
        <button class="function-btn" data-function="polish" title="润色">
          <span class="icon">✨</span>
          <span class="text">润色</span>
        </button>
      </div>
      <div class="panel-content" id="panel-content">
        <!-- 动态内容将在这里显示 -->
      </div>
    `;
    
    // 添加到页面
    document.body.appendChild(floatingPanel);
    
    // 防止面板点击事件冒泡
    floatingPanel.addEventListener('click', function(e) {
      console.log('面板点击事件被阻止');
      e.stopPropagation();
    });
    
    // 设置面板状态观察器
    setupPanelObserver();
    
    // 绑定按钮点击事件
    bindPanelEvents();
  }
  
  /**
   * 设置面板状态观察器
   */
  function setupPanelObserver() {
    if (panelObserver) {
      panelObserver.disconnect();
    }
    
    panelObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target === floatingPanel) {
            const display = target.style.display;
            const opacity = getComputedStyle(target).opacity;
            console.log('面板样式变化:', { display, opacity, isPanelVisible });
            
            // 如果面板被意外隐藏，重新显示
            if (display === 'none' && isPanelVisible && !isProcessing) {
              console.log('检测到面板被意外隐藏，重新显示');
              target.style.display = 'block';
              target.classList.add('show');
            }
          }
        }
      });
    });
    
    panelObserver.observe(floatingPanel, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  /**
   * 绑定面板事件
   */
  function bindPanelEvents() {
    const buttons = floatingPanel.querySelectorAll('.function-btn');
    
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        const functionType = this.dataset.function;
        console.log('功能按钮点击:', functionType);
        handleFunctionClick(functionType);
      });
    });
  }
  
  /**
   * 处理功能按钮点击
   * @param {string} functionType - 功能类型
   */
  async function handleFunctionClick(functionType) {
    if (!selectedText) return;
    
    // 设置处理状态
    isProcessing = true;
    
    // 清除隐藏定时器
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    
    // 确保面板保持可见
    if (!isPanelVisible) {
      showFloatingPanel();
    }
    
    // 更新按钮状态
    updateButtonStates(functionType);
    
    // 显示加载状态
    showLoadingState(functionType);
    
    try {
      switch (functionType) {
        case 'explain':
          await handleExplain();
          break;
        case 'translate':
          await handleTranslate();
          break;
        case 'speak':
          await handleSpeak();
          break;
        case 'polish':
          await handlePolish();
          break;
      }
    } catch (error) {
      console.error(`${functionType} 功能执行失败:`, error);
      showErrorState(functionType, error.message);
    } finally {
      // 处理完成，重置状态
      isProcessing = false;
    }
  }
  
  /**
   * 更新按钮状态
   * @param {string} activeFunction - 当前激活的功能
   */
  function updateButtonStates(activeFunction) {
    const buttons = floatingPanel.querySelectorAll('.function-btn');
    
    buttons.forEach(button => {
      if (button.dataset.function === activeFunction) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
  
  /**
   * 显示加载状态
   * @param {string} functionType - 功能类型
   */
  function showLoadingState(functionType) {
    const content = document.getElementById('panel-content');
    const functionNames = {
      explain: '解释',
      translate: '翻译',
      speak: '朗读',
      polish: '润色'
    };
    
    content.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在${functionNames[functionType]}中...</div>
      </div>
    `;
  }
  
  /**
   * 显示错误状态
   * @param {string} functionType - 功能类型
   * @param {string} errorMessage - 错误消息
   */
  function showErrorState(functionType, errorMessage) {
    const content = document.getElementById('panel-content');
    const functionNames = {
      explain: '解释',
      translate: '翻译',
      speak: '朗读',
      polish: '润色'
    };
    
    content.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <div class="error-text">${functionNames[functionType]}失败</div>
        <div class="error-detail">${errorMessage}</div>
        <button class="retry-btn" onclick="handleFunctionClick('${functionType}')">重试</button>
      </div>
    `;
    
    // 防止内容区域点击事件冒泡
    content.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
    // 显示结果后重新计算面板位置
    setTimeout(() => {
      updatePanelPosition();
    }, 10);
  }
  
  /**
   * 处理解释功能
   */
  async function handleExplain() {
    if (!currentConfig.apiKey) {
      throw new Error('请先配置Kimi API Key');
    }
    
    const prompt = `请解释以下文本的含义：\n\n"${selectedText}"\n\n请用简洁明了的中文进行解释。`;
    const result = await callKimiAPI(prompt);
    
    showExplainResult(result);
  }
  
  /**
   * 处理翻译功能
   */
  async function handleTranslate() {
    if (!currentConfig.apiKey) {
      throw new Error('请先配置Kimi API Key');
    }
    
    // 显示语言选择界面
    showTranslateSelection();
  }
  
  /**
   * 显示翻译语言选择界面
   */
  function showTranslateSelection() {
    const content = document.getElementById('panel-content');
    content.innerHTML = `
      <div class="result-section">
        <div class="result-label">选中文本：</div>
        <div class="selected-text">"${selectedText}"</div>
        <div class="result-label">翻译目标：</div>
        <div class="translate-selection">
          <select id="translate-target-lang" class="language-dropdown">
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>
          <button id="confirm-translate-btn" class="translate-button">翻译</button>
        </div>
        <div class="result-label">翻译结果：</div>
        <div id="translation-result-container" class="result-content">
          <!-- 翻译结果将在这里显示 -->
        </div>
      </div>
    `;
    
    // 绑定确认翻译按钮事件
    const confirmBtn = document.getElementById('confirm-translate-btn');
    confirmBtn.addEventListener('click', performTranslation);
    
    // 防止内容区域点击事件冒泡
    content.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
    // 显示结果后重新计算面板位置
    setTimeout(() => {
      updatePanelPosition();
    }, 10);
  }
  
  /**
   * 执行翻译操作
   */
  async function performTranslation() {
    try {
      // 先获取选择的目标语言
      const langSelect = document.getElementById('translate-target-lang');
      
      // 检查元素是否存在
      if (!langSelect) {
        throw new Error('无法获取语言选择元素');
      }
      
      const langValue = langSelect.value;
      const targetLang = {
        'zh': '中文',
        'en': '英文'
      }[langValue];
      
      // 获取结果容器
      const resultContainer = document.getElementById('translation-result-container');
      if (!resultContainer) {
        throw new Error('无法获取结果容器');
      }
      
      // 显示加载状态（但不替换整个界面）
      resultContainer.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">正在翻译中...</div>';
      
      const prompt = `请将以下文本翻译成${targetLang}：\n\n"${selectedText}"\n\n只返回翻译结果，不要其他内容。`;
      const result = await callKimiAPI(prompt);
      
      // 只更新翻译结果内容，不改变其他部分
      resultContainer.innerHTML = result;
      
      // 显示结果后重新计算面板位置
      setTimeout(() => {
        updatePanelPosition();
      }, 10);
      
    } catch (error) {
      console.error('翻译失败:', error);
      
      // 获取结果容器
      const resultContainer = document.getElementById('translation-result-container');
      if (resultContainer) {
        resultContainer.innerHTML = `<div class="error-icon">❌</div><div class="error-text">翻译失败</div><div class="error-detail">${error.message}</div>`;
      } else {
        // 如果找不到容器，使用备用错误显示方式
        showErrorState('translate', error.message);
      }
    } finally {
      isProcessing = false;
    }
  }
  
  // 移除showTranslateResult函数，因为我们不再需要它
  /**
   * 显示翻译结果
   * @param {string} result - 翻译结果
   * @param {string} targetLang - 目标语言
   */
  function showTranslateResult(result, targetLang) {
    console.log('显示翻译结果:', result);
    
    const content = document.getElementById('panel-content');
    content.innerHTML = `
      <div class="result-section">
        <div class="result-label">选中文本：</div>
        <div class="selected-text">"${selectedText}"</div>
        <div class="result-label">翻译目标：</div>
        <div class="target-lang">${targetLang}</div>
        <div class="result-label">翻译结果：</div>
        <div class="result-content">${result}</div>
      </div>
    `;
    
    // 防止内容区域点击事件冒泡
    content.addEventListener('click', function(e) {
      console.log('内容区域点击事件被阻止');
      e.stopPropagation();
    });
    
    // 显示结果后重新计算面板位置
    setTimeout(() => {
      console.log('重新计算面板位置');
      updatePanelPosition();
      
      // 强制确保面板可见
      if (floatingPanel) {
        floatingPanel.style.display = 'block';
        floatingPanel.classList.add('show');
        isPanelVisible = true;
        console.log('强制确保面板可见');
      }
    }, 10);
    
    console.log('翻译结果显示完成，面板可见状态:', isPanelVisible);
  }
  
  /**
   * 处理朗读功能
   */
  async function handleSpeak() {
    // 检测文本语言
    const isChinese = /[\u4e00-\u9fa5]/.test(selectedText);
    const lang = isChinese ? 'zh-CN' : 'en-US';
    
    try {
      // 通过消息传递调用background script中的TTS功能
      try {
        await chrome.runtime.sendMessage({
          type: 'SPEAK_TEXT',
          text: selectedText,
          options: {
            lang: lang,
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
          }
        });
        
        // 直接隐藏面板，实现点击朗读后不显示悬浮框
        showSpeakResult(lang);
      } catch (error) {
        console.error('TTS调用失败，但继续执行备选方案:', error);
        // 即使主方案失败，也继续执行备选方案
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(selectedText);
          utterance.lang = lang;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          speechSynthesis.speak(utterance);
          showSpeakResult(lang);
        }
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
  
  /**
   * 处理润色功能
   */
  async function handlePolish() {
    if (!currentConfig.apiKey) {
      throw new Error('请先配置Kimi API Key');
    }
    
    const prompt = `请对以下文本进行润色，使其更加优美、流畅：\n\n"${selectedText}"\n\n只返回润色后的文本，不要其他内容。`;
    const result = await callKimiAPI(prompt);
    
    showPolishResult(result);
  }
  
  /**
   * 调用Kimi API
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} API响应结果
   */
  async function callKimiAPI(prompt) {
    const response = await fetch(`${currentConfig.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentConfig.apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('API响应格式错误');
    }
    
    return data.choices[0].message.content.trim();
  }
  
  /**
   * 显示解释结果
   * @param {string} result - 解释结果
   */
  function showExplainResult(result) {
    console.log('显示解释结果:', result);
    
    const content = document.getElementById('panel-content');
    content.innerHTML = `
      <div class="result-section">
        <div class="result-label">选中文本：</div>
        <div class="selected-text">"${selectedText}"</div>
        <div class="result-label">解释结果：</div>
        <div class="result-content">${result}</div>
      </div>
    `;
    
    // 防止内容区域点击事件冒泡
    content.addEventListener('click', function(e) {
      console.log('内容区域点击事件被阻止');
      e.stopPropagation();
    });
    
    // 显示结果后重新计算面板位置
    setTimeout(() => {
      console.log('重新计算面板位置');
      updatePanelPosition();
      
      // 强制确保面板可见
      if (floatingPanel) {
        floatingPanel.style.display = 'block';
        floatingPanel.classList.add('show');
        isPanelVisible = true;
        console.log('强制确保面板可见');
      }
    }, 10);
    
    console.log('解释结果显示完成，面板可见状态:', isPanelVisible);
  }
  
  /**
   * 显示朗读结果
   * @param {string} lang - 语言代码
   */
  function showSpeakResult(lang) {
    console.log('显示朗读结果:', lang);
    
    // 直接隐藏面板，实现点击朗读后不显示悬浮框
    setTimeout(() => {
      hideFloatingPanel();
    }, 300);
  }
  
  /**
   * 显示润色结果
   * @param {string} result - 润色结果
   */
  function showPolishResult(result) {
    console.log('显示润色结果:', result);
    
    const content = document.getElementById('panel-content');
    content.innerHTML = `
      <div class="result-section">
        <div class="result-label">选中文本：</div>
        <div class="selected-text">"${selectedText}"</div>
        <div class="result-label">润色结果：</div>
        <textarea class="polish-textarea" id="polish-textarea">${result}</textarea>
        <div class="polish-controls">
          <button class="control-btn" onclick="editPolishText()">编辑</button>
          <button class="control-btn primary" onclick="replaceText()">一键替换</button>
          <button class="control-btn" onclick="handleFunctionClick('polish')">重新润色</button>
        </div>
      </div>
    `;
    
    // 防止内容区域点击事件冒泡
    content.addEventListener('click', function(e) {
      console.log('内容区域点击事件被阻止');
      e.stopPropagation();
    });
    
    // 显示结果后重新计算面板位置
    setTimeout(() => {
      console.log('重新计算面板位置');
      updatePanelPosition();
      
      // 强制确保面板可见
      if (floatingPanel) {
        floatingPanel.style.display = 'block';
        floatingPanel.classList.add('show');
        isPanelVisible = true;
        console.log('强制确保面板可见');
      }
    }, 10);
    
    console.log('润色结果显示完成，面板可见状态:', isPanelVisible);
  }
  
  
  /**
   * 更新面板位置
   */
  function updatePanelPosition() {
    if (!floatingPanel || !selectionRange) return;
    
    const rect = selectionRange.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 获取面板实际尺寸
    const panelWidth = floatingPanel.offsetWidth || 320;
    const panelHeight = floatingPanel.offsetHeight || 100;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 计算面板位置（选中文本上方10px）
    const panelTop = rect.top + scrollTop - 10;
    const panelLeft = rect.left + scrollLeft;
    
    let finalLeft = panelLeft;
    let finalTop = panelTop - panelHeight;
    
    // 水平位置调整
    if (finalLeft + panelWidth > viewportWidth) {
      finalLeft = viewportWidth - panelWidth - 10;
    }
    if (finalLeft < 10) {
      finalLeft = 10;
    }
    
    // 垂直位置调整 - 优先显示在选中文本上方
    if (finalTop < 10) {
      // 如果上方空间不够，显示在选中文本下方
      finalTop = rect.bottom + scrollTop + 10;
    }
    
    // 确保面板不超出视窗底部
    if (finalTop + panelHeight > viewportHeight + scrollTop) {
      finalTop = viewportHeight + scrollTop - panelHeight - 10;
    }
    
    floatingPanel.style.left = finalLeft + 'px';
    floatingPanel.style.top = finalTop + 'px';
  }
  
  /**
   * 隐藏悬浮面板
   */
  function hideFloatingPanel() {
    if (!floatingPanel || !isPanelVisible) return;
    
    // 如果正在处理功能请求，不隐藏面板
    if (isProcessing) {
      console.log('正在处理功能请求，不隐藏面板');
      return;
    }
    
    console.log('隐藏面板');
    floatingPanel.classList.remove('show');
    
    setTimeout(() => {
      if (floatingPanel && !isProcessing) {
        floatingPanel.style.display = 'none';
        isPanelVisible = false;
        console.log('面板已隐藏');
      }
    }, 150);
  }
  
  /**
   * 处理文档点击事件
   * @param {Event} event - 点击事件
   */
  function handleDocumentClick(event) {
    // 如果面板不存在或不可见，直接返回
    if (!floatingPanel || !isPanelVisible) return;
    
    // 如果正在处理功能请求，不隐藏面板
    if (isProcessing) return;
    
    // 检查点击目标是否在面板内
    if (floatingPanel.contains(event.target)) {
      return; // 点击在面板内，不隐藏
    }
    
    // 检查是否点击了功能按钮
    if (event.target.classList.contains('function-btn') || 
        event.target.closest('.function-btn')) {
      return; // 点击了功能按钮，不隐藏
    }
    
    // 检查是否点击了控制按钮
    if (event.target.classList.contains('control-btn') || 
        event.target.closest('.control-btn')) {
      return; // 点击了控制按钮，不隐藏
    }
    
    // 延迟隐藏面板，给用户一些时间
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    
    hideTimer = setTimeout(() => {
      hideFloatingPanel();
    }, 100);
  }
  
  /**
   * 处理键盘事件
   * @param {Event} event - 键盘事件
   */
  function handleKeyDown(event) {
    if (event.key === 'Escape' && isPanelVisible) {
      hideFloatingPanel();
    }
  }
  
  /**
   * 处理来自popup的消息
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者
   * @param {Function} sendResponse - 响应函数
   */
  function handleMessage(message, sender, sendResponse) {
    // 保留消息处理函数，用于其他可能的通信需求
    if (message.type === 'GET_CONFIG') {
      sendResponse({ config: currentConfig });
    }
  }
  
  // 将函数暴露到全局作用域，供HTML中的onclick使用
  window.handleFunctionClick = handleFunctionClick;
  window.editPolishText = editPolishText;
  window.replaceText = replaceText;
  window.speakText = speakText;
  window.pauseTTS = pauseTTS;
  window.stopTTS = stopTTS;
  window.performTranslation = performTranslation;
  
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
  
  // 修复润色结果中的onclick事件处理
  function editPolishText() {
    const textarea = document.getElementById('polish-textarea');
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
  }
  
  function replaceText() {
    const textarea = document.getElementById('polish-textarea');
    if (textarea && selectionRange) {
      const newText = textarea.value;
      
      // 替换选中文本
      selectionRange.deleteContents();
      selectionRange.insertNode(document.createTextNode(newText));
      
      // 清除选择
      window.getSelection().removeAllRanges();
      
      // 隐藏面板
      hideFloatingPanel();
    }
  }
  
})();
