# 大型风力发电监控平台

React + Cesium 三维 GIS 前端，Python FastAPI 提供假数据的风电场监控大屏。

当前版本（假数据演示）功能已完整，可本地运行查看。

---

## 框架与技术栈

整体为 **前后端分离**：浏览器跑 React 大屏，Python 提供 JSON 假数据。

```
浏览器 (React 大屏)
    │  HTTP /api/*
    ▼
Vite 开发代理 ──► FastAPI (Python) ──► mock_data.py
    │
    ▼
Cesium 三维地球 + ECharts 图表
```

### 前端

| 技术 | 版本/说明 | 作用 |
|------|-----------|------|
| **React** | 19.x | UI 组件与页面逻辑 |
| **Vite** | 8.x | 开发服务器、热更新、打包；代理 `/api` 到后端 |
| **Cesium** | 1.146.x | 三维 GIS：卫星影像、风机 glb 模型、相机环绕 |
| **ECharts** | 6.x | 圆环指标、功率趋势、状态占比、故障折线 |
| **CSS** | 原生 | 大屏 HUD 布局与科技风样式（无 UI 组件库） |

入口：`index.html` → `src/main.jsx` → `App.jsx` → `WindScreen`。

### 后端

| 技术 | 说明 | 作用 |
|------|------|------|
| **Python 3** | 建议 3.10+ | 运行环境 |
| **FastAPI** | REST API 框架 | 提供 `/api/dashboard` 等接口 |
| **Uvicorn** | ASGI 服务器 | `python main.py` 启动 HTTP 服务 |
| **假数据** | `mock_data.py` | 机组坐标、图表序列、巡检与任务等 |

### 数据与静态资源

| 类型 | 说明 |
|------|------|
| 接口数据 | 前端 `fetch('/api/dashboard')`，开发时由 Vite 转发到 `127.0.0.1:8001` |
| 风机模型 | `public/model/windturbine.glb`（glTF 二进制） |
| Cesium 资源 | `public/cesium/`（Workers / Assets / Widgets） |
| 底图 | ArcGIS World Imagery 在线瓦片（需联网） |

### 未使用（刻意保持简单）

- 无 React Router（单页大屏）
- 无 Redux / Zustand（状态在 `WindScreen` 内即可）
- 无 Tailwind / Ant Design（自定义 CSS 更贴合 DataV 风）
- 无数据库（数据全在 `mock_data.py`）

---

## 功能清单

- [x] 三维 GIS 地图（Cesium 卫星影像）
- [x] 风机三维模型展示与点击选中
- [x] 选中描边 / 绿色底框
- [x] 点击风机后固定仰角、水平 360° 环绕
- [x] 左侧：实测运行指标、发电功率趋势（24h）、机组状态占比
- [x] 右侧：机组详情、无人机巡检、故障归类、维修任务进度
- [x] 底部：故障数 / 设备数 / 今日发电 / 总功率
- [x] Python 假数据 API（`GET /api/dashboard`）

后续接入真实模型：替换 `public/model/windturbine.glb`，必要时调整 `CesiumMap.jsx` 中的 `MODEL_SCALE`。

---

## 启动方式

### 1. 后端

```bash
cd backend

# 1. 激活虚拟环境
.venv\Scripts\activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动
python main.py
```

服务地址：`http://127.0.0.1:8001`

### 2. 前端（另开终端）

```bash
npm install
npm run dev
```

浏览器打开：<http://localhost:5173>

前端通过 Vite 代理访问 `http://127.0.0.1:8001/api/*`。

---

## 正在使用的文件结构

