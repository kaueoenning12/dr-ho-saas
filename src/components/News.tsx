import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useNews } from "@/hooks/useNewsQuery";

export function News() {
  const { data: news = [], isLoading } = useNews();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <Card className="border border-cyan/10 shadow-elegant">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
        <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan" />
          Novidades
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
        {isLoading ? (
          <p className="text-[14px] text-muted-foreground text-center py-4">
            Carregando...
          </p>
        ) : news.length === 0 ? (
          <p className="text-[14px] text-muted-foreground text-center py-4">
            Nenhuma novidade no momento
          </p>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <div
                key={item.id}
                className="pb-4 border-b border-cyan/10 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-cyan mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[14px] sm:text-[15px] text-foreground mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 mb-2">
                      {item.description}
                    </p>
                    <span className="text-[12px] text-muted-foreground/60">
                      {formatDate(item.date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

