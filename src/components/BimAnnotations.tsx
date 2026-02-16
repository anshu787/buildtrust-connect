import { useState, useEffect, useCallback } from "react";
import { Html } from "@react-three/drei";
import { ThreeEvent, useThree } from "@react-three/fiber";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquarePlus, X, Trash2, Send, StickyNote, Loader2
} from "lucide-react";
import * as THREE from "three";

export interface Annotation {
  id: string;
  project_id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  text: string;
  color: string;
  created_at: string;
}

// ─── 3D Annotation markers rendered in scene ───
export function AnnotationMarkers({
  annotations,
  onSelect,
}: {
  annotations: Annotation[];
  onSelect?: (annotation: Annotation) => void;
}) {
  return (
    <>
      {annotations.map((a) => (
        <group key={a.id}>
          <mesh position={[a.position_x, a.position_y, a.position_z]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="hsl(220, 90%, 56%)" />
          </mesh>
          <Html
            position={[a.position_x, a.position_y + 0.2, a.position_z]}
            center
            distanceFactor={8}
          >
            <button
              onClick={() => onSelect?.(a)}
              className="rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground whitespace-nowrap shadow-lg hover:bg-primary/90 transition-colors max-w-32 truncate cursor-pointer"
            >
              <StickyNote className="h-3 w-3 inline mr-1" />
              {a.text}
            </button>
          </Html>
        </group>
      ))}
    </>
  );
}

// ─── Annotation Panel (overlay UI) ───
export function AnnotationPanel({
  projectId,
  annotations,
  annotateMode,
  onToggleMode,
  onAnnotationsChanged,
  selectedAnnotation,
  onSelectAnnotation,
}: {
  projectId: string;
  annotations: Annotation[];
  annotateMode: boolean;
  onToggleMode: () => void;
  onAnnotationsChanged: () => void;
  selectedAnnotation: Annotation | null;
  onSelectAnnotation: (a: Annotation | null) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showList, setShowList] = useState(false);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("model_annotations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Annotation deleted" });
      onSelectAnnotation(null);
      onAnnotationsChanged();
    }
  };

  return (
    <>
      {/* Annotate mode banner */}
      {annotateMode && (
        <div className="absolute top-12 left-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-primary/90 backdrop-blur px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Click on the model to place an annotation
          </div>
        </div>
      )}

      {/* Selected annotation detail */}
      {selectedAnnotation && !annotateMode && (
        <div className="absolute bottom-12 left-3 z-10">
          <div className="rounded-lg bg-background/90 backdrop-blur border p-3 max-w-64 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <StickyNote className="h-3 w-3 text-primary" /> Annotation
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSelectAnnotation(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs">{selectedAnnotation.text}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(selectedAnnotation.created_at).toLocaleDateString()}
            </p>
            {user?.id === selectedAnnotation.user_id && (
              <Button variant="destructive" size="sm" className="h-6 text-[10px] w-full" onClick={() => handleDelete(selectedAnnotation.id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Annotation list sidebar toggle is handled via showList */}
      {showList && (
        <div className="absolute top-12 right-3 z-10 w-56 rounded-lg bg-background/95 backdrop-blur border shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-semibold">Annotations ({annotations.length})</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowList(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="max-h-60">
            {annotations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground p-3 text-center">No annotations yet.</p>
            ) : (
              <div className="p-1 space-y-0.5">
                {annotations.map((a) => (
                  <button
                    key={a.id}
                    className="w-full text-left rounded px-2 py-1.5 text-[11px] hover:bg-accent/50 transition-colors"
                    onClick={() => { onSelectAnnotation(a); setShowList(false); }}
                  >
                    <p className="font-medium truncate">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </>
  );
}

// ─── Annotation input dialog (shown after clicking model in annotate mode) ───
export function AnnotationInput({
  position,
  projectId,
  onSaved,
  onCancel,
}: {
  position: { x: number; y: number; z: number };
  projectId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("model_annotations").insert({
      project_id: projectId,
      user_id: user.id,
      position_x: position.x,
      position_y: position.y,
      position_z: position.z,
      text: text.trim(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Annotation saved" });
      onSaved();
    }
  };

  return (
    <Html position={[position.x, position.y + 0.3, position.z]} center distanceFactor={6}>
      <div className="rounded-lg bg-background border shadow-xl p-3 w-56 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold flex items-center gap-1">
            <MessageSquarePlus className="h-3 w-3 text-primary" /> Add Note
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <Input
          placeholder="Type your annotation..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-8 text-xs"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <Button size="sm" className="h-7 text-[11px] w-full" onClick={handleSave} disabled={!text.trim() || saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
          Save
        </Button>
      </div>
    </Html>
  );
}

// ─── Hook to load annotations ───
export function useAnnotations(projectId: string | undefined) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data } = await supabase
      .from("model_annotations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    setAnnotations((data as Annotation[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  return { annotations, loading, refetch: fetchAnnotations };
}
