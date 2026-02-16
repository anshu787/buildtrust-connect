import { Suspense, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html, Line } from "@react-three/drei";
import {
  Loader2, Box, AlertTriangle, MousePointerClick,
  Scissors, ChevronRight, ChevronDown, Eye, EyeOff, List, X,
  Camera, Ruler, Trash2, MessageSquarePlus, StickyNote
} from "lucide-react";
import { AnnotationMarkers, AnnotationInput, type Annotation } from "./BimAnnotations";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/web-ifc@0.0.57/";
const MAX_FILE_SIZE_MB = 50;

const HIGHLIGHT_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("hsl(45, 100%, 55%)"),
  transparent: true,
  opacity: 0.85,
  depthTest: false,
});

// ─── Element tree types ───
interface ElementNode {
  id: number;
  name: string;
  type: string;
  object: THREE.Object3D;
  children: ElementNode[];
  visible: boolean;
}

// ─── Measurement types ───
interface MeasurePoint {
  position: THREE.Vector3;
}

interface Measurement {
  id: string;
  points: THREE.Vector3[];
  distance: number;
}

function buildElementTree(obj: THREE.Object3D, depth = 0): ElementNode[] {
  const nodes: ElementNode[] = [];
  obj.children.forEach((child) => {
    const name = child.name || child.userData?.name || `Object #${child.id}`;
    const type = child.userData?.type || (child instanceof THREE.Mesh ? "Mesh" : "Group");
    const childNodes = depth < 3 ? buildElementTree(child, depth + 1) : [];
    if (child instanceof THREE.Mesh || childNodes.length > 0) {
      nodes.push({ id: child.id, name, type, object: child, children: childNodes, visible: child.visible });
    }
  });
  return nodes;
}

