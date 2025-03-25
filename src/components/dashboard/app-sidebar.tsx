'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BookOpen, Bookmark, Brain, HomeIcon } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { APP_VERSION, IS_BETA } from '@/lib/constants';

import { AppSidebarAutomations } from './app-sidebar-automations';
import { AppSidebarConversations } from './app-sidebar-conversations';
import { AppSidebarUser } from './app-sidebar-user';

const AppSidebarHeader = () => {
  return (
    <SidebarHeader>
      <div className="flex items-center justify-between px-1">
        <span className="pl-2 text-lg font-medium tracking-tight group-data-[collapsible=icon]:hidden">
          dextra.sh
        </span>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:hidden">
            {IS_BETA && (
              <span className="select-none rounded-md bg-primary/90 px-1.5 py-0.5 text-xs text-primary-foreground">
                BETA
              </span>
            )}
            <span className="select-none rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </SidebarHeader>
  );
};

const AppSidebarFooter = () => {
  return (
    <SidebarFooter>
      <AppSidebarUser />
    </SidebarFooter>
  );
};

const ExploreItems = [
  {
    title: 'Home',
    url: '/home',
    segment: 'home',
    icon: HomeIcon,
    external: false,
  },
  {
    title: 'Docs',
    url: 'https://docs.neur.sh',
    segment: 'docs',
    icon: BookOpen,
    external: true,
  },
  {
    title: 'Memories',
    url: '/memories',
    segment: 'memories',
    icon: Brain,
    external: false,
  },
  {
    title: 'Saved Prompts',
    url: '/saved-prompts',
    segment: 'saved-prompts',
    icon: Bookmark,
    external: false,
  },
  // {
  //     title: "Agents",
  //     url: "/agents",
  //     segment: "agents",
  //     icon: Bot,
  //     external: false,
  // },
  // {
  //     title: "Automations",
  //     url: "/automations",
  //     segment: "automations",
  //     icon: Workflow,
  //     external: false,
  // }
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  const getIsActive = (itemSegment: string) => {
    if (itemSegment === 'home') {
      return pathname === '/home';
    }
    return pathname.startsWith(`/${itemSegment}`);
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="hidden md:flex">
      <AppSidebarHeader />

      <SidebarContent>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Explore</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ExploreItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={getIsActive(item.segment)}
                    >
                      <Link
                        href={item.url}
                        target={item.external ? '_blank' : undefined}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <AppSidebarConversations />
          <AppSidebarAutomations />
        </SidebarContent>
      </SidebarContent>

      <AppSidebarFooter />
    </Sidebar>
  );
}
