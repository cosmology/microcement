#!/bin/sh

echo "=== Testing USDZ to GLB Conversion via Next.js API ==="
echo ""

# Use Node.js to make HTTP request to the API
docker exec microcement-app-dev-1 sh -c '
cat > /tmp/test-api.js << "NODESCRIPT"
const http = require("http");

console.log("Calling POST /api/test-conversion...");
console.log("");

const req = http.request({
  hostname: "localhost",
  port: 3000,
  path: "/api/test-conversion",
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  }
}, (res) => {
  let body = "";
  res.on("data", (chunk) => { body += chunk; });
  res.on("end", () => {
    try {
      const data = JSON.parse(body);
      
      if (data.error) {
        console.error("❌ API Error:");
        console.error("  Message:", data.error);
        if (data.details) {
          console.error("  Details:", data.details);
        }
        if (data.stack) {
          console.error("");
          console.error("Stack trace:");
          console.error(data.stack);
        }
        process.exit(1);
      }
      
      console.log("✅ Conversion Successful!");
      console.log("");
      console.log("Input:");
      console.log("  File:", data.input.file);
      console.log("  Size:", data.input.size, "bytes (" + (data.input.size / 1024).toFixed(2) + " KB)");
      console.log("");
      console.log("Output:");
      console.log("  GLB file:", data.output.glbPath);
      console.log("  Size:", data.output.size, "bytes (" + (data.output.size / 1024).toFixed(2) + " KB)");
      console.log("  URL:", data.output.url);
      console.log("");
      
      if (data.summary) {
        console.log("Summary:");
        console.log("  Mesh count:   ", data.summary.meshCount);
        console.log("  Total vertices:", data.summary.totalVertices);
        console.log("  Total faces:   ", data.summary.totalFaces);
        console.log("");
      }
      
      if (data.meshes && data.meshes.length > 0) {
        console.log("Meshes:");
        data.meshes.forEach((mesh, idx) => {
          console.log("  " + (idx + 1) + ". " + mesh.name + ":");
          console.log("     Vertices:", mesh.vertexCount);
          console.log("     Faces:   ", mesh.faceCount);
          if (mesh.primitives && mesh.primitives.length > 0) {
            mesh.primitives.forEach((prim, pidx) => {
              console.log("     Primitive " + pidx + ":");
              Object.keys(prim.attributes).forEach(attr => {
                console.log("       " + attr + ":", prim.attributes[attr].count, "vertices");
              });
              if (prim.faceCount > 0) {
                console.log("       Faces:", prim.faceCount);
              }
            });
          }
        });
        console.log("");
      }
      
      if (data.materials && data.materials.length > 0) {
        console.log("Materials:");
        data.materials.forEach((mat, idx) => {
          console.log("  " + (idx + 1) + ". " + mat.name);
        });
        console.log("");
      }
      
      const sizeRatio = (data.output.size / data.input.size * 100);
      console.log("Size Ratio:", sizeRatio.toFixed(1) + "%");
      
      if (data.output.size >= 10000 && data.output.size <= 17000) {
        console.log("");
        console.log("✅ SUCCESS: Output size is in expected range (10-17 KB)");
      } else {
        console.log("");
        console.log("⚠️  WARNING: Output size is outside expected range (10-17 KB)");
      }
      
    } catch (e) {
      console.error("Failed to parse response:");
      console.error(body.substring(0, 1000));
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
  process.exit(1);
});

req.end();
NODESCRIPT
node /tmp/test-api.js
'

echo ""
echo "Done!"
