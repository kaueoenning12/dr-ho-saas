import { Notification } from "@/types/database";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { FileText, MessageSquare, Heart, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
}

const iconMap = {
  new_document: FileText,
  comment: MessageSquare,
  like: Heart,
  system: Bell,
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead } = useNotifications();
  const Icon = iconMap[notification.type];

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left p-4 hover:bg-accent transition-colors",
        !notification.read && "bg-accent/50"
      )}
    >
      <div className="flex gap-3">
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
          notification.type === "new_document" && "bg-primary/10 text-primary",
          notification.type === "comment" && "bg-blue-500/10 text-blue-500",
          notification.type === "like" && "bg-red-500/10 text-red-500",
          notification.type === "system" && "bg-muted-foreground/10 text-muted-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
        {!notification.read && (
          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
        )}
      </div>
    </button>
  );
}
