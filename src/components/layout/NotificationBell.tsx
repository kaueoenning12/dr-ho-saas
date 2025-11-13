import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationList } from "./NotificationList";
import { Badge } from "@/components/ui/badge";

export function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`relative transition-all duration-300 hover:scale-110 active:scale-95 ${
            unreadCount > 0 ? 'animate-bounce-in' : ''
          }`}
        >
          <Bell className={`h-5 w-5 transition-transform duration-300 ${
            unreadCount > 0 ? 'animate-glow-pulse' : ''
          }`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-bounce-in animate-glow-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 animate-scale-in" align="end">
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}
