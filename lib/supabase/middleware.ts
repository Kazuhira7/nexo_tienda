import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, VerticalType } from "@/types/database";
import { homeRoute } from "@/lib/home-route";

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
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/recuperar") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next");

  if (isPublic) {
    if (user && (pathname.startsWith("/login") || pathname.startsWith("/registro"))) {
      // Redirect authenticated users away from login/signup
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
    .select("role, organizations(vertical)")
    .eq("id", userId)
    .single();

  const vertical = (profile?.organizations as { vertical: VerticalType } | null)?.vertical;
  const url = request.nextUrl.clone();
  url.pathname = homeRoute(profile?.role, vertical);
  return NextResponse.redirect(url);
}
