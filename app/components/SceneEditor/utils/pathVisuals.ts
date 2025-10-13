import * as THREE from 'three'
import { CameraPoint } from '../types'
import { SCENE_CONFIG } from '@/lib/config/sceneConfig'

export class PathVisualsManager {
  private scene: THREE.Scene
  private pathLines: THREE.Line[] = []
  private pathSpheres: THREE.Mesh[] = []
  private lookAtSpheres: THREE.Mesh[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /**
   * Add camera path visualization to the scene
   */
  addPathVisuals(
    cameraPoints: CameraPoint[],
    lookAtTargets: CameraPoint[],
    config: {
      showPath?: boolean
      showWaypoints?: boolean
      showLookAtTargets?: boolean
    } = {}
  ): void {
    const {
      showPath = SCENE_CONFIG.SHOW_CAMERA_PATH,
      showWaypoints = SCENE_CONFIG.SHOW_WAYPOINTS,
      showLookAtTargets = SCENE_CONFIG.SHOW_LOOKUP_TARGETS
    } = config

    this.removePathVisuals()

    console.log('🎨 [PathVisuals] Adding path visuals:', {
      showPath,
      showWaypoints,
      showLookAtTargets,
      cameraPointsCount: cameraPoints.length,
      lookAtTargetsCount: lookAtTargets.length
    })

    // Add camera path line
    if (showPath && cameraPoints.length > 1) {
      this.addPathLine(cameraPoints, 0xff0000) // Red line
    }

    // Add waypoint spheres
    if (showWaypoints && cameraPoints.length > 0) {
      cameraPoints.forEach((point, index) => {
        const sphere = this.createSphere(point, 0.3, 0xff0000) // Red spheres
        this.pathSpheres.push(sphere)
        this.scene.add(sphere)
      })
    }

    // Add lookAt target spheres
    if (showLookAtTargets && lookAtTargets.length > 0) {
      lookAtTargets.forEach((point, index) => {
        const sphere = this.createSphere(point, 0.4, 0xffa500) // Orange spheres
        this.lookAtSpheres.push(sphere)
        this.scene.add(sphere)
      })
    }
  }

  /**
   * Remove all path visuals from the scene
   */
  removePathVisuals(): void {
    // Remove path lines
    this.pathLines.forEach(line => {
      this.scene.remove(line)
      line.geometry.dispose()
      if (Array.isArray(line.material)) {
        line.material.forEach(mat => mat.dispose())
      } else {
        line.material.dispose()
      }
    })
    this.pathLines = []

    // Remove path spheres
    this.pathSpheres.forEach(sphere => {
      this.scene.remove(sphere)
      sphere.geometry.dispose()
      if (Array.isArray(sphere.material)) {
        sphere.material.forEach(mat => mat.dispose())
      } else {
        sphere.material.dispose()
      }
    })
    this.pathSpheres = []

    // Remove lookAt spheres
    this.lookAtSpheres.forEach(sphere => {
      this.scene.remove(sphere)
      sphere.geometry.dispose()
      if (Array.isArray(sphere.material)) {
        sphere.material.forEach(mat => mat.dispose())
      } else {
        sphere.material.dispose()
      }
    })
    this.lookAtSpheres = []
  }

  /**
   * Create a path line
   */
  private addPathLine(points: CameraPoint[], color: number): void {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(p => new THREE.Vector3(p.x, p.y, p.z))
    )
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 })
    const line = new THREE.Line(geometry, material)
    this.pathLines.push(line)
    this.scene.add(line)
  }

  /**
   * Create a sphere marker
   */
  private createSphere(point: CameraPoint, radius: number, color: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 16, 16)
    const material = new THREE.MeshBasicMaterial({ color })
    const sphere = new THREE.Mesh(geometry, material)
    sphere.position.set(point.x, point.y, point.z)
    return sphere
  }

  /**
   * Update path visuals with new data
   */
  updatePathVisuals(
    cameraPoints: CameraPoint[],
    lookAtTargets: CameraPoint[]
  ): void {
    this.addPathVisuals(cameraPoints, lookAtTargets)
  }

  /**
   * Toggle visibility of path visuals
   */
  toggleVisibility(visible: boolean): void {
    this.pathLines.forEach(line => line.visible = visible)
    this.pathSpheres.forEach(sphere => sphere.visible = visible)
    this.lookAtSpheres.forEach(sphere => sphere.visible = visible)
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.removePathVisuals()
  }
}

