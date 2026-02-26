"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  PieChart, 
  CreditCard,
  Bell,
  Upload,
  Database
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 
      "bg-zinc-800 text-white" : 
      "text-zinc-400 hover:bg-zinc-800 hover:text-white";
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-zinc-200 bg-zinc-900 text-white transition-transform">
      <div className="flex h-16 items-center border-b border-zinc-800 px-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold">R</span>
          </div>
          <span>RentFlow</span>
        </div>
      </div>

      <div className="px-3 py-4">
        <ul className="space-y-1">
          <li>
            <Link href="/" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/')}`}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/invoices" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/invoices')}`}>
              <FileText size={18} />
              Invoices Ready
              <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">New</span>
            </Link>
          </li>
          <li>
            <Link href="/tenants" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/tenants')}`}>
              <Users size={18} />
              Tenants
            </Link>
          </li>
          <li>
            <Link href="/payments" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/payments')}`}>
              <CreditCard size={18} />
              Payments
            </Link>
          </li>
          <li>
            <Link href="/reports" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/reports')}`}>
              <PieChart size={18} />
              Reports
            </Link>
          </li>
        </ul>

        <div className="mt-8 px-3 text-xs font-semibold uppercase text-zinc-500">
          System
        </div>
        <ul className="mt-2 space-y-1">
          <li>
            <Link href="/upload" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/upload')}`}>
              <Upload size={18} />
              Data Import
            </Link>
          </li>
          <li>
            <Link href="/settings/mapping" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/settings/mapping')}`}>
              <Database size={18} />
              Data Mapping
            </Link>
          </li>
          <li>
            <Link href="/settings" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/settings')}`}>
              <Settings size={18} />
              Settings
            </Link>
          </li>
           <li>
            <Link href="/notifications" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive('/notifications')}`}>
              <Bell size={18} />
              Notifications
            </Link>
          </li>
        </ul>
      </div>
      
      <div className="absolute bottom-0 w-full border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-700"></div>
          <div>
            <div className="text-sm font-medium text-white">Admin User</div>
            <div className="text-xs text-zinc-500">admin@rentflow.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}