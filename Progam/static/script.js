/* ==========================================================================
   COTO (eco-Token) v2 - Frontend Interactive Script
   Multi-file upload | Download .md | Auto-copy | Toast | Theme Toggle
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // DOM references
    const themeToggleBtn  = document.getElementById('themeToggleBtn');
    const brandLogo       = document.getElementById('brandLogo');
    const dropzone        = document.getElementById('dropzone');
    const fileInput       = document.getElementById('fileInput');
    const dropzoneContent = document.getElementById('dropzoneContent');
    const loader          = document.getElementById('loader');
    const loaderText      = document.getElementById('loaderText');

    const outputContainer = document.getElementById('outputContainer');
    const outputFilename  = document.getElementById('outputFilename');
    const outputTokenCount= document.getElementById('outputTokenCount');
    const codePreview     = document.getElementById('codePreview');
    const copyBtn         = document.getElementById('copyBtn');
    const downloadBtn     = document.getElementById('downloadBtn');
    const downloadAllBtn  = document.getElementById('downloadAllBtn');
    const addMoreBtn      = document.getElementById('addMoreBtn');
    const resetBtn        = document.getElementById('resetBtn');
    const toastContainer  = document.getElementById('toastContainer');
    const ultraPureToggle = document.getElementById('ultraPureToggle');
    const activeFilesList = document.getElementById('activeFilesList');
    const learnMoreBtn    = document.getElementById('learnMoreBtn');
    const pageTransitionOverlay = document.getElementById('pageTransitionOverlay');

    // State
    let currentMarkdown         = "";       // Markdown yang aktif saat ini (bisa original atau pure)
    let currentMarkdownOriginal = "";       // Menyimpan versi Markdown dengan simbol
    let currentMarkdownPure     = "";       // Menyimpan versi Markdown tanpa simbol
    let estimatedTokensOriginal = 0;        // Menyimpan jumlah token versi original
    let estimatedTokensPure     = 0;        // Menyimpan jumlah token versi pure
    let currentFilenames        = [];       // Nama file asli yang sedang aktif (array)
    let sessionFiles            = [];       // Hasil konversi per file dalam sesi aktif
    let selectedFileIndex       = 0;        // Index file yang sedang ditampilkan
    let isProcessing            = false;    // Guard multi-submit

    function clearCotoSessionUI() {
        currentMarkdown = "";
        currentMarkdownOriginal = "";
        currentMarkdownPure = "";
        estimatedTokensOriginal = 0;
        estimatedTokensPure = 0;
        currentFilenames = [];
        sessionFiles = [];
        selectedFileIndex = 0;
        isProcessing = false;

        if (fileInput) fileInput.value = "";
        if (codePreview) codePreview.textContent = "";
        if (outputFilename) outputFilename.textContent = "output.md";
        if (outputTokenCount) outputTokenCount.textContent = "~0 token";
        if (activeFilesList) activeFilesList.innerHTML = "";
        if (outputContainer) outputContainer.style.display = "none";
        if (dropzone) {
            dropzone.style.display = "block";
            dropzone.style.pointerEvents = "auto";
        }
        if (dropzoneContent) dropzoneContent.style.display = "flex";
        if (loader) loader.style.display = "none";
    }

    function setPageTransitionOrigin(overlay, triggerEl) {
        if (!overlay || !triggerEl) return;
        const rect = triggerEl.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        overlay.style.setProperty('--transition-x', `${x}px`);
        overlay.style.setProperty('--transition-y', `${y}px`);
    }

    function t(idText, enText) {
        return window.CotoI18n && typeof window.CotoI18n.t === 'function'
            ? window.CotoI18n.t(idText, enText)
            : idText;
    }

    // Theme system: system default + premium reveal + cooldown
    const THEME_KEY = 'coto-theme';
    const THEME_COOLDOWN_MS = 5000;
    let isThemeCoolingDown = false;

    const logoImg = document.querySelector('.coto-logo');
    const DARK_LOGO = '/static/Logo%20mode%20gelap.png';
    const LIGHT_LOGO = '/static/Logo%20mode%20terang.png';

    function getInitialTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') return saved;

        return window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    function updateLogoForTheme(theme) {
        if (!logoImg) return;
        logoImg.src = theme === 'dark' ? DARK_LOGO : LIGHT_LOGO;
    }

    function applyTheme(theme, shouldSave = true) {
        document.documentElement.setAttribute('data-theme', theme);
        updateLogoForTheme(theme);

        if (shouldSave) {
            localStorage.setItem(THEME_KEY, theme);
        }
    }

    function createThemeRevealOverlay(nextTheme) {
        if (!themeToggleBtn) return null;

        const rect = themeToggleBtn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const overlay = document.createElement('div');
        overlay.className = `theme-reveal-overlay theme-to-${nextTheme}`;
        overlay.style.setProperty('--reveal-x', `${x}px`);
        overlay.style.setProperty('--reveal-y', `${y}px`);

        document.body.appendChild(overlay);

        overlay.addEventListener('animationend', () => {
            overlay.remove();
        }, { once: true });

        return overlay;
    }

    function startThemeCooldown() {
        isThemeCoolingDown = true;

        if (themeToggleBtn) {
            themeToggleBtn.disabled = true;
            themeToggleBtn.classList.add('is-cooling-down');
        }

        setTimeout(() => {
            isThemeCoolingDown = false;

            if (themeToggleBtn) {
                themeToggleBtn.disabled = false;
                themeToggleBtn.classList.remove('is-cooling-down');
            }
        }, THEME_COOLDOWN_MS);
    }

    function toggleThemeWithReveal() {
        if (isThemeCoolingDown) return;

        const current = document.documentElement.getAttribute('data-theme') || getInitialTheme();
        const next = current === 'dark' ? 'light' : 'dark';

        startThemeCooldown();

        const reducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!reducedMotion) {
            createThemeRevealOverlay(next);

            // Switch shortly after overlay appears, so the page never goes blank.
            requestAnimationFrame(() => {
                setTimeout(() => applyTheme(next, true), 80);
            });
        } else {
            applyTheme(next, true);
        }

        showToast(
            t("Tema Diubah", "Theme Changed"),
            t(
                `Beralih ke ${next === 'dark' ? 'Dark Mode' : 'Light Mode'}.`,
                `Switched to ${next === 'dark' ? 'Dark Mode' : 'Light Mode'}.`
            ),
            "info"
        );
    }

    // Initial theme
    applyTheme(getInitialTheme(), false);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleThemeWithReveal);
    }

    // Logo easter egg: 6 clicks within 5 seconds
    let logoClickCount = 0;
    let logoClickTimer = null;

    if (logoImg) {
        logoImg.addEventListener('click', () => {
            logoClickCount += 1;

            clearTimeout(logoClickTimer);
            logoClickTimer = setTimeout(() => {
                logoClickCount = 0;
            }, 5000);

            if (logoClickCount === 5) {
                showToast("Hampir terbuka", "Satu klik lagi.", "info");
            }

            if (logoClickCount >= 6) {
                logoClickCount = 0;
                clearTimeout(logoClickTimer);
                window.location.href = "https://www.instagram.com/nra.care?igsh=bHZtcHpoOXpscHZv";
            }
        });
    }

    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', () => {
            clearCotoSessionUI();
            document.body.classList.add('is-transitioning');

            if (pageTransitionOverlay) {
                setPageTransitionOrigin(pageTransitionOverlay, learnMoreBtn);
                pageTransitionOverlay.classList.add('active');
            }

            setTimeout(() => {
                window.location.href = '/learn';
            }, 520);
        });
    }

    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        dropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
    });

    ['dragenter', 'dragover'].forEach(ev =>
        dropzone.addEventListener(ev, () => dropzone.classList.add('dragover'))
    );
    ['dragleave', 'drop'].forEach(ev =>
        dropzone.addEventListener(ev, () => dropzone.classList.remove('dragover'))
    );

    dropzone.addEventListener('drop', e => {
        const files = [...e.dataTransfer.files];
        if (files.length > 0) processFiles(files);
    });

    dropzone.addEventListener('click', e => {
        if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('change', e => {
        const files = [...e.target.files];
        if (files.length > 0) processFiles(files);
    });

    // Process files (multi-file aware)
    function processFiles(files) {
        if (isProcessing) return;
        isProcessing = true;

        currentFilenames = files.map(f => f.name);

        // State: tampilkan loader
        showLoadingState(files.length);

        const formData = new FormData();
        files.forEach(f => formData.append('file', f));
        formData.append('strip_symbols', ultraPureToggle.checked);

        fetch('/api/convert', { method: 'POST', body: formData })
            .then(res => {
                if (!res.ok) return res.json().then(err => { throw new Error(err.error || "Gagal memproses file."); });
                return res.json();
            })
            .then(hasil => {
                hideLoadingState();
                isProcessing = false;

                const incomingFiles = normalizeResponseFiles(hasil);

                if (incomingFiles.length > 0) {
                    const previousLength = sessionFiles.length;
                    sessionFiles = sessionFiles.concat(incomingFiles);
                    currentFilenames = sessionFiles.map(file => file.filename);

                    const firstNewSuccess = sessionFiles.findIndex((file, index) =>
                        index >= previousLength && file.success
                    );
                    const firstAnySuccess = sessionFiles.findIndex(file => file.success);
                    selectedFileIndex = firstNewSuccess !== -1 ? firstNewSuccess : Math.max(firstAnySuccess, 0);

                    renderActiveFilesList();
                    selectFile(selectedFileIndex, { copy: true });

                    outputContainer.style.display = 'block';
                    dropzone.style.display = 'none';

                    const successCount = incomingFiles.filter(file => file.success).length;
                    const failedCount = incomingFiles.length - successCount;
                    const copyMsg = successCount > 0
                        ? 'File aktif siap di-copy atau diunduh.'
                        : 'Tidak ada file yang berhasil dikonversi.';

                    showToast(
                        successCount > 0 ? 'Berhasil Mengompresi!' : 'Tidak Ada File Valid',
                        `${successCount} dari ${incomingFiles.length} file berhasil. ${copyMsg}`,
                        successCount > 0 ? 'success' : 'error'
                    );

                    if (hasil.error || failedCount > 0) {
                        showToast('Peringatan', hasil.error || `${failedCount} file gagal diproses.`, 'error');
                    }
                } else {
                    showToast('Gagal Konversi', hasil.error || 'Terjadi kesalahan.', 'error');
                }
            })
            .catch(err => {
                hideLoadingState();
                isProcessing = false;
                showToast("Kesalahan Server", err.message, "error");
            });
    }

    // Sync Ultra-Pure view
    function normalizeResponseFiles(hasil) {
        const rawFiles = Array.isArray(hasil.files) && hasil.files.length > 0 ? hasil.files : [hasil];
        return rawFiles.map((item, index) => {
            const meta = item.meta || {};
            return {
                filename: meta.filename || currentFilenames[index] || `file-${sessionFiles.length + index + 1}.md`,
                data: item.data || "",
                data_pure: item.data_pure || item.data || "",
                estimated_tokens: meta.estimated_tokens || 0,
                estimated_tokens_pure: meta.estimated_tokens_pure || meta.estimated_tokens || 0,
                success: Boolean(item.success),
                error: item.error || null
            };
        });
    }

    function renderActiveFilesList() {
        activeFilesList.innerHTML = "";

        sessionFiles.forEach((file, index) => {
            const card = document.createElement('div');
            card.setAttribute('role', 'button');
            card.tabIndex = file.success ? 0 : -1;
            card.className = `file-mini-card${index === selectedFileIndex ? ' active' : ''}${file.success ? '' : ' file-error'}`;
            card.dataset.index = index;

            const tokens = ultraPureToggle.checked ? file.estimated_tokens_pure : file.estimated_tokens;
            const statusText = file.success ? `~${tokens.toLocaleString()} token` : "Gagal";
            const icon = file.success ? "fa-file-lines" : "fa-triangle-exclamation";

            card.innerHTML = `
                <div class="file-info-col">
                    <i class="fa-solid ${icon} file-type-icon"></i>
                    <span class="file-card-name" title="${escapeHtml(file.filename)}">${escapeHtml(file.filename)}</span>
                </div>
                <span class="token-badge-sm">${statusText}</span>
                <button type="button" class="btn-mini-download" title="Download file ini" ${file.success ? "" : "disabled"}>
                    <i class="fa-solid fa-download"></i>
                </button>`;

            card.addEventListener('click', () => {
                if (file.success) selectFile(index);
            });

            card.addEventListener('keydown', event => {
                if (file.success && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    selectFile(index);
                }
            });

            const miniDownloadBtn = card.querySelector('.btn-mini-download');
            miniDownloadBtn.addEventListener('click', event => {
                event.stopPropagation();
                if (file.success) downloadContent(getActiveContent(file), file.filename);
            });

            activeFilesList.appendChild(card);
        });
    }

    function selectFile(index, options = {}) {
        const file = sessionFiles[index];
        if (!file || !file.success) {
            currentMarkdown = "";
            currentMarkdownOriginal = "";
            currentMarkdownPure = "";
            estimatedTokensOriginal = 0;
            estimatedTokensPure = 0;
            outputFilename.textContent = file ? file.filename : "Tidak ada file";
            outputTokenCount.textContent = "~0 token";
            codePreview.textContent = file ? `Gagal konversi: ${file.error || "Unknown error"}` : "";
            renderActiveFilesList();
            return;
        }

        selectedFileIndex = index;
        currentMarkdownOriginal = file.data;
        currentMarkdownPure = file.data_pure;
        estimatedTokensOriginal = file.estimated_tokens;
        estimatedTokensPure = file.estimated_tokens_pure;
        currentMarkdown = getActiveContent(file);

        const tokens = ultraPureToggle.checked ? estimatedTokensPure : estimatedTokensOriginal;
        outputFilename.textContent = file.filename;
        outputTokenCount.textContent = `~${tokens.toLocaleString()} token`;
        codePreview.textContent = currentMarkdown;
        renderActiveFilesList();

        if (options.copy) {
            navigator.clipboard.writeText(currentMarkdown)
                .catch(err => console.warn("[Clipboard browser]", err));
        }
    }

    function syncUltraPureView() {
        selectFile(selectedFileIndex);
    }

    function getActiveContent(file) {
        return ultraPureToggle.checked ? (file.data_pure || file.data || "") : (file.data || "");
    }

    function getCombinedContent() {
        return sessionFiles
            .filter(file => file.success)
            .map(file => {
                const divider = [
                    "",
                    "============================================================",
                    `## File: ${file.filename}`,
                    "============================================================",
                    ""
                ].join("\n");
                return `${divider}\n${getActiveContent(file)}`;
            })
            .join("\n\n");
    }

    function downloadContent(content, originalFilename) {
        if (!content) return;

        fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                original_filename: originalFilename
            })
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal mengunduh file.");
            return res.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const baseName = originalFilename.replace(/\.[^/.]+$/, '');
            const safeBase = baseName.replace(/[\\/:*?"<>|]/g, '_');
            a.href = url;
            a.download = `${safeBase}_CVTBYCOTO.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(
                t("Diunduh!", "Downloaded!"),
                t(`File ${safeBase}_CVTBYCOTO.md berhasil diunduh.`, `File ${safeBase}_CVTBYCOTO.md downloaded successfully.`),
                "success"
            );
        })
        .catch(err => showToast(t("Gagal Unduh", "Download Failed"), err.message, "error"));
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Event listener untuk toggle Ultra-Pure
    ultraPureToggle.addEventListener('change', () => {
        if (!sessionFiles.some(file => file.success)) return; // Belum ada file yang berhasil di-convert
        syncUltraPureView();
        renderActiveFilesList();
        
        const isPure = ultraPureToggle.checked;
        showToast(
            isPure ? "Ultra-Pure Mode Aktif" : "Format Standar Aktif",
            isPure 
                ? "Simbol hiasan Markdown dilepas. Token hemat maksimal!"
                : "Simbol asli dipulihkan kembali.",
            "info"
        );
    });

    // UI state management
    function showLoadingState(fileCount = 1) {
        dropzoneContent.style.display = 'none';
        loader.style.display = 'flex';
        loaderText.textContent = fileCount > 1
            ? t(`Mengompresi ${fileCount} file ke Markdown...`, `Compressing ${fileCount} files into Markdown...`)
            : t("Mengompresi file ke Markdown...", "Compressing file into Markdown...");
        dropzone.style.pointerEvents = 'none';
    }

    function hideLoadingState() {
        dropzoneContent.style.display = 'flex';
        loader.style.display = 'none';
        dropzone.style.pointerEvents = 'auto';
    }

    // Button: copy manual
    copyBtn.addEventListener('click', () => {
        if (!currentMarkdown) return;
        navigator.clipboard.writeText(currentMarkdown)
            .then(() => {
                const origHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>Copied!</span>`;
                copyBtn.style.background = '#15803d';
                copyBtn.style.color = '#ffffff';
                showToast("Tersalin!", "Markdown berhasil disimpan ke clipboard Anda.", "success");
                setTimeout(() => {
                    copyBtn.innerHTML = origHTML;
                    copyBtn.style.background = '';
                    copyBtn.style.color = '';
                }, 2200);
            })
            .catch(() => showToast("Gagal Menyalin", "Coba salin konten preview secara manual.", "error"));
    });

    // Button: download .md
    downloadBtn.addEventListener('click', () => {
        const file = sessionFiles[selectedFileIndex];
        if (!file || !file.success) {
            showToast(
                t('Tidak Ada File Terpilih', 'No Selected File'),
                t('Pilih file yang berhasil dikonversi dulu.', 'Choose a successfully converted file first.'),
                'error'
            );
            return;
        }

        downloadContent(getActiveContent(file), file.filename);
    });

    downloadAllBtn.addEventListener('click', () => {
        const successFiles = sessionFiles.filter(file => file.success);
        if (successFiles.length === 0) {
            showToast(
                t('Tidak Ada File Valid', 'No Valid File'),
                t('Tidak ada hasil konversi yang bisa diunduh.', 'No converted output is available to download.'),
                'error'
            );
            return;
        }

        downloadContent(getCombinedContent(), successFiles.length === 1 ? successFiles[0].filename : 'coto_session_all_files');
    });

    // Button: add more files
    addMoreBtn.addEventListener('click', e => {
        e.stopPropagation();
        // Reset input agar bisa pilih file yang sama lagi
        fileInput.value = "";
        fileInput.click();
    });

    // Button: reset
    resetBtn.addEventListener('click', e => {
        e.stopPropagation();
        clearCotoSessionUI();
        showToast("Reset", t("Siap menerima file baru.", "Ready for new files."), "info");
    });

    // Toast notification
    function showToast(title, message, type = "success") {
        const toast = document.createElement('div');
        toast.className = `toast${type === 'error' ? ' toast-error' : type === 'info' ? ' toast-info' : ''}`;

        const icons = {
            success: `<i class="fa-solid fa-circle-check toast-icon"></i>`,
            error:   `<i class="fa-solid fa-triangle-exclamation toast-icon"></i>`,
            info:    `<i class="fa-solid fa-circle-info toast-icon"></i>`,
        };

        toast.innerHTML = `
            ${icons[type] || icons.success}
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>`;

        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
});
