// Re-mounts on every navigation inside this route group → each page enters with a short fade/slide.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
