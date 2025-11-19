import { Home, FileText, Settings, LogOut, Shield, Menu, Megaphone, Lightbulb, CreditCard, MessageSquare, MessageCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useTheme } from "next-themes";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/dr_logo_branca.png" : "/dr_logo.png";

  const handleLogout = () => {
    logout();
    navigate("/login");
    setOpen(false);
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

  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-muted transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-foreground stroke-[1.5] transition-transform duration-300" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 border-cyan/20 animate-slide-in-bounce">
        <SheetHeader className="border-b border-cyan/10 px-5 py-5">
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="bg-card border border-border rounded-full p-1.5 shadow-md flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-6">
              <img 
                src={logoSrc} 
                alt="Dr. HO Logo" 
                className="h-9 w-9 object-contain"
              />
            </div>
            <SheetTitle className="font-semibold text-[18px] tracking-tight text-foreground">
              Doutor HO
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 py-4 flex-1">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-medium text-foreground/50 uppercase tracking-wider mb-2 animate-fade-in">
              Menu
            </p>
            {menuItems.map((item, index) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-[14px] transition-all duration-300 min-h-[44px] animate-slide-in-left stagger-${index + 1} ${
                    isActive
                      ? "bg-cyan/15 text-cyan shadow-sm border-l-2 border-cyan"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted hover:translate-x-1"
                  }`
                }
              >
                <item.icon className="h-4 w-4 stroke-[1.5] transition-transform duration-300 group-hover:scale-110" />
                <span className="transition-all duration-300">{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <SheetFooter className="border-t border-cyan/10 p-4 mt-auto block animate-fade-in-up stagger-6">
          <div className="flex items-center gap-3 mb-3 px-1 transition-all duration-300 hover:bg-muted rounded-lg p-2 -ml-2 -mr-2">
            <NotificationBell />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[14px] text-foreground truncate">{user?.name}</p>
              <p className="text-[12px] text-foreground/60 font-light truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="group w-full justify-start text-foreground/80 hover:text-foreground hover:bg-muted font-medium text-[14px] rounded-lg transition-all duration-300 min-h-[44px] hover:translate-x-1 active:scale-95"
          >
            <LogOut className="h-4 w-4 stroke-[1.5] mr-2 transition-transform duration-300 group-hover:rotate-12" />
            <span>Sair</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
