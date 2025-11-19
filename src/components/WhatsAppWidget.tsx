import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { whatsappConfig } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";

export function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent(whatsappConfig.welcomeMessage);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setIsOpen(false);
  };

  return (
    <>
      {/* Dialog */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 animate-in slide-in-from-bottom-5">
          <Card className="w-80 sm:w-96 shadow-2xl border-green-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Doutor HO</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Online</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>
                Olá! 👋 Converse com nossa IA ou entre nos grupos da comunidade! Nossa IA está disponível 24/7 para tirar suas dúvidas.
              </CardDescription>
              
              <Button 
                onClick={handleWhatsAppClick}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Iniciar Conversa
              </Button>

              <Button 
                variant="outline"
                onClick={() => {
                  navigate('/whatsapp-community');
                  setIsOpen(false);
                }}
                className="w-full border-cyan/30 hover:bg-cyan/5"
              >
                Ver Comunidade Completa
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {whatsappConfig.businessHours}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-4 sm:right-6 z-40 h-14 w-14 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen 
            ? "bg-red-500 hover:bg-red-600" 
            : "bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700"
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white animate-pulse" />
        )}
      </Button>

      {!isOpen && whatsappConfig.isOnline && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-30 bg-card dark:bg-muted px-4 py-2 rounded-full shadow-lg border border-border animate-in slide-in-from-right">
          <p className="text-sm font-medium text-card-foreground">Tire suas dúvidas!</p>
        </div>
      )}
    </>
  );
}