// ─── Screenshot helper (inside Canvas) ───
function ScreenshotHelper({ onCapture }: { onCapture: React.MutableRefObject<(() => void) | null> }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    onCapture.current = () => {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `bim-screenshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    };
    return () => { onCapture.current = null; };
  }, [gl, scene, camera, onCapture]);

  return null;
}

// ─── Measurement lines rendered in scene ───
function MeasurementLines({ measurements }: { measurements: Measurement[] }) {
  return (
    <>
      {measurements.map((m) => (
        <group key={m.id}>
          <Line
            points={m.points.map((p) => [p.x, p.y, p.z] as [number, number, number])}
            color="hsl(0, 85%, 60%)"
            lineWidth={2}
            dashed={false}
          />
          {m.points.map((p, i) => (
            <mesh key={i} position={[p.x, p.y, p.z]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshBasicMaterial color="hsl(0, 85%, 60%)" />
            </mesh>
          ))}
          {m.points.length === 2 && (
            <Html
              position={[
                (m.points[0].x + m.points[1].x) / 2,
                (m.points[0].y + m.points[1].y) / 2 + 0.15,
                (m.points[0].z + m.points[1].z) / 2,
              ]}
              center
              distanceFactor={8}
            >
              <div className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground whitespace-nowrap shadow">
                {m.distance.toFixed(2)}m
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}

// ─── Pending measurement point ───
function PendingPoint({ point }: { point: THREE.Vector3 }) {
  return (
    <mesh position={[point.x, point.y, point.z]}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshBasicMaterial color="hsl(45, 100%, 55%)" />
    </mesh>
  );
}

// ─── Clipping plane component ───
function ClippingPlane({ enabled, position, axis }: { enabled: boolean; position: number; axis: "x" | "y" | "z" }) {
  const { gl, scene } = useThree();
  const planeRef = useRef(new THREE.Plane());

  useEffect(() => { gl.localClippingEnabled = enabled; }, [enabled, gl]);

  useEffect(() => {
    if (!enabled) {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => { m.clippingPlanes = []; m.needsUpdate = true; });
        }
      });
      return;
    }
    const normal = new THREE.Vector3(axis === "x" ? -1 : 0, axis === "y" ? -1 : 0, axis === "z" ? -1 : 0);
    planeRef.current.set(normal, position);
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => { m.clippingPlanes = [planeRef.current]; m.clipShadows = true; m.needsUpdate = true; });
      }
    });
  }, [enabled, position, axis, scene]);

  return null;
}

// ─── IFC Model ───
function IFCModel({
  url, onPick, onModelLoaded, clippingEnabled, clippingPosition, clippingAxis,
  measureMode, onMeasureClick, annotateMode, onAnnotateClick,
}: {
  url: string;
  onPick?: (info: string | null) => void;
  onModelLoaded?: (elements: ElementNode[]) => void;
  clippingEnabled: boolean;
  clippingPosition: number;
  clippingAxis: "x" | "y" | "z";
  measureMode: boolean;
  onMeasureClick?: (point: THREE.Vector3) => void;
  annotateMode: boolean;
  onAnnotateClick?: (point: THREE.Vector3) => void;
}) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const highlightRef = useRef<THREE.Mesh | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    const loader = new IFCLoader();

    async function load() {
      try {
        await loader.ifcManager.setWasmPath(WASM_PATH);
        await loader.ifcManager.applyWebIfcConfig({ USE_FAST_BOOLS: true });

        // Fetch file as blob first to avoid CORS/redirect issues with storage URLs
        setProgress(5);
        const response = await fetch(url);
        if (!response.ok) {
          if (!cancelled) setError(`Failed to download IFC file (HTTP ${response.status}).`);
          return;
        }
        const blob = await response.blob();
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setProgress(20);

        loader.load(
          blobUrl,
          (ifcModel) => {
            if (cancelled) return;
            const box = new THREE.Box3().setFromObject(ifcModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 ? 6 / maxDim : 1;
            ifcModel.position.sub(center);
            ifcModel.scale.setScalar(scale);
            ifcModel.position.y += (size.y * scale) / 2;
            setModel(ifcModel);
            onModelLoaded?.(buildElementTree(ifcModel));
          },
          (event) => { if (event.total > 0) setProgress(20 + Math.round((event.loaded / event.total) * 80)); },
          (err) => { if (!cancelled) { console.error("IFC parse error:", err); setError("Failed to parse IFC file. The file may be corrupted."); } }
        );
      } catch (err) {
        if (!cancelled) { console.error("IFC load error:", err); setError("Failed to load IFC file. Check your network connection."); }
      }
    }
    load();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();

      // Annotation mode
      if (annotateMode && e.intersections[0]?.point) {
        onAnnotateClick?.(e.intersections[0].point.clone());
        return;
      }

      // Measurement mode
      if (measureMode && e.intersections[0]?.point) {
        onMeasureClick?.(e.intersections[0].point.clone());
        return;
      }

      // Selection mode
      if (highlightRef.current) {
        scene.remove(highlightRef.current);
        highlightRef.current.geometry.dispose();
        highlightRef.current = null;
      }
      const hit = e.intersections[0];
      if (!hit?.object) { onPick?.(null); return; }
      const mesh = hit.object as THREE.Mesh;
      if (mesh.geometry) {
        const clone = new THREE.Mesh(mesh.geometry.clone(), HIGHLIGHT_MATERIAL);
        clone.applyMatrix4(mesh.matrixWorld);
        clone.renderOrder = 1;
        scene.add(clone);
        highlightRef.current = clone;
        const name = mesh.name || mesh.userData?.name || `Element #${mesh.id}`;
        const type = mesh.userData?.type || "IFC Element";
        onPick?.(`${type}: ${name}`);
      }
    },
    [scene, onPick, measureMode, onMeasureClick]
  );

  useEffect(() => {
    return () => {
      if (highlightRef.current) { scene.remove(highlightRef.current); highlightRef.current.geometry.dispose(); }
    };
  }, [scene]);

  if (error) {
    return (
      <>
        <Html center>
          <div className="flex items-center gap-2 text-xs text-destructive bg-background/80 backdrop-blur rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        </Html>
        <PlaceholderBuilding />
      </>
    );
  }

  if (!model) {
    return (
      <Html center>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading IFC model...
          </div>
          {progress > 0 && (
            <div className="w-48">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center mt-1">{progress}%</p>
            </div>
          )}
        </div>
      </Html>
    );
  }

  return (
    <>
      <ClippingPlane enabled={clippingEnabled} position={clippingPosition} axis={clippingAxis} />
      <primitive object={model} onClick={handleClick} />
    </>
  );
}

