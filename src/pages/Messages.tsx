import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import ProjectChat from "@/components/ProjectChat";

interface ConversationProject {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export default function Messages() {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState<ConversationProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      // Get projects the user is part of (as builder or accepted contractor)
      let projectIds: string[] = [];
      let projectMap: Record<string, string> = {};

      if (role === "builder") {
        const { data } = await supabase.from("projects").select("id, title").eq("builder_id", user.id).neq("status", "open");
        projectIds = (data || []).map((p) => p.id);
        projectMap = Object.fromEntries((data || []).map((p) => [p.id, p.title]));
      } else {
        const { data: quotes } = await supabase
          .from("quotes")
          .select("project_id, projects!inner(id, title)")
          .eq("contractor_id", user.id)
          .eq("status", "accepted");
        const projs = (quotes || []).map((q) => {
          const p = q.projects as any;
          return { id: p.id, title: p.title };
        });
        projectIds = projs.map((p) => p.id);
        projectMap = Object.fromEntries(projs.map((p) => [p.id, p.title]));
      }

      if (projectIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get latest message per project
      const conversations: ConversationProject[] = [];
      for (const pid of projectIds) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("project_id", pid)
          .order("created_at", { ascending: false })
          .limit(1);

        conversations.push({
          id: pid,
          title: projectMap[pid] || "Unknown Project",
          lastMessage: msgs?.[0]?.content || "No messages yet",
          lastMessageAt: msgs?.[0]?.created_at || "",
          unread: 0,
        });
      }

      conversations.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
      setProjects(conversations);
      if (conversations.length > 0 && !selectedProject) {
        setSelectedProject(conversations[0].id);
      }
      setLoading(false);
    };

    fetchConversations();
  }, [user, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" /> Messages
      </h1>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p>No conversations yet. Chat becomes available after a project is awarded.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Conversation list */}
          <div className="space-y-2">
            {projects.map((p) => (
              <Card
                key={p.id}
                className={`cursor-pointer transition-colors hover:border-primary/40 ${
                  selectedProject === p.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedProject(p.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{p.lastMessage}</p>
                    </div>
                    {p.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {format(new Date(p.lastMessageAt), "MMM d")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chat panel */}
          <div className="md:col-span-2">
            {selectedProject ? (
              <ProjectChat projectId={selectedProject} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a conversation
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
