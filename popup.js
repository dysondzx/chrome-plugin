// 弹窗页面脚本
document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const statusDiv = document.getElementById('configStatus');
  
  // 检查配置状态
  checkConfigStatus();
  
  /**
   * 检查配置状态
   */
  async function checkConfigStatus() {
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        // 向content script发送消息获取配置状态
        const response = await chrome.tabs.sendMessage(tab.id, { 
          type: 'GET_CONFIG'
        });
        
        if (response && response.config) {
          const config = response.config;
          
          if (config.apiKey && config.apiKey !== 'YOUR_KIMI_API_KEY_HERE') {
            showStatus('✅ 配置正常，API功能可用', 'success');
          } else {
            showStatus('⚠️ 请先在config.js中配置API Key', 'error');
          }
        } else {
          showStatus('❌ 无法获取配置信息', 'error');
        }
      } else {
        showStatus('❌ 无法访问当前页面', 'error');
      }
    } catch (error) {
      console.error('检查配置失败:', error);
      showStatus('❌ 检查配置失败，请刷新页面后重试', 'error');
    }
  }
  
  /**
   * 显示状态信息
   * @param {string} message - 状态消息
   * @param {string} type - 状态类型 (success/error)
   */
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }
});
