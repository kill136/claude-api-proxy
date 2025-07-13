export default {
  async fetch(request, env, ctx) {
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
          'Access-Control-Max-Age': '86400',
        }
      })
    }

    // 获取请求的URL
    const url = new URL(request.url)
    
    // 构建目标API URL
    const targetUrl = `https://api.anthropic.com${url.pathname}${url.search}`
    
    // 创建新的请求
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
    
    // 添加必要的headers
    newRequest.headers.set('anthropic-version', '2023-06-01')
    
    try {
      // 转发请求到Anthropic API
      const response = await fetch(newRequest)
      
      // 获取响应内容
      const responseBody = await response.arrayBuffer()
      
      // 创建新的响应并添加CORS headers
      const newResponse = new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
        }
      })
      
      return newResponse
    } catch (error) {
      console.error('代理请求失败:', error)
      
      return new Response(JSON.stringify({ 
        error: '代理请求失败', 
        details: error.message 
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