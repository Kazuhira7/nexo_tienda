// Central role → home route mapping. Pure function, safe on client and server.
// When verticals get distinct home screens, branch here on org vertical.
import type { UserRole } from "@/types/database";

export function homeRoute(role: UserRole | null | undefined): string {
  switch (role) {
    case "superadmin": return "/admin";
    case "owner":      return "/dashboard";
    case "brand":      return "/mi-tienda";
    default:           return "/login";
  }
}
