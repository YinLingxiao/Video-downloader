const $ = (sel) => document.querySelector(sel);

const urlInput = $("#url-input");
const fetchBtn = $("#fetch-btn");
const videoInfo = $("#video-info");
const thumbnail = $("#thumbnail");
const videoTitle = $("#video-title");
const videoUploader = $("#video-uploader");
const videoDuration = $("#video-duration");
const partSelectArea = $("#part-select-area");
const partList = $("#part-list");
const partCount = $("#part-count");
const partSelectedCount = $("#part-selected-count");
const selectFirstPartsBtn = $("#select-first-parts");
const clearPartsBtn = $("#clear-parts");
const formatSelect = $("#format-select");
const downloadBtn = $("#download-btn");
const downloadSection = $("#download-section");
const progressBar = $("#progress-bar");
const progressPercent = $("#progress-percent");
const progressSpeed = $("#progress-speed");
const progressEta = $("#progress-eta");
const statusBadge = $("#status-badge");
const batchCurrent = $("#batch-current");
const errorMsg = $("#error-msg");
const completeActions = $("#complete-actions");
const downloadAllBtn = $("#download-all-btn");
const completeFiles = $("#complete-files");
const failedParts = $("#failed-parts");
const ffmpegDot = $("#ffmpeg-dot");
const ffmpegStatusText = $("#ffmpeg-status-text");
const cookieDot = $("#cookie-dot");
const cookieStatusText = $("#cookie-status-text");
const cookieFileInput = $("#cookie-file-input");
const cookieDropZone = $("#cookie-drop-zone");
const deleteCookieBtn = $("#delete-cookie-btn");
const cookieMsg = $("#cookie-msg");
const modeVideoBtn = $("#mode-video");
const modeAudioBtn = $("#mode-audio");

let currentTaskId = null;
let pollTimer = null;
let pollController = null;
let audioOnly = false;
let cachedVideoFormats = [];
let cachedAudioFormats = [];
let cachedParts = [];
let selectedPages = new Set();
let currentBvid = "";
let maxBatchParts = 20;

