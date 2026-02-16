import { Suspense, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useThree, ThreeEvent, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html } from "@react-three/drei";
import {
  Loader2, Box, AlertTriangle, MousePointerClick,
  Scissors, ChevronRight, ChevronDown, Eye, EyeOff, List, X
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

function buildElementTree(obj: THREE.Object3D, depth = 0): ElementNode[] {
  const nodes: ElementNode[] = [];
  obj.children.forEach((child) => {
    const name = child.name || child.userData?.name || `Object #${child.id}`;
    const type = child.userData?.type || (child instanceof THREE.Mesh ? "Mesh" : "Group");
    const childNodes = depth < 3 ? buildElementTree(child, depth + 1) : [];
    if (child instanceof THREE.Mesh || childNodes.length > 0) {
      nodes.push({
        id: child.id,
        name,
        type,
        object: child,
        children: childNodes,
        visible: child.visible,
      });
    }
  });
  return nodes;
}

// ─── Clipping plane component ───
function ClippingPlane({
  enabled,
  position,
  axis,
}: {
  enabled: boolean;
  position: number;
  axis: "x" | "y" | "z";
}) {
  const { gl, scene } = useThree();
  const planeRef = useRef(new THREE.Plane());

  useEffect(() => {
    gl.localClippingEnabled = enabled;
  }, [enabled, gl]);

  useEffect(() => {
    if (!enabled) {
      // Remove clipping from all materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            m.clippingPlanes = [];
            m.needsUpdate = true;
          });
        }
      });
      return;
    }

    const normal = new THREE.Vector3(
      axis === "x" ? -1 : 0,
      axis === "y" ? -1 : 0,
      axis === "z" ? -1 : 0
    );
    planeRef.current.set(normal, position);

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          m.clippingPlanes = [planeRef.current];
          m.clipShadows = true;
          m.needsUpdate = true;
        });
      }
    });
  }, [enabled, position, axis, scene]);

  return null;
}

