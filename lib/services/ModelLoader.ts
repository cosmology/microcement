import * as THREE from 'three';

export interface ModelLoadResult {
  model: THREE.Object3D;
  clickableObjects: THREE.Object3D[];
  boundingSphere: THREE.Sphere;
  cameraPoints: THREE.Vector3[];
  lookAtTargets: THREE.Vector3[];
}

export interface ModelLoadOptions {
  modelPath: string;
  targetSize?: number;
  rotationY?: number;
  scaleMultiplier?: number;
  enableContourEdges?: boolean;
  enableShadows?: boolean;
  forceReload?: boolean;  // Skip cache and reload model
  onProgress?: (progress: number, loaded: number, total: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface CameraPathData {
  cameraPoints: THREE.Vector3[];
  lookAtTargets: THREE.Vector3[];
}

export class ModelLoader {
  private static instance: ModelLoader;
  private loadedModels: Map<string, ModelLoadResult> = new Map();
  
  // Default camera path data - can be overridden per model
  private defaultCameraPathData: CameraPathData = {
    cameraPoints: [
      new THREE.Vector3(20, 5, 0),
      new THREE.Vector3(-8, 6.5, 2),
      new THREE.Vector3(-14, 6.75, 7),
      new THREE.Vector3(-8, 7, 24),
      new THREE.Vector3(-4, 7, 30),
      new THREE.Vector3(-2, 7.25, 32),
      new THREE.Vector3(12, 7.5, 32),
      new THREE.Vector3(20, 8, 25),
      new THREE.Vector3(16, 8, 0),
    ],
    lookAtTargets: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(4, 3, 0),
      new THREE.Vector3(6, 4, 0),
      new THREE.Vector3(7, 5, 30),
      new THREE.Vector3(10, 6, 50),
      new THREE.Vector3(20, 7, 60),
      new THREE.Vector3(30, 8, 40),
      new THREE.Vector3(30, 8, 20),
      new THREE.Vector3(0, 8, -40),
    ]
  };

  private constructor() {}

  public static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  /**
   * Load a 3D model from the specified path
   */
  public async loadModel(options: ModelLoadOptions): Promise<ModelLoadResult> {
    const { 
      modelPath, 
      targetSize = 30, 
      rotationY = Math.PI / 2, 
      scaleMultiplier = 2,
      enableContourEdges = true,
      enableShadows = true,
      forceReload = false,
      onProgress,
      onComplete,
      onError
    } = options;

    // Check if model is already loaded (skip if forceReload is true)
    if (!forceReload && this.loadedModels.has(modelPath)) {
      const cached = this.loadedModels.get(modelPath)!;
      console.log(`🔄 Model ${modelPath} already loaded, returning cached version`);
      console.log(`📦 Cached model has ${cached.clickableObjects.length} hotspots:`, 
        cached.clickableObjects.map(obj => obj.name));
      return cached;
    }
    
    if (forceReload && this.loadedModels.has(modelPath)) {
      console.log(`🔃 Force reload requested, clearing cache for: ${modelPath}`);
      this.loadedModels.delete(modelPath);
    }

    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
      
      const gltfLoader = new GLTFLoader();
      
      // Setup Draco decoder for compressed models
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      dracoLoader.setDecoderConfig({ type: 'js' });
      gltfLoader.setDRACOLoader(dracoLoader);
      
      const modelUrl = `${modelPath}?cb=${Date.now()}`;

      // Get total bytes for progress tracking
      let totalBytes = 0;
      try {
        const headRes = await fetch(modelUrl, { method: 'HEAD', cache: 'no-store' });
        const len = headRes.headers.get('content-length');
        if (len) {
          totalBytes = parseInt(len, 10);
        }
      } catch (e) {
        console.warn('[ModelLoader] HEAD request failed; continuing without total bytes');
      }

      // Load model data
      const fileLoader = new THREE.FileLoader();
      fileLoader.setResponseType('arraybuffer');

      const gltf = await new Promise<any>((resolve, reject) => {
        fileLoader.load(
          modelUrl,
          (data: ArrayBuffer) => {
            gltfLoader.parse(
              data,
              '',
              (parsedGltf) => {
                // Cleanup Draco loader after parsing
                dracoLoader.dispose();
                resolve(parsedGltf);
              },
              reject
            );
          },
          (evt: ProgressEvent) => {
            if (onProgress && totalBytes > 0) {
              const loaded = evt.loaded;
              const progress = (loaded / totalBytes) * 100;
              onProgress(progress, loaded, totalBytes);
            }
          },
          (error) => {
            // Cleanup Draco loader on error
            dracoLoader.dispose();
            reject(error);
          }
        );
      });

      const model = gltf.scene;
      
      // Apply transformations
      this.applyModelTransformations(model, targetSize, rotationY, scaleMultiplier);
      
      // Process hotspots and collect clickable objects
      const clickableObjects = this.processHotspots(model, enableContourEdges);
      
      // Apply shadows if enabled
      if (enableShadows) {
        this.applyShadows(model);
      }
      
      // Calculate bounding sphere
      const box = new THREE.Box3().setFromObject(model);
      const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      
      // Get camera path data (could be customized per model in the future)
      const cameraPathData = this.getCameraPathData(modelPath);
      
      const result: ModelLoadResult = {
        model,
        clickableObjects,
        boundingSphere,
        cameraPoints: cameraPathData.cameraPoints,
        lookAtTargets: cameraPathData.lookAtTargets
      };

      // Cache the result
      this.loadedModels.set(modelPath, result);
      
      onComplete?.();
      return result;

    } catch (error) {
      console.error('ModelLoader error:', error);
      onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Apply standard transformations to the model
   */
  private applyModelTransformations(
    model: THREE.Object3D, 
    targetSize: number, 
    rotationY: number, 
    scaleMultiplier: number
  ): void {
    // Normalize and scale to target visibility
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.frustumCulled = false;

    // Calculate scale
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    const scale = (targetSize / maxDim) * scaleMultiplier;
    model.scale.setScalar(scale);

    // Apply rotation
    model.rotation.y = rotationY;
    model.updateMatrix();
    model.updateMatrixWorld(true);
  }

  /**
   * Process hotspots and create clickable objects
   */
  private processHotspots(model: THREE.Object3D, enableContourEdges: boolean): THREE.Object3D[] {
    const clickableObjects: THREE.Object3D[] = [];
    
    console.log('🔍 ========== HOTSPOT DETECTION START ==========');
    console.log('Model name:', model.name);
    console.log('Model children count:', model.children.length);
    console.log('Model transformations:', {
      position: model.position,
      rotation: model.rotation,
      scale: model.scale
    });
    
    // Traverse the transformed model
    let totalObjects = 0;
    let meshCount = 0;
    let hotspotsFound = 0;
    
    model.traverse((child: any) => {
      totalObjects++;
      
      if (child.isMesh) {
        meshCount++;
      }

      
      // Propagate hotspot identity down the hierarchy
      if (child && child.isMesh) {
        let ancestor: THREE.Object3D | null = child.parent;
        while (ancestor) {
          if (ancestor.name && ancestor.name.toUpperCase().includes('HOTSPOT')) {
            child.userData = child.userData || {};
            if (!child.userData.hotspotName) {
              child.userData.hotspotName = ancestor.name;
              console.log(`🔗 Propagated hotspot name "${ancestor.name}" to child mesh "${child.name}"`);
            }
            break;
          }
          ancestor = ancestor.parent;
        }
      }

      // Process hotspot objects (case-insensitive)
      if (child.name.toUpperCase().includes("HOTSPOT")) {
        hotspotsFound++;
        console.log(`🎯 HOTSPOT #${hotspotsFound} FOUND:`, {
          name: child.name,
          type: child.type,
          position: child.position,
          worldPosition: child.getWorldPosition(new THREE.Vector3()),
          visible: child.visible,
          parent: child.parent?.name || 'no parent',
          isMesh: child.isMesh,
          hasGeometry: child.geometry ? true : false,
          hasMaterial: child.material ? true : false
        });
        clickableObjects.push(child);
        
        // Ensure the hotspot has a material
        if (!child.material) {
          console.log('Creating material for hotspot:', child.name);
          child.material = new THREE.MeshStandardMaterial({ 
            color: 0x8C33FF, // Default hotspot color
          });
        } else {
          // Clone material to avoid shared instances
          try {
            const srcMat = child.material as THREE.MeshStandardMaterial;
            const cloned = srcMat.clone();
            (cloned as any).userData = { ...(srcMat as any).userData };
            child.material = cloned;
          } catch (e) {
            console.warn('Could not clone hotspot material for', child.name, e);
          }
        }
        
        // Make sure the hotspot is visible
        child.visible = true;
        child.frustumCulled = false;
      }

      // Add contour edges if enabled
      if (enableContourEdges && child.isMesh) {
        try {
          const edges = new THREE.EdgesGeometry(child.geometry);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ 
              color: 0x000000,
              transparent: true,
              opacity: 0.8
            })
          );
          line.userData.isEdgeLine = true;
          line.userData.isContourEdge = true;
          line.visible = true;
          child.add(line);
        } catch (error) {
          console.warn(`Failed to create edges for mesh: ${child.name}`, error);
        }
      }
    });

