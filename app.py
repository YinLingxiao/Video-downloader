from __future__ import annotations

import os
import re
import secrets
import shutil
import sys
import threading
import time
import uuid
from urllib.parse import parse_qs, urlparse

import requests
import yt_dlp
from flask import (
    Flask,
    Response,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.utils import secure_filename

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
FFMPEG_DIR = os.path.join(BASE_DIR, "bin")
COOKIE_DIR = os.path.join(BASE_DIR, "cookies")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(COOKIE_DIR, exist_ok=True)


def load_env_file() -> None:
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.isfile(env_path):
        return
    try:
        with open(env_path, encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass


load_env_file()

download_tasks: dict = {}
tasks_lock = threading.Lock()

def get_session_id() -> str:
    sid = session.get("sid")
    if not sid:
        sid = secrets.token_hex(16)
        session["sid"] = sid
    return sid


def session_cookie_path() -> str:
    # Cookie 按会话隔离，避免多个访问者共享同一份登录凭证或互相覆盖。
    return os.path.join(COOKIE_DIR, f"{get_session_id()}.txt")


def resolve_access_code():
    """解析访问码配置。VIDEO_ACCESS_CODE 是规范名称；临时兼容旧的 VIDEO_AUTH_PASSWORD。"""
    code = os.environ.get("VIDEO_ACCESS_CODE", "").strip()
    if code:
        return code
    legacy = os.environ.get("VIDEO_AUTH_PASSWORD", "").strip()
    if legacy:
        # 旧的 VIDEO_AUTH_PASSWORD 与当前单字段访问码模型语义一致，仅作迁移告警。
        print(
            "WARNING: VIDEO_AUTH_PASSWORD 已废弃，请迁移到 VIDEO_ACCESS_CODE。",
            file=sys.stderr,
        )
        return legacy
    return ""


ACCESS_CODE = resolve_access_code()
if not ACCESS_CODE:
    raise RuntimeError(
        "必须设置 VIDEO_ACCESS_CODE 环境变量（或临时使用 VIDEO_AUTH_PASSWORD）才能启动服务。"
    )

# 生产环境必须配置稳定的 VIDEO_SECRET_KEY；开发环境未设置时随机生成，但重启会清除会话。
app.secret_key = os.environ.get("VIDEO_SECRET_KEY", "").strip() or secrets.token_hex(32)
# HTTPS 部署时应置 VIDEO_COOKIE_SECURE=1，避免会话 Cookie 走明文。
_cookie_secure = os.environ.get("VIDEO_COOKIE_SECURE", "").lower() in {"1", "true", "yes", "on"}
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=_cookie_secure,
    # 限制上传体积，Cookie 文件不应过大。
    MAX_CONTENT_LENGTH=1 * 1024 * 1024,
)

TASK_MAX_AGE = 1800
FILE_MAX_AGE = 1800
# 超过此时间未收到进度更新的 downloading/pending 任务视为卡死，可被清理。
TASK_STALL_TIMEOUT = 1800
# 会话 Cookie 文件保留时长，超时清理，避免文件无限堆积。
COOKIE_MAX_AGE = 86400

ACCESS_EXEMPT_ENDPOINTS = {"access", "static"}

# 仅允许下载受支持站点，防止任意 URL 触发 yt-dlp 的 SSRF / 内网探测。
ALLOWED_HOST_SUFFIXES = (
    "bilibili.com",
    "b23.tv",
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
)
# format_id 只允许安全字符，阻断 "+"、"/"、"[...]" 等 yt-dlp format 选择表达式注入。
FORMAT_ID_RE = re.compile(r"^[A-Za-z0-9_.-]+$")
BVID_RE = re.compile(r"(BV[0-9A-Za-z]{10})", re.IGNORECASE)
INVALID_FILENAME_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    *{f"COM{i}" for i in range(1, 10)},
    *{f"LPT{i}" for i in range(1, 10)},
}
MAX_BATCH_PARTS = 20

# 并发下载上限，防止无限起线程打满带宽/磁盘/CPU。
MAX_CONCURRENT_DOWNLOADS = int(os.environ.get("MAX_CONCURRENT_DOWNLOADS", "3"))
download_semaphore = threading.BoundedSemaphore(MAX_CONCURRENT_DOWNLOADS)


