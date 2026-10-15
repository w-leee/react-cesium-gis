import './BladeCrackDetect.css'

/**
 * 查看已绑定风机的叶片缺陷检测标注图
 */
export default function CrackResultViewer({ open, record, onClose }) {
  if (!open || !record) return null

  return (
    <div className="bcd-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bcd-modal" onClick={(e) => e.stopPropagation()}>
        <header className="bcd-header">
          <h3>
            {record.turbine_id} 叶片缺陷检测图
            <span className="bcd-tag">缺陷 {record.crack_count} 处</span>
          </h3>
          <button type="button" className="bcd-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="bcd-canvas-wrap">
          {record.imageDataUrl ? (
            <img
              src={record.imageDataUrl}
              alt={`${record.turbine_id} 叶片缺陷标注`}
              className="bcd-canvas"
            />
          ) : (
            <p className="bcd-placeholder">暂无检测图片</p>
          )}
        </div>

        <p className="bcd-summary">
          点击三维场景中带红色告警标记的风机，可再次查看本图
        </p>
      </div>
    </div>
  )
}
