import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, TrendingUp, CheckCircle, Mail } from "lucide-react";
import { useNotificationStats } from "@/hooks/useNotificationStats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NotificationManagement() {
  const { data: stats, isLoading } = useNotificationStats();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "system" as "new_document" | "comment" | "like" | "system",
    link: "",
  });
  const [sending, setSending] = useState(false);

  const handleSendNotification = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("create-notifications", {
        body: {
          event_type: formData.type,
          title: formData.title,
          message: formData.message,
          link: formData.link || undefined,
        },
      });

      if (error) throw error;

      toast.success("Notification sent to all users");
      setDialogOpen(false);
      setFormData({
        title: "",
        message: "",
        type: "system",
        link: "",
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const statCards = [
    {
      label: "Total Notifications",
      value: stats?.total || 0,
      icon: Bell,
      color: "text-cyan",
    },
    {
      label: "Unread",
      value: stats?.unread || 0,
      icon: Mail,
      color: "text-yellow-600",
    },
    {
      label: "Read Rate",
      value: `${stats?.readRate || 0}%`,
      icon: TrendingUp,
      color: "text-green-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border border-cyan/10 shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[12px] sm:text-[13px] font-medium text-navy/70">
                {stat.label}
              </CardTitle>
              <div className="h-9 w-9 rounded-lg bg-cyan/10 flex items-center justify-center">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-navy">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notifications by Type */}
      <Card className="border border-cyan/10 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">
            Notifications by Type
          </CardTitle>
          <CardDescription>Breakdown of notification categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats?.byType || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-cyan/5 rounded-lg">
                <span className="text-sm font-medium capitalize text-navy">
                  {type.replace("_", " ")}
                </span>
                <span className="text-2xl font-bold text-cyan">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Send System Notification */}
      <Card className="border border-cyan/10 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">
            Send System Notification
          </CardTitle>
          <CardDescription>Create and send notifications to all users</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-brand hover:opacity-90 text-navy shadow-cyan">
                <Send className="h-4 w-4 mr-2" />
                Create Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-navy text-[18px]">
                  Send System Notification
                </DialogTitle>
                <DialogDescription className="text-navy/60 text-[14px]">
                  This will send a notification to all users
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-navy font-medium">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Notification title"
                    className="border-cyan/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-navy font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Notification message"
                    rows={4}
                    className="border-cyan/20 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-navy font-medium">
                    Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger className="border-cyan/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="new_document">New Document</SelectItem>
                      <SelectItem value="comment">Comment</SelectItem>
                      <SelectItem value="like">Like</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link" className="text-navy font-medium">
                    Link (Optional)
                  </Label>
                  <Input
                    id="link"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="/page or full URL"
                    className="border-cyan/20"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="text-navy/70 hover:text-navy"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendNotification}
                  disabled={sending}
                  className="bg-gradient-brand hover:opacity-90 text-navy"
                >
                  {sending ? "Sending..." : "Send Notification"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
