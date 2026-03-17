import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Loader2, Paperclip, FileText, X, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

interface ProjectChatProps {
  projectId: string;
  compact?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isImageType(type: string | null | undefined) {
  return type?.startsWith("image/");
}

export default function ProjectChat({ projectId, compact = false }: ProjectChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);
      setLoading(false);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Use images, PDFs, or Office documents.");
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    const ext = file.name.split(".").pop();
    const path = `${projectId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file);

    if (error) {
      toast.error("Failed to upload file.");
      return null;
    }

    const { data: signedData } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

    return signedData ? { url: signedData.signedUrl, name: file.name, type: file.type } : null;
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !user) return;
    setSending(true);

    let fileData: { url: string; name: string; type: string } | null = null;
    if (selectedFile) {
      fileData = await uploadFile(selectedFile);
      if (!fileData) { setSending(false); return; }
    }

    const { error } = await supabase.from("messages").insert({
      project_id: projectId,
      sender_id: user.id,
      content: newMessage.trim() || (fileData ? `📎 ${fileData.name}` : ""),
      file_url: fileData?.url ?? null,
      file_name: fileData?.name ?? null,
      file_type: fileData?.type ?? null,
    });

    if (!error) {
      setNewMessage("");
      clearFile();
    }
    setSending(false);
  };

  const getSignedUrl = async (fileUrl: string) => {
    // If it's already a signed URL, open directly
    window.open(fileUrl, "_blank");
  };

  const maxH = compact ? "max-h-[300px]" : "max-h-[500px]";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" /> Project Chat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className={`${maxH} overflow-y-auto space-y-3 mb-3 pr-1`}>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    {/* Attachment preview */}
                    {msg.file_url && (
                      <div className="mb-2">
                        {isImageType(msg.file_type) ? (
                          <img
                            src={msg.file_url}
                            alt={msg.file_name || "attachment"}
                            className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                            onClick={() => getSignedUrl(msg.file_url!)}
                          />
                        ) : (
                          <button
                            onClick={() => getSignedUrl(msg.file_url!)}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                              isMe ? "bg-primary-foreground/10" : "bg-background"
                            }`}
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-[150px]">{msg.file_name || "File"}</span>
                            <Download className="h-3 w-3 shrink-0" />
                          </button>
                        )}
                      </div>
                    )}
                    {/* Don't show auto-generated content for file-only messages */}
                    {msg.content && !(msg.file_url && msg.content.startsWith("📎")) && (
                      <p>{msg.content}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(new Date(msg.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* File preview bar */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-muted text-sm">
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="h-10 w-10 rounded object-cover" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="truncate flex-1 text-foreground">{selectedFile.name}</span>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={clearFile}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={sending || (!newMessage.trim() && !selectedFile)}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
