"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// Sinh vị trí ngẫu nhiên NHƯNG ổn định (seeded) cho các node — tránh bố cục "nhảy" khác nhau
// mỗi lần Fast Refresh / re-mount trong lúc phát triển, và giữ bố cục nhất quán giữa các lần tải.
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateNodes(count: number, spreadX: number, spreadY: number, spreadZ: number, seed: number) {
  const rand = seededRandom(seed);
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push(
      new THREE.Vector3(
        (rand() - 0.5) * spreadX,
        (rand() - 0.5) * spreadY,
        (rand() - 0.5) * spreadZ,
      ),
    );
  }
  return nodes;
}

interface NetworkGroupProps {
  reduceMotion: boolean;
  nodeCount: number;
  colorA: string;
  colorB: string;
  opacity: number;
  seed: number;
}

function NetworkGroup({ reduceMotion, nodeCount, colorA, colorB, opacity, seed }: NetworkGroupProps) {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => generateNodes(nodeCount, 11, 5.5, 6, seed), [nodeCount, seed]);

  // Nối các node ở gần nhau bằng đường thẳng mảnh — gợi hình "mạng lưới kết nối dịch vụ/dữ liệu".
  const lineGeometry = useMemo(() => {
    const positions: number[] = [];
    const threshold = 3.4;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < threshold) {
          positions.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [nodes]);

  useFrame((_, delta) => {
    if (!group.current || reduceMotion) return;
    group.current.rotation.y += delta * 0.035;
    group.current.rotation.x += delta * 0.006;
  });

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={colorB} transparent opacity={opacity * 0.55} />
      </lineSegments>
      {nodes.map((pos, i) => (
        <Float
          key={i}
          speed={reduceMotion ? 0 : 0.5 + (i % 4) * 0.12}
          floatIntensity={reduceMotion ? 0 : 0.7}
          rotationIntensity={0}
        >
          <mesh position={pos}>
            <icosahedronGeometry args={[i % 3 === 0 ? 0.15 : 0.09, 0]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? colorA : colorB}
              transparent
              opacity={opacity}
              metalness={0.4}
              roughness={0.4}
              emissive={i % 3 === 0 ? colorA : colorB}
              emissiveIntensity={0.18}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export interface AmbientNetworkSceneProps {
  reduceMotion?: boolean;
  nodeCount?: number;
  colorA?: string;
  colorB?: string;
  opacity?: number;
  seed?: number;
}

// Cảnh 3D trang trí nền, dùng chung cho nhiều section (Dịch vụ, HR Portal, CTA) — nhẹ hơn cảnh
// hero (không có hình khối lớn/nhiều ánh sáng), phù hợp làm lớp nền mờ phía sau nội dung chính.
export default function AmbientNetworkScene({
  reduceMotion = false,
  nodeCount = 20,
  colorA = "#C9973C",
  colorB = "#3E5AA8",
  opacity = 0.5,
  seed = 42,
}: AmbientNetworkSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 6]} intensity={0.5} />
      <NetworkGroup
        reduceMotion={reduceMotion}
        nodeCount={nodeCount}
        colorA={colorA}
        colorB={colorB}
        opacity={opacity}
        seed={seed}
      />
    </Canvas>
  );
}
