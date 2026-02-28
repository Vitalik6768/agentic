"use client";

import Link from "next/link";
import Image from "next/image";
import { FolderOpen, FolderOpenIcon, HistoryIcon, KeyIcon, LogOutIcon, PlayIcon } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/server/better-auth/client";


const menuItems = [
    {
        title: "Main",
        items: [
            {
                title: "Workflows",
                icon: FolderOpenIcon,
                url: "/workflows",
            },
            {
                title: "Credentials",
                icon: KeyIcon,
                url: "/credentials",
            },
            {
                title: "Executions",
                icon: HistoryIcon,
                url: "/executions",
            },
        ],

    },

];

export const AppSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild className="gap-x-4 h-10 px-4">
                        <Link href="/workflows" prefetch>
                            <Image src="/logos/logo.svg" alt="Nodebase" width={30} height={30} />
                            <span className="text-2xl font-bold">Agentic</span>

                            
                        </Link>

                    </SidebarMenuButton>

                </SidebarMenuItem>

            </SidebarHeader>
            <SidebarContent>
                {menuItems.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupContent>{group.items?.map((item) => {
                            const IconComponent = item.icon === FolderOpenIcon ? FolderOpen : null;
                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={ pathname === item.url }
                                        className="gap-x-4 h-10 px-4"
                                    >
                                        <Link href={item.url} prefetch>
                                        <item.icon />
                                        <span className="truncate text-base font-medium">{item.title}</span>
                                        </Link>

                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}</SidebarGroupContent>
                    </SidebarGroup>

                ))}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/logout" onClick={() => authClient.signOut({
                                fetchOptions: {
                                    onSuccess: () => {
                                        router.push("/login");
                                    },
                                    onError: (ctx) => {
                                        toast.error(ctx.error.message);
                                    },
                                },
                     
                            })}>
                                <LogOutIcon />
                                <span className="truncate text-base font-medium">Logout</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                
            </SidebarFooter>

        </Sidebar>
    );
};