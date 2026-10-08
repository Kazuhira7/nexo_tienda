import AuthExperience from "@/components/auth/auth-experience";

// Welcome screen first; "Iniciar sesión" / "Crear mi negocio" open the sheet.
export default function LoginPage() {
  return <AuthExperience initial="intro" />;
}
