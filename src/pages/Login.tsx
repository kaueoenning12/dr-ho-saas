import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/dr_logo_branca.png" : "/dr_logo.png";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔵 [LOGIN] Iniciando login", { email });
    setLoading(true);

    try {
      console.log("🔵 [LOGIN] Chamando função login do AuthContext");
      await login(email, password);
      console.log("✅ [LOGIN] Login bem-sucedido");
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao Dr. HO",
      });
      
      console.log("🔵 [LOGIN] Navegando para /");
      navigate("/");
      console.log("✅ [LOGIN] Navigate chamado");
    } catch (error) {
      console.error("❌ [LOGIN] Erro no login:", error);
      toast({
        title: "Erro ao fazer login",
        description: error instanceof Error ? error.message : "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      console.log("🔵 [LOGIN] Finalizando (setLoading false)");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <Card className="w-full max-w-[440px] bg-card text-card-foreground shadow-elegant-lg rounded-xl border">
        <CardHeader className="space-y-4 sm:space-y-5 text-center px-4 sm:px-10 pt-10 sm:pt-12 pb-4 sm:pb-6">
          <div className="flex justify-center">
            <img 
              src={logoSrc} 
              alt="Dr. HO Logo" 
              className="h-14 w-auto sm:h-16 object-contain opacity-95"
            />
          </div>
          <CardDescription className="text-[13px] sm:text-[14px] font-light text-muted-foreground mt-1">
            Entre com suas credenciais para acessar
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-10 pb-8 sm:pb-10 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[12px] sm:text-[13px] font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 sm:h-11 text-sm sm:text-[15px] font-normal bg-background border-border rounded-lg focus-visible:ring-2 focus-visible:ring-accent transition-all"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[12px] sm:text-[13px] font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 sm:h-11 pr-10 text-sm sm:text-[15px] font-normal bg-background border-border rounded-lg focus-visible:ring-2 focus-visible:ring-accent transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center justify-center px-1.5 text-foreground/60 hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 bg-accent text-accent-foreground hover:opacity-90 font-semibold text-sm sm:text-[15px] rounded-lg shadow-cyan transition-all duration-200 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="flex items-center justify-start pt-1">
              <Link to="#" className="text-sm text-foreground/70 hover:text-foreground transition-colors">Esqueci minha senha</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
