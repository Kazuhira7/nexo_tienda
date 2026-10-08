// Sign-in screens: each page renders <AuthExperience> (welcome screen + sheet/panel).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-[100svh] bg-background">{children}</main>;
}
