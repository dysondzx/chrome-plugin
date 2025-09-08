// Kimi API 配置文件
// 请在此处填写您的 Kimi API 配置信息

const KIMI_CONFIG = {
  // Kimi API 基础URL
  API_BASE_URL: 'https://api.moonshot.cn/v1',
  
  // 您的 Kimi API Key
  // 请到 https://platform.moonshot.cn/ 获取您的 API Key
  API_KEY: 'sk-KMwxBZIbaT02zkmF2CQqBy6FhZKASxmqngShjBAt13Bhx1HE',
  
  // 模型名称
  MODEL: 'moonshot-v1-8k',
  
  // 请求超时时间（毫秒）
  TIMEOUT: 30000,
  
  // 最大重试次数
  MAX_RETRIES: 3
};

// 导出配置供其他文件使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KIMI_CONFIG;
} else if (typeof window !== 'undefined') {
  window.KIMI_CONFIG = KIMI_CONFIG;
}
