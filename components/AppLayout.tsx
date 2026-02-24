import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans antialiased text-zinc-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header takes full width minus sidebar, handled by its fixed position and width calc or margin */}
        {/* But Header component uses fixed positioning. Let's adjust AppLayout to handle it properly */}
        {/* Actually, let's keep Header fixed but inside the layout structure */}
        <div className="pl-64 w-full"> 
            <Header />
        </div>
        
        <main className="ml-64 mt-16 w-auto p-8 transition-all">
          {children}
        </main>
      </div>
    </div>
  );
}