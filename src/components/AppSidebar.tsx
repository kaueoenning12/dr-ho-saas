import { Home, FileText, Settings, LogOut, Shield, Megaphone, Lightbulb, CreditCard, MessageSquare, MessageCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./layout/NotificationBell";
import { useTheme } from "next-themes";

export function AppSidebar() {
  const { resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const logoSrc = resolvedTheme === "dark" ? "/dr_logo_branca.png" : "/dr_logo.png";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { title: "Documentos", url: "/", icon: Home },
    { title: "Fórum", url: "/forum", icon: MessageSquare },
    { title: "WhatsApp", url: "/whatsapp-community", icon: MessageCircle },
    { title: "Avisos", url: "/announcements", icon: Megaphone },
    { title: "Sugestões", url: "/suggestions", icon: Lightbulb },
    { title: "Planos", url: "/plans", icon: CreditCard },
    { title: "Configurações", url: "/settings", icon: Settings },
  ];

  if (user?.role === "admin") {
    menuItems.push({ title: "Admin", url: "/admin", icon: Shield });
  }

  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarHeader className="border-b border-sidebar-border px-5 py-5 transition-all duration-300">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="bg-card border border-border rounded-full p-1.5 shadow-md flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-6">
              <img 
                src={logoSrc} 
                alt="Dr. HO Logo" 
                className="h-9 w-9 object-contain"
              />
            </div>
            <span className="font-semibold text-[18px] tracking-tight text-sidebar-foreground">Doutor HO</span>
          </div>
        ) : (
          <div className="flex justify-center animate-scale-in">
            <div className="bg-card border border-border rounded-full p-1.5 shadow-md flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-6">
              <img 
                src={logoSrc} 
                alt="Dr. HO Logo" 
                className="h-8 w-8 object-contain"
              />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={`${isCollapsed ? 'px-0' : 'px-3'} py-4`}>
        <SidebarGroup className={isCollapsed ? 'p-0' : ''}>
          {!isCollapsed && (
            <SidebarGroupLabel className="px-3 text-[11px] font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2">
              Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? 'mx-auto' : ''}`}>
              {menuItems.map((item, index) => (
                <SidebarMenuItem 
                  key={item.title}
                  className={`${isCollapsed ? 'flex justify-center' : ''} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `group/item flex ${isCollapsed ? '!w-auto mx-auto' : 'w-full'} items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${isCollapsed ? 'px-2' : 'px-3'} py-2.5 rounded-lg font-medium text-[14px] transition-all duration-300 relative ${isCollapsed ? '' : 'overflow-hidden'} ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-cyan"
                          : `text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-foreground/10 ${isCollapsed ? '' : 'hover:translate-x-1'}`
                        }`
                      }
                    >
                      <item.icon className={`h-4 w-4 stroke-[1.5] transition-transform duration-300 group-hover/item:scale-110`} />
                      {!isCollapsed && <span className="transition-all duration-300">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 transition-all duration-300">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-3 ${isCollapsed ? 'px-0' : 'px-1'} transition-all duration-300 hover:bg-foreground/5 rounded-lg ${isCollapsed ? 'p-2' : 'p-2 -ml-2 -mr-2'}`}>
          <NotificationBell />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="font-medium text-[14px] text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[12px] text-sidebar-foreground/60 font-light truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          onClick={handleLogout}
          className={`group w-full ${isCollapsed ? 'justify-center mx-auto' : 'justify-start'} text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-foreground/10 font-medium text-[14px] rounded-lg transition-all duration-300 ${isCollapsed ? '' : 'hover:translate-x-1'} active:scale-95`}
        >
          <LogOut className="h-4 w-4 stroke-[1.5] transition-transform duration-300 group-hover:rotate-12" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