// ─── IFC Model ───
function IFCModel({
  url,
  onPick,
  onModelLoaded,
  clippingEnabled,
  clippingPosition,
  clippingAxis,
}: {
  url: string;
  onPick?: (info: string | null) => void;
  onModelLoaded?: (elements: ElementNode[]) => void;
  clippingEnabled: boolean;
  clippingPosition: number;
  clippingAxis: "x" | "y" | "z";
}) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const highlightRef = useRef<THREE.Mesh | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    let cancelled = false;
    const loader = new IFCLoader();

    async function load() {
      try {
        await loader.ifcManager.setWasmPath(WASM_PATH);
        await loader.ifcManager.applyWebIfcConfig({ USE_FAST_BOOLS: true });

        loader.load(
          url,
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
            const tree = buildElementTree(ifcModel);
            onModelLoaded?.(tree);
          },
          (event) => {
            if (event.total > 0) setProgress(Math.round((event.loaded / event.total) * 100));
          },
          (err) => {
            if (!cancelled) {
              console.error("IFC load error:", err);
              setError("Failed to load IFC file. Showing placeholder.");
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          console.error("IFC setup error:", err);
          setError("Failed to initialize IFC loader.");
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
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
    [scene, onPick]
  );

  useEffect(() => {
    return () => {
      if (highlightRef.current) {
        scene.remove(highlightRef.current);
        highlightRef.current.geometry.dispose();
      }
    };
  }, [scene]);

  if (error) {
    return (
      <>
        <Html center>
          <div className="flex items-center gap-2 text-xs text-destructive bg-background/80 backdrop-blur rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
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
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading IFC model...
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
function TreeItem({
  node,
  depth,
  onSelect,
  onToggleVisibility,
}: {
  node: ElementNode;
  depth: number;
  onSelect: (node: ElementNode) => void;
  onToggleVisibility: (node: ElementNode) => void;
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
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="shrink-0 p-0.5 hover:bg-accent rounded"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="truncate flex-1 font-medium">{node.name}</span>
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">
          {node.type}
        </Badge>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(node); }}
          className="shrink-0 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-opacity"
        >
          {node.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <TreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
        />
      ))}
    </div>
  );
}

// ─── Main BimViewer ───
interface BimViewerProps {
  fileName?: string;
  fileUrl?: string;
  fileSize?: number | null;
}

export default function BimViewer({ fileName, fileUrl, fileSize }: BimViewerProps) {
  const isIfc = fileUrl && (fileUrl.endsWith(".ifc") || fileUrl.includes(".ifc"));
  const [pickedElement, setPickedElement] = useState<string | null>(null);
  const fileSizeMB = fileSize ? fileSize / 1024 / 1024 : 0;
  const isLargeFile = fileSizeMB > MAX_FILE_SIZE_MB;

  // Clipping state
  const [clippingEnabled, setClippingEnabled] = useState(false);
  const [clippingPosition, setClippingPosition] = useState(3);
  const [clippingAxis, setClippingAxis] = useState<"x" | "y" | "z">("y");

  // Element tree state
  const [elements, setElements] = useState<ElementNode[]>([]);
  const [showTree, setShowTree] = useState(false);

  const handleModelLoaded = useCallback((tree: ElementNode[]) => {
    setElements(tree);
  }, []);

  const handleTreeSelect = useCallback((node: ElementNode) => {
    const name = node.name;
    const type = node.type;
    setPickedElement(`${type}: ${name}`);
  }, []);

  const handleToggleVisibility = useCallback((node: ElementNode) => {
    node.object.visible = !node.object.visible;
    node.visible = node.object.visible;
    // Force re-render
    setElements((prev) => [...prev]);
  }, []);

  const elementCount = useMemo(() => {
    let count = 0;
    function countNodes(nodes: ElementNode[]) {
      nodes.forEach((n) => { count++; countNodes(n.children); });
    }
    countNodes(elements);
    return count;
  }, [elements]);

  return (
    <div className="relative rounded-xl border bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      {/* Header bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-background/80 backdrop-blur px-3 py-1.5 text-xs font-medium">
        <Box className="h-3.5 w-3.5 text-primary" />
        {fileName || "BIM Model Preview"}
        {fileSizeMB > 0 && (
          <span className="text-muted-foreground ml-1">({fileSizeMB.toFixed(1)}MB)</span>
        )}
      </div>

      {/* Top-right controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {isIfc && elements.length > 0 && (
          <Button
            variant={showTree ? "default" : "secondary"}
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={() => setShowTree(!showTree)}
          >
            <List className="h-3.5 w-3.5" />
            Elements ({elementCount})
          </Button>
        )}
        {fileUrl && (
          <a
            href={fileUrl}
            download
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Download IFC
          </a>
        )}
      </div>

      {/* File size warning */}
      {isLargeFile && (
        <div className="absolute top-12 left-3 right-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Large file ({fileSizeMB.toFixed(0)}MB) — loading may be slow.
          </div>
        </div>
      )}

      {/* Section plane controls */}
      {isIfc && (
        <div className="absolute bottom-12 right-3 z-10 flex flex-col gap-2 rounded-lg bg-background/90 backdrop-blur border p-3 w-52">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <Scissors className="h-3.5 w-3.5 text-primary" />
              Section Plane
            </div>
            <Switch
              checked={clippingEnabled}
              onCheckedChange={setClippingEnabled}
              className="scale-75"
            />
          </div>
          {clippingEnabled && (
            <>
              <div className="flex gap-1">
                {(["x", "y", "z"] as const).map((a) => (
                  <Button
                    key={a}
                    size="sm"
                    variant={clippingAxis === a ? "default" : "outline"}
                    className="h-6 text-[10px] flex-1 px-0"
                    onClick={() => setClippingAxis(a)}
                  >
                    {a.toUpperCase()}
                  </Button>
                ))}
              </div>
              <Slider
                min={-6}
                max={6}
                step={0.1}
                value={[clippingPosition]}
                onValueChange={([v]) => setClippingPosition(v)}
                className="w-full"
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Position: {clippingPosition.toFixed(1)}
              </p>
            </>
          )}
        </div>
      )}

      {/* Picked element info */}
      {pickedElement && (
        <div className="absolute bottom-12 left-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-primary/90 backdrop-blur px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg">
            <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
            {pickedElement}
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
                ) : (
                  elements.map((node) => (
                    <TreeItem
                      key={node.id}
                      node={node}
                      depth={0}
                      onSelect={handleTreeSelect}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 3D Canvas */}
        <div className="flex-1">
          <Canvas
            camera={{ position: [5, 4, 5], fov: 45 }}
            gl={{ antialias: true, localClippingEnabled: true }}
            onPointerMissed={() => setPickedElement(null)}
          >
            <Suspense fallback={<LoadingFallback />}>
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
                />
              ) : (
                <PlaceholderBuilding />
              )}
              <Grid
                args={[20, 20]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="hsl(210, 20%, 70%)"
                sectionSize={2}
                sectionThickness={1}
                sectionColor="hsl(210, 30%, 60%)"
                fadeDistance={15}
                fadeStrength={1}
                position={[0, -0.01, 0]}
              />
              <OrbitControls
                enablePan
                enableZoom
                enableRotate
                minDistance={3}
                maxDistance={20}
                target={[0, 1.5, 0]}
              />
              <Environment preset="city" />
            </Suspense>
          </Canvas>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Orbit: drag • Zoom: scroll • Pan: right-click + drag{isIfc ? " • Click: select" : ""}</span>
        <span className="text-primary font-medium">
          {isIfc ? "IFC Model Viewer" : "Interactive 3D Preview"}
        </span>
      </div>
    </div>
  );
}
