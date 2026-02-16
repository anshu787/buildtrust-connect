import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell, Check, ArrowDownLeft, ArrowUpRight, ExternalLink, CheckCheck, Filter,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  email_sent: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "escrow_deposit" | "escrow_release">("all");

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "escrow_deposit" || filter === "escrow_release") return n.type === filter;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> All
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Unread
          </TabsTrigger>
          <TabsTrigger value="escrow_deposit" className="gap-1.5">
            <ArrowDownLeft className="h-3.5 w-3.5" /> Deposits
          </TabsTrigger>
          <TabsTrigger value="escrow_release" className="gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> Releases
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {loading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No notifications to show.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((n) => (
                <Card
                  key={n.id}
                  className={`transition-colors ${!n.read ? "border-primary/30 bg-accent/20" : "opacity-70"}`}
                >
                  <CardContent className="flex items-start gap-4 py-4">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        n.type === "escrow_deposit" ? "bg-blue-500/10" : "bg-green-500/10"
                      }`}
                    >
                      {n.type === "escrow_deposit" ? (
                        <ArrowDownLeft className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                        {n.metadata?.txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${n.metadata.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                          >
                            View TX <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {n.email_sent && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">Emailed</Badge>
                        )}
                      </div>
                    </div>
                    {!n.read && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => markRead(n.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
