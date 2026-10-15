import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

function valueFontSize(text) {
  const len = String(text).length
  if (len >= 5) return 13
  if (len >= 4) return 15
  return 17
}

export default function GaugeRow({ gauges = [] }) {
  const refs = useRef([])

  useEffect(() => {
    const charts = gauges.map((_, i) => {
      const el = refs.current[i]
      if (!el) return null
      return echarts.init(el)
    })

    gauges.forEach((g, i) => {
      const chart = charts[i]
      if (!chart) return
      const percent = Math.min(100, Math.round((g.value / g.max) * 100))
      const display = String(g.value)

      chart.setOption({
        series: [
          {
            type: 'gauge',
            startAngle: 90,
            endAngle: -270,
            radius: '88%',
            center: ['50%', '50%'],
            pointer: { show: false },
            progress: {
              show: true,
              overlap: false,
              roundCap: true,
              clip: false,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#1a6cff' },
                  { offset: 1, color: '#4ecbff' },
                ]),
              },
            },
            axisLine: {
              lineStyle: { width: 7, color: [[1, 'rgba(40,80,140,0.45)']] },
            },
            splitLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false },
            // 圆内只放数值，字号按位数缩放
            detail: {
              valueAnimation: true,
              fontSize: valueFontSize(display),
              fontWeight: 700,
              color: '#c2d8ea',
              offsetCenter: [0, '0%'],
              formatter: () => display,
            },
            // 标题放到圆外，由下方 HTML 展示，避免挤进圆环
            title: { show: false },
            data: [{ value: percent, name: g.label }],
          },
        ],
      })
    })

    const observers = gauges.map((_, i) => {
      const el = refs.current[i]
      if (!el || typeof ResizeObserver === 'undefined') return null
      const ro = new ResizeObserver(() => charts[i]?.resize())
      ro.observe(el)
      return ro
    })

    const onResize = () => charts.forEach((c) => c?.resize())
    window.addEventListener('resize', onResize)
    requestAnimationFrame(() => charts.forEach((c) => c?.resize()))

    return () => {
      window.removeEventListener('resize', onResize)
      observers.forEach((ro) => ro?.disconnect())
      charts.forEach((c) => c?.dispose())
    }
  }, [gauges])

  return (
    <div className="gauge-row">
      {gauges.map((g, i) => (
        <div key={g.label} className="gauge-item">
          <div
            className="gauge-chart"
            ref={(el) => {
              refs.current[i] = el
            }}
          />
          <div className="gauge-caption">
            <span className="gauge-caption__label">{g.label}</span>
            {g.unit ? <span className="gauge-caption__unit">{g.unit}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