def is_allowed_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    if not host:
        return False
    return any(
        host == suffix or host.endswith("." + suffix)
        for suffix in ALLOWED_HOST_SUFFIXES
    )


def is_valid_format_id(fid: str) -> bool:
    return fid == "" or bool(FORMAT_ID_RE.match(fid))


def extract_bvid(url: str, info: dict | None = None) -> str:
    info = info or {}
    sources = [
        url,
        info.get("webpage_url", ""),
        info.get("original_url", ""),
        info.get("id", ""),
    ]
    for source in sources:
        value = str(source)
        match = BVID_RE.search(value)
        if match:
            return match.group(1)
        candidate = f"BV{value}"
        if BVID_RE.fullmatch(candidate):
            return candidate
    return ""


def safe_download_stem(title: str, page: int | None = None) -> str:
    stem = INVALID_FILENAME_RE.sub("_", title).strip(" .")
    stem = re.sub(r"\s+", " ", stem)[:140].rstrip(" .")
    if not stem:
        stem = "video"
    if stem.upper() in WINDOWS_RESERVED_NAMES:
        stem = f"_{stem}"
    if page is not None:
        return f"P{page:03d} - {stem}"
    return stem


def get_bilibili_parts(url: str, info: dict) -> tuple[list[dict], int]:
    sources = [
        url,
        info.get("webpage_url", ""),
        info.get("original_url", ""),
    ]
    bvid = extract_bvid(url, info)
    if not bvid:
        return [], 1

    selected_page = 1
    for source in sources[:3]:
        try:
            raw_page = parse_qs(urlparse(str(source)).query).get("p", ["1"])[0]
            selected_page = max(1, int(raw_page))
            if selected_page > 1:
                break
        except (TypeError, ValueError):
            continue

    try:
        response = requests.get(
            "https://api.bilibili.com/x/player/pagelist",
            params={"bvid": bvid},
            headers=get_bilibili_headers(url).get("http_headers", {}),
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        pages = payload.get("data") if payload.get("code") == 0 else []
    except (requests.RequestException, ValueError):
        return [], selected_page

    parts = []
    for item in pages or []:
        page = item.get("page")
        if not isinstance(page, int):
            continue
        parts.append({
            "page": page,
            "title": item.get("part") or f"P{page}",
            "duration": item.get("duration"),
            "url": f"https://www.bilibili.com/video/{bvid}/?p={page}",
        })

    if parts:
        selected_page = min(max(selected_page, 1), len(parts))
    return parts, selected_page


def resolve_download_parts(
    url: str,
    bvid: str,
    requested_pages: list,
) -> list[dict]:
    if not requested_pages:
        return [{"page": None, "title": "", "url": url}]
    if len(requested_pages) > MAX_BATCH_PARTS:
        raise ValueError(f"单次最多下载 {MAX_BATCH_PARTS} 个分P")

    normalized_pages = []
    for value in requested_pages:
        if isinstance(value, bool):
            raise ValueError("分P参数非法")
        try:
            page = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("分P参数非法") from exc
        if page < 1 or page in normalized_pages:
            raise ValueError("分P参数非法")
        normalized_pages.append(page)

    trusted_bvid = extract_bvid(url)
    if not trusted_bvid and BVID_RE.fullmatch(bvid or ""):
        trusted_bvid = bvid
    if not trusted_bvid:
        raise ValueError("无法识别视频的 BV 号")

    canonical_url = f"https://www.bilibili.com/video/{trusted_bvid}/"
    all_parts, _ = get_bilibili_parts(canonical_url, {"id": trusted_bvid})
    part_map = {part["page"]: part for part in all_parts}
    if not all(page in part_map for page in normalized_pages):
        raise ValueError("所选分P不存在")
    return [part_map[page] for page in normalized_pages]


def is_authorized() -> bool:
    return session.get("access_granted") is True


@app.before_request
def require_access_code():
    if request.endpoint in ACCESS_EXEMPT_ENDPOINTS:
        return None
    if is_authorized():
        return None
    if request.path.startswith("/api/"):
        return jsonify({"error": "未通过访问码校验，请刷新页面重新输入"}), 401
    return redirect(url_for("access", next=request.path))


def cleanup_old_downloads():
    """清理过期的下载文件与会话 Cookie 文件。"""
    now = time.time()
    try:
        for name in os.listdir(DOWNLOAD_DIR):
            path = os.path.join(DOWNLOAD_DIR, name)
            if os.path.isfile(path) and now - os.path.getmtime(path) > FILE_MAX_AGE:
                os.remove(path)
    except OSError:
        pass
    try:
        for name in os.listdir(COOKIE_DIR):
            path = os.path.join(COOKIE_DIR, name)
            if os.path.isfile(path) and now - os.path.getmtime(path) > COOKIE_MAX_AGE:
                os.remove(path)
    except OSError:
        pass


def cleanup_old_tasks():
    """清理内存中过期的任务记录，防止内存泄漏。"""
    now = time.time()
    with tasks_lock:
        expired = []
        for tid, task in download_tasks.items():
            status = task.get("status")
            finished_at = task.get("finished_at")
            updated_at = task.get("updated_at") or task.get("created_at") or now
            # 已完成的记录保留到完成时间 + TASK_MAX_AGE。
            if status in ("completed", "error") and finished_at:
                if now - finished_at > TASK_MAX_AGE:
                    expired.append(tid)
            # 卡死的 pending/downloading 任务按最后更新时间清理。
            elif status in ("pending", "downloading"):
                if now - updated_at > TASK_STALL_TIMEOUT:
                    expired.append(tid)
        for tid in expired:
            download_tasks.pop(tid, None)


def start_cleanup_timer():
    cleanup_old_downloads()
    cleanup_old_tasks()
    timer = threading.Timer(600, start_cleanup_timer)
    timer.daemon = True
    timer.start()


start_cleanup_timer()


def find_ffmpeg() -> str | None:
    local_ffmpeg = os.path.join(FFMPEG_DIR, "ffmpeg.exe")
    if os.path.isfile(local_ffmpeg):
        return FFMPEG_DIR
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return os.path.dirname(system_ffmpeg)
    return None


def get_ffmpeg_opts() -> dict:
    path = find_ffmpeg()
    if path:
        return {"ffmpeg_location": path}
    return {}


def get_cookie_opts(cookie_path: str | None) -> dict:
    if cookie_path and os.path.isfile(cookie_path):
        return {"cookiefile": cookie_path}
    return {}


def get_cookie_status(cookie_path: str) -> dict:
    if os.path.isfile(cookie_path):
        size = os.path.getsize(cookie_path)
        count = 0
        try:
            with open(cookie_path, encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        count += 1
        except OSError:
            pass
        return {"loaded": True, "count": count, "size": size}
    return {"loaded": False, "count": 0, "size": 0}


def strip_ansi(text: str) -> str:
    """去除 yt-dlp 进度字符串中的 ANSI 终端颜色转义码。"""
    return re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", text) if text else text


def get_bilibili_headers(url: str) -> dict:
    """为 Bilibili 链接添加必要的请求头，避免 412 Precondition Failed。"""
    if "bilibili.com" not in url and "b23.tv" not in url:
        return {}
    return {
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Referer": "https://www.bilibili.com/",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
    }


def fetch_formats(url: str, cookie_path: str | None) -> dict:
    ydl_opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "socket_timeout": 15,
        "extractor_retries": 1,
        "noplaylist": True,
        **get_ffmpeg_opts(),
        **get_cookie_opts(cookie_path),
        **get_bilibili_headers(url),
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    formats = info.get("formats", [])
    video_result = []
    audio_result = []
    video_seen: set = set()
    audio_seen: set = set()

    for item in formats:
        vcodec = item.get("vcodec", "none")
        acodec = item.get("acodec", "none")
        ext = item.get("ext", "")
        filesize = item.get("filesize") or item.get("filesize_approx")
        format_id = item.get("format_id", "")

        has_video = vcodec not in ("none", None)
        has_audio = acodec not in ("none", None)

        if has_video:
            height = item.get("height")
            fps = item.get("fps")
            if not height:
                continue
            label = f"{height}p"
            if fps and fps > 30:
                label += f"{fps}"
            key = (height, fps, has_audio, ext)
            if key in video_seen:
                continue
            video_seen.add(key)
            video_result.append({
                "format_id": format_id,
                "label": label,
                "height": height,
                "fps": fps,
                "ext": ext,
                "has_audio": has_audio,
                "filesize": filesize,
                "vcodec": vcodec,
                "acodec": acodec if has_audio else None,
            })

        elif has_audio and not has_video:
            abr = item.get("abr") or item.get("tbr") or 0
            asr = item.get("asr") or 0
            label = f"{int(abr)}kbps" if abr else ext
            if asr:
                label += f" / {asr}Hz"
            key = (int(abr), asr, ext)
            if key in audio_seen:
                continue
            audio_seen.add(key)
            audio_result.append({
                "format_id": format_id,
                "label": label,
                "abr": abr,
                "asr": asr,
                "ext": ext,
                "filesize": filesize,
                "acodec": acodec,
            })

    video_result.sort(key=lambda x: (x["height"], x.get("fps") or 0), reverse=True)
    audio_result.sort(key=lambda x: x.get("abr") or 0, reverse=True)
    parts, selected_part = get_bilibili_parts(url, info)

    return {
        "title": info.get("title", ""),
        "thumbnail": info.get("thumbnail", ""),
        "duration": info.get("duration"),
        "uploader": info.get("uploader", ""),
        "formats": video_result,
        "audio_formats": audio_result,
        "parts": parts,
        "selected_part": selected_part,
        "bvid": extract_bvid(url, info),
        "max_batch_parts": MAX_BATCH_PARTS,
    }


def update_task(task_id: str, **values) -> None:
    with tasks_lock:
        task = download_tasks.get(task_id)
        if task:
            task.update(values)


def download_part(
    task_id: str,
    part: dict,
    part_index: int,
    total_parts: int,
    format_id: str,
    audio_only: bool,
    cookie_path: str | None,
) -> dict:
    url = part["url"]
    prefix = f"{task_id}_{part_index + 1:03d}"
    outtmpl = os.path.join(DOWNLOAD_DIR, f"{prefix}.%(ext)s")

    def progress_hook(data):
        if data["status"] == "downloading":
            total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
            downloaded = data.get("downloaded_bytes", 0)
            part_progress = downloaded / total * 100 if total else 0
            overall = (part_index + part_progress / 100) / total_parts * 100
            update_task(
                task_id,
                progress=round(overall, 1),
                part_progress=round(part_progress, 1),
                speed=strip_ansi(data.get("_speed_str", "")),
                eta=strip_ansi(data.get("_eta_str", "")),
                updated_at=time.time(),
            )

    common_opts = {
        "quiet": True,
        "no_warnings": True,
        "outtmpl": outtmpl,
        "progress_hooks": [progress_hook],
        "socket_timeout": 15,
        "extractor_retries": 1,
        "noplaylist": True,
        **get_ffmpeg_opts(),
        **get_cookie_opts(cookie_path),
        **get_bilibili_headers(url),
    }
    if audio_only:
        ydl_opts = {
            **common_opts,
            "format": format_id if format_id else "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "0",
            }],
        }
    else:
        ydl_opts = {
            **common_opts,
            "format": f"{format_id}+bestaudio/best" if format_id else "bestvideo+bestaudio/best",
            "merge_output_format": "mp4",
        }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        prepared = ydl.prepare_filename(info)

    expected = os.path.splitext(prepared)[0] + (".mp3" if audio_only else ".mp4")
    if os.path.isfile(expected):
        filename = expected
    elif os.path.isfile(prepared):
        filename = prepared
    else:
        candidates = [
            os.path.join(DOWNLOAD_DIR, name)
            for name in os.listdir(DOWNLOAD_DIR)
            if name.startswith(prefix + ".")
            and not name.endswith((".part", ".ytdl", ".temp"))
        ]
        if not candidates:
            raise FileNotFoundError("下载完成但未找到输出文件")
        filename = max(candidates, key=os.path.getmtime)

    title = part.get("title") or info.get("title") or "video"
    display_stem = safe_download_stem(title, part.get("page"))
    extension = os.path.splitext(filename)[1]
    return {
        "stored_filename": os.path.basename(filename),
        "name": f"{display_stem}{extension}",
        "page": part.get("page"),
        "title": title,
    }


