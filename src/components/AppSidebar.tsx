import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { Building2, LayoutDashboard, Plus, Search, FileText, Milestone, Shield, Brain, LogOut, Wallet, UserCog, Bell, MessageCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const builderLinks = [
  { title: "Dashboard", url: "/builder", icon: LayoutDashboard },
  { title: "New Project", url: "/builder/create-project", icon: Plus },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Milestones", url: "/milestones", icon: Milestone },
  { title: "Escrow", url: "/escrow", icon: Wallet },
  { title: "AI Tools", url: "/ai-tools", icon: Brain },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: UserCog },
];

const contractorLinks = [
  { title: "Dashboard", url: "/contractor", icon: LayoutDashboard },
  { title: "Browse Projects", url: "/contractor/browse", icon: Search },
  { title: "My Quotes", url: "/contractor", icon: FileText },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Milestones", url: "/milestones", icon: Milestone },
  { title: "Escrow", url: "/escrow", icon: Wallet },
  { title: "AI Tools", url: "/ai-tools", icon: Brain },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: UserCog },
];

export function AppSidebar() {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const links = role === "builder" ? builderLinks : contractorLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold group-data-[collapsible=icon]:hidden">ConQuote</span>
        </NavLink>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-xs uppercase tracking-wider text-sidebar-foreground/40">
            {role === "builder" ? "Builder" : "Contractor"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.url + item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50 rounded-xl transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <span className="truncate text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">{user?.email}</span>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0 h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
