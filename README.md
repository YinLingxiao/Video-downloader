# Video Downloader

一个基于 Flask + yt-dlp 的在线视频下载工具，支持 Bilibili、YouTube 等多个视频平台，提供 Web 界面进行视频解析和下载。

## 功能特性

- **多平台支持**：支持 Bilibili、YouTube 及 yt-dlp 支持的 [1000+ 视频网站](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- **清晰度选择**：自动解析视频所有可用清晰度，支持 4K、1080p60fps 等高规格格式
- **Cookie 认证**：支持上传 Cookie 文件，下载需要登录的高清视频（如 Bilibili 大会员专属分辨率）
- **实时进度**：下载过程中实时显示进度、速度、剩余时间
- **自动合并**：使用 FFmpeg 自动合并视频流和音频流
- **图片代理**：解决跨域问题，正常显示视频缩略图
- **现代化 UI**：响应式设计，支持移动端访问

## 技术栈

- **后端**：Python 3.10+ / Flask
- **视频解析**：yt-dlp
- **媒体处理**：FFmpeg
- **前端**：原生 HTML/CSS/JavaScript

## 环境要求

- Python 3.10 或更高版本
- FFmpeg（用于音视频合并）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/video-downloader.git
cd video-downloader
```

### 2. 创建虚拟环境

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 安装 FFmpeg

**Windows:**
1. 从 [ffmpeg.org](https://ffmpeg.org/download.html) 下载 FFmpeg
2. 解压后将 `ffmpeg.exe`、`ffprobe.exe` 放入项目的 `bin/` 目录
3. 或将 FFmpeg 添加到系统 PATH 环境变量

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

### 5. 运行应用

```bash
python app.py
```

应用将在 `http://127.0.0.1:5000` 启动。

## 使用说明

### 基本使用

1. 打开浏览器访问 `http://127.0.0.1:5000`
2. 在输入框中粘贴视频链接（支持 Bilibili、YouTube 等）
3. 点击「解析」按钮，等待视频信息加载
4. 从下拉菜单中选择目标清晰度
5. 点击「下载」按钮开始下载
6. 下载完成后点击「保存文件」

### Cookie 上传（下载会员视频）

部分高清视频需要登录才能下载，你可以上传 Cookie 文件来解锁：

1. 安装浏览器扩展 [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. 登录目标网站（Bilibili / YouTube）
3. 点击扩展图标，导出 Cookie 为 `cookies.txt`
4. 将文件拖拽到上传区域或点击选择文件上传

### 清晰度说明

| 标签 | 含义 |
|------|------|
| `[A+V]` | 视频流包含音频，可直接下载 |
| `[V only]` | 纯视频流，下载时自动合并最佳音频 |
| `60` / `120` | 高帧率视频（如 1080p60） |

## 项目结构

```
video-downloader/
├── app.py              # Flask 主程序
├── requirements.txt    # Python 依赖
├── .gitignore
├── README.md
├── static/
│   ├── css/
│   │   └── style.css   # 样式文件
│   └── js/
│       └── main.js     # 前端逻辑
├── templates/
│   └── index.html      # 主页面模板
├── bin/                # FFmpeg 二进制文件（需自行放置）
│   ├── ffmpeg.exe
│   ├── ffplay.exe
│   └── ffprobe.exe
├── cookies/            # Cookie 存储目录（自动创建）
│   └── cookies.txt
└── downloads/          # 下载文件目录（自动创建）
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 主页面 |
| `/api/status` | GET | 获取系统状态（FFmpeg、Cookie） |
| `/api/formats` | POST | 解析视频信息 |
| `/api/download` | POST | 创建下载任务 |
| `/api/task/<task_id>` | GET | 查询任务状态 |
| `/api/download_file/<task_id>` | GET | 下载完成的文件 |
| `/api/upload_cookie` | POST | 上传 Cookie 文件 |
| `/api/delete_cookie` | POST | 删除 Cookie 文件 |
| `/api/proxy_image` | GET | 图片代理 |

## 生产环境部署

### 使用 Gunicorn（Linux/macOS）

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 使用 Waitress（Windows）

```bash
pip install waitress
waitress-serve --port=5000 app:app
```

### 使用 Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
```

构建并运行：
```bash
docker build -t video-downloader .
docker run -d -p 5000:5000 video-downloader
```

## 常见问题

### Q: 下载时提示 "FFmpeg not found"

确保 FFmpeg 已正确安装：
- 方法一：将 `ffmpeg.exe` 放入项目的 `bin/` 目录
- 方法二：将 FFmpeg 添加到系统 PATH

### Q: 无法下载 1080p 及以上清晰度

YouTube 等平台的高清视频通常采用 DASH 技术，音视频分离。本工具会自动合并，但需要 FFmpeg 支持。

### Q: Bilibili 提示 "需要登录"

上传 Bilibili 的 Cookie 文件即可。确保导出 Cookie 时已登录账号。

### Q: 下载速度很慢

下载速度取决于：
- 你的网络环境
- 视频源服务器的速度
- 是否需要代理访问

可以通过配置代理来改善：
```python
# 在 app.py 的 ydl_opts 中添加
ydl_opts = {
    ...
    "proxy": "http://127.0.0.1:7890",
}
```

## 注意事项

- Cookie 文件包含登录凭证，请勿分享给他人
- Cookie 有有效期，过期后需重新上传
- 本工具仅供个人学习使用，请尊重视频创作者的版权
- 下载的内容请勿用于商业用途或二次传播

## 许可证

[MIT License](LICENSE)

## 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载库
- [Flask](https://flask.palletsprojects.com/) - Python Web 框架
- [FFmpeg](https://ffmpeg.org/) - 多媒体处理工具

---

<div align="center">

### 博觀而約取，厚積而薄發

=======
