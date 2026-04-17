const $ = (sel) => document.querySelector(sel);

const urlInput = $("#url-input");
const fetchBtn = $("#fetch-btn");
const videoInfo = $("#video-info");
const thumbnail = $("#thumbnail");
const videoTitle = $("#video-title");
const videoUploader = $("#video-uploader");
const videoDuration = $("#video-duration");
const formatSelect = $("#format-select");
const downloadBtn = $("#download-btn");
const downloadSection = $("#download-section");
const progressBar = $("#progress-bar");
const progressPercent = $("#progress-percent");
const progressSpeed = $("#progress-speed");
const progressEta = $("#progress-eta");
const statusBadge = $("#status-badge");
const errorMsg = $("#error-msg");
const completeActions = $("#complete-actions");
const downloadFileBtn = $("#download-file-btn");
const ffmpegDot = $("#ffmpeg-dot");
const ffmpegStatusText = $("#ffmpeg-status-text");
const cookieDot = $("#cookie-dot");
const cookieStatusText = $("#cookie-status-text");
const cookieFileInput = $("#cookie-file-input");
const cookieDropZone = $("#cookie-drop-zone");
const deleteCookieBtn = $("#delete-cookie-btn");
const cookieMsg = $("#cookie-msg");

let currentTaskId = null;
let pollTimer = null;

function formatDuration(seconds) {
    if (!seconds) return "--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFilesize(bytes) {
    if (!bytes) return "";
    if (bytes > 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function setLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> 加载中...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
}

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = "block";
}

function hideError() {
    errorMsg.textContent = "";
    errorMsg.style.display = "none";
}

function showCookieMsg(message, isError) {
    cookieMsg.textContent = message;
    cookieMsg.className = isError ? "cookie-msg error" : "cookie-msg success";
    cookieMsg.style.display = "block";
    setTimeout(() => { cookieMsg.style.display = "none"; }, 5000);
}

function updateCookieUI(cookie) {
    if (cookie.loaded) {
        cookieDot.className = "status-dot ok";
        cookieStatusText.textContent = `Cookie: 已加载 (${cookie.count} 条)`;
        deleteCookieBtn.style.display = "inline-flex";
        cookieDropZone.classList.add("has-cookie");
    } else {
        cookieDot.className = "status-dot";
        cookieStatusText.textContent = "Cookie: 未加载（仅可下载公开视频）";
        deleteCookieBtn.style.display = "none";
        cookieDropZone.classList.remove("has-cookie");
    }
}

function resetUI() {
    videoInfo.classList.remove("active");
    downloadSection.classList.remove("active");
    completeActions.classList.remove("active");
    hideError();
    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";
    progressSpeed.textContent = "";
    progressEta.textContent = "";
    if (pollTimer) clearInterval(pollTimer);
    currentTaskId = null;
}

async function checkSystemStatus() {
    try {
        const resp = await fetch("/api/status");
        const data = await resp.json();
        if (data.ffmpeg) {
            ffmpegDot.classList.add("ok");
            ffmpegStatusText.textContent = "FFmpeg: 已就绪";
        } else {
            ffmpegDot.classList.add("err");
            ffmpegStatusText.textContent = "FFmpeg: 未检测到（合并功能不可用）";
        }
        updateCookieUI(data.cookie);
    } catch {
        ffmpegDot.classList.add("err");
        ffmpegStatusText.textContent = "FFmpeg: 检测失败";
    }
}

async function uploadCookie(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const resp = await fetch("/api/upload_cookie", { method: "POST", body: formData });
        const data = await resp.json();
        if (!resp.ok) {
            showCookieMsg(data.error || "上传失败", true);
            return;
        }
        showCookieMsg(data.message, false);
        updateCookieUI(data.cookie);
    } catch (e) {
        showCookieMsg("上传出错: " + e.message, true);
    }
}

async function deleteCookie() {
    try {
        const resp = await fetch("/api/delete_cookie", { method: "POST" });
        const data = await resp.json();
        showCookieMsg(data.message, false);
        updateCookieUI(data.cookie);
    } catch (e) {
        showCookieMsg("清除出错: " + e.message, true);
    }
}

