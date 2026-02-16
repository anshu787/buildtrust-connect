import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html } from "@react-three/drei";
import { Loader2, Box, AlertTriangle, MousePointerClick } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/web-ifc@0.0.57/";
const MAX_FILE_SIZE_MB = 50;

// Highlight material for picked elements
const HIGHLIGHT_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("hsl(45, 100%, 55%)"),
  transparent: true,
  opacity: 0.85,
  depthTest: false,
});

function IFCModel({ url, onPick }: { url: string; onPick?: (info: string | null) => void }) {
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
        await loader.ifcManager.applyWebIfcConfig({
          USE_FAST_BOOLS: true,
        });

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
          },
          (event) => {
            if (event.total > 0) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          },
          (err) => {
            if (!cancelled) {
              console.error("IFC load error:", err);
              setError("Failed to load IFC file. Showing placeholder model.");
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          console.error("IFC setup error:", err);
          setError("Failed to initialize IFC loader. Showing placeholder model.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();

      // Remove old highlight
      if (highlightRef.current) {
        scene.remove(highlightRef.current);
        highlightRef.current.geometry.dispose();
        highlightRef.current = null;
      }

      const hit = e.intersections[0];
      if (!hit || !hit.object) {
        onPick?.(null);
        return;
      }

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

  // Clear highlight on unmount
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

  return <primitive object={model} onClick={handleClick} />;
}

function PlaceholderBuilding() {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef}>
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

      {/* Download button */}
      {fileUrl && (
        <div className="absolute top-3 right-3 z-10">
          <a
            href={fileUrl}
            download
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Download IFC
          </a>
        </div>
      )}

      {/* File size warning */}
      {isLargeFile && (
        <div className="absolute top-12 left-3 right-3 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Large file ({fileSizeMB.toFixed(0)}MB) — loading may take a while and performance could be reduced.
          </div>
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

      {/* 3D Canvas */}
      <div className="h-[400px]">
        <Canvas
          camera={{ position: [5, 4, 5], fov: 45 }}
          gl={{ antialias: true }}
          onPointerMissed={() => setPickedElement(null)}
        >
          <Suspense fallback={<LoadingFallback />}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            {isIfc && fileUrl ? (
              <IFCModel url={fileUrl} onPick={setPickedElement} />
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

      {/* Footer */}
      <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Orbit: drag • Zoom: scroll • Pan: right-click + drag{isIfc ? " • Click: select element" : ""}</span>
        <span className="text-primary font-medium">
          {isIfc ? "IFC Model Viewer" : "Interactive 3D Preview"}
        </span>
      </div>
    </div>
  );
}
