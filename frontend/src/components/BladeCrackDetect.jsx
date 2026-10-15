import { useEffect, useRef, useState } from 'react'
import { detectBladeCrack } from '../api/client'
import './BladeCrackDetect.css'

/**
 * 风机叶片裂缝 AI 检测弹窗
 */
export default function BladeCrackDetect({ open, turbineId, onClose, onDetected }) {
  const canvasRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!open || !previewUrl) return
    drawResult(canvasRef.current, previewUrl, result?.cracks || [])
  }, [open, previewUrl, result])

  function resetState() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
    setLoading(false)
    setError('')
    setResult(null)
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = 0
      canvas.height = 0
    }
  }

  function handleClose() {
    resetState()
    onClose?.()
  }

  function handleFileChange(e) {
    const next = e.target.files?.[0]
    if (!next) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(next)
    setPreviewUrl(URL.createObjectURL(next))
    setResult(null)
    setError('')
  }

  async function handleDetect() {
    if (!file || !turbineId || loading) return
    setLoading(true)
    setError('')
    try {
      const data = await detectBladeCrack(file, turbineId)
      const normalized = {
        turbine_id: data.turbine_id || turbineId,
        crack_count: data.crack_count ?? data.cracks?.length ?? 0,
        cracks: Array.isArray(data.cracks) ? data.cracks : [],
      }
      setResult(normalized)

      // 绘制标注图并导出为 dataURL，绑定到风机供三维点击查看
      const imageDataUrl = await drawResult(canvasRef.current, previewUrl, normalized.cracks)
      onDetected?.({ ...normalized, imageDataUrl: imageDataUrl || '' })
    } catch {
      setError('AI检测服务异常，请检查服务是否启动')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="bcd-overlay" role="dialog" aria-modal="true">
      <div className="bcd-modal">
        <header className="bcd-header">
          <h3>叶片缺陷巡检 — {turbineId || '未选中风机'}</h3>
          <button type="button" className="bcd-close" onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="bcd-toolbar">
          <label className="bcd-file">
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={loading} />
            选择叶片图片
          </label>
          <button
            type="button"
            className="bcd-btn"
            disabled={!file || !turbineId || loading}
            onClick={handleDetect}
          >
            {loading ? '检测中…' : '上传并检测'}
          </button>
          {file && <span className="bcd-filename">{file.name}</span>}
        </div>

        {error && <p className="bcd-error">{error}</p>}
        {loading && <p className="bcd-loading">正在调用 AI 检测服务，请稍候…</p>}

        <div className="bcd-canvas-wrap">
          {previewUrl ? (
            <canvas ref={canvasRef} className="bcd-canvas" />
          ) : (
            <p className="bcd-placeholder">请选择叶片图片后点击「上传并检测」</p>
          )}
        </div>

        {result && (
          <p className="bcd-summary">
            风机 {result.turbine_id} 检出缺陷 <b>{result.crack_count}</b> 处（已标注到三维场景，点击风机可查看）
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 在 Canvas 上绘制原图 + 红色缺陷框 + 置信度文字
 * @returns {Promise<string|null>} 标注后图片的 dataURL
 */
export function drawResult(canvas, imageUrl, cracks) {
  if (!canvas || !imageUrl) return Promise.resolve(null)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      const list = Array.isArray(cracks) ? cracks : []
      for (const item of list) {
        const [x1, y1, x2, y2] = item.bbox || []
        if ([x1, y1, x2, y2].some((v) => typeof v !== 'number')) continue

        const w = x2 - x1
        const h = y2 - y1
        const conf = typeof item.conf === 'number' ? item.conf : 0

        ctx.strokeStyle = '#ff2d2d'
        ctx.lineWidth = Math.max(2, Math.round(Math.min(img.naturalWidth, img.naturalHeight) / 400))
        ctx.strokeRect(x1, y1, w, h)

        const label = conf.toFixed(2)
        const fontSize = Math.max(14, Math.round(Math.min(img.naturalWidth, img.naturalHeight) / 40))
        ctx.font = `bold ${fontSize}px sans-serif`
        const textW = ctx.measureText(label).width
        const padX = 6
        const padY = 4
        const boxH = fontSize + padY * 2
        const boxY = Math.max(0, y1 - boxH - 2)

        ctx.fillStyle = 'rgba(180, 0, 0, 0.75)'
        ctx.fillRect(x1, boxY, textW + padX * 2, boxH)
        ctx.fillStyle = '#fff'
        ctx.fillText(label, x1 + padX, boxY + fontSize + padY / 2)
      }

      try {
        resolve(canvas.toDataURL('image/jpeg', 0.92))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}
