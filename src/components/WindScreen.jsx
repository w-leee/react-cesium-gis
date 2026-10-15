import { useEffect, useMemo, useState } from 'react'
import { fetchDashboard } from '../api/client'
import CesiumMap from './CesiumMap'
import BladeCrackDetect from './BladeCrackDetect'
import CrackResultViewer from './CrackResultViewer'
import GaugeRow from './charts/GaugeRow'
import PowerTrend from './charts/PowerTrend'
import StatusDonut from './charts/StatusDonut'
import FaultLine from './charts/FaultLine'
import './WindScreen.css'

function formatNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function Panel({ title, children, className = '', scroll = false }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel__title">
        <span className="panel__mark" />
        {title}
      </header>
      <div className={`panel__body ${scroll ? 'panel__body--scroll' : ''}`}>{children}</div>
    </section>
  )
}

export default function WindScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [now, setNow] = useState(formatNow)
  const [crackModalOpen, setCrackModalOpen] = useState(false)
  /** @type {[Record<string, { turbine_id: string, crack_count: number, cracks: Array, imageDataUrl: string }>, Function]} */
  const [crackRecords, setCrackRecords] = useState({})
  const [viewingTurbineId, setViewingTurbineId] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(formatNow()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    fetchDashboard()
      .then((res) => {
        if (!alive) return
        setData(res)
        setSelectedId(res.defaultTurbineId || res.turbines?.[0]?.id)
      })
      .catch((e) => {
        if (!alive) return
        setError(e.message || '加载失败，请先启动 Python 后端')
      })
    return () => {
      alive = false
    }
  }, [])

  const selected = useMemo(
    () => data?.turbines?.find((t) => t.id === selectedId) || null,
    [data, selectedId],
  )

  const crackCounts = useMemo(() => {
    const map = {}
    for (const [id, rec] of Object.entries(crackRecords)) {
      map[id] = rec.crack_count ?? 0
    }
    return map
  }, [crackRecords])

  const selectedCrackCount = selectedId != null ? crackCounts[selectedId] : undefined
  const selectedCrackRecord = selectedId != null ? crackRecords[selectedId] : null
  const alertTurbineIds = useMemo(
    () => Object.keys(crackRecords).filter((id) => (crackRecords[id]?.crack_count || 0) > 0),
    [crackRecords],
  )
  const viewingRecord = viewingTurbineId ? crackRecords[viewingTurbineId] : null

  function handleCrackDetected(result) {
    const id = result.turbine_id
    if (!id) return
    setCrackRecords((prev) => ({
      ...prev,
      [id]: {
        turbine_id: id,
        crack_count: result.crack_count ?? 0,
        cracks: result.cracks || [],
        imageDataUrl: result.imageDataUrl || '',
      },
    }))
  }

  function handleAlertClick(turbineId) {
    if (crackRecords[turbineId]?.imageDataUrl) {
      setViewingTurbineId(turbineId)
    }
  }

  if (error) {
    return (
      <div className="wind-screen wind-screen--error">
        <p>数据加载失败：{error}</p>
        <p>请在 backend 目录运行：python main.py</p>
      </div>
    )
  }

  if (!data) {
    return <div className="wind-screen wind-screen--loading">正在加载风场监控数据…</div>
  }

  const { site, summary, gauges, powerTrend, statusRatio, turbines, uavInspections, faultAnalysis, maintenanceTasks } =
    data

  return (
    <div className="wind-screen">
      <CesiumMap
        turbines={turbines}
        center={site.center}
        selectedId={selectedId}
        onSelect={setSelectedId}
        alertTurbineIds={alertTurbineIds}
        crackCounts={crackCounts}
        onAlertClick={handleAlertClick}
      />

      <div className="fx-layer" aria-hidden="true">
        <div className="fx-vignette" />
        <div className="fx-glow fx-glow--top" />
        <div className="fx-glow fx-glow--left" />
        <div className="fx-glow fx-glow--right" />
        <div className="fx-grid" />
        <div className="fx-corner fx-corner--tl" />
        <div className="fx-corner fx-corner--tr" />
        <div className="fx-corner fx-corner--bl" />
        <div className="fx-corner fx-corner--br" />
      </div>

      <div className="hud">
        <header className="hud-header">
          <div className="hud-time">
            <span className="hud-time__dot" />
            {now}
          </div>
          <div className="hud-titles">
            <div className="hud-titles__deco">
              <i />
              <span>WIND FARM DIGITAL TWIN</span>
              <i />
            </div>
            <h1>{site.title}</h1>
            <p>{site.subtitle}</p>
          </div>
          <div className="hud-header__right">
            <span className="hud-badge">LIVE</span>
          </div>
        </header>

        <aside className="hud-left">
          <Panel title="实测运行指标">
            <GaugeRow gauges={gauges} />
          </Panel>
          <Panel title="发电功率趋势">
            <PowerTrend data={powerTrend} />
          </Panel>
          <Panel title="机组状态占比">
            <StatusDonut data={statusRatio} />
          </Panel>
        </aside>

        <aside className="hud-right">
          <Panel title="机组详情" scroll>
            {selected ? (
              <div className="turbine-detail">
                <div className="kv">
                  <span>编号</span>
                  <b>{selected.id}</b>
                </div>
                <div className="kv">
                  <span>功率</span>
                  <b>{selected.power} kW</b>
                </div>
                <div className="kv">
                  <span>状态</span>
                  <b className={`status status--${selected.status}`}>{selected.statusLabel}</b>
                </div>
                <div className="kv">
                  <span>经度</span>
                  <b>{selected.lon.toFixed(4)}°</b>
                </div>
                <div className="kv">
                  <span>纬度</span>
                  <b>{selected.lat.toFixed(4)}°</b>
                </div>
                <div className="kv">
                  <span>风速</span>
                  <b>{selected.windSpeed} m/s</b>
                </div>
                <div className="kv">
                  <span>转速</span>
                  <b>{selected.rpm} rpm</b>
                </div>
                <div className="kv">
                  <span>名称</span>
                  <b>{selected.name}</b>
                </div>
              </div>
            ) : (
              <p className="muted">点击地图机组查看详情</p>
            )}
            <button
              type="button"
              className="inspect-btn"
              disabled={!selectedId}
              onClick={() => setCrackModalOpen(true)}
            >
              叶片缺陷巡检
            </button>
          </Panel>

          <Panel title="无人机巡检状态" scroll>
            {selectedId && (
              <div className={`crack-banner ${selectedCrackCount > 0 ? 'crack-banner--alert' : ''}`}>
                <span>当前风机 {selectedId}</span>
                <b>
                  叶片缺陷{' '}
                  {selectedCrackCount == null ? '—' : `${selectedCrackCount} 处`}
                </b>
              </div>
            )}
            {selectedCrackRecord?.imageDataUrl && (
              <button
                type="button"
                className="bcd-view-btn"
                onClick={() => setViewingTurbineId(selectedId)}
              >
                查看叶片检测图片
              </button>
            )}
            <ul className="uav-list">
              {uavInspections.map((item) => (
                <li key={`${item.part}-${item.time}`} className={item.status}>
                  <span className="uav-part">{item.part}</span>
                  <span className="uav-time">{item.time}</span>
                  <span className="uav-msg">{item.message}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="故障归类分析">
            <FaultLine data={faultAnalysis} />
          </Panel>

          <Panel title="维修任务进度" scroll>
            <ul className="task-list">
              {maintenanceTasks.map((task) => (
                <li key={task.name}>
                  <div className="task-head">
                    <span>{task.name}</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="task-bar">
                    <i style={{ width: `${task.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>

        <footer className="hud-bottom">
          <div className="stat-card" style={{ animationDelay: '0.05s' }}>
            <strong>{summary.faultCount}</strong>
            <span>总故障数</span>
          </div>
          <div className="stat-card" style={{ animationDelay: '0.12s' }}>
            <strong>
              {summary.deviceCount} <small>台</small>
            </strong>
            <span>设备统计</span>
          </div>
          <div className="stat-card" style={{ animationDelay: '0.19s' }}>
            <strong>
              {summary.todayGeneration} <small>MWh</small>
            </strong>
            <span>今日发电</span>
          </div>
          <div className="stat-card" style={{ animationDelay: '0.26s' }}>
            <strong>
              {summary.totalPower} <small>kW</small>
            </strong>
            <span>风场总功率</span>
          </div>
        </footer>
      </div>

      <BladeCrackDetect
        open={crackModalOpen}
        turbineId={selectedId}
        onClose={() => setCrackModalOpen(false)}
        onDetected={handleCrackDetected}
      />

      <CrackResultViewer
        open={!!viewingRecord}
        record={viewingRecord}
        onClose={() => setViewingTurbineId(null)}
      />
    </div>
  )
}
