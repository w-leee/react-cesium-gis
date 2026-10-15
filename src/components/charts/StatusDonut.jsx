import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export default function StatusDonut({ data = [] }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !data.length) return
    const chart = echarts.init(ref.current)
    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(8,24,48,0.9)',
        borderColor: '#2a6db0',
        textStyle: { color: '#dff' },
      },
      legend: {
        orient: 'vertical',
        right: '4%',
        top: 'middle',
        itemGap: 14,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#7aa3c0', fontSize: 13 },
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '64%'],
          center: ['34%', '50%'],
          avoidLabelOverlap: true,
          label: { show: false },
          data: data.map((d) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: d.color },
          })),
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

  return <div ref={ref} className="chart-box chart-box--sm" />
}
