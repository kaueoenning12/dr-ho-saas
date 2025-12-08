import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info, Megaphone, TrendingUp } from "lucide-react";
import { HomeAnnouncement } from "@/types/database";

interface HomeAnnouncementsProps {
  announcements: HomeAnnouncement[];
}

export function HomeAnnouncements({ announcements }: HomeAnnouncementsProps) {
  if (announcements.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-500/10 text-green-700 border-green-200";
      default:
        return "bg-navy/10 text-navy border-navy/20";
    }
  };

  const getCategoryIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-5 w-5" />;
      case "medium":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card
          key={announcement.id}
          className="border border-cyan/10 shadow-elegant hover:shadow-cyan hover:border-cyan/30 transition-all duration-300"
        >
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-lg ${getPriorityColor(
                  announcement.priority
                )} flex items-center justify-center shrink-0`}
              >
                {getCategoryIcon(announcement.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-foreground">
                  {announcement.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={`text-[11px] font-medium border ${getPriorityColor(
                      announcement.priority
                    )}`}
                  >
                    {announcement.priority === "high"
                      ? "Alta"
                      : announcement.priority === "medium"
                      ? "Média"
                      : "Baixa"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
            <p className="text-[14px] sm:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

