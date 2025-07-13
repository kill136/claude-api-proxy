export default {
  async fetch(request, env, ctx) {
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
          'Access-Control-Max-Age': '86400',
        }
      })
    }

    try {
      const url = new URL(request.url)
      
      // 构建目标URL
      const targetUrl = `https://api.anthropic.com${url.pathname}${url.search}`
      
      // 创建新的headers，完全重新构建
      const proxyHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
      
      // 只保留必要的认证headers
      const authKey = request.headers.get('x-api-key')
      const contentType = request.headers.get('content-type')
      const anthropicVersion = request.headers.get('anthropic-version')
      
      if (authKey) proxyHeaders['x-api-key'] = authKey
      if (contentType) proxyHeaders['content-type'] = contentType
      if (anthropicVersion) proxyHeaders['anthropic-version'] = anthropicVersion
      
      // 添加一些伪装headers
      proxyHeaders['Referer'] = 'https://console.anthropic.com/'
      proxyHeaders['Origin'] = 'https://console.anthropic.com'
      proxyHeaders['Sec-Fetch-Dest'] = 'empty'
      proxyHeaders['Sec-Fetch-Mode'] = 'cors'
      proxyHeaders['Sec-Fetch-Site'] = 'same-site'
      
      // 创建代理请求
      const proxyRequest = {
        method: request.method,
        headers: proxyHeaders,
        body: request.body
      }
      
      // 发送请求到多个备用endpoint (如果主endpoint失败)
      const endpoints = [
        targetUrl,
        // 可以添加更多备用endpoint
      ]
      
      let lastError = null
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, proxyRequest)
          
          // 构建响应
          const responseBody = await response.arrayBuffer()
          
          return new Response(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              ...Object.fromEntries(
                Array.from(response.headers.entries())
                  .filter(([key]) => !['set-cookie', 'cookie'].includes(key.toLowerCase()))
              ),
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
            }
          })
          
        } catch (error) {
          lastError = error
          console.error(`Endpoint ${endpoint} failed:`, error)
          continue
        }
      }
      
      throw lastError || new Error('All endpoints failed')
      
    } catch (error) {
      console.error('Worker error:', error)
      
      return new Response(JSON.stringify({
        error: 'Worker proxy failed',
        message: error.message,
        suggestion: 'Try using a custom domain instead of workers.dev'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }
  }
}
