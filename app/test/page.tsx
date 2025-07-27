"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ScrollScene = dynamic(() => import("../components/ScrollScene"), { ssr: false });

export default function TestPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#222" }}>
      <ScrollScene />
      <div style={{ position: "absolute", top: 20, right: 20, color: "white", zIndex: 100 }}>
        <h2>ScrollScene Test (Vanilla Three.js)</h2>
        <p>You should see floating particles and a central hub.</p>
        <p>Scroll down to see camera movement!</p>
      </div>
      
      {/* Scrollable content for testing */}
      <main style={{ 
        position: "relative", 
        zIndex: 10, 
        paddingTop: "100vh",
        background: "linear-gradient(180deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        minHeight: "300vh"
      }}>
        <div style={{ padding: "100px 20px", color: "white", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", marginBottom: "2rem" }}>Section 1</h1>
          <p style={{ fontSize: "1.5rem", marginBottom: "4rem" }}>Scroll down to see the camera move through 3D space</p>
        </div>
        
        <div style={{ padding: "100px 20px", color: "white", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", marginBottom: "2rem" }}>Section 2</h1>
          <p style={{ fontSize: "1.5rem", marginBottom: "4rem" }}>The camera should smoothly move along the predefined path</p>
        </div>
        
        <div style={{ padding: "100px 20px", color: "white", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", marginBottom: "2rem" }}>Section 3</h1>
          <p style={{ fontSize: "1.5rem", marginBottom: "4rem" }}>Notice how the 3D scene perspective changes as you scroll</p>
        </div>
        
        <div style={{ padding: "100px 20px", color: "white", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", marginBottom: "2rem" }}>Section 4</h1>
          <p style={{ fontSize: "1.5rem", marginBottom: "4rem" }}>This creates an immersive 3D experience similar to the Virtual Well-being Hub</p>
        </div>
      </main>
    </div>
  );
} 