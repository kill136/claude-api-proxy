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

    // 获取请求的URL和路径
    const url = new URL(request.url)
    
    // 构建目标API URL - 确保使用正确的Anthropic API端点
    const targetUrl = `https://api.anthropic.com${url.pathname}${url.search}`
    
    // 创建新的headers，移除可能暴露真实IP的headers
    const newHeaders = new Headers()
    
    // 只复制必要的headers
    const allowedHeaders = [
      'content-type',
      'authorization', 
      'x-api-key',
      'anthropic-version',
      'anthropic-dangerous-direct-browser-access',
      'user-agent'
    ]
    
    // 复制允许的headers
    for (const [key, value] of request.headers.entries()) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        newHeaders.set(key, value)
      }
    }
    
    // 强制设置必要的headers
    newHeaders.set('anthropic-version', '2023-06-01')
    
    // 移除可能暴露真实IP的headers
    newHeaders.delete('x-forwarded-for')
    newHeaders.delete('x-real-ip')
    newHeaders.delete('cf-connecting-ip')
    newHeaders.delete('x-forwarded-proto')
    newHeaders.delete('x-forwarded-host')
    
    // 设置一个通用的User-Agent，避免暴露客户端信息
    newHeaders.set('user-agent', 'CloudflareWorker/1.0')
    
    try {
      // 创建新的请求 - 这个请求将从CloudFlare服务器发出
      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        // 重要：确保请求从CloudFlare服务器发出
        redirect: 'follow'
      })
      
      // 发送请求到Anthropic API - 这里使用的是CloudFlare服务器的IP
      const response = await fetch(newRequest)
      
      // 读取响应内容
      const responseBody = await response.arrayBuffer()
      
      // 创建新的响应headers
      const responseHeaders = new Headers()
      
      // 复制响应headers（排除一些可能有问题的headers）
      for (const [key, value] of response.headers.entries()) {
        // 跳过一些可能有问题的headers
        if (!['set-cookie', 'cookie'].includes(key.toLowerCase())) {
          responseHeaders.set(key, value)
        }
      }
      
      // 添加CORS headers
      responseHeaders.set('Access-Control-Allow-Origin', '*')
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access')
      responseHeaders.set('Access-Control-Expose-Headers', '*')
      
      // 创建响应
      const newResponse = new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      })
      
      return newResponse
      
    } catch (error) {
      console.error('Worker代理错误:', error)
      
      // 返回错误响应
      return new Response(JSON.stringify({ 
        error: 'Worker代理请求失败', 
        details: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
        }
      })
    }
  }
}
