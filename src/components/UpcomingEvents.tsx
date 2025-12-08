import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Event } from "@/types/database";

interface UpcomingEventsProps {
  events: Event[];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <Card className="border border-cyan/10 shadow-elegant">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
          <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
          <p className="text-[14px] text-muted-foreground text-center py-4">
            Nenhum evento próximo
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  };

  return (
    <Card className="border border-cyan/10 shadow-elegant">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
        <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-cyan" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="space-y-4">
          {events.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 pb-4 border-b border-cyan/10 last:border-0 last:pb-0"
            >
              <div className="flex flex-col items-center justify-center min-w-[60px] bg-cyan/10 rounded-lg p-2">
                <span className="text-[18px] font-bold text-cyan">
                  {formatEventDate(event.event_date).split("/")[0]}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {formatEventDate(event.event_date).split("/")[1]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[14px] sm:text-[15px] text-foreground mb-1">
                  {event.title}
                </h4>
                {event.description && (
                  <p className="text-[13px] text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

