# 风电场监控平台 · 接口文档

> 版本：1.0.0（假数据演示）  
> 后端：FastAPI · 默认地址 `http://127.0.0.1:8001`  
> 前端开发：Vite 将 `/api` 代理到上述地址，浏览器侧统一请求 `/api/*`

---

## 1. 通用说明

| 项 | 说明 |
|----|------|
| 协议 | HTTP / JSON |
| 字符编码 | UTF-8 |
| 鉴权 | 当前无（演示版） |
| CORS | 已开放 `*` |
| 错误 | 业务错误多为 `200` + `{ "error": "..." }`；HTTP 层失败由前端 `res.ok` 判断 |

### 前端对接方式

```js
// src/api/client.js
fetch('/api/dashboard')  // 开发环境经 Vite 代理到 8001
```

大屏当前**仅调用** `GET /api/dashboard`；其余接口后端已实现，供扩展使用。

---

## 2. 接口一览

| 方法 | 路径 | 说明 | 前端是否使用 |
|------|------|------|----------------|
| GET | `/api/health` | 健康检查 | 否（预留） |
| GET | `/api/dashboard` | 大屏全量数据 | **是** |
| GET | `/api/turbines` | 风机列表 | 否（预留） |
| GET | `/api/turbines/{turbine_id}` | 单台风机详情 | 否（预留） |

---

## 3. 接口详情

### 3.1 健康检查

**`GET /api/health`**

探活，确认后端进程可用。

**响应示例**

```json
{
  "status": "ok"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 固定 `"ok"` |

---

### 3.2 大屏全量数据（主接口）

**`GET /api/dashboard`**

一次返回监控大屏所需全部业务数据。前端 `WindScreen` 打开时调用一次并渲染。

**响应结构总览**

```json
{
  "site": { },
  "summary": { },
  "gauges": [ ],
  "powerTrend": { },
  "statusRatio": [ ],
  "turbines": [ ],
  "uavInspections": [ ],
  "faultAnalysis": { },
  "maintenanceTasks": [ ],
  "defaultTurbineId": "WT005"
}
```

#### 3.2.1 `site` — 站点信息

对应：页眉标题、地图中心。

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 大屏主标题 |
| subtitle | string | 副标题 |
| center | object | 地图中心 |
| center.lon | number | 经度 |
| center.lat | number | 纬度 |
| center.height | number | 建议观察高度（米），可选 |

**示例**

```json
{
  "title": "大型风力发电监控平台",
  "subtitle": "湖北大学风场 - 三维 GIS 监控",
  "center": { "lon": 114.3376, "lat": 30.5825, "height": 700 }
}
```

#### 3.2.2 `summary` — 底部统计卡片

| 字段 | 类型 | 单位/说明 | 前端展示 |
|------|------|-----------|----------|
| faultCount | number | 总故障数 | 总故障数 |
| deviceCount | number | 台 | 设备统计 |
| todayGeneration | number | MWh | 今日发电 |
| totalPower | number | kW | 风场总功率 |

#### 3.2.3 `gauges` — 实测运行指标（圆环）

数组，建议 4 项。

| 字段 | 类型 | 说明 |
|------|------|------|
| label | string | 指标名 |
| value | number | 当前值 |
| max | number | 满刻度 |
| unit | string | 单位，如 `kW` / `台` / `%` |

**示例**

```json
[
  { "label": "总功率", "value": 6400, "max": 8000, "unit": "kW" },
  { "label": "在线机组", "value": 4, "max": 5, "unit": "台" },
  { "label": "可用率", "value": 78, "max": 100, "unit": "%" },
  { "label": "负荷率", "value": 96, "max": 100, "unit": "%" }
]
```

#### 3.2.4 `powerTrend` — 发电功率趋势

| 字段 | 类型 | 说明 |
|------|------|------|
| times | string[] | X 轴时间标签，长度建议 24（`00:00` … `23:00`） |
| values | number[] | Y 轴功率，与 `times` 等长，单位 kW |

**示例**

```json
{
  "times": ["00:00", "01:00", "…", "23:00"],
  "values": [1200, 1100, "…", 1500]
}
```

#### 3.2.5 `statusRatio` — 机组状态占比

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 状态名（如「正常发电」「待机」「故障」） |
| value | number | 数量 |
| color | string | 图表颜色，CSS 色值 |

#### 3.2.6 `turbines` — 风机列表

同时用于：Cesium 三维落点、机组详情面板。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机组编号，唯一，如 `WT001` |
| name | string | 是 | 显示名称 |
| power | number | 是 | 当前功率，kW |
| status | string | 是 | 状态码：`normal` / `standby` / `fault`（影响样式类名） |
| statusLabel | string | 是 | 状态中文文案 |
| lon | number | 是 | 经度 |
| lat | number | 是 | 纬度 |
| height | number | 否 | 高程，米；演示可用 `0` |
| windSpeed | number | 是 | 风速，m/s |
| rpm | number | 是 | 转速，rpm |

**示例**

```json
{
  "id": "WT005",
  "name": "5号机组",
  "power": 900,
  "status": "fault",
  "statusLabel": "故障",
  "lon": 114.3399,
  "lat": 30.5839,
  "height": 0,
  "windSpeed": 7.8,
  "rpm": 6.4
}
```

#### 3.2.7 `uavInspections` — 无人机巡检状态

| 字段 | 类型 | 说明 |
|------|------|------|
| part | string | 部件名 |
| time | string | 时间，如 `09:12` |
| status | string | `normal` / `abnormal`（影响列表样式） |
| message | string | 结果说明 |

#### 3.2.8 `faultAnalysis` — 故障归类分析

| 字段 | 类型 | 说明 |
|------|------|------|
| categories | string[] | X 轴类目（如周一～周日） |
| series | object[] | 多系列折线 |
| series[].name | string | 系列名（电气 / 机械 / 控制） |
| series[].data | number[] | 与 `categories` 等长 |
| series[].color | string | 折线颜色 |

#### 3.2.9 `maintenanceTasks` — 维修任务进度

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 任务名 |
| progress | number | 进度 0～100 |

#### 3.2.10 `defaultTurbineId`

| 字段 | 类型 | 说明 |
|------|------|------|
| defaultTurbineId | string | 打开大屏时默认选中的 `turbines[].id` |

---

### 3.3 风机列表（预留）

**`GET /api/turbines`**

返回与 `dashboard.turbines` 同结构的数组。大屏当前不单独请求，数据已包含在 dashboard 中。

**响应**：`Turbine[]`（字段见 3.2.6）

---

### 3.4 单台风机详情（预留）

**`GET /api/turbines/{turbine_id}`**

| 参数 | 位置 | 类型 | 说明 |
|------|------|------|------|
| turbine_id | path | string | 机组 id，如 `WT001` |

**成功**：单个 Turbine 对象（同 3.2.6）

**未找到**

```json
{ "error": "not found" }
```

> 说明：前端当前从 `dashboard.turbines` 本地筛选选中机组，未调用本接口。需要按需刷新单机时再接。

---

## 4. 前端字段消费对照

| 界面模块 | 数据来源 |
|----------|----------|
| 页眉标题 / 副标题 | `site.title` / `site.subtitle` |
| 三维地图风机 | `turbines[]` |
| 实测运行指标 | `gauges` |
| 发电功率趋势 | `powerTrend` |
| 机组状态占比 | `statusRatio` |
| 机组详情 | 选中项 ∈ `turbines[]` |
| 无人机巡检 | `uavInspections` |
| 故障归类分析 | `faultAnalysis` |
| 维修任务进度 | `maintenanceTasks` |
| 底部四卡 | `summary.*` |
| 默认选中 | `defaultTurbineId` |

以下为纯前端，不走接口：本地时钟、装饰文案 `WIND FARM DIGITAL TWIN`、`LIVE` 徽章。

---

## 5. 联调与接真数据

### 本地联调

1. 启动后端：`cd backend && python main.py` → `http://127.0.0.1:8001`
2. 启动前端：`npm run dev` → `http://localhost:5173`
3. 浏览器访问 `/api/dashboard`（经代理）或直接访问 `http://127.0.0.1:8001/api/dashboard`
4. FastAPI 自带文档：`http://127.0.0.1:8001/docs`

