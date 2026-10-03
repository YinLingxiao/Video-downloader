# Windows Server 部署说明

这个项目是一个 Flask Web 应用，推荐在 Windows Server 上使用 `waitress` 作为生产环境 Web 服务器。

## 1. 准备环境

- 安装 Python 3.11 或 3.12
- 安装 FFmpeg，并确保 `ffmpeg` 与 `ffprobe` 可以从系统 `PATH` 调用
- 确认服务器可以联网访问目标视频站点
- 确认放行你要使用的端口，例如 `5000`、`80` 或 `8080`

## 2. 安装依赖

在项目目录执行：

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

安装后可运行 `ffmpeg -version` 与 `ffprobe -version` 验证。应用会优先使用本地 `bin\ffmpeg.exe`，不存在时自动使用系统 `PATH`。

## 3. 配置并启动服务

先复制配置模板：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，设置非空的 `VIDEO_ACCESS_CODE` 和稳定的 `VIDEO_SECRET_KEY`。应用启动时会自动读取配置；访问页面后输入访问码。通过 HTTPS 访问时设置 `VIDEO_COOKIE_SECURE=1`，本地 HTTP 调试时留空。

开发方式：

```powershell
$env:HOST="0.0.0.0"
$env:PORT="5000"
python app.py
```

生产方式：

```powershell
.\venv\Scripts\python.exe -m waitress --host=0.0.0.0 --port=5000 app:app
```

浏览器访问：

```text
http://服务器IP:5000
```

## 4. 配置 Windows 防火墙

放行端口：

```powershell
netsh advfirewall firewall add rule name="video-downloader-5000" dir=in action=allow protocol=TCP localport=5000
```

## 5. 配置为开机自启

推荐使用 `nssm` 把 Python 服务注册成 Windows 服务。

示例：

```powershell
nssm install VideoDownloader
```

然后在弹窗里填写：

- Application path: `D:\Program\video-downloader\venv\Scripts\python.exe`
- Startup directory: `D:\Program\video-downloader`
- Arguments: `-m waitress --host=0.0.0.0 --port=5000 app:app`

安装完成后：

```powershell
nssm start VideoDownloader
```

## 6. 绑定域名（可选）

如果你想通过域名访问，推荐：

- IIS 反向代理到 `127.0.0.1:5000`
- 或 Nginx for Windows 反向代理到 `127.0.0.1:5000`

这样可以把外部端口统一放到 `80` / `443`，也更方便加 HTTPS。

## 7. 需要注意的点

- 当前下载任务状态保存在进程内存里，服务重启后任务记录会丢失
- 下载文件保存在 `downloads` 目录，项目里有定时清理逻辑，超过 30 分钟的文件会被删除
- 如果目标平台需要登录，上传 `cookies.txt` 到系统即可
- 建议不要直接用 Flask debug 模式对外提供服务
