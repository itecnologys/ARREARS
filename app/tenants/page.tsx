import { AppLayout } from "../../components/AppLayout";
import { Users } from "lucide-react";

export default function TenantsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div>
             <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tenants</h1>
             <p className="text-sm text-zinc-500 mt-1">Manage tenant information and contacts</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center">
          <div className="rounded-full bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-zinc-900">No tenants found</h3>
          <p className="mt-1 text-sm text-zinc-500">Add tenants to start managing them.</p>
          <button className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Add Tenant
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
