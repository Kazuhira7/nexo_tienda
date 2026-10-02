// Central role (+ org vertical) → home route mapping. Pure function, safe on client and server.
// Every "wrong place" redirect goes through "/" (app/page.tsx), which calls this,
// so route groups never redirect into each other (no loops).
import type { UserRole, VerticalType } from "@/types/database";

export function homeRoute(
  role: UserRole | null | undefined,
  vertical?: VerticalType | null
): string {
  switch (role) {
    case "superadmin": return "/admin";
    case "owner":      return vertical === "restaurante" ? "/salon" : "/dashboard";
    case "terminal":   return "/salon";
    case "brand":      return "/mi-tienda";
    default:           return "/login";
  }
}
