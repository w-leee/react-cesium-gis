import axios from 'axios'

const BASE = '/api'

export async function fetchDashboard() {
  const res = await fetch(`${BASE}/dashboard`)
  if (!res.ok) throw new Error(`dashboard ${res.status}`)
  return res.json()
}

/**
 * 风机叶片裂缝 AI 检测
 * @param {File} file 叶片图片
 * @param {string} turbineId 当前选中风机编号
 */
export async function detectBladeCrack(file, turbineId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('turbine_id', turbineId)

  const res = await axios.post(`${BASE}/blade_crack_detect`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return res.data
}
