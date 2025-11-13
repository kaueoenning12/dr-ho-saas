import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "next-themes";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/dr_logo_branca.png" : "/dr_logo.png";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.number) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const sanitizedNumber = formData.number.replace(/\D/g, "");
    if (sanitizedNumber.length < 10) {
      toast({
        title: "Número inválido",
        description: "Informe um número de telefone válido com DDD",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, sanitizedNumber);
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao Dr. HO",
      });
      
      navigate("/");
    } catch (error) {
      toast({
        title: "Erro ao criar conta",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[440px] border shadow-elegant-lg">
        <CardHeader className="space-y-4 sm:space-y-5 text-center px-4 sm:px-10 pt-10 sm:pt-12 pb-4 sm:pb-6">
          <div className="flex justify-center">
            <img 
              src={logoSrc} 
              alt="Dr. HO Logo" 
              className="h-14 w-auto sm:h-16 object-contain opacity-95"
            />
          </div>
          <CardDescription className="text-[13px] sm:text-[14px] font-light text-muted-foreground mt-1">
            Crie sua conta para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-10 pb-8 sm:pb-10 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[12px] sm:text-[13px] font-medium text-foreground">
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 sm:h-11 text-sm sm:text-[15px] font-normal border-cyan/30 rounded-lg focus-visible:ring-cyan/30 focus-visible:border-cyan transition-all"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number" className="text-[12px] sm:text-[13px] font-medium text-foreground">
                Número de Telefone
              </Label>
              <Input
                id="number"
                type="tel"
                inputMode="tel"
                placeholder="(11) 91234-5678"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="h-10 sm:h-11 text-sm sm:text-[15px] font-normal border-cyan/30 rounded-lg focus-visible:ring-cyan/30 focus-visible:border-cyan transition-all"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[12px] sm:text-[13px] font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-10 sm:h-11 text-sm sm:text-[15px] font-normal border-cyan/30 rounded-lg focus-visible:ring-cyan/30 focus-visible:border-cyan transition-all"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[12px] sm:text-[13px] font-medium text-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-10 sm:h-11 text-sm sm:text-[15px] font-normal border-cyan/30 rounded-lg focus-visible:ring-cyan/30 focus-visible:border-cyan transition-all"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[12px] sm:text-[13px] font-medium text-foreground">
                Confirmar Senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="h-10 sm:h-11 text-sm sm:text-[15px] font-normal border-cyan/30 rounded-lg focus-visible:ring-cyan/30 focus-visible:border-cyan transition-all"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 sm:h-11 bg-gradient-brand hover:opacity-90 text-foreground font-semibold text-[14px] sm:text-[15px] rounded-lg transition-all shadow-md hover:shadow-lg"
              disabled={loading}
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>

            <div className="text-center pt-2">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-[13px] sm:text-[14px] text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


