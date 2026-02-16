import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function DropZone({
  accept,
  multiple = true,
  onFiles,
  label,
  sublabel,
  icon,
  className,
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      dragCounter.current = 0;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (!multiple && droppedFiles.length > 1) {
        onFiles([droppedFiles[0]]);
      } else {
        onFiles(droppedFiles);
      }
    },
    [multiple, onFiles]
  );

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01] shadow-md"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30",
        className
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
          dragging ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {icon || <Upload className="h-5 w-5" />}
      </div>
      <div>
        <p className="text-sm font-medium">
          {dragging ? "Drop files here" : label}
        </p>
        {sublabel && !dragging && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
