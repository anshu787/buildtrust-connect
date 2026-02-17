import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Box, FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import BimViewer from "@/components/BimViewer";

export default function BimTest() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileName(file.name);
    setFileSize(file.size);
  }, [fileUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".ifc") || file.name.endsWith(".IFC"))) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold font-display">BIM Viewer Test</h1>
          </div>
          <Badge variant="outline" className="ml-auto">Test Page</Badge>
        </div>
      </header>

      <main className="container max-w-5xl py-8 space-y-6">
        {!fileUrl ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload an IFC File</CardTitle>
              <CardDescription>Drag & drop or click to select an IFC model file to test the 3D viewer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-16 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Drop your .ifc file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".ifc"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">({(fileSize / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setFileUrl(null); setFileName(""); }}>
                Upload Different File
              </Button>
            </div>
            <BimViewer
              fileName={fileName}
              fileUrl={fileUrl}
              fileSize={fileSize}
              projectId="test-project"
              annotations={[]}
            />
          </div>
        )}
      </main>
    </div>
  );
}
