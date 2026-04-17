import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Play, RotateCcw } from 'lucide-react';

export type ExperimentType = 'gravity' | 'atoms' | 'optics';

export const LabSimulation: React.FC<{ type?: ExperimentType }> = ({ type = 'gravity' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    // Clear previous canvas
    containerRef.current.innerHTML = '';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    const objects: THREE.Object3D[] = [];

    if (type === 'gravity') {
      // Sun
      const sunGeo = new THREE.SphereGeometry(1, 32, 32);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const sun = new THREE.Mesh(sunGeo, sunMat);
      scene.add(sun);

      // Earth
      const earthGeo = new THREE.SphereGeometry(0.3, 32, 32);
      const earthMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      scene.add(earth);
      objects.push(earth);

      const light = new THREE.PointLight(0xffffff, 2, 100);
      light.position.set(0, 0, 0);
      scene.add(light);
    } else if (type === 'atoms') {
      // Nucleus
      const nucleusGeo = new THREE.SphereGeometry(0.5, 32, 32);
      const nucleusMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
      scene.add(nucleus);

      // Electrons
      const electronGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const electronMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
      
      for (let i = 0; i < 3; i++) {
        const electron = new THREE.Mesh(electronGeo, electronMat);
        scene.add(electron);
        objects.push(electron);
      }
    } else if (type === 'optics') {
      // Prism (Equilateral Triangle)
      const prismGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 3);
      const prismMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 0.9,
        thickness: 0.5,
        transparent: true,
        opacity: 0.4
      });
      const prism = new THREE.Mesh(prismGeo, prismMat);
      prism.rotation.x = Math.PI / 2;
      prism.rotation.z = Math.PI / 6;
      scene.add(prism);

      // Light Beams (Incoming)
      const incomingBeamGeo = new THREE.BoxGeometry(0.04, 0.04, 4);
      const incomingBeamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const incomingBeam = new THREE.Mesh(incomingBeamGeo, incomingBeamMat);
      incomingBeam.position.set(-2, 0, 0);
      incomingBeam.rotation.y = Math.PI / 2;
      scene.add(incomingBeam);

      // Spectrum Beams (Outgoing)
      const colors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3];
      colors.forEach((color, i) => {
        const spectrumBeamGeo = new THREE.BoxGeometry(0.02, 0.02, 4);
        const spectrumBeamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const spectrumBeam = new THREE.Mesh(spectrumBeamGeo, spectrumBeamMat);
        
        // Position slightly after prism
        spectrumBeam.position.set(2, 0, 0);
        spectrumBeam.rotation.y = Math.PI / 2 + (i * 0.04) - 0.12;
        
        scene.add(spectrumBeam);
        objects.push(spectrumBeam);
      });
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    let angle = 0;
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      angle += 0.02;

      if (type === 'gravity') {
        objects[0].position.x = Math.cos(angle) * 4;
        objects[0].position.z = Math.sin(angle) * 4;
        objects[0].rotation.y += 0.02;
      } else if (type === 'atoms') {
        objects.forEach((obj, i) => {
          const speed = 0.05 + (i * 0.02);
          const radius = 2 + (i * 1);
          obj.position.x = Math.cos(angle * (i + 1)) * radius;
          obj.position.y = Math.sin(angle * (i + 1)) * radius;
          obj.position.z = Math.sin(angle * (i + 1) * 0.5) * radius * 0.5;
        });
      } else if (type === 'optics') {
        // Pulse the spectrum beams
        objects.forEach((obj, i) => {
          obj.scale.z = 1 + Math.sin(angle * 2 + i) * 0.1;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      renderer.dispose();
      // Cleanup geometries and materials... (simpler approach here for brevity)
    };
  }, [type]);

  const titles = {
    gravity: 'Solar Dynamics Lab',
    atoms: 'Atomic Structure Lab',
    optics: 'Light & Optics Lab'
  };

  const descriptions = {
    gravity: 'Interactive WebGL Gravity Simulation',
    atoms: 'Visualizing Electron Orbitals & Nucleus',
    optics: 'Exploring Light Refraction & Prisms'
  };

  return (
    <div className="w-full relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
      <div ref={containerRef} className="w-full h-[400px]" />
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl text-white">
        <h4 className="font-fredoka text-lg">{titles[type]}</h4>
        <p className="text-xs text-slate-400">{descriptions[type]}</p>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button className="bg-white/10 hover:bg-white/20 p-2 rounded-xl backdrop-blur-md text-white">
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};
