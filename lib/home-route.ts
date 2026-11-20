// Central role → home route mapping. Pure function, safe on client and server.
// Every "wrong place" redirect goes through "/" (app/page.tsx), which calls this,
// so route groups never redirect into each other (no loops).
import type { UserRole } from "@/types/database";

export function homeRoute(role: UserRole | null | undefined): string {
  switch (role) {
    case "superadmin": return "/admin";
    // The owner administers from Inicio; the shared device ("terminal") lands on the floor.
    case "owner":      return "/dashboard";
    case "terminal":   return "/salon";
    case "brand":      return "/mi-tienda";
    default:           return "/login";
  }
}
