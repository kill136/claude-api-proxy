export default {
  async fetch(request, env, ctx) {
    // 获取请求的 URL
    const url = new URL(request.url)
    
    // 构建目标 API URL
    const targetUrl = `https://api.anthropic.com${url.pathname}${url.search}`
    
    // 创建新的请求，保持所有原始headers
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
    
    // 添加CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
    }
    
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      })
    }
    
    try {
      // 转发请求到 Anthropic API
      const response = await fetch(newRequest)
      
      // 创建响应副本并添加CORS headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          ...corsHeaders
        }
      })
      
      return newResponse
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Proxy request failed', 
        details: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
  }
}