def run_batch_download(
    task_id: str,
    parts: list[dict],
    format_id: str,
    audio_only: bool = False,
    cookie_path: str | None = None,
):
    total_parts = len(parts)
    files = []
    failures = []
    now = time.time()
    update_task(
        task_id,
        status="downloading",
        started_at=now,
        updated_at=now,
        total_count=total_parts,
    )

    try:
        for part_index, part in enumerate(parts):
            update_task(
                task_id,
                current_index=part_index + 1,
                current_page=part.get("page"),
                current_title=part.get("title") or "",
                part_progress=0,
                speed="",
                eta="",
                updated_at=time.time(),
            )
            try:
                result = download_part(
                    task_id,
                    part,
                    part_index,
                    total_parts,
                    format_id,
                    audio_only,
                    cookie_path,
                )
                files.append(result)
            except Exception as exc:
                print(
                    f"[download {task_id} part {part.get('page') or part_index + 1}] {exc}",
                    file=sys.stderr,
                )
                failures.append({
                    "page": part.get("page"),
                    "title": part.get("title") or f"第 {part_index + 1} 项",
                })

            update_task(
                task_id,
                progress=round((part_index + 1) / total_parts * 100, 1),
                part_progress=100,
                completed_count=len(files),
                failed_count=len(failures),
                files=list(files),
                failures=list(failures),
                updated_at=time.time(),
            )

        finished_at = time.time()
        if files:
            update_task(
                task_id,
                status="completed",
                progress=100,
                speed="",
                eta="",
                current_title="",
                error=f"{len(failures)} 个分P下载失败" if failures else None,
                finished_at=finished_at,
                updated_at=finished_at,
            )
        else:
            update_task(
                task_id,
                status="error",
                speed="",
                eta="",
                error="所选视频均下载失败，请检查格式、Cookie 或稍后重试。",
                finished_at=finished_at,
                updated_at=finished_at,
            )
    finally:
        download_semaphore.release()