function formatDuration(seconds) {
    if (!seconds) return "--";
    seconds = Math.round(seconds);
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

function renderFormats() {
    formatSelect.innerHTML = "";
    if (audioOnly) {
        if (cachedAudioFormats.length === 0) {
            const opt = document.createElement("option");
            opt.textContent = "无可用音频格式";
            opt.disabled = true;
            formatSelect.appendChild(opt);
            return;
        }
        cachedAudioFormats.forEach((f) => {
            const opt = document.createElement("option");
            opt.value = f.format_id;
            let label = f.label;
            if (f.ext) label += ` (${f.ext})`;
            if (f.filesize) label += ` ~${formatFilesize(f.filesize)}`;
            opt.textContent = label;
            formatSelect.appendChild(opt);
        });
    } else {
        cachedVideoFormats.forEach((f) => {
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
    }
}

function updatePartSelectionUI() {
    const inputs = partList.querySelectorAll("input[type='checkbox']");
    selectedPages = new Set(
        [...inputs].filter((input) => input.checked).map((input) => Number(input.value)),
    );
    const count = selectedPages.size;
    partSelectedCount.textContent = `已选 ${count} / ${maxBatchParts} P`;
    inputs.forEach((input) => {
        input.disabled = !input.checked && count >= maxBatchParts;
    });
    downloadBtn.disabled = cachedParts.length > 1 && count === 0;
    downloadBtn.textContent = count > 1 ? `下载选中 ${count} P` : "下载";
}

function renderParts(parts, selectedPage) {
    cachedParts = parts;
    selectedPages = new Set();
    partList.innerHTML = "";
    partSelectArea.classList.toggle("active", parts.length > 1);
    partCount.textContent = String(parts.length);
    selectFirstPartsBtn.textContent = `全选前${maxBatchParts}项`;

    if (parts.length > 0) {
        selectedPages.add(selectedPage || parts[0].page);
    }

    parts.forEach((part) => {
        const label = document.createElement("label");
        label.className = "part-option";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = String(part.page);
        input.checked = selectedPages.has(part.page);

        const index = document.createElement("span");
        index.className = "part-option-index";
        index.textContent = `P${part.page}`;

        const title = document.createElement("span");
        title.className = "part-option-title";
        title.textContent = part.title;

        const duration = document.createElement("span");
        duration.className = "part-option-duration";
        duration.textContent = formatDuration(part.duration);

        label.append(input, index, title, duration);
        partList.appendChild(label);
    });

    updatePartSelectionUI();
}

function setMode(isAudio) {
    audioOnly = isAudio;
    if (isAudio) {
        modeAudioBtn.classList.add("active");
        modeVideoBtn.classList.remove("active");
    } else {
        modeVideoBtn.classList.add("active");
        modeAudioBtn.classList.remove("active");
    }
    renderFormats();
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
    batchCurrent.textContent = "";
    completeFiles.innerHTML = "";
    failedParts.innerHTML = "";
    stopPolling();
    currentTaskId = null;
    cachedVideoFormats = [];
    cachedAudioFormats = [];
    cachedParts = [];
    selectedPages = new Set();
    currentBvid = "";
    maxBatchParts = 20;
    partSelectArea.classList.remove("active");
    partList.innerHTML = "";
    downloadBtn.disabled = false;
    downloadBtn.textContent = "下载";
}

function stopPolling() {
    // 中止当前在途请求，并停止后续调度，避免新旧任务/页面状态混用同一响应。
    if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
    if (pollController) {
        pollController.abort();
        pollController = null;
    }
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

        thumbnail.src = data.thumbnail || "";
        // 缩略图改由浏览器直接请求，不再经过服务端代理，以消除 SSRF 风险。
        thumbnail.referrerPolicy = "no-referrer";
        thumbnail.style.display = data.thumbnail ? "block" : "none";
        videoTitle.textContent = data.title || "未知标题";
        videoUploader.textContent = data.uploader ? `UP主: ${data.uploader}` : "";
        videoDuration.textContent = data.duration ? `时长: ${formatDuration(data.duration)}` : "";

        cachedVideoFormats = data.formats || [];
        cachedAudioFormats = data.audio_formats || [];
        currentBvid = data.bvid || "";
        maxBatchParts = data.max_batch_parts || 20;
        renderParts(data.parts || [], data.selected_part);

        setMode(false);

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
    const pages = [...selectedPages].sort((a, b) => a - b);

    if (cachedParts.length > 1 && pages.length === 0) {
        showError("请至少选择一个分P");
        return;
    }
    if (pages.length > maxBatchParts) {
        showError(`单次最多下载 ${maxBatchParts} 个分P`);
        return;
    }

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
            body: JSON.stringify({
                url,
                format_id: formatId,
                audio_only: audioOnly,
                bvid: currentBvid,
                pages,
            }),
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

function renderCompletedFiles(taskId, task) {
    completeFiles.innerHTML = "";
    failedParts.innerHTML = "";

    (task.files || []).forEach((file) => {
        const row = document.createElement("div");
        row.className = "complete-file-row";

        const name = document.createElement("span");
        name.textContent = file.name;

        const link = document.createElement("a");
        link.className = "btn btn-success btn-sm completed-file-link";
        link.href = `/api/download_file/${taskId}/${file.index}`;
        link.download = file.name;
        link.textContent = "重新保存";

        row.append(name, link);
        completeFiles.appendChild(row);
    });

    downloadAllBtn.style.display = (task.files || []).length > 1 ? "inline-flex" : "none";

    if ((task.failures || []).length > 0) {
        const names = task.failures.map((item) => {
            return item.page ? `P${item.page} ${item.title}` : item.title;
        });
        failedParts.textContent = `下载失败：${names.join("、")}`;
    }
}

function triggerCompletedDownloads() {
    completeFiles.querySelectorAll(".completed-file-link").forEach((link, index) => {
        setTimeout(() => link.click(), index * 500);
    });
}

function pollProgress() {
    stopPolling();

    const taskId = currentTaskId;
    const controller = new AbortController();
    pollController = controller;

    async function pollOnce() {
        if (!currentTaskId || currentTaskId !== taskId) return;

        try {
            const resp = await fetch(`/api/task/${taskId}`, { signal: controller.signal });
            if (!resp.ok) {
                stopPolling();
                if (resp.status === 401) showError("会话已过期，请刷新页面重新输入访问码");
                else showError("任务不存在或已过期");
                setLoading(downloadBtn, false);
                return;
            }
            const task = await resp.json();

            if (task.status === "downloading") {
                statusBadge.className = "status-badge downloading";
                statusBadge.textContent = task.total_count > 1
                    ? `下载中 ${task.completed_count + task.failed_count}/${task.total_count}`
                    : "下载中";
                progressBar.style.width = `${task.progress}%`;
                progressPercent.textContent = `${task.progress}%`;
                progressSpeed.textContent = task.speed || "";
                progressEta.textContent = task.eta ? `剩余: ${task.eta}` : "";
                batchCurrent.textContent = task.current_title
                    ? `${task.current_page ? `P${task.current_page} · ` : ""}${task.current_title}`
                    : "";
            } else if (task.status === "completed") {
                statusBadge.className = "status-badge completed";
                statusBadge.textContent = task.failed_count > 0 ? "部分完成" : "已完成";
                progressBar.style.width = "100%";
                progressPercent.textContent = "100%";
                progressSpeed.textContent = "";
                progressEta.textContent = "";
                renderCompletedFiles(taskId, task);
                completeActions.classList.add("active");
                const summary = task.total_count > 1
                    ? `成功 ${task.completed_count} P，失败 ${task.failed_count} P。`
                    : "";
                const saveTip = task.completed_count > 1
                    ? "已自动开始保存，请允许浏览器下载多个文件。"
                    : "已自动开始保存到本地。";
                batchCurrent.textContent = `${summary}${saveTip}`;
                stopPolling();
                setLoading(downloadBtn, false);
                setTimeout(triggerCompletedDownloads, 200);
                setTimeout(() => {
                    completeActions.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 100);
                return;
            } else if (task.status === "error") {
                statusBadge.className = "status-badge error";
                statusBadge.textContent = "出错";
                batchCurrent.textContent = "";
                showError(task.error || "下载失败");
                stopPolling();
                setLoading(downloadBtn, false);
                return;
            }
        } catch (e) {
            // AbortError 来自 stopPolling 的主动取消，不需要报错。
            if (e.name === "AbortError") return;
            console.error("Poll error:", e);
        }

        // 当前请求结束后才调度下一次，避免慢请求造成并发轮询。
        if (currentTaskId === taskId) {
            pollTimer = setTimeout(pollOnce, 1000);
        }
    }

    pollOnce();
}

modeVideoBtn.addEventListener("click", () => setMode(false));
modeAudioBtn.addEventListener("click", () => setMode(true));
partList.addEventListener("change", updatePartSelectionUI);
selectFirstPartsBtn.addEventListener("click", () => {
    partList.querySelectorAll("input[type='checkbox']").forEach((input, index) => {
        input.checked = index < maxBatchParts;
    });
    updatePartSelectionUI();
});
clearPartsBtn.addEventListener("click", () => {
    partList.querySelectorAll("input[type='checkbox']").forEach((input) => {
        input.checked = false;
    });
    updatePartSelectionUI();
});
downloadAllBtn.addEventListener("click", () => {
    triggerCompletedDownloads();
});

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
