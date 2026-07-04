import PasswordForm from "@/components/perfil/password-form";

// The user lands here from the recovery email with a session already
// established by /auth/callback. Setting the password logs them in fully.
export default function RestablecerPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Nueva contraseña</h1>
        <p className="text-muted-foreground text-sm">
          Crea tu nueva contraseña. Al guardarla entrarás directo a tu panel.
        </p>
      </div>
      <PasswordForm redirectAfter="/" />
    </div>
  );
}
