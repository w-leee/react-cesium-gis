import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

const GLOW = Cesium.Color.fromCssColorString('#3ecbff')
const ALERT = Cesium.Color.fromCssColorString('#ff4d4d')
const LABEL_COLOR = Cesium.Color.fromCssColorString('#d8ecff')

const MODEL_SCALE = 12
const MODEL_MIN_PIXEL = 72

/** 默认鸟瞰参数（打开页面） */
const VIEW_HEADING = Cesium.Math.toRadians(25)
const VIEW_PITCH = Cesium.Math.toRadians(-15)
const VIEW_RANGE_FARM = 0
/** 点击风机后环绕观察：固定仰角 + 水平 360° */
const VIEW_RANGE_TURBINE = 800
const ORBIT_PITCH = Cesium.Math.toRadians(-28)

function isFiniteCartesian(v) {
  return (
    v &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z) &&
    Cesium.Cartesian3.magnitudeSquared(v) > Cesium.Math.EPSILON10
  )
}

function setupCameraController(viewer, { orbit = false } = {}) {
  const c = viewer.scene.screenSpaceCameraController
  c.enableRotate = true
  c.enableZoom = true
  c.enableLook = true
  c.enableInputs = true
  // 环绕模式：禁止平移、禁止调仰角，只允许水平转 + 滚轮远近
  c.enableTranslate = !orbit
  c.enableTilt = !orbit
  c.minimumPickingTerrainHeight = -100000
  c.minimumCollisionTerrainHeight = -100000
  c.minimumZoomDistance = 40
  c.maximumZoomDistance = 80000
  c.rotateEventTypes = Cesium.CameraEventType.LEFT_DRAG
  c.translateEventTypes = Cesium.CameraEventType.RIGHT_DRAG
  c.tiltEventTypes = [
    Cesium.CameraEventType.MIDDLE_DRAG,
    Cesium.CameraEventType.PINCH,
    {
      eventType: Cesium.CameraEventType.LEFT_DRAG,
      modifier: Cesium.KeyboardEventModifier.CTRL,
    },
  ]
  c.zoomEventTypes = [
    Cesium.CameraEventType.WHEEL,
    Cesium.CameraEventType.PINCH,
  ]
}

/** 自由漫游：解除 lookAt 约束，恢复可旋转仰角 */
function enableFreeCamera(viewer, orbitStateRef) {
  if (orbitStateRef) {
    orbitStateRef.current = null
  }

  const camera = viewer.camera
  camera.cancelFlight()

  const locked = !Cesium.Matrix4.equalsEpsilon(
    camera.transform,
    Cesium.Matrix4.IDENTITY,
    Cesium.Math.EPSILON10,
  )

  if (locked) {
    // 必须用世界系 direction/up 解锁；用 lookAt 局部 heading/pitch 会导致 normalize NaN
    const position = Cesium.Cartesian3.clone(camera.positionWC)
    const direction = Cesium.Cartesian3.clone(camera.directionWC)
    const up = Cesium.Cartesian3.clone(camera.upWC)

    camera.lookAtTransform(Cesium.Matrix4.IDENTITY)

    if (isFiniteCartesian(position) && isFiniteCartesian(direction) && isFiniteCartesian(up)) {
      Cesium.Cartesian3.normalize(direction, direction)
      Cesium.Cartesian3.normalize(up, up)
      try {
        camera.setView({
          destination: position,
          orientation: { direction, up },
        })
      } catch {
        // 回退到安全视角，避免渲染永久停住
        camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(114.3376, 30.5788, 800),
          orientation: { heading: VIEW_HEADING, pitch: VIEW_PITCH, roll: 0 },
        })
      }
    } else {
      camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(114.3376, 30.5788, 800),
        orientation: { heading: VIEW_HEADING, pitch: VIEW_PITCH, roll: 0 },
      })
    }
  }

  setupCameraController(viewer, { orbit: false })
}

