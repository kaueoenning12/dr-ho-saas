import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./NotificationItem";
import { CheckCheck, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function NotificationList() {
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications();

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let label: string;
    if (diffInDays === 0) {
      label = "Today";
    } else if (diffInDays === 1) {
      label = "Yesterday";
    } else if (diffInDays < 7) {
      label = "This Week";
    } else if (diffInDays < 30) {
      label = "This Month";
    } else {
      label = "Older";
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(notification);
    return groups;
  }, {} as Record<string, typeof notifications>);

  const groupOrder = ["Today", "Yesterday", "This Week", "This Month", "Older"];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-8 text-xs"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div>
            {groupOrder.map((groupLabel) => {
              const group = groupedNotifications[groupLabel];
              if (!group || group.length === 0) return null;

              const unreadInGroup = group.filter((n) => !n.read).length;

              return (
                <div key={groupLabel}>
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-4 py-2 border-b">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {groupLabel}
                      </h4>
                      {unreadInGroup > 0 && (
                        <span className="text-xs text-cyan font-medium">
                          {unreadInGroup} new
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y">
                    {group.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
