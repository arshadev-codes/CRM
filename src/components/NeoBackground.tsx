import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Subtle three.js backdrop: slowly drifting translucent blobs that
 * tint the neomorphic background without competing with content.
 */
export function NeoBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const palette = [0x9bb6ff, 0xc7b8ff, 0xa9e2ff, 0xffd6e8];
    const spheres: { mesh: THREE.Mesh; speed: number; offset: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.IcosahedronGeometry(1.4 + Math.random() * 1.2, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: palette[i % palette.length],
        transparent: true,
        opacity: 0.18,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5, -2 - Math.random() * 3);
      scene.add(mesh);
      spheres.push({ mesh, speed: 0.15 + Math.random() * 0.25, offset: Math.random() * Math.PI * 2 });
    }

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      spheres.forEach((s, i) => {
        s.mesh.position.x += Math.sin(t * s.speed + s.offset) * 0.0025;
        s.mesh.position.y += Math.cos(t * s.speed * 0.8 + s.offset) * 0.002;
        s.mesh.rotation.x = t * 0.05 * (i % 2 ? 1 : -1);
        s.mesh.rotation.y = t * 0.07;
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      spheres.forEach(s => { s.mesh.geometry.dispose(); (s.mesh.material as THREE.Material).dispose(); });
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none opacity-70"
      style={{ filter: "blur(40px)" }}
    />
  );
}
