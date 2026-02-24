"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "../../components/AppLayout";
import { fetchTenants } from "../actions";
import { Tenant } from "../rent-model";
import { 
  Users, 
  Search, 
  Plus,
  MoreHorizontal
} from "lucide-react";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchTenants();
        setTenants(data);
      } catch (error) {
        console.error("Failed to load tenants", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredTenants = tenants.filter(t => 
    (t.tenantName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.roomCode || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tenants</h1>
            <p className="text-sm text-zinc-500 mt-1">Manage tenant information and contacts</p>
          </div>
          
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={16} />
            Add Tenant
          </button>
        </div>

        <main className="flex-1">
          {/* Stats / Filters */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search tenants..."
                  className="h-9 w-64 rounded-md border-none bg-transparent pl-9 text-sm outline-none placeholder:text-zinc-400 focus:ring-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Tenant Name</th>
                    <th className="px-6 py-4">Room</th>
                    <th className="px-6 py-4">Assigned Staff</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                        Loading tenants...
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                        No tenants found.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 text-xs font-bold">
                              {t.tenantName.substring(0, 2).toUpperCase()}
                            </div>
                            {t.tenantName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-600">
                          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                            {t.roomCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-600">
                          {t.staffName}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
             <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Showing {filteredTenants.length} tenants
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
