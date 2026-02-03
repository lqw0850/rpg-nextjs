import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server' // 导入类型
import { createServerClient } from '@supabase/ssr'

// 中间件工厂：用于同步客户端和服务端的会话，保证服务端能拿到用户会话
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // ✅ 关键：刷新会话，保持有效性
  const { data: { user } } = await supabase.auth.getUser()
  
  // 可选：保护特定路由
//   if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
//     return NextResponse.redirect(new URL('/login', request.url))
//   }

  return response
}

// 配置中间件匹配规则
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}