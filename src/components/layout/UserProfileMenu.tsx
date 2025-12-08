import { ChevronDown, Settings, HelpCircle, LifeBuoy, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-1.5 sm:gap-3 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-muted transition-all duration-300 outline-none hover:scale-105 active:scale-95">
        <div className="relative">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-cyan/30 transition-all duration-300 group-hover:border-cyan/50 group-hover:scale-105">
            <AvatarFallback className="bg-gradient-brand text-foreground font-semibold text-[13px] sm:text-[15px]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-2 w-2 sm:h-3 sm:w-3 bg-aqua border-2 border-white rounded-full animate-pulse" />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-[14px] font-medium text-foreground transition-colors duration-300 group-hover:text-cyan">{user.name}</p>
          <p className="text-[12px] text-aqua font-light">Online</p>
        </div>
        <ChevronDown className="h-4 w-4 text-foreground/50 stroke-[1.5] hidden sm:block transition-transform duration-300 group-hover:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-72 p-2 border-cyan/20 shadow-elegant-lg animate-scale-in" align="end">
        {/* User Info Header */}
        <div className="flex items-center gap-3 px-3 py-3 mb-2">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-cyan/30">
              <AvatarFallback className="bg-gradient-brand text-foreground font-semibold text-[16px]">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-aqua border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-semibold text-foreground truncate">{user.name}</p>
              {user.role === "admin" && (
                <Shield className="h-3.5 w-3.5 text-cyan flex-shrink-0" />
              )}
            </div>
            <p className="text-[13px] text-muted-foreground font-light truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="h-2 w-2 bg-aqua rounded-full animate-pulse" />
              <span className="text-[12px] text-aqua font-medium">Online agora</span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-cyan/10" />

        {/* Menu Items */}
        <DropdownMenuItem
          onClick={() => navigate("/settings")}
          className="group/item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-cyan/5 transition-all duration-300 hover:translate-x-1 active:scale-95"
        >
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center transition-all duration-300 group-hover/item:bg-cyan/10 group-hover/item:scale-110">
            <Settings className="h-4 w-4 text-foreground stroke-[1.5] transition-transform duration-300 group-hover/item:rotate-90" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">Configurações</p>
            <p className="text-[12px] text-muted-foreground font-light">Preferências e privacidade</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="group/item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-cyan/5 transition-all duration-300 hover:translate-x-1 active:scale-95">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center transition-all duration-300 group-hover/item:bg-cyan/10 group-hover/item:scale-110">
            <HelpCircle className="h-4 w-4 text-foreground stroke-[1.5] transition-transform duration-300 group-hover/item:scale-110" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">FAQ</p>
            <p className="text-[12px] text-muted-foreground font-light">Perguntas frequentes</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="group/item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-cyan/5 transition-all duration-300 hover:translate-x-1 active:scale-95">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center transition-all duration-300 group-hover/item:bg-cyan/10 group-hover/item:scale-110">
            <LifeBuoy className="h-4 w-4 text-foreground stroke-[1.5] transition-transform duration-300 group-hover/item:rotate-12" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">Suporte</p>
            <p className="text-[12px] text-muted-foreground font-light">Ajuda e documentação</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-cyan/10 my-2" />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="group/logout flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-destructive/10 transition-all duration-300 hover:translate-x-1 active:scale-95"
        >
          <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center transition-all duration-300 group-hover/logout:bg-destructive/20 group-hover/logout:scale-110">
            <LogOut className="h-4 w-4 text-destructive stroke-[1.5] transition-transform duration-300 group-hover/logout:rotate-12" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-destructive">Sair da conta</p>
            <p className="text-[12px] text-destructive/70 font-light">Encerrar sessão atual</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  );
}
