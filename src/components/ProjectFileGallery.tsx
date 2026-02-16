import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Box, FileText, Image, Download, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BimViewer from "./BimViewer";

interface ProjectFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  milestone_id: string | null;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
}

interface Props {
  files: ProjectFile[];
  milestones: Milestone[];
  canEdit: boolean;
  onFileUpdated?: () => void;
}

const typeIcons: Record<string, typeof Box> = {
  ifc: Box,
  drawing: FileText,
  photo: Image,
  document: FileText,
};

const typeLabels: Record<string, string> = {
  ifc: "IFC Model",
  drawing: "Drawing",
  photo: "Site Photo",
  document: "Document",
};

export default function ProjectFileGallery({ files, milestones, canEdit, onFileUpdated }: Props) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

  const filteredFiles = filter === "all" ? files : files.filter((f) => f.file_type === filter);
  const ifcFiles = files.filter((f) => f.file_type === "ifc");

  const handleMilestoneTag = async (fileId: string, milestoneId: string | null) => {
    const { error } = await supabase
      .from("project_files")
      .update({ milestone_id: milestoneId === "none" ? null : milestoneId })
      .eq("id", fileId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Milestone tag updated" });
      onFileUpdated?.();
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* BIM 3D Viewer */}
      {ifcFiles.length > 0 && (
        <BimViewer
          fileName={ifcFiles[0].file_name}
          fileUrl={ifcFiles[0].file_url}
        />
      )}

      {/* File Gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-xl">Project Files ({files.length})</CardTitle>
            <div className="flex gap-2">
              {["all", "ifc", "drawing", "photo"].map((t) => (
                <Button
                  key={t}
                  variant={filter === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(t)}
                  className="text-xs"
                >
                  {t === "all" ? "All" : typeLabels[t] || t}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No files in this category.</p>
          ) : (
            <div className="grid gap-3">
              {filteredFiles.map((file) => {
                const Icon = typeIcons[file.file_type] || FileText;
                const milestone = milestones.find((m) => m.id === file.milestone_id);
                const isImage = file.file_type === "photo" || file.file_url.match(/\.(jpg|jpeg|png|webp|gif)$/i);

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 rounded-lg border bg-card p-3 hover:bg-accent/30 transition-colors"
                  >
                    {/* Thumbnail / Icon */}
                    {isImage ? (
                      <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted">
                        <img src={file.file_url} alt={file.file_name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabels[file.file_type] || file.file_type}
                        </Badge>
                        {file.file_size && (
                          <span className="text-[10px] text-muted-foreground">
                            {(file.file_size / 1024 / 1024).toFixed(1)}MB
                          </span>
                        )}
                        {milestone && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Tag className="h-2.5 w-2.5 mr-1" />
                            {milestone.title}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Milestone tagging */}
                    {canEdit && milestones.length > 0 && (
                      <Select
                        value={file.milestone_id || "none"}
                        onValueChange={(v) => handleMilestoneTag(file.id, v)}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Tag milestone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No milestone</SelectItem>
                          {milestones.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Download */}
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