    console.log('📊 ========== HOTSPOT DETECTION SUMMARY ==========');
    console.log('Total objects traversed:', totalObjects);
    console.log('Total meshes found:', meshCount);
    console.log('Total hotspots found:', hotspotsFound);
    console.log('Clickable objects collected:', clickableObjects.length);
    console.log('Hotspot names:', clickableObjects.map(obj => obj.name));
    console.log('========================================');
    
    return clickableObjects;
  }

  /**
   * Apply shadows to all meshes in the model
   */
  private applyShadows(model: THREE.Object3D): void {
    model.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Get camera path data for a specific model
   * In the future, this could be customized per model or loaded from a database
   */
  private getCameraPathData(modelPath: string): CameraPathData {
    // For now, return default data
    // In the future, this could:
    // 1. Load from a database based on modelPath
    // 2. Load from a JSON file
    // 3. Be customized per user/model combination
    return {
      cameraPoints: this.defaultCameraPathData.cameraPoints.map(point => point.clone()),
      lookAtTargets: this.defaultCameraPathData.lookAtTargets.map(target => target.clone())
    };
  }

  /**
   * Set custom camera path data for a specific model
   */
  public setCameraPathData(modelPath: string, cameraPathData: CameraPathData): void {
    // In the future, this could save to a database
    // For now, we'll store it in memory
    if (this.loadedModels.has(modelPath)) {
      const result = this.loadedModels.get(modelPath)!;
      result.cameraPoints = cameraPathData.cameraPoints.map(point => point.clone());
      result.lookAtTargets = cameraPathData.lookAtTargets.map(target => target.clone());
    }
  }

  /**
   * Clear cached models (useful for memory management)
   */
  public clearCache(): void {
    this.loadedModels.clear();
  }

  /**
   * Get cached model if available
   */
  public getCachedModel(modelPath: string): ModelLoadResult | null {
    return this.loadedModels.get(modelPath) || null;
  }
}
