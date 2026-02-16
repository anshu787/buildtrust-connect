import { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html } from "@react-three/drei";
import { Loader2, Box, Columns2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/web-ifc@0.0.57/";

function ComparisonModel({ url, color }: { url: string; color: string }) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    const loader = new IFCLoader();
    async function load() {
      try {
        await loader.ifcManager.setWasmPath(WASM_PATH);
        await loader.ifcManager.applyWebIfcConfig({ USE_FAST_BOOLS: true });

        // Fetch as blob to avoid CORS/redirect issues
        const response = await fetch(url);
        if (!response.ok) { if (!cancelled) setError(`Download failed (HTTP ${response.status}).`); return; }
        const blob = await response.blob();
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);

        loader.load(
          blobUrl,
          (ifcModel) => {
            if (cancelled) return;
            const box = new THREE.Box3().setFromObject(ifcModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 ? 5 / maxDim : 1;
            ifcModel.position.sub(center);
            ifcModel.scale.setScalar(scale);
            ifcModel.position.y += (size.y * scale) / 2;
            setModel(ifcModel);
          },
          (event) => { if (event.total > 0) setProgress(Math.round((event.loaded / event.total) * 100)); },
          (err) => { if (!cancelled) { console.error("IFC compare load error:", err); setError("Failed to parse model."); } }
        );
      } catch (err) {
        if (!cancelled) setError("Failed to load model.");
      }
    }
    load();
    return () => { cancelled = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [url]);

  if (error) {
    return (
      <Html center>
        <div className="flex items-center gap-2 text-xs text-destructive bg-background/80 backdrop-blur rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      </Html>
    );
  }

  if (!model) {
    return (
      <Html center>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
          {progress > 0 && (
            <div className="w-36">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
      </Html>
    );
  }

  return <primitive object={model} />;
}

function CompareCanvas({ url, label, labelColor }: { url: string; label: string; labelColor: string }) {
  return (
    <div className="flex-1 relative">
      <div className="absolute top-2 left-2 z-10 rounded bg-background/80 backdrop-blur px-2 py-1 text-[11px] font-semibold" style={{ borderLeft: `3px solid ${labelColor}` }}>
        {label}
      </div>
      <Canvas camera={{ position: [5, 4, 5], fov: 45 }} gl={{ antialias: true }}>
        <Suspense fallback={
          <Html center>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          </Html>
        }>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <ComparisonModel url={url} color={labelColor} />
          <Grid
            args={[20, 20]} cellSize={0.5} cellThickness={0.5} cellColor="hsl(210, 20%, 70%)"
            sectionSize={2} sectionThickness={1} sectionColor="hsl(210, 30%, 60%)"
            fadeDistance={15} fadeStrength={1} position={[0, -0.01, 0]}
          />
          <OrbitControls enablePan enableZoom enableRotate minDistance={3} maxDistance={20} target={[0, 1.5, 0]} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

interface BimCompareViewProps {
  files: { file_name: string; file_url: string }[];
  onClose: () => void;
}

export default function BimCompareView({ files, onClose }: BimCompareViewProps) {
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(files.length > 1 ? 1 : 0);

  if (files.length < 2) {
    return (
      <div className="rounded-xl border bg-gradient-to-b from-muted/30 to-background p-8 text-center">
        <Columns2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Need at least 2 IFC files to compare versions.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Columns2 className="h-4 w-4 text-primary" />
          Model Comparison
        </div>
        <div className="flex items-center gap-2">
          {/* Left file selector */}
          <select
            className="h-7 rounded border bg-background px-2 text-[11px]"
            value={leftIdx}
            onChange={(e) => setLeftIdx(Number(e.target.value))}
          >
            {files.map((f, i) => (
              <option key={i} value={i}>{f.file_name}</option>
            ))}
          </select>
          <span className="text-[11px] text-muted-foreground">vs</span>
          {/* Right file selector */}
          <select
            className="h-7 rounded border bg-background px-2 text-[11px]"
            value={rightIdx}
            onChange={(e) => setRightIdx(Number(e.target.value))}
          >
            {files.map((f, i) => (
              <option key={i} value={i}>{f.file_name}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onClose}>
            <Box className="h-3.5 w-3.5 mr-1" /> Back to Viewer
          </Button>
        </div>
      </div>

      {/* Side-by-side canvases */}
      <div className="flex h-[450px] divide-x">
        <CompareCanvas url={files[leftIdx].file_url} label={files[leftIdx].file_name} labelColor="hsl(220, 90%, 56%)" />
        <CompareCanvas url={files[rightIdx].file_url} label={files[rightIdx].file_name} labelColor="hsl(35, 90%, 56%)" />
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Each viewport has independent camera controls</span>
        <span className="text-primary font-medium">Side-by-Side Comparison</span>
      </div>
    </div>
  );
}