async function fetchFormats() {
    const url = urlInput.value.trim();
    if (!url) {
        showError("请输入视频链接");
        urlInput.focus();
        return;
    }

    resetUI();
    setLoading(fetchBtn, true);

    try {
        const resp = await fetch("/api/formats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        const data = await resp.json();

        if (!resp.ok) {
            showError(data.error || "解析失败");
            return;
        }

        thumbnail.src = data.thumbnail ? `/api/proxy_image?url=${encodeURIComponent(data.thumbnail)}` : "";
        thumbnail.style.display = data.thumbnail ? "block" : "none";
        videoTitle.textContent = data.title || "未知标题";
        videoUploader.textContent = data.uploader ? `UP主: ${data.uploader}` : "";
        videoDuration.textContent = data.duration ? `时长: ${formatDuration(data.duration)}` : "";

        formatSelect.innerHTML = "";
        data.formats.forEach((f) => {
            const opt = document.createElement("option");
            opt.value = f.format_id;
            let label = f.label;
            if (f.ext) label += ` (${f.ext})`;
            if (f.has_audio) label += " [A+V]";
            else label += " [V only]";
            if (f.filesize) label += ` ~${formatFilesize(f.filesize)}`;
            opt.textContent = label;
            formatSelect.appendChild(opt);
        });

        videoInfo.classList.add("active");
        setTimeout(() => {
            videoInfo.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
    } catch (e) {
        showError(e.message);
    } finally {
        setLoading(fetchBtn, false);
    }
}

async function startDownload() {
    const url = urlInput.value.trim();
    const formatId = formatSelect.value;

    downloadSection.classList.add("active");
    completeActions.classList.remove("active");
    hideError();
    setLoading(downloadBtn, true);
    statusBadge.className = "status-badge pending";
    statusBadge.textContent = "等待中";

    try {
        const resp = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, format_id: formatId }),
        });
        const data = await resp.json();

        if (!resp.ok) {
            showError(data.error || "下载启动失败");
            setLoading(downloadBtn, false);
            return;
        }

        currentTaskId = data.task_id;
        pollProgress();
    } catch (e) {
        showError(e.message);
        setLoading(downloadBtn, false);
    }
}

function pollProgress() {
    if (pollTimer) clearInterval(pollTimer);

    pollTimer = setInterval(async () => {
        if (!currentTaskId) return;

        try {
            const resp = await fetch(`/api/task/${currentTaskId}`);
            const task = await resp.json();

            if (task.status === "downloading") {
                statusBadge.className = "status-badge downloading";
                statusBadge.textContent = "下载中";
                progressBar.style.width = `${task.progress}%`;
                progressPercent.textContent = `${task.progress}%`;
                progressSpeed.textContent = task.speed || "";
                progressEta.textContent = task.eta ? `剩余: ${task.eta}` : "";
            } else if (task.status === "completed") {
                statusBadge.className = "status-badge completed";
                statusBadge.textContent = "已完成";
                progressBar.style.width = "100%";
                progressPercent.textContent = "100%";
                progressSpeed.textContent = "";
                progressEta.textContent = "";
                completeActions.classList.add("active");
                downloadFileBtn.href = `/api/download_file/${currentTaskId}`;
                clearInterval(pollTimer);
                setLoading(downloadBtn, false);
                setTimeout(() => {
                    completeActions.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 100);
            } else if (task.status === "error") {
                statusBadge.className = "status-badge error";
                statusBadge.textContent = "出错";
                showError(task.error || "下载失败");
                clearInterval(pollTimer);
                setLoading(downloadBtn, false);
            }
        } catch (e) {
            console.error("Poll error:", e);
        }
    }, 1000);
}

cookieDropZone.addEventListener("click", () => cookieFileInput.click());

cookieFileInput.addEventListener("change", () => {
    if (cookieFileInput.files.length > 0) {
        uploadCookie(cookieFileInput.files[0]);
        cookieFileInput.value = "";
    }
});

cookieDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    cookieDropZone.classList.add("drag-over");
});

cookieDropZone.addEventListener("dragleave", () => {
    cookieDropZone.classList.remove("drag-over");
});

cookieDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    cookieDropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length > 0) {
        uploadCookie(e.dataTransfer.files[0]);
    }
});

deleteCookieBtn.addEventListener("click", deleteCookie);

document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const tab = document.getElementById("tab-" + btn.dataset.tab);
        if (tab) tab.classList.add("active");
    });
});

document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const text = btn.dataset.copy;
        navigator.clipboard.writeText(text).then(() => {
            const original = btn.textContent;
            btn.textContent = "已复制";
            btn.classList.add("copied");
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove("copied");
            }, 2000);
        });
    });
});

fetchBtn.addEventListener("click", fetchFormats);
downloadBtn.addEventListener("click", startDownload);

urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchFormats();
});

checkSystemStatus();
