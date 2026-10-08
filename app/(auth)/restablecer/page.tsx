import PasswordForm from "@/components/perfil/password-form";
import AuthExperience from "@/components/auth/auth-experience";

// The user lands here from the recovery email with a session already
// established by /auth/callback. Setting the password logs them in fully.
export default function RestablecerPage() {
  return (
    <AuthExperience>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Nueva contraseña</h1>
          <p className="text-muted-foreground text-sm">
            Crea tu nueva contraseña. Al guardarla entrarás directo a tu panel.
          </p>
        </div>
        <PasswordForm redirectAfter="/" />
      </div>
    </AuthExperience>
  );
}
