import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  if (pathname.startsWith("/login") || pathname.startsWith("/_next")) {
    if (user && pathname.startsWith("/login")) {
      // Redirect authenticated users away from login
      return redirectByRole(user.id, supabase, request);
    }
    return supabaseResponse;
  }

  // Require authentication for all other routes
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

async function redirectByRole(
  userId: string,
  supabase: ReturnType<typeof createServerClient<Database>>,
  request: NextRequest
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const url = request.nextUrl.clone();
  if (profile?.role === "superadmin") url.pathname = "/admin";
  else if (profile?.role === "owner") url.pathname = "/dashboard";
  else url.pathname = "/mi-tienda";
  return NextResponse.redirect(url);
}