### 替换真实服务

保持本文档中的 **路径 + JSON 字段名** 不变，前端可零改或少改；若字段名变更，需同步改：

- `src/api/client.js`
- `src/components/WindScreen.jsx`
- `src/components/charts/*`

假数据定义位置：`backend/mock_data.py`。

### 建议后续扩展（当前未实现）

- 定时轮询或 WebSocket 推送实时功率 / 状态
- 鉴权（Token / 网关）
- 写接口：告警确认、任务更新等
- 单机详情改为调用 `GET /api/turbines/{id}` 并定时刷新

---

## 6. 完整响应示例（`GET /api/dashboard`）

结构示意（数值以当前假数据为准，可能随 `mock_data.py` 调整）：

```json
{
  "site": {
    "title": "大型风力发电监控平台",
    "subtitle": "湖北大学风场 - 三维 GIS 监控",
    "center": { "lon": 114.3376, "lat": 30.5825, "height": 700 }
  },
  "summary": {
    "faultCount": 12,
    "deviceCount": 5,
    "todayGeneration": 128.6,
    "totalPower": 6400
  },
  "gauges": [
    { "label": "总功率", "value": 6400, "max": 8000, "unit": "kW" },
    { "label": "在线机组", "value": 4, "max": 5, "unit": "台" },
    { "label": "可用率", "value": 78, "max": 100, "unit": "%" },
    { "label": "负荷率", "value": 96, "max": 100, "unit": "%" }
  ],
  "powerTrend": {
    "times": ["00:00", "01:00", "02:00"],
    "values": [1200, 1100, 1050]
  },
  "statusRatio": [
    { "name": "正常发电", "value": 3, "color": "#3b9eff" },
    { "name": "待机", "value": 1, "color": "#f5c842" },
    { "name": "故障", "value": 1, "color": "#ff4d4f" }
  ],
  "turbines": [
    {
      "id": "WT001",
      "name": "1号机组",
      "power": 1450,
      "status": "normal",
      "statusLabel": "正常发电",
      "lon": 114.3315,
      "lat": 30.5812,
      "height": 0,
      "windSpeed": 8.6,
      "rpm": 14.2
    }
  ],
  "uavInspections": [
    {
      "part": "变桨系统",
      "time": "09:12",
      "status": "normal",
      "message": "正常"
    }
  ],
  "faultAnalysis": {
    "categories": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    "series": [
      {
        "name": "电气",
        "data": [2, 3, 1, 4, 2, 1, 3],
        "color": "#3b9eff"
      }
    ]
  },
  "maintenanceTasks": [
    { "name": "齿轮箱轴承润滑", "progress": 60 }
  ],
  "defaultTurbineId": "WT005"
}
```
