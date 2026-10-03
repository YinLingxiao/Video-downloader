# Video Downloader

基于 Flask + yt-dlp 的在线视频下载工具，提供 Bilibili、YouTube 视频解析与下载的 Web 界面。

## 功能

- 解析视频信息并选择清晰度，使用 FFmpeg 合并音视频。
- 支持仅下载音频，以及 Bilibili 分 P 选择与批量下载；单个批量任务最多 20 P。
- 显示下载进度、速度和剩余时间，完成后保存文件。
- 通过访问码进入工具；下载任务与上传的 Cookie 按浏览器会话隔离。
- 支持上传 Netscape 格式的 `cookies.txt`，用于需要登录的视频。
- 灰阶响应式界面，配有星空背景和自定义光标。

## 环境要求

- Python 3.10+，Windows 部署建议使用 Python 3.11 或 3.12。
- FFmpeg 与 FFprobe：加入系统 `PATH`，或将 Windows 可执行文件放在项目的 `bin/` 目录。
- 能够访问目标视频平台的网络环境。

## 快速开始

```powershell
git clone https://github.com/YinLingxiao/Video-downloader.git
cd Video-downloader
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Linux / macOS 使用 `python3 -m venv venv`、`source venv/bin/activate` 和 `cp .env.example .env`。

编辑 `.env`，设置 `VIDEO_ACCESS_CODE` 和 `VIDEO_SECRET_KEY`。可以运行以下命令生成会话密钥，再将输出填入 `VIDEO_SECRET_KEY`：

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

| 配置 | 用途 | 默认值 |
| --- | --- | --- |
| `VIDEO_ACCESS_CODE` | 访问码，必须设置非空值 | 无 |
| `VIDEO_SECRET_KEY` | 会话密钥，生产环境应配置稳定值 | 每次启动随机生成 |
| `VIDEO_COOKIE_SECURE` | HTTPS 部署时设置为 `1`；本地 HTTP 留空 | 关闭 |
| `MAX_CONCURRENT_DOWNLOADS` | 同时运行的下载任务数 | `3` |
| `HOST` | 监听地址 | 开发入口 `127.0.0.1`；生产入口 `0.0.0.0` |
| `PORT` | 监听端口 | `5000` |

应用自动读取 `.env`，已有环境变量优先。旧的 `VIDEO_AUTH_PASSWORD` 暂时兼容，建议迁移到 `VIDEO_ACCESS_CODE`。

开发启动：

```powershell
python app.py
```

打开 `http://127.0.0.1:5000`，输入访问码，粘贴视频链接并解析，选择清晰度或分 P 后下载。

## 生产部署

项目已包含 Waitress，启动方式：

```powershell
python wsgi.py
```

也可直接指定监听地址：

```powershell
python -m waitress --host=0.0.0.0 --port=5000 app:app
```

下载任务保存在进程内存中，应使用单进程服务。需要域名与 HTTPS 时，将反向代理指向服务端口，并设置稳定的会话密钥及 `VIDEO_COOKIE_SECURE=1`。

Windows 防火墙、开机自启和反向代理配置见 [Windows Server 部署说明](README-Windows-Deploy.md)。

## 项目结构

```text
Video-downloader/
├── app.py                     Flask 应用、解析与下载接口
├── wsgi.py                    Waitress 生产入口
├── requirements.txt           Python 依赖
├── .env.example               配置模板
├── static/css/style.css       页面样式
├── static/js/                 下载交互、光标与星空
├── templates/index.html       下载页面
├── templates/access.html      访问码页面
├── README-Windows-Deploy.md   Windows 部署说明
└── DESIGN.md                  设计规范
```

`downloads/` 和 `cookies/` 在运行时自动创建，不提交到 Git。下载文件与任务过期时间为 30 分钟，Cookie 文件为 24 小时；清理由定时任务执行。服务重启会丢失内存中的任务记录。

## 使用说明

- 当前链接白名单支持 Bilibili、YouTube 及其短链接。
- 上传的 Cookie 属于当前会话，过期后需重新导出并上传。
- 高清视频可能需要平台账号权限以及 FFmpeg；上传 Cookie 不会改变账号权限。
- 下载耗时取决于网络、源站限制和媒体处理速度。
- `.env`、Cookie、下载文件、本机虚拟环境和 FFmpeg 二进制均不上传。请妥善保管访问码与 Cookie，并遵守平台规则及内容授权。