@app.route("/access", methods=["GET", "POST"])
def access():
    error = ""
    if request.method == "POST":
        submitted = (request.form.get("code") or "").strip()
        if secrets.compare_digest(submitted, ACCESS_CODE):
            session["access_granted"] = True
            session.permanent = False
            target = request.form.get("next") or url_for("index")
            if not target.startswith("/") or target.startswith("//"):
                target = url_for("index")
            return redirect(target)
        error = "访问码错误，请确认后重新输入。"

    if is_authorized() and request.method == "GET":
        return redirect(url_for("index"))

    next_url = request.args.get("next", "")
    return render_template("access.html", error=error, next_url=next_url), (
        401 if error else 200
    )


@app.route("/logout", methods=["POST", "GET"])
def logout():
    session.pop("access_granted", None)
    return redirect(url_for("access"))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    ffmpeg_path = find_ffmpeg()
    cookie = get_cookie_status(session_cookie_path())
    return jsonify({
        "ffmpeg": ffmpeg_path is not None,
        "ffmpeg_path": ffmpeg_path or "",
        "cookie": cookie,
    })


@app.route("/api/upload_cookie", methods=["POST"])
def api_upload_cookie():
    if "file" not in request.files:
        return jsonify({"error": "未选择文件"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "未选择文件"}), 400

    name = secure_filename(file.filename)
    if not name.endswith(".txt"):
        return jsonify({"error": "仅支持 .txt 格式的 Cookie 文件"}), 400

    cookie_path = session_cookie_path()
    file.save(cookie_path)
    status = get_cookie_status(cookie_path)
    if status["count"] == 0:
        os.remove(cookie_path)
        return jsonify({"error": "文件内容无效，未检测到有效的 Cookie 条目"}), 400

    return jsonify({"message": f"上传成功，共读取 {status['count']} 条 Cookie", "cookie": status})