```
react-cesium-gis/
├── package.json              # 依赖与 npm 脚本
├── package-lock.json         # 锁定依赖版本
├── vite.config.js            # Vite 配置（API 代理、Cesium）
├── index.html                # 前端 HTML 入口
├── .gitignore                # Git 忽略规则
├── eslint.config.js          # ESLint 配置（可选）
├── README.md                 # 本说明文档
│
├── src/                      # 前端源码
│   ├── main.jsx              # React 挂载入口
│   ├── App.jsx               # 根组件
│   ├── index.css             # 全局样式
│   ├── api/
│   │   └── client.js         # 请求后端数据
│   └── components/
│       ├── WindScreen.jsx    # 监控大屏布局
│       ├── WindScreen.css    # 大屏样式
│       ├── CesiumMap.jsx     # 三维地图与风机交互
│       └── charts/
│           ├── GaugeRow.jsx      # 运行指标圆环
│           ├── PowerTrend.jsx    # 功率趋势折线
│           ├── StatusDonut.jsx   # 机组状态占比
│           └── FaultLine.jsx     # 故障归类分析
│
├── public/                   # 静态资源
│   ├── favicon.svg           # 网站图标
│   ├── model/
│   │   └── windturbine.glb   # 风机三维模型
│   └── cesium/               # Cesium 运行时资源
│       ├── Assets/
│       ├── Workers/
│       └── Widgets/
│
└── backend/                  # Python 假数据后端
    ├── main.py               # FastAPI 入口（python main.py 启动）
    ├── mock_data.py          # 假数据定义
    └── requirements.txt      # Python 依赖
```

### 文件用途说明

| 分类 | 文件 | 用途 |
|------|------|------|
| 配置 | `package.json` | 依赖与启动脚本 |
| 配置 | `package-lock.json` | 锁定依赖版本 |
| 配置 | `vite.config.js` | 前端构建、`/api` 代理、Cesium |
| 配置 | `index.html` | 页面入口 |
| 配置 | `.gitignore` | 忽略 `node_modules` 等 |
| 配置 | `eslint.config.js` | 代码检查（不影响运行） |
| 前端 | `src/main.jsx` | React 挂载 |
| 前端 | `src/App.jsx` | 根组件 |
| 前端 | `src/index.css` | 全局样式 |
| 前端 | `src/api/client.js` | 调用 `/api/dashboard` |
| 前端 | `WindScreen.*` | 大屏 HUD 布局与样式 |
| 前端 | `CesiumMap.jsx` | 地图、风机、相机环绕 |
| 前端 | `charts/*` | ECharts 图表 |
| 静态 | `public/favicon.svg` | 浏览器图标 |
| 静态 | `public/model/windturbine.glb` | 风机模型 |
| 静态 | `public/cesium/` | Cesium Workers / Assets |
| 后端 | `backend/main.py` | API 服务 |
| 后端 | `backend/mock_data.py` | 假数据 |
| 后端 | `backend/requirements.txt` | FastAPI / uvicorn |

### 自动生成（勿手改、一般不提交）

| 路径 | 说明 |
|------|------|
| `node_modules/` | `npm install` 生成 |
| `backend/__pycache__/` | Python 运行缓存（已加入 `.gitignore`） |
| `dist/` | `npm run build` 产物 |

---

## 主要接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/dashboard` | 大屏全部数据 |
| GET | `/api/turbines` | 风机列表 |
| GET | `/api/turbines/{id}` | 单台风机详情 |

完整字段说明、示例与前后端对照见 **[docs/API.md](docs/API.md)**。

---

## 相机相关参数（`src/components/CesiumMap.jsx`）

| 常量 | 含义 |
|------|------|
| `VIEW_HEADING` / `VIEW_PITCH` | 打开页面时的默认朝向与俯仰 |
| `VIEW_RANGE_TURBINE` | 点击风机后的观察距离 |
| `ORBIT_PITCH` | 环绕时的固定仰角（不可上下调，只能水平转） |
| `MODEL_SCALE` | 风机模型缩放 |

打开时远近：`sphere.radius = Math.max(sphere.radius * …, …)` 系数越小越近。

---

## 后续扩展：叶片裂纹检测链路

计划接入的真实检测功能，共 5 步流程：

1. **前端**：用户选择图片上传，发给 GIS 后端接口 `/api/blade_crack_detect`
2. **GIS 后端（8000）**：接收图片二进制，作为**中转代理**，把图片转发请求到 YOLO 服务 `127.0.0.1:8001/detect_crack`
3. **YOLO 服务（8001）**：接收图片，模型推理，算出所有缺陷的 `bbox 坐标、置信度`，返回 JSON
4. **GIS 后端**：拿到 YOLO 返回的 JSON，直接原样传回前端
5. **前端**：收到 JSON 里的坐标，用 Canvas 在原图上绘制矩形标注框 + 置信度文字展示
