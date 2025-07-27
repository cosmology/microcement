import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ScrollScene = dynamic(() => import("../app/components/ScrollScene"), { ssr: false });

export default function Test3D() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#222" }}>
      <ScrollScene />
      <div style={{ position: "absolute", top: 20, right: 20, color: "white", zIndex: 100 }}>
        <h2>3D Scene Test Page (Pages Router)</h2>
        <p>If you see the 3D scene and no errors, the setup is correct.</p>
        <p>This page bypasses the App Router middleware.</p>
      </div>
    </div>
  );
} 