@app.route("/api/delete_cookie", methods=["POST"])
def api_delete_cookie():
    cookie_path = session_cookie_path()
    if os.path.isfile(cookie_path):
        os.remove(cookie_path)
    return jsonify({"message": "Cookie 已清除", "cookie": get_cookie_status(cookie_path)})


@app.route("/api/formats", methods=["POST"])
def api_formats():
    data = request.get_json() or {}
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "URL 不能为空"}), 400
    if not is_allowed_url(url):
        return jsonify({"error": "仅支持 Bilibili 或 YouTube 的 http(s) 链接"}), 400

    try:
        return jsonify(fetch_formats(url, session_cookie_path()))
    except Exception as exc:
        print(f"[formats] {exc}", file=sys.stderr)
        return jsonify({"error": "解析失败，请检查链接是否有效或稍后重试。"}), 500


@app.route("/api/download", methods=["POST"])
def api_download():
    data = request.get_json() or {}
    url = data.get("url", "").strip()
    format_id = (data.get("format_id") or "").strip()
    audio_only = bool(data.get("audio_only", False))
    bvid = (data.get("bvid") or "").strip()
    requested_pages = data.get("pages", [])

    if not url:
        return jsonify({"error": "URL 不能为空"}), 400
    if not is_allowed_url(url):
        return jsonify({"error": "仅支持 Bilibili 或 YouTube 的 http(s) 链接"}), 400
    if not is_valid_format_id(format_id):
        return jsonify({"error": "格式参数非法"}), 400
    if not isinstance(requested_pages, list):
        return jsonify({"error": "分P参数非法"}), 400
    try:
        parts = resolve_download_parts(url, bvid, requested_pages)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not download_semaphore.acquire(blocking=False):
        return jsonify({"error": "当前下载任务过多，请稍后再试"}), 429

    owner = get_session_id()
    cookie_path = session_cookie_path()
    task_id = str(uuid.uuid4())
    with tasks_lock:
        download_tasks[task_id] = {
            "owner": owner,
            "status": "pending",
            "progress": 0,
            "speed": "",
            "eta": "",
            "part_progress": 0,
            "files": [],
            "failures": [],
            "completed_count": 0,
            "failed_count": 0,
            "total_count": len(parts),
            "current_index": 0,
            "current_page": None,
            "current_title": "",
            "error": None,
            "created_at": time.time(),
            "started_at": None,
            "updated_at": time.time(),
            "finished_at": None,
        }

    thread = threading.Thread(
        target=run_batch_download,
        args=(task_id, parts, format_id, audio_only, cookie_path),
        daemon=True,
    )
    try:
        thread.start()
    except RuntimeError:
        download_semaphore.release()
        with tasks_lock:
            download_tasks.pop(task_id, None)
        return jsonify({"error": "无法启动下载任务，请稍后再试"}), 500

    return jsonify({"task_id": task_id})


def _owned_task(task_id: str):
    with tasks_lock:
        task = download_tasks.get(task_id)
        if not task or task.get("owner") != get_session_id():
            return None
        return dict(task)


@app.route("/api/task/<task_id>")
def api_task_status(task_id):
    task = _owned_task(task_id)
    if not task:
        return jsonify({"error": "任务不存在"}), 404
    payload = {k: v for k, v in task.items() if k != "owner"}
    payload["files"] = [
        {
            "index": index,
            "name": item["name"],
            "page": item.get("page"),
            "title": item.get("title", ""),
        }
        for index, item in enumerate(task.get("files", []))
    ]
    return jsonify(payload)


@app.route("/api/download_file/<task_id>")
def api_download_file(task_id):
    return api_download_file_at(task_id, 0)


@app.route("/api/download_file/<task_id>/<int:file_index>")
def api_download_file_at(task_id, file_index):
    task = _owned_task(task_id)
    files = task.get("files", []) if task else []
    if (
        not task
        or task["status"] != "completed"
        or file_index < 0
        or file_index >= len(files)
    ):
        return jsonify({"error": "文件不可用"}), 404
    item = files[file_index]
    return send_from_directory(
        DOWNLOAD_DIR,
        item["stored_filename"],
        as_attachment=True,
        download_name=item["name"],
    )


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "").lower() in {"1", "true", "yes", "on"}
    app.run(debug=debug, host=host, port=port)
