import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  } catch (e) {
    console.warn("Supabase auth user retrieval failed:", e);
  }

  const url = request.nextUrl.clone();
  
  // Apply Enterprise Security Headers to the response
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  
  // Set a robust, secure CSP dynamically resolving the API URL host
  let apiHost = "http://localhost:8000";
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      apiHost = new URL(process.env.NEXT_PUBLIC_API_URL).origin;
    } catch {
      apiHost = process.env.NEXT_PUBLIC_API_URL;
    }
  }
  const wsHost = apiHost.replace(/^http/, "ws");

  supabaseResponse.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.supabase.co; connect-src 'self' ${apiHost} ${wsHost} https://*.supabase.co wss://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com; frame-src 'none'; object-src 'none';`
  );

  // Protected Routes Handling
  const isProtectedRoute = url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/analysis");
  const isAuthRoute = url.pathname === "/login" || url.pathname === "/signup";

  if (!user && isProtectedRoute) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
