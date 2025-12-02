import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, AlertCircle } from "lucide-react";
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
  const [showEmailConfirmationDialog, setShowEmailConfirmationDialog] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" || resolvedTheme === "black" ? "/dr_logo_branca.png" : "/dr_logo.png";

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
      
      // Mostrar diálogo de confirmação de email
      setRegisteredEmail(formData.email);
      setShowEmailConfirmationDialog(true);
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para ativar sua conta",
        duration: 5000,
      });
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
              <p className="text-[11px] sm:text-[12px] text-muted-foreground/80">
                Você receberá um email para confirmar sua conta após o cadastro
              </p>
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

      {/* Diálogo de confirmação de email */}
      <Dialog open={showEmailConfirmationDialog} onOpenChange={setShowEmailConfirmationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cyan/10 mb-4 mx-auto">
              <Mail className="h-6 w-6 text-cyan" />
            </div>
            <DialogTitle className="text-center text-[18px] font-semibold text-foreground">
              Verifique seu email
            </DialogTitle>
            <DialogDescription className="text-center text-[14px] text-muted-foreground mt-2">
              Enviamos um email de ativação para:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-[15px] font-medium text-foreground break-all">
                {registeredEmail}
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-cyan shrink-0 mt-0.5" />
                <div className="space-y-2 text-[13px] text-foreground/90">
                  <p className="font-medium">Próximos passos:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                    <li>Acesse sua caixa de entrada</li>
                    <li>Clique no link de ativação no email</li>
                    <li>Faça login com suas credenciais</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
              <p className="text-[12px] text-amber-900 dark:text-amber-200">
                <strong>Dica:</strong> Verifique também a pasta de spam ou lixo eletrônico caso não encontre o email.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setShowEmailConfirmationDialog(false);
                navigate("/login");
              }}
              className="w-full bg-gradient-brand hover:opacity-90 text-foreground font-semibold"
            >
              Entendi, ir para o login
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowEmailConfirmationDialog(false)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