// ─── Placeholder ───
function PlaceholderBuilding() {
  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 2]} />
        <meshStandardMaterial color="hsl(210, 40%, 75%)" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 2]} />
        <meshStandardMaterial color="hsl(210, 60%, 50%)" wireframe />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, i, 0]}>
          <boxGeometry args={[3.1, 0.05, 2.1]} />
          <meshStandardMaterial color="hsl(210, 30%, 60%)" />
        </mesh>
      ))}
      {[-0.8, 0, 0.8].map((x) =>
        [0.5, 1.5, 2.5].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, y, 1.01]}>
            <planeGeometry args={[0.4, 0.5]} />
            <meshStandardMaterial color="hsl(200, 80%, 70%)" transparent opacity={0.6} />
          </mesh>
        ))
      )}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[3.3, 0.1, 2.3]} />
        <meshStandardMaterial color="hsl(210, 20%, 50%)" />
      </mesh>
    </group>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading 3D viewer...
      </div>
    </Html>
  );
}

// ─── Element Tree Item ───
function TreeItem({ node, depth, onSelect, onToggleVisibility }: {
  node: ElementNode; depth: number; onSelect: (node: ElementNode) => void; onToggleVisibility: (node: ElementNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 hover:bg-accent/50 cursor-pointer rounded text-[11px] group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="shrink-0 p-0.5 hover:bg-accent rounded">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : <span className="w-4 shrink-0" />}
        <span className="truncate flex-1 font-medium">{node.name}</span>
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">{node.type}</Badge>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(node); }}
          className="shrink-0 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-opacity"
        >
          {node.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <TreeItem key={child.id} node={child} depth={depth + 1} onSelect={onSelect} onToggleVisibility={onToggleVisibility} />
      ))}
    </div>
  );
}

// ─── Main BimViewer ───
interface BimViewerProps {
  fileName?: string;
  fileUrl?: string;
  fileSize?: number | null;
  projectId?: string;
  annotations?: Annotation[];
  onAnnotationsChanged?: () => void;
}

