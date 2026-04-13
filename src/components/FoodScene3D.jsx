import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const Donut = () => {
  const ref = useRef(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.4;
      ref.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <mesh ref={ref} castShadow>
      <torusGeometry args={[1, 0.45, 32, 64]} />
      <meshStandardMaterial color="#e8853a" roughness={0.35} metalness={0.1} />
    </mesh>
  );
};

const Plate = () => {
  const ref = useRef(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.2;
  });

  return (
    <mesh ref={ref} position={[0, -0.8, 0]} receiveShadow>
      <cylinderGeometry args={[1.6, 1.5, 0.12, 48]} />
      <meshStandardMaterial color="#f5f0e8" roughness={0.6} metalness={0.05} />
    </mesh>
  );
};

const Garnish = ({ position, color }) => {
  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  return (
    <mesh ref={ref} position={position} castShadow>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
    </mesh>
  );
};

const FoodScene3D = ({ className = "" }) => {
  return (
    <div className={`food-scene ${className}`} style={{ width: "100%", height: 220 }}>
      <Canvas
        shadows
        camera={{ position: [0, 2, 4.5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
        <pointLight position={[-3, 2, -2]} intensity={0.4} color="#ffd700" />
        <Donut />
        <Plate />
        <Garnish position={[-0.6, -0.5, 0.8]} color="#4ade80" />
        <Garnish position={[0.5, -0.4, 0.6]} color="#f87171" />
        <Garnish position={[0.1, -0.5, 1.0]} color="#facc15" />
      </Canvas>
    </div>
  );
};

export default FoodScene3D;