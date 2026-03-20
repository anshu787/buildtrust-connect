import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Upload, X, Plus, FileText, Image, Box, GripVertical } from "lucide-react";
import DropZone from "@/components/DropZone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MilestoneEntry {
  id: string;
  name: string;
  description: string;
  expectedDate: string;
  costAllocation: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
}

function SortableMilestoneItem({
  milestone,
  index,
  onUpdate,
  onRemove,
}: {
  milestone: MilestoneEntry;
  index: number;
  onUpdate: (index: number, field: keyof MilestoneEntry, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground">Milestone {index + 1}</span>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(index)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-2">
        <Input
          placeholder="Milestone name (e.g. Foundation Complete)"
          value={milestone.name}
          onChange={(e) => onUpdate(index, "name", e.target.value)}
          maxLength={200}
        />
        <Textarea
          placeholder="Description (optional)"
          value={milestone.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          rows={2}
          maxLength={1000}
          className="text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Expected Completion</Label>
          <Input type="date" value={milestone.expectedDate} onChange={(e) => onUpdate(index, "expectedDate", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cost Allocation (₹)</Label>
          <Input type="number" placeholder="Optional" value={milestone.costAllocation} onChange={(e) => onUpdate(index, "costAllocation", e.target.value)} min={0} />
        </div>
      </div>
    </div>
  );
}

export default function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    budget_min: "",
    budget_max: "",
    start_date: "",
    end_date: "",
  });

  // File uploads
  const [ifcFiles, setIfcFiles] = useState<UploadedFile[]>([]);
  const [drawings, setDrawings] = useState<UploadedFile[]>([]);
  const [sitePhotos, setSitePhotos] = useState<UploadedFile[]>([]);

  // Milestones
  const [milestones, setMilestones] = useState<MilestoneEntry[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    maxSize = 20
  ) => {
    const files = Array.from(e.target.files || []);
    addFilesToState(files, setter, maxSize);
    e.target.value = "";
  };

  const addFilesToState = useCallback(
    (
      files: File[],
      setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
      maxSize = 20
    ) => {
      const valid = files.filter((f) => {
        if (f.size > maxSize * 1024 * 1024) {
          toast({ title: "File too large", description: `${f.name} exceeds ${maxSize}MB limit.`, variant: "destructive" });
          return false;
        }
        return true;
      });
      const uploads: UploadedFile[] = valid.map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));
      setter((prev) => [...prev, ...uploads]);
    },
    [toast]
  );

  const removeFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    setter((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { id: crypto.randomUUID(), name: "", description: "", expectedDate: "", costAllocation: "" }]);
  };

  const updateMilestone = (index: number, field: keyof MilestoneEntry, value: string) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMilestones((prev) => {
        const oldIndex = prev.findIndex((m) => m.id === active.id);
        const newIndex = prev.findIndex((m) => m.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const uploadFiles = async (
    projectId: string,
    files: UploadedFile[],
    folder: string,
    fileType: string
  ): Promise<{ url: string; name: string; size: number }[]> => {
    const results: { url: string; name: string; size: number }[] = [];
    for (const { file } of files) {
      const path = `${user!.id}/${projectId}/${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("project-files").upload(path, file);
      if (!error) {
        // Store the storage path as the URL reference (bucket is private, signed URLs generated on read)
        results.push({ url: path, name: file.name, size: file.size });
      }
    }
    return results;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      // 1. Create the project
      const { data: project, error: projError } = await supabase
        .from("projects")
        .insert({
          builder_id: user.id,
          title: form.title,
          description: form.description || null,
          location: form.location || null,
          budget_min: form.budget_min ? Number(form.budget_min) : null,
          budget_max: form.budget_max ? Number(form.budget_max) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        })
        .select("id")
        .single();

      if (projError || !project) throw projError || new Error("Failed to create project");

      // 2. Upload files in parallel
      const [ifcResults, drawingResults, photoResults] = await Promise.all([
        uploadFiles(project.id, ifcFiles, "ifc", "ifc"),
        uploadFiles(project.id, drawings, "drawings", "drawing"),
        uploadFiles(project.id, sitePhotos, "photos", "photo"),
      ]);

      // 3. Update BIM file URL if IFC uploaded
      if (ifcResults.length > 0) {
        await supabase
          .from("projects")
          .update({ bim_file_url: ifcResults[0].url })
          .eq("id", project.id);
      }

      // 4. Create milestones
      const validMilestones = milestones.filter((m) => m.name.trim());
      if (validMilestones.length > 0) {
        const msInserts = validMilestones.map((m, i) => ({
          project_id: project.id,
          title: m.name.trim(),
          description: [m.description.trim(), m.expectedDate ? `Expected: ${m.expectedDate}` : ""].filter(Boolean).join(" | ") || null,
          amount: m.costAllocation ? Number(m.costAllocation) : null,
          order_index: i,
        }));
        await supabase.from("milestones").insert(msInserts);
      }

      // 5. Save file records to project_files table
      const allFiles = [
        ...ifcResults.map((f) => ({ ...f, type: "ifc" })),
        ...drawingResults.map((f) => ({ ...f, type: "drawing" })),
        ...photoResults.map((f) => ({ ...f, type: "photo" })),
      ];
      if (allFiles.length > 0) {
        const fileInserts = allFiles.map((f) => ({
          project_id: project.id,
          uploaded_by: user.id,
          file_url: f.url,
          file_name: f.name,
          file_type: f.type,
          file_size: f.size,
        }));
        await supabase.from("project_files").insert(fileInserts);
      }

      const totalFiles = ifcResults.length + drawingResults.length + photoResults.length;
      toast({ title: "Project created!", description: `${totalFiles} files uploaded.` });
      navigate("/builder");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" onClick={() => navigate("/builder")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Basic Details ── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Create New Project</CardTitle>
            <CardDescription>Post a construction project for contractors to bid on.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input id="title" name="title" value={form.title} onChange={handleChange} required placeholder="e.g. 3-Story Residential Building" maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={form.description} onChange={handleChange} placeholder="Describe the project scope, requirements, and any specific details..." rows={5} maxLength={5000} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Lagos, Nigeria" maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label>Estimated Budget ($)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input name="budget_min" type="number" value={form.budget_min} onChange={handleChange} placeholder="Min budget" min={0} />
                <Input name="budget_max" type="number" value={form.budget_max} onChange={handleChange} placeholder="Max budget" min={0} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" name="end_date" type="date" value={form.end_date} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── BIM / Attachments ── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> BIM &amp; Attachments
            </CardTitle>
            <CardDescription>Upload IFC models, drawings, and site photos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* IFC File */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" /> IFC File Upload
              </Label>
              <DropZone
                accept=".ifc"
                onFiles={(files) => addFilesToState(files, setIfcFiles)}
                label="Drag & drop IFC files here, or click to browse"
                sublabel=".ifc files up to 20MB"
                icon={<Box className="h-5 w-5" />}
              />
              {ifcFiles.length > 0 && (
                <div className="space-y-2">
                  {ifcFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      <Box className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate flex-1">{f.file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.file.size / 1024 / 1024).toFixed(1)}MB</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(i, setIfcFiles)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Drawings */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Drawings Upload
              </Label>
              <DropZone
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onFiles={(files) => addFilesToState(files, setDrawings)}
                label="Drag & drop drawings here, or click to browse"
                sublabel="PDF, JPG, PNG up to 20MB"
                icon={<FileText className="h-5 w-5" />}
              />
              {drawings.length > 0 && (
                <div className="space-y-2">
                  {drawings.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate flex-1">{f.file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.file.size / 1024 / 1024).toFixed(1)}MB</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(i, setDrawings)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Site Photos */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" /> Site Photos
              </Label>
              <DropZone
                accept="image/*"
                onFiles={(files) => addFilesToState(files, setSitePhotos)}
                label="Drag & drop photos here, or click to browse"
                sublabel="JPG, PNG, WebP up to 20MB"
                icon={<Image className="h-5 w-5" />}
              />
              {sitePhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {sitePhotos.map((f, i) => (
                    <div key={i} className="group relative rounded-lg border overflow-hidden aspect-square bg-muted">
                      {f.preview ? (
                        <img src={f.preview} alt={f.file.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(i, setSitePhotos)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute bottom-0 inset-x-0 bg-background/80 px-2 py-1">
                        <p className="text-[10px] truncate">{f.file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Milestone Setup ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-xl">Milestone Setup</CardTitle>
                <CardDescription>Define project milestones for tracking progress and escrow releases.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                <Plus className="mr-1 h-4 w-4" /> Add Milestone
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
                <p className="text-sm text-muted-foreground">No milestones added yet. Click "Add Milestone" to define project phases.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={milestones.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {milestones.map((m, i) => (
                      <SortableMilestoneItem
                        key={m.id}
                        milestone={m}
                        index={i}
                        onUpdate={updateMilestone}
                        onRemove={removeMilestone}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* ── Submit ── */}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Project
        </Button>
      </form>
    </div>
  );
}