export default function BimViewer({ fileName, fileUrl, fileSize, projectId, annotations = [], onAnnotationsChanged }: BimViewerProps) {
  const { toast } = useToast();
  const isIfc = fileUrl && (fileUrl.endsWith(".ifc") || fileUrl.includes(".ifc"));
  const [pickedElement, setPickedElement] = useState<string | null>(null);
  const fileSizeMB = fileSize ? fileSize / 1024 / 1024 : 0;
  const isLargeFile = fileSizeMB > MAX_FILE_SIZE_MB;

  // Clipping
  const [clippingEnabled, setClippingEnabled] = useState(false);
  const [clippingPosition, setClippingPosition] = useState(3);
  const [clippingAxis, setClippingAxis] = useState<"x" | "y" | "z">("y");

  // Element tree
  const [elements, setElements] = useState<ElementNode[]>([]);
  const [showTree, setShowTree] = useState(false);

  // Screenshot
  const screenshotRef = useRef<(() => void) | null>(null);

  // Measurement
  const [measureMode, setMeasureMode] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [pendingPoint, setPendingPoint] = useState<THREE.Vector3 | null>(null);

  // Annotations
  const [annotateMode, setAnnotateMode] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{ x: number; y: number; z: number } | null>(null);

  const handleModelLoaded = useCallback((tree: ElementNode[]) => setElements(tree), []);
  const handleTreeSelect = useCallback((node: ElementNode) => setPickedElement(`${node.type}: ${node.name}`), []);
  const handleToggleVisibility = useCallback((node: ElementNode) => {
    node.object.visible = !node.object.visible;
    node.visible = node.object.visible;
    setElements((prev) => [...prev]);
  }, []);

  const elementCount = useMemo(() => {
    let count = 0;
    function countNodes(nodes: ElementNode[]) { nodes.forEach((n) => { count++; countNodes(n.children); }); }
    countNodes(elements);
    return count;
  }, [elements]);

  const handleScreenshot = useCallback(() => {
    if (screenshotRef.current) {
      screenshotRef.current();
      toast({ title: "Screenshot saved", description: "PNG image downloaded." });
    }
  }, [toast]);

  const handleMeasureClick = useCallback((point: THREE.Vector3) => {
    if (!pendingPoint) {
      setPendingPoint(point);
    } else {
      const dist = pendingPoint.distanceTo(point);
      setMeasurements((prev) => [...prev, {
        id: `m-${Date.now()}`,
        points: [pendingPoint, point],
        distance: dist,
      }]);
      setPendingPoint(null);
    }
  }, [pendingPoint]);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setPendingPoint(null);
  }, []);

  const toggleMeasureMode = useCallback(() => {
    setMeasureMode((prev) => {
      if (prev) { setPendingPoint(null); }
      return !prev;
    });
  }, []);

  return (
    <div className="relative rounded-xl border bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      {/* Header bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-background/80 backdrop-blur px-3 py-1.5 text-xs font-medium">
        <Box className="h-3.5 w-3.5 text-primary" />
        {fileName || "BIM Model Preview"}
        {fileSizeMB > 0 && <span className="text-muted-foreground ml-1">({fileSizeMB.toFixed(1)}MB)</span>}
      </div>

      {/* Top-right controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {isIfc && (
          <>
            {/* Screenshot */}
            <Button variant="secondary" size="sm" className="h-7 text-[11px] gap-1" onClick={handleScreenshot}>
              <Camera className="h-3.5 w-3.5" /> Screenshot
            </Button>
            {/* Measure toggle */}
            <Button
              variant={measureMode ? "default" : "secondary"}
              size="sm"
              className="h-7 text-[11px] gap-1"
              onClick={toggleMeasureMode}
            >
              <Ruler className="h-3.5 w-3.5" />
              {measureMode ? "Measuring" : "Measure"}
            </Button>
            {/* Annotate toggle */}
            {projectId && (
              <Button
                variant={annotateMode ? "default" : "secondary"}
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => { setAnnotateMode(!annotateMode); setPendingAnnotation(null); }}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                {annotateMode ? "Annotating" : "Annotate"}
                {annotations.length > 0 && ` (${annotations.length})`}
              </Button>
            )}
            {/* Element tree */}
            {elements.length > 0 && (
              <Button
                variant={showTree ? "default" : "secondary"}
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => setShowTree(!showTree)}
              >
                <List className="h-3.5 w-3.5" /> ({elementCount})
              </Button>
            )}
          </>
        )}
        {fileUrl && (
          <a href={fileUrl} download className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Download
          </a>
        )}
      </div>

      {/* File size warning */}
      {isLargeFile && (
        <div className="absolute top-12 left-3 right-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Large file ({fileSizeMB.toFixed(0)}MB) — loading may be slow.
          </div>
        </div>
      )}

      {/* Measure mode banner */}
      {measureMode && (
        <div className="absolute top-12 left-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-primary/90 backdrop-blur px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg">
            <Ruler className="h-3.5 w-3.5" />
            {pendingPoint ? "Click second point to measure" : "Click first point on model"}
            {measurements.length > 0 && (
              <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-2 text-primary-foreground hover:text-primary-foreground/80 px-1.5" onClick={clearMeasurements}>
                <Trash2 className="h-3 w-3 mr-0.5" /> Clear ({measurements.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Annotate mode banner */}
      {annotateMode && (
        <div className="absolute top-12 left-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-primary/90 backdrop-blur px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Click on the model to place an annotation
          </div>
        </div>
      )}

      {/* Section plane controls */}
      {isIfc && (
        <div className="absolute bottom-12 right-3 z-10 flex flex-col gap-2 rounded-lg bg-background/90 backdrop-blur border p-3 w-52">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <Scissors className="h-3.5 w-3.5 text-primary" /> Section Plane
            </div>
            <Switch checked={clippingEnabled} onCheckedChange={setClippingEnabled} className="scale-75" />
          </div>
          {clippingEnabled && (
            <>
              <div className="flex gap-1">
                {(["x", "y", "z"] as const).map((a) => (
                  <Button key={a} size="sm" variant={clippingAxis === a ? "default" : "outline"} className="h-6 text-[10px] flex-1 px-0" onClick={() => setClippingAxis(a)}>
                    {a.toUpperCase()}
                  </Button>
                ))}
              </div>
              <Slider min={-6} max={6} step={0.1} value={[clippingPosition]} onValueChange={([v]) => setClippingPosition(v)} className="w-full" />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">Position: {clippingPosition.toFixed(1)}</p>
                <Button variant="outline" size="sm" className="h-5 text-[10px] px-2 gap-1" onClick={handleScreenshot}>
                  <Camera className="h-3 w-3" /> Export
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Picked element info */}
      {pickedElement && !measureMode && (
        <div className="absolute bottom-12 left-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-primary/90 backdrop-blur px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg">
            <MousePointerClick className="h-3.5 w-3.5 shrink-0" /> {pickedElement}
          </div>
        </div>
      )}

      {/* Measurement results panel */}
      {measurements.length > 0 && !measureMode && (
        <div className="absolute bottom-12 left-3 z-10">
          <div className="rounded-lg bg-background/90 backdrop-blur border p-2.5 space-y-1.5 max-w-60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1"><Ruler className="h-3 w-3 text-primary" /> Measurements</span>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={clearMeasurements}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {measurements.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between text-[11px] bg-muted/50 rounded px-2 py-1">
                <span className="text-muted-foreground">#{i + 1}</span>
                <span className="font-mono font-semibold">{m.distance.toFixed(3)} m</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-[11px] border-t pt-1.5">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-mono font-bold text-primary">
                {measurements.reduce((s, m) => s + m.distance, 0).toFixed(3)} m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main content: tree sidebar + canvas */}
      <div className="flex h-[450px]">
        {/* Element tree sidebar */}
        {showTree && (
          <div className="w-64 shrink-0 border-r bg-background/95 backdrop-blur flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-semibold">Model Elements</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowTree(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="py-1">
                {elements.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground p-3">No elements found.</p>
                ) : elements.map((node) => (
                  <TreeItem key={node.id} node={node} depth={0} onSelect={handleTreeSelect} onToggleVisibility={handleToggleVisibility} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 3D Canvas */}
        <div className="flex-1" style={{ cursor: measureMode || annotateMode ? "crosshair" : undefined }}>
          <Canvas
            camera={{ position: [5, 4, 5], fov: 45 }}
            gl={{ antialias: true, localClippingEnabled: true, preserveDrawingBuffer: true }}
            onPointerMissed={() => { if (!measureMode) setPickedElement(null); }}
          >
            <Suspense fallback={<LoadingFallback />}>
              <ScreenshotHelper onCapture={screenshotRef} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              {isIfc && fileUrl ? (
                <IFCModel
                  url={fileUrl}
                  onPick={setPickedElement}
                  onModelLoaded={handleModelLoaded}
                  clippingEnabled={clippingEnabled}
                  clippingPosition={clippingPosition}
                  clippingAxis={clippingAxis}
                  measureMode={measureMode}
                  onMeasureClick={handleMeasureClick}
                  annotateMode={annotateMode}
                  onAnnotateClick={(point) => setPendingAnnotation({ x: point.x, y: point.y, z: point.z })}
                />
              ) : (
                <PlaceholderBuilding />
              )}
              <MeasurementLines measurements={measurements} />
              {pendingPoint && <PendingPoint point={pendingPoint} />}
              <AnnotationMarkers annotations={annotations} onSelect={() => {}} />
              {pendingAnnotation && projectId && (
                <AnnotationInput
                  position={pendingAnnotation}
                  projectId={projectId}
                  onSaved={() => { setPendingAnnotation(null); setAnnotateMode(false); onAnnotationsChanged?.(); }}
                  onCancel={() => setPendingAnnotation(null)}
                />
              )}
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
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>
          Orbit: drag • Zoom: scroll • Pan: right-click
          {isIfc && !measureMode && !annotateMode ? " • Click: select" : ""}
          {measureMode ? " • Click: place measure point" : ""}
          {annotateMode ? " • Click: place annotation" : ""}
        </span>
        <span className="text-primary font-medium">
          {isIfc ? "IFC Model Viewer" : "Interactive 3D Preview"}
        </span>
      </div>
    </div>
  );
}
