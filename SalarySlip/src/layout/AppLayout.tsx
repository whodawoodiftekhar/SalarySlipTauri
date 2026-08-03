import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DbStatusBanner } from "@/shared/components/DbStatusBanner";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-paper font-sans text-[14px] text-ink max-mob:flex-col">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <DbStatusBanner />
        <div className="w-full flex-1 px-7 py-[26px] max-mob:p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
