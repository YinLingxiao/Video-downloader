from __future__ import annotations

import os
import shutil
import threading
import uuid

import requests
import yt_dlp
from flask import Flask, Response, jsonify, render_template, request, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
FFMPEG_DIR = os.path.join(BASE_DIR, "bin")
COOKIE_DIR = os.path.join(BASE_DIR, "cookies")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(COOKIE_DIR, exist_ok=True)

download_tasks: dict = {}

COOKIE_FILE_PATH = os.path.join(COOKIE_DIR, "cookies.txt")


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


def get_cookie_opts() -> dict:
    if os.path.isfile(COOKIE_FILE_PATH):
        return {"cookiefile": COOKIE_FILE_PATH}
    return {}


def get_cookie_status() -> dict:
    if os.path.isfile(COOKIE_FILE_PATH):
        size = os.path.getsize(COOKIE_FILE_PATH)
        count = 0
        try:
            with open(COOKIE_FILE_PATH, encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        count += 1
        except OSError:
            pass
        return {"loaded": True, "count": count, "size": size}
    return {"loaded": False, "count": 0, "size": 0}


def fetch_formats(url: str) -> dict:
    ydl_opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        **get_ffmpeg_opts(),
        **get_cookie_opts(),
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    formats = info.get("formats", [])
    result = []
    seen: set = set()

    for item in formats:
        vcodec = item.get("vcodec", "none")
        if vcodec in ("none", None):
            continue

        height = item.get("height")
        fps = item.get("fps")
        if not height:
            continue

        acodec = item.get("acodec", "none")
        label = f"{height}p"
        if fps and fps > 30:
            label += f"{fps}"

        has_audio = acodec not in ("none", None)
        ext = item.get("ext", "mp4")
        filesize = item.get("filesize") or item.get("filesize_approx")
        format_id = item.get("format_id", "")

        key = (height, fps, has_audio, ext)
        if key in seen:
            continue
        seen.add(key)

        result.append(
            {
                "format_id": format_id,
                "label": label,
                "height": height,
                "fps": fps,
                "ext": ext,
                "has_audio": has_audio,
                "filesize": filesize,
                "vcodec": vcodec,
                "acodec": acodec if has_audio else None,
            }
        )

    result.sort(key=lambda x: (x["height"], x.get("fps") or 0), reverse=True)

    return {
        "title": info.get("title", ""),
        "thumbnail": info.get("thumbnail", ""),
        "duration": info.get("duration"),
        "uploader": info.get("uploader", ""),
        "formats": result,
    }


def run_download(task_id: str, url: str, format_id: str):
    task = download_tasks[task_id]
    task["status"] = "downloading"

    def progress_hook(data):
        if data["status"] == "downloading":
            total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
            downloaded = data.get("downloaded_bytes", 0)
            task["progress"] = round(downloaded / total * 100, 1) if total else 0
            task["speed"] = data.get("_speed_str", "")
            task["eta"] = data.get("_eta_str", "")
        elif data["status"] == "finished":
            task["progress"] = 100

    fmt = f"{format_id}+bestaudio/best" if format_id else "bestvideo+bestaudio/best"

    ydl_opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "format": fmt,
        "outtmpl": os.path.join(DOWNLOAD_DIR, f"{task_id}_%(title)s.%(ext)s"),
        "merge_output_format": "mp4",
        "progress_hooks": [progress_hook],
        **get_ffmpeg_opts(),
        **get_cookie_opts(),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            merged = os.path.splitext(filename)[0] + ".mp4"
            if os.path.exists(merged):
                filename = merged
            task["status"] = "completed"
            task["filename"] = os.path.basename(filename)
    except Exception as exc:
        task["status"] = "error"
        task["error"] = str(exc)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    ffmpeg_path = find_ffmpeg()
    cookie = get_cookie_status()
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

    file.save(COOKIE_FILE_PATH)
    status = get_cookie_status()
    if status["count"] == 0:
        os.remove(COOKIE_FILE_PATH)
        return jsonify({"error": "文件内容无效，未检测到有效的 Cookie 条目"}), 400

    return jsonify({"message": f"上传成功，共读取 {status['count']} 条 Cookie", "cookie": status})


@app.route("/api/delete_cookie", methods=["POST"])
def api_delete_cookie():
    if os.path.isfile(COOKIE_FILE_PATH):
        os.remove(COOKIE_FILE_PATH)
    return jsonify({"message": "Cookie 已清除", "cookie": get_cookie_status()})


@app.route("/api/proxy_image")
def api_proxy_image():
    url = request.args.get("url", "")
    if not url:
        return Response(status=400)
    try:
        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": url,
        })
        excluded = {"transfer-encoding", "content-encoding", "connection"}
        headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded}
        return Response(resp.content, status=resp.status_code, headers=headers)
    except Exception:
        return Response(status=502)


@app.route("/api/formats", methods=["POST"])
def api_formats():
    data = request.get_json() or {}
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "URL 不能为空"}), 400

    try:
        return jsonify(fetch_formats(url))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/download", methods=["POST"])
def api_download():
    data = request.get_json() or {}
    url = data.get("url", "").strip()
    format_id = data.get("format_id", "")

    if not url:
        return jsonify({"error": "URL 不能为空"}), 400

    task_id = str(uuid.uuid4())[:8]
    download_tasks[task_id] = {
        "status": "pending",
        "progress": 0,
        "speed": "",
        "eta": "",
        "filename": None,
        "error": None,
    }

    thread = threading.Thread(
        target=run_download,
        args=(task_id, url, format_id),
        daemon=True,
    )
    thread.start()

    return jsonify({"task_id": task_id})


@app.route("/api/task/<task_id>")
def api_task_status(task_id):
    task = download_tasks.get(task_id)
    if not task:
        return jsonify({"error": "任务不存在"}), 404
    return jsonify(task)


@app.route("/api/download_file/<task_id>")
def api_download_file(task_id):
    task = download_tasks.get(task_id)
    if not task or task["status"] != "completed" or not task["filename"]:
        return jsonify({"error": "文件不可用"}), 404
    return send_from_directory(DOWNLOAD_DIR, task["filename"], as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
