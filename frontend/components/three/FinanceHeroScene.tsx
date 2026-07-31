"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const GOLD = "#C9973C";
const NAVY = "#1B3A8F";

// Điểm camera hướng tới — đặt cùng độ cao với trọng tâm hình khối bên dưới (cột cao nhất ~3.4,
// đồng xu trôi tới ~4.9) để bố cục luôn nằm giữa khung hình bất kể mặc định lookAt của Canvas.
const FOCUS_POINT = new THREE.Vector3(0, 1.5, 0);

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(FOCUS_POINT);
  }, [camera]);
  return null;
}

const BAR_HEIGHTS = [0.7, 1.1, 1.6, 2.1, 2.7, 3.4];

const COIN_POSITIONS: Array<[number, number, number]> = [
  [-2.6, 2.0, 0.9],
  [2.5, 2.5, -0.6],
  [-1.5, 2.9, -1.1],
  [1.1, 3.2, 1.1],
  [3.2, 1.7, 1.4],
];

function FinanceComposition({ reduceMotion }: { reduceMotion: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (!reduceMotion) {
      group.current.rotation.y += delta * 0.12;
    }
    // Nghiêng nhẹ theo vị trí con trỏ — hiệu ứng parallax tinh tế, không cần OrbitControls.
    const targetTiltX = state.pointer.y * 0.15;
    const targetTiltZ = -state.pointer.x * 0.15;
    group.current.rotation.x += (targetTiltX - group.current.rotation.x) * 0.05;
    group.current.rotation.z += (targetTiltZ - group.current.rotation.z) * 0.05;
  });

  return (
    <group ref={group}>
      {/* Biểu đồ cột tăng trưởng — motif kế toán/tài chính trực quan nhất */}
      {BAR_HEIGHTS.map((h, i) => (
        <mesh key={i} position={[(i - (BAR_HEIGHTS.length - 1) / 2) * 0.85, h / 2, 0]}>
          <boxGeometry args={[0.6, h, 0.6]} />
          <meshStandardMaterial
            color={GOLD}
            metalness={0.6}
            roughness={0.3}
            emissive={GOLD}
            emissiveIntensity={0.08}
          />
        </mesh>
      ))}

      {/* Bệ nền tròn mờ — tạo cảm giác "đứng" cho khối biểu đồ */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.6, 64]} />
        <meshStandardMaterial color={NAVY} transparent opacity={0.25} metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Vòng halo nghiêng — gợi ý "vòng quay tài chính/chu kỳ tăng trưởng" */}
      <mesh rotation={[Math.PI / 2.4, 0.3, 0]} position={[0, 1.4, -0.5]}>
        <torusGeometry args={[3, 0.03, 16, 100]} />
        <meshStandardMaterial color={GOLD} transparent opacity={0.35} emissive={GOLD} emissiveIntensity={0.4} />
      </mesh>

      {/* Đồng xu trôi lơ lửng — mỗi đồng bọc trong <Float> cho hiệu ứng bồng bềnh tự nhiên */}
      {COIN_POSITIONS.map((pos, i) => (
        <Float
          key={i}
          speed={reduceMotion ? 0 : 1.2 + i * 0.15}
          rotationIntensity={reduceMotion ? 0 : 0.6}
          floatIntensity={reduceMotion ? 0 : 1.1}
        >
          <mesh position={pos} rotation={[1.0, i * 0.5, 0.2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.07, 32]} />
            <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.2} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

interface FinanceHeroSceneProps {
  reduceMotion?: boolean;
}

export default function FinanceHeroScene({ reduceMotion = false }: FinanceHeroSceneProps) {
  return (
    <Canvas
      camera={{ position: [4.8, 3.0, 7.6], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <CameraRig />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 4]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-4, 2, -3]} intensity={0.8} color={NAVY} />
      <pointLight position={[2, 4, 3]} intensity={0.6} color={GOLD} />
      <FinanceComposition reduceMotion={reduceMotion} />
      <Sparkles count={40} scale={7} size={2} speed={reduceMotion ? 0 : 0.3} color={GOLD} opacity={0.5} />
    </Canvas>
  );
}
