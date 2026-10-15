"""湖北大学风场 - 监控平台假数据"""

TURBINES = [
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
        "rpm": 14.2,
    },
    {
        "id": "WT002",
        "name": "2号机组",
        "power": 1320,
        "status": "normal",
        "statusLabel": "正常发电",
        "lon": 114.3358,
        "lat": 30.5798,
        "height": 0,
        "windSpeed": 8.1,
        "rpm": 13.5,
    },
    {
        "id": "WT003",
        "name": "3号机组",
        "power": 1180,
        "status": "standby",
        "statusLabel": "待机",
        "lon": 114.3382,
        "lat": 30.5856,
        "height": 0,
        "windSpeed": 3.2,
        "rpm": 0,
    },
    {
        "id": "WT004",
        "name": "4号机组",
        "power": 1550,
        "status": "normal",
        "statusLabel": "正常发电",
        "lon": 114.3425,
        "lat": 30.5821,
        "height": 0,
        "windSpeed": 9.0,
        "rpm": 15.1,
    },
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
        "rpm": 6.4,
    },
]

POWER_TREND = {
    "times": [f"{h:02d}:00" for h in range(24)],
    # 24 小时发电功率假数据（夜间较低，白天升高）
    "values": [
        1200,
        1100,
        1050,
        1000,
        1150,
        1600,
        2100,
        2800,
        3600,
        4200,
        5100,
        5800,
        6200,
        6500,
        6400,
        6100,
        5600,
        4900,
        4300,
        3800,
        3200,
        2600,
        2000,
        1500,
    ],
}

STATUS_RATIO = [
    {"name": "正常发电", "value": 3, "color": "#3b9eff"},
    {"name": "待机", "value": 1, "color": "#f5c842"},
    {"name": "故障", "value": 1, "color": "#ff4d4f"},
]

UAV_INSPECTIONS = [
    {"part": "变桨系统", "time": "09:12", "status": "normal", "message": "正常"},
    {"part": "齿轮箱", "time": "09:08", "status": "abnormal", "message": "部件异常"},
    {"part": "发电机", "time": "09:15", "status": "normal", "message": "正常"},
    {"part": "偏航系统", "time": "09:18", "status": "normal", "message": "正常"},
]

FAULT_ANALYSIS = {
    "categories": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    "series": [
        {"name": "电气", "data": [2, 3, 1, 4, 2, 1, 3], "color": "#3b9eff"},
        {"name": "机械", "data": [1, 2, 4, 2, 3, 2, 1], "color": "#f5c842"},
        {"name": "控制", "data": [0, 1, 2, 1, 2, 0, 1], "color": "#ff6b4a"},
    ],
}

MAINTENANCE_TASKS = [
    {"name": "齿轮箱轴承润滑", "progress": 60},
    {"name": "WT003 叶片巡检", "progress": 100},
    {"name": "升压站通信测试", "progress": 35},
    {"name": "年度防雷检测", "progress": 80},
]


def get_dashboard():
    total_power = sum(t["power"] for t in TURBINES)
    online = sum(1 for t in TURBINES if t["status"] != "fault")

    return {
        "site": {
            "title": "大型风力发电监控平台",
            "subtitle": "湖北大学风场 - 三维 GIS 监控",
            "center": {"lon": 114.3376, "lat": 30.5825, "height": 700},
        },
        "summary": {
            "faultCount": 12,
            "deviceCount": len(TURBINES),
            "todayGeneration": 128.6,
            "totalPower": total_power,
        },
        "gauges": [
            {"label": "总功率", "value": total_power, "max": 8000, "unit": "kW"},
            {"label": "在线机组", "value": online, "max": 5, "unit": "台"},
            {"label": "可用率", "value": 78, "max": 100, "unit": "%"},
            {"label": "负荷率", "value": 96, "max": 100, "unit": "%"},
        ],
        "powerTrend": POWER_TREND,
        "statusRatio": STATUS_RATIO,
        "turbines": TURBINES,
        "uavInspections": UAV_INSPECTIONS,
        "faultAnalysis": FAULT_ANALYSIS,
        "maintenanceTasks": MAINTENANCE_TASKS,
        "defaultTurbineId": "WT005",
    }
