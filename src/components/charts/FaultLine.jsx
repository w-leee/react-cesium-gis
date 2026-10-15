import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export default function FaultLine({ data }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !data) return
    const chart = echarts.init(ref.current)
    chart.setOption({
      grid: { left: 36, right: 12, top: 32, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8,24,48,0.9)',
        borderColor: '#2a6db0',
        textStyle: { color: '#dff' },
      },
      legend: {
        top: 0,
        right: 4,
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 12,
        textStyle: { color: '#6e99b8', fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        data: data.categories,
        axisLine: { lineStyle: { color: '#2a5080' } },
        axisLabel: { color: '#6e99b8', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#6e99b8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(50,100,160,0.25)', type: 'dashed' } },
      },
      series: data.series.map((s) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: s.data,
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
      })),
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

  return <div ref={ref} className="chart-box chart-box--sm" />
}