function flyToTurbine(viewer, turbine, orbitStateRef, duration = 1.6) {
  if (!turbine || !Number.isFinite(turbine.lon) || !Number.isFinite(turbine.lat)) return

  const target = Cesium.Cartesian3.fromDegrees(turbine.lon, turbine.lat, 40)
  const sphere = new Cesium.BoundingSphere(target, 60)

  // 不使用 lookAt 环绕：该模式在拖拽时易触发 normalize NaN，导致渲染停住
  enableFreeCamera(viewer, orbitStateRef)

  viewer.camera.flyToBoundingSphere(sphere, {
    duration,
    offset: new Cesium.HeadingPitchRange(VIEW_HEADING, ORBIT_PITCH, VIEW_RANGE_TURBINE),
    complete: () => {
      setupCameraController(viewer, { orbit: false })
    },
    cancel: () => enableFreeCamera(viewer, orbitStateRef),
  })
}

/** 红色告警图钉（dataURL），标注有叶片缺陷的风机 */
function createAlertPin(count) {
  const size = 56
  const c = document.createElement('canvas')
  c.width = size
  c.height = size + 12
  const ctx = c.getContext('2d')
  if (!ctx) return c

  // 圆头
  ctx.beginPath()
  ctx.arc(size / 2, size / 2 - 2, size / 2 - 4, 0, Math.PI * 2)
  ctx.fillStyle = '#e02020'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  ctx.stroke()

  // 尖角
  ctx.beginPath()
  ctx.moveTo(size / 2 - 10, size / 2 + 14)
  ctx.lineTo(size / 2, size + 8)
  ctx.lineTo(size / 2 + 10, size / 2 + 14)
  ctx.closePath()
  ctx.fillStyle = '#e02020'
  ctx.fill()

  // 数字 / 感叹号
  const text = count > 0 && count < 100 ? String(count) : '!'
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2 - 2)

  return c
}

