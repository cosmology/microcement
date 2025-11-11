import * as THREE from 'three'
import gsap from 'gsap'
import { CameraPoint } from '../types'
import { SCENE_CONFIG } from '@/lib/config/sceneConfig'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private introTween: gsap.core.Tween | null = null
  private followTween: gsap.core.Tween | null = null

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
  }

  /**
   * Animate camera to bird view position
   */
  animateToBirdView(onComplete?: () => void): void {
    this.killAllTweens()
    
    const targetPos = SCENE_CONFIG.INTRO_START_POS
    const targetLookAt = SCENE_CONFIG.INTRO_START_LOOKAT

    gsap.to(this.camera.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.5,
      ease: 'power2.inOut',
    })

    gsap.to(this.camera, {
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z)
      },
      onComplete: () => {
        console.log('🦅 [CameraController] Bird view animation complete')
        onComplete?.()
      }
    })
  }

  /**
   * Animate camera to a specific path position
   */
  animateToPathPosition(
    position: CameraPoint,
    lookAt: CameraPoint,
    duration: number = 1.5,
    onComplete?: () => void
  ): void {
    this.killAllTweens()

    gsap.to(this.camera.position, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration,
      ease: 'power2.inOut',
    })

    gsap.to(this.camera, {
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
      },
      onComplete: () => {
        console.log('📷 [CameraController] Path position animation complete')
        onComplete?.()
      }
    })
  }

  /**
   * Animate intro sequence
   */
  animateIntro(
    startPos: CameraPoint,
    endPos: CameraPoint,
    startLookAt: CameraPoint,
    endLookAt: CameraPoint,
    duration: number,
    onUpdate?: (progress: number) => void,
    onComplete?: () => void
  ): void {
    this.killAllTweens()

    // Set initial position
    this.camera.position.set(startPos.x, startPos.y, startPos.z)
    this.camera.lookAt(startLookAt.x, startLookAt.y, startLookAt.z)

    const progress = { value: 0 }
    const tempPos = new THREE.Vector3()
    const tempLookAt = new THREE.Vector3()

    this.introTween = gsap.to(progress, {
      value: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = progress.value
        
        // Interpolate position
        tempPos.lerpVectors(
          new THREE.Vector3(startPos.x, startPos.y, startPos.z),
          new THREE.Vector3(endPos.x, endPos.y, endPos.z),
          t
        )
        
        // Interpolate lookAt
        tempLookAt.lerpVectors(
          new THREE.Vector3(startLookAt.x, startLookAt.y, startLookAt.z),
          new THREE.Vector3(endLookAt.x, endLookAt.y, endLookAt.z),
          t
        )

        this.camera.position.copy(tempPos)
        this.camera.lookAt(tempLookAt.x, tempLookAt.y, tempLookAt.z)
        
        onUpdate?.(t)
      },
      onComplete: () => {
        console.log('🎬 [CameraController] Intro animation complete')
        onComplete?.()
      }
    })
  }

  /**
   * Update camera position along a path based on progress (0-1)
   */
  updateCameraOnPath(
    cameraPoints: CameraPoint[],
    lookAtTargets: CameraPoint[],
    progress: number
  ): void {
    if (cameraPoints.length === 0 || lookAtTargets.length === 0) return

    const index = Math.min(
      Math.floor(progress * cameraPoints.length),
      cameraPoints.length - 1
    )
    
    const nextIndex = Math.min(index + 1, cameraPoints.length - 1)
    const localProgress = (progress * cameraPoints.length) % 1

    const currentPoint = cameraPoints[index]
    const nextPoint = cameraPoints[nextIndex]
    const currentLookAt = lookAtTargets[index]
    const nextLookAt = lookAtTargets[nextIndex]

    // Interpolate position
    this.camera.position.set(
      THREE.MathUtils.lerp(currentPoint.x, nextPoint.x, localProgress),
      THREE.MathUtils.lerp(currentPoint.y, nextPoint.y, localProgress),
      THREE.MathUtils.lerp(currentPoint.z, nextPoint.z, localProgress)
    )

    // Interpolate lookAt
    const lookAtX = THREE.MathUtils.lerp(currentLookAt.x, nextLookAt.x, localProgress)
    const lookAtY = THREE.MathUtils.lerp(currentLookAt.y, nextLookAt.y, localProgress)
    const lookAtZ = THREE.MathUtils.lerp(currentLookAt.z, nextLookAt.z, localProgress)

    this.camera.lookAt(lookAtX, lookAtY, lookAtZ)
  }

  /**
   * Kill all active tweens
   */
  killAllTweens(): void {
    if (this.introTween) {
      this.introTween.kill()
      this.introTween = null
    }
    if (this.followTween) {
      this.followTween.kill()
      this.followTween = null
    }
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.camera)
  }

  /**
   * Get current camera position
   */
  getCurrentPosition(): CameraPoint {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.killAllTweens()
  }
}

