import { Search, Bell, HelpCircle } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed right-0 top-0 z-30 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input 
            type="search" 
            placeholder="Search tenant, invoice..." 
            className="h-9 w-64 rounded-md border border-zinc-200 bg-zinc-50 pl-9 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>
        <button className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
        </button>
        <div className="h-8 w-px bg-zinc-200 mx-2"></div>
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
             AD
           </div>
        </div>
      </div>
    </header>
  );
}