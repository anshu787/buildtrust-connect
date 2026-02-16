import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html } from "@react-three/drei";
import { Loader2, Box } from "lucide-react";
import * as THREE from "three";

function BuildingModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main structure */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 2]} />
        <meshStandardMaterial color="hsl(210, 40%, 75%)" wireframe={false} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 2]} />
        <meshStandardMaterial color="hsl(210, 60%, 50%)" wireframe />
      </mesh>

      {/* Floors */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, i, 0]}>
          <boxGeometry args={[3.1, 0.05, 2.1]} />
          <meshStandardMaterial color="hsl(210, 30%, 60%)" />
        </mesh>
      ))}

      {/* Windows */}
      {[-0.8, 0, 0.8].map((x) =>
        [0.5, 1.5, 2.5].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, y, 1.01]}>
            <planeGeometry args={[0.4, 0.5]} />
            <meshStandardMaterial color="hsl(200, 80%, 70%)" transparent opacity={0.6} />
          </mesh>
        ))
      )}

      {/* Roof */}
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
}

export default function BimViewer({ fileName, fileUrl }: BimViewerProps) {
  return (
    <div className="relative rounded-xl border bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-background/80 backdrop-blur px-3 py-1.5 text-xs font-medium">
        <Box className="h-3.5 w-3.5 text-primary" />
        {fileName || "BIM Model Preview"}
      </div>
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
      <div className="h-[400px]">
        <Canvas
          camera={{ position: [5, 4, 5], fov: 45 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <BuildingModel />
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
      <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Orbit: drag • Zoom: scroll • Pan: right-click + drag</span>
        <span className="text-primary font-medium">Interactive 3D Preview</span>
      </div>
    </div>
  );
}
