import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <>
        <AppHeader />
        <main className="flex-1">{children}</main>
        </>
              
    
    );
};
export default layout;