import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export default function PowerTrend({ data }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !data) return
    const chart = echarts.init(ref.current)
    chart.setOption({
      grid: { left: 48, right: 18, top: 28, bottom: 36, containLabel: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8,24,48,0.9)',
        borderColor: '#2a6db0',
        textStyle: { color: '#dff' },
      },
      xAxis: {
        type: 'category',
        data: data.times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#2a5080' } },
        // 24 小时数据：轴上每 4 小时显示一次，悬停可看整点
        axisLabel: {
          color: '#6e99b8',
          fontSize: 11,
          interval: 3,
          hideOverlap: true,
          margin: 10,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        max: 7000,
        splitNumber: 4,
        axisLine: { show: false },
        axisLabel: { color: '#6e99b8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(50,100,160,0.25)', type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          data: data.values,
          lineStyle: { width: 2, color: '#3ec6ff' },
          itemStyle: { color: '#3ec6ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(62,198,255,0.45)' },
              { offset: 1, color: 'rgba(62,198,255,0.02)' },
            ]),
          },
        },
      ],
    })

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => chart.resize())
        : null
    if (ro) ro.observe(ref.current)

    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    requestAnimationFrame(() => chart.resize())

    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
      chart.dispose()
    }
  }, [data])

  return <div ref={ref} className="chart-box" />
}
