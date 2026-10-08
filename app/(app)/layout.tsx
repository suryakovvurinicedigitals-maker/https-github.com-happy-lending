import { NavBar } from "@/components/NavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