export default function CesiumMap({
  turbines = [],
  center,
  selectedId,
  onSelect,
  alertTurbineIds = [],
  crackCounts = {},
  onAlertClick,
}) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const entitiesRef = useRef(new Map())
  const markerRef = useRef(new Map())
  const onSelectRef = useRef(onSelect)
  const onAlertClickRef = useRef(onAlertClick)
  const alertIdsRef = useRef(alertTurbineIds)
  const didInitCamera = useRef(false)
  const skipNextFlyRef = useRef(true)
  /** { target, pitch } | null */
  const orbitStateRef = useRef(null)
  onSelectRef.current = onSelect
  onAlertClickRef.current = onAlertClick
  alertIdsRef.current = alertTurbineIds

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    const imageryProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 19,
    })

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: new Cesium.ImageryLayer(imageryProvider),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      requestRenderMode: false,
    })

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(114.3376, 30.5788, 500),
      orientation: {
        heading: VIEW_HEADING,
        pitch: VIEW_PITCH,
        roll: 0,
      },
    })
    enableFreeCamera(viewer, orbitStateRef)

    viewer.scene.globe.enableLighting = false
    viewer.scene.fog.enabled = false
    viewer.scene.globe.depthTestAgainstTerrain = false
    viewer.cesiumWidget.creditContainer.style.display = 'none'

    // 相机向量异常时自动复位，避免渲染永久停住
    const guardCamera = () => {
      const pos = viewer.camera.positionWC
      const dir = viewer.camera.directionWC
      if (!isFiniteCartesian(pos) || !isFiniteCartesian(dir)) {
        enableFreeCamera(viewer, orbitStateRef)
      }
    }
    viewer.scene.preUpdate.addEventListener(guardCamera)

    // 渲染错误后恢复渲染循环（默认 Cesium 会停住并弹错误面板）
    viewer.cesiumWidget.showErrorPanel = false
    viewer.scene.renderError.addEventListener(() => {
      try {
        enableFreeCamera(viewer, orbitStateRef)
        viewer.useDefaultRenderLoop = true
      } catch {
        /* ignore */
      }
    })

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.position)
      if (!Cesium.defined(picked) || !picked.id) return
      const turbineId = picked.id.turbineId
      if (!turbineId) return

      onSelectRef.current?.(turbineId)
      // 有缺陷标注的风机：点击后打开检测图片
      if (alertIdsRef.current.includes(turbineId)) {
        onAlertClickRef.current?.(turbineId)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    viewerRef.current = viewer

    return () => {
      viewer.scene.preUpdate.removeEventListener(guardCamera)
      handler.destroy()
      viewer.destroy()
      viewerRef.current = null
      entitiesRef.current.clear()
      markerRef.current.clear()
      didInitCamera.current = false
      skipNextFlyRef.current = true
      orbitStateRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !turbines.length) return

    for (const [id, entity] of entitiesRef.current) {
      if (!turbines.some((t) => t.id === id)) {
        viewer.entities.remove(entity)
        entitiesRef.current.delete(id)
      }
    }

    for (const t of turbines) {
      const position = Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 0)

      if (entitiesRef.current.has(t.id)) {
        const entity = entitiesRef.current.get(t.id)
        entity.position = position
        if (entity.model) {
          entity.model.scale = MODEL_SCALE
          entity.model.minimumPixelSize = MODEL_MIN_PIXEL
        }
        continue
      }

      const entity = viewer.entities.add({
        id: `turbine-${t.id}`,
        turbineId: t.id,
        position,
        model: {
          uri: '/model/windturbine.glb',
          scale: MODEL_SCALE,
          minimumPixelSize: MODEL_MIN_PIXEL,
          maximumScale: 20000,
          color: Cesium.Color.WHITE,
          colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
          colorBlendAmount: 0,
          silhouetteColor: GLOW,
          silhouetteSize: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: t.id,
          font: 'bold 13px sans-serif',
          fillColor: LABEL_COLOR,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -24),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })

      entitiesRef.current.set(t.id, entity)
    }

    if (!didInitCamera.current) {
      didInitCamera.current = true
      const positions = turbines.map((t) =>
        Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 0),
      )
      const sphere = Cesium.BoundingSphere.fromPoints(positions)
      sphere.radius = Math.max(sphere.radius * 0.8, 300)

      viewer.camera.viewBoundingSphere(
        sphere,
        new Cesium.HeadingPitchRange(VIEW_HEADING, VIEW_PITCH, VIEW_RANGE_FARM),
      )
      enableFreeCamera(viewer, orbitStateRef)
    }
  }, [turbines])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const alertSet = new Set(alertTurbineIds)

    for (const [id, entity] of entitiesRef.current) {
      if (!entity.model) continue
      const selected = id === selectedId
      const alert = alertSet.has(id)

      if (alert) {
        // 存在叶片缺陷：红色轮廓 + 红色高亮，告警标识
        entity.model.silhouetteSize = selected ? 4.5 : 3.2
        entity.model.silhouetteColor = ALERT
        entity.model.color = ALERT.withAlpha(0.85)
        entity.model.colorBlendAmount = 0.55
        if (entity.label) {
          entity.label.fillColor = ALERT
          entity.label.text = `${id} 缺陷`
        }
      } else {
        entity.model.silhouetteSize = selected ? 3.5 : 0
        entity.model.silhouetteColor = GLOW
        entity.model.color = Cesium.Color.WHITE
        entity.model.colorBlendAmount = 0
        if (entity.label) {
          entity.label.fillColor = selected ? GLOW : LABEL_COLOR
          entity.label.text = id
        }
      }
    }

    // 同步三维告警图钉：有缺陷的风机头顶标注，可点击查看图片
    for (const [id, marker] of markerRef.current) {
      if (!alertSet.has(id)) {
        viewer.entities.remove(marker)
        markerRef.current.delete(id)
      }
    }

    for (const id of alertTurbineIds) {
      const turbine = turbines.find((t) => t.id === id)
      if (!turbine) continue
      const count = crackCounts[id] || 0
      const position = Cesium.Cartesian3.fromDegrees(turbine.lon, turbine.lat, 0)
      const pin = createAlertPin(count)

      if (markerRef.current.has(id)) {
        const marker = markerRef.current.get(id)
        marker.position = position
        if (marker.billboard) {
          marker.billboard.image = pin
        }
        continue
      }

      const marker = viewer.entities.add({
        id: `crack-marker-${id}`,
        turbineId: id,
        position,
        billboard: {
          image: pin,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -90),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 1,
        },
        label: {
          text: '点击查看检测图',
          font: 'bold 12px sans-serif',
          fillColor: ALERT,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -150),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          show: true,
        },
      })
      markerRef.current.set(id, marker)
    }
  }, [selectedId, turbines, alertTurbineIds, crackCounts])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const t = turbines.find((x) => x.id === selectedId)
    if (!t) return

    if (skipNextFlyRef.current) {
      skipNextFlyRef.current = false
      return
    }

    flyToTurbine(viewer, t, orbitStateRef)
    // 仅随选中风机变化飞行，避免 turbines 引用变化重复触发导致相机 NaN
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return <div ref={containerRef} className="cesium-map" />
}
