import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Criamos a resposta inicial
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Atualiza os cookies na requisição e na resposta
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // Remove os cookies na requisição e na resposta
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // IMPORTANTE: getUser() é mais seguro que getSession() no middleware
  // Usamos o destructuring para pegar o user, ignorando erros de token inválido aqui
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  
  //TRAVANDO A ABA CAMPEONATOS
  const isCampeonatosPage = request.nextUrl.pathname.startsWith('/campeonatos') // Detecta a rota e sub-rotas
    // NOVA TRAVA: Se tentar acessar campeonatos, manda para a Home
    if (isCampeonatosPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }

  // 1. Se NÃO tem usuário e NÃO está na página de login -> Redireciona para /login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Se JÁ tem usuário e tenta acessar o /login -> Redireciona para a Home (/)
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 3. ESSENCIAL: Retorna a resposta com os headers/cookies atualizados
  return response
}

export const config = {
  // Protege tudo exceto arquivos estáticos, imagens e a própria API
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api).*)'],
}