import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ModelLoadResult } from '../types'

export class ModelLoader {
  private loader: GLTFLoader
  private loadingManager: THREE.LoadingManager

  constructor() {
    this.loadingManager = new THREE.LoadingManager()
    this.loader = new GLTFLoader(this.loadingManager)
  }

  /**
   * Load a GLTF/GLB model
   */
  async loadModel(
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<ModelLoadResult> {
    return new Promise((resolve, reject) => {
      console.log('📦 [ModelLoader] Loading model:', path)

      this.loader.load(
        path,
        (gltf) => {
          console.log('✅ [ModelLoader] Model loaded successfully')
          resolve({
            model: gltf.scene,
            animations: gltf.animations
          })
        },
        (xhr) => {
          const progress = xhr.total > 0 ? (xhr.loaded / xhr.total) * 100 : 0
          onProgress?.(progress)
        },
        (error) => {
          console.error('❌ [ModelLoader] Error loading model:', error)
          reject(error)
        }
      )
    })
  }

  /**
   * Prepare model for scene (scale, position, rotation)
   */
  prepareModel(
    model: THREE.Group,
    config: {
      scale?: number
      position?: { x: number; y: number; z: number }
      rotation?: { x: number; y: number; z: number }
    } = {}
  ): THREE.Group {
    const { scale = 1, position, rotation } = config

    // Apply scale
    model.scale.setScalar(scale)

    // Apply position
    if (position) {
      model.position.set(position.x, position.y, position.z)
    }

    // Apply rotation
    if (rotation) {
      model.rotation.set(rotation.x, rotation.y, rotation.z)
    }

    // Traverse and set shadows
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    return model
  }

  /**
   * Center model to origin
   */
  centerModel(model: THREE.Group): THREE.Group {
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    model.position.sub(center)
    return model
  }

  /**
   * Get model bounding box
   */
  getModelBounds(model: THREE.Group): {
    min: THREE.Vector3
    max: THREE.Vector3
    size: THREE.Vector3
    center: THREE.Vector3
  } {
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    return {
      min: box.min,
      max: box.max,
      size,
      center
    }
  }

  /**
   * Dispose of a model and its resources
   */
  disposeModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose())
        } else {
          child.material?.dispose()
        }
      }
    })
  }
}

