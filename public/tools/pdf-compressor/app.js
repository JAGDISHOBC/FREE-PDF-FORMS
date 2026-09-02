(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const uploadArea = document.getElementById("uploadArea");
    const browseButton = document.getElementById("browseButton");
    const fileInput = document.getElementById("fileInput");
    const fileInfo = document.getElementById("fileInfo");
    const targetBox = document.getElementById("targetBox");
    const targetSizeInput = document.getElementById("targetSizeInput");
    const compressButton = document.getElementById("compressButton");
    const status = document.getElementById("status");
    const result = document.getElementById("result");
    const resultInfo = document.getElementById("resultInfo");
    const downloadButton = document.getElementById("downloadButton");
    const resetButton = document.getElementById("resetButton");

    const MAX_INPUT_BYTES = 25 * 1024 * 1024;
    const MAX_PAGES = 50;
    const MAX_TARGET_KB = 50000;

    const state = {
      file: null,
      outputUrl: null
    };

    if (!uploadArea || !browseButton || !fileInput || !compressButton) {
      console.error("PDF Compressor: required elements are missing.");
      return;
    }

    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    function setStatus(message, type = "") {
      status.textContent = message || "";
      status.className = `status${type ? ` ${type}` : ""}`;
    }

    function revokeOutput() {
      if (state.outputUrl) {
        URL.revokeObjectURL(state.outputUrl);
        state.outputUrl = null;
      }
    }

    function validateFile(file) {
      if (!file) return "Please choose a PDF.";
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isPdf) return "Please choose a PDF file.";
      if (file.size <= 0) return "The selected PDF is empty.";
      if (file.size > MAX_INPUT_BYTES) return "PDF is too large. Maximum input size is 25 MB.";
      return null;
    }

    async function inspectPdf(file) {
      if (!window.pdfjsLib) {
        throw new Error("PDF engine could not be loaded.");
      }

      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      if (pdf.numPages > MAX_PAGES) {
        throw new Error(`This tool supports up to ${MAX_PAGES} pages per PDF.`);
      }

      return { buffer, pageCount: pdf.numPages, pdf };
    }

    async function handleFile(file) {
      setStatus("");
      result.classList.remove("visible");
      revokeOutput();

      const error = validateFile(file);
      if (error) {
        fileInput.value = "";
        targetBox.classList.remove("visible");
        fileInfo.classList.remove("visible");
        setStatus(error, "error");
        return;
      }

      try {
        compressButton.disabled = true;
        setStatus("Checking PDF...");

        const info = await inspectPdf(file);

        state.file = file;
        fileInfo.textContent =
          `${file.name} • ${formatBytes(file.size)} • ${info.pageCount} page${info.pageCount === 1 ? "" : "s"}`;
        fileInfo.classList.add("visible");

        targetSizeInput.value = "";
        targetBox.classList.add("visible");
        setStatus("PDF ready. Enter your target size.");
      } catch (error) {
        console.error(error);
        state.file = null;
        fileInfo.classList.remove("visible");
        targetBox.classList.remove("visible");
        setStatus(error.message || "This PDF could not be opened.", "error");
      } finally {
        compressButton.disabled = false;
      }
    }

    function openPicker() {
      fileInput.value = "";
      fileInput.click();
    }

    browseButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPicker();
    });

    uploadArea.addEventListener("click", (event) => {
      if (event.target.closest("#browseButton")) return;
      openPicker();
    });

    uploadArea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPicker();
      }
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) handleFile(file);
    });

    uploadArea.addEventListener("dragover", (event) => {
      event.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (event) => {
      event.preventDefault();
      uploadArea.classList.remove("dragover");
      const file = event.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    });

    compressButton.addEventListener("click", async () => {
      setStatus("");
      result.classList.remove("visible");
      revokeOutput();

      if (!state.file) {
        setStatus("Please choose a PDF first.", "error");
        return;
      }

      const targetKB = Number(targetSizeInput.value);

      if (!Number.isFinite(targetKB) || targetKB < 10) {
        setStatus("Please enter a target size of at least 10 KB.", "error");
        targetSizeInput.focus();
        return;
      }

      if (targetKB > MAX_TARGET_KB) {
        setStatus(`Target size cannot be more than ${MAX_TARGET_KB.toLocaleString()} KB.`, "error");
        return;
      }

      const targetBytes = Math.floor(targetKB * 1024);

      compressButton.disabled = true;
      compressButton.textContent = "Compressing...";
      setStatus("Preparing PDF pages...");

      try {
        const best = await findBestPdf(state.file, targetBytes);

        if (!best || best.bytes.length > targetBytes) {
          throw new Error(
            "This PDF could not be reduced to the requested size safely. Try a slightly larger target."
          );
        }

        revokeOutput();
        state.outputUrl = URL.createObjectURL(
          new Blob([best.bytes], { type: "application/pdf" })
        );

        const finalKB = best.bytes.length / 1024;
        const differenceKB = targetKB - finalKB;
        const baseName = safeBaseName(state.file.name);
        const filename = `${baseName}-compressed.pdf`;

        downloadButton.href = state.outputUrl;
        downloadButton.download = filename;

        resultInfo.innerHTML = `
          <div class="result-line">Original Size: <strong>${formatBytes(state.file.size)}</strong></div>
          <div class="result-line">Target Size: <strong>${targetKB.toFixed(1)} KB</strong></div>
          <div class="result-line">Final Size: <strong>${finalKB.toFixed(1)} KB</strong></div>
          <div class="result-line">Pages: <strong>${best.pageCount}</strong></div>
          <div class="result-line" style="margin-top:10px;color:#15803d;font-weight:800">
            ✅ ${differenceKB.toFixed(1)} KB below target
          </div>
        `;

        result.classList.add("visible");
        setStatus("Compression complete.", "success");

        setTimeout(() => {
          result.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch (error) {
        console.error("PDF compression error:", error);
        setStatus(
          error.message || "PDF compression failed. Please try another PDF.",
          "error"
        );
      } finally {
        compressButton.disabled = false;
        compressButton.textContent = "Compress to Target Size";
      }
    });

    async function findBestPdf(file, targetBytes) {
      const buffer = await file.arrayBuffer();

      const scales = [1, 0.85, 0.70, 0.58, 0.48, 0.40, 0.33, 0.27, 0.22, 0.18, 0.15, 0.12];
      const qualities = [0.82, 0.72, 0.62, 0.52, 0.44, 0.36, 0.30, 0.25, 0.20, 0.16];

      let best = null;

      for (const scale of scales) {
        setStatus(`Rendering pages at ${Math.round(scale * 100)}%...`);

        const rendered = await renderPages(buffer, scale);

        for (const quality of qualities) {
          setStatus(
            `Testing compression: ${Math.round(scale * 100)}% • JPEG ${Math.round(quality * 100)}%...`
          );

          const candidate = await buildPdf(rendered, quality);

          if (candidate.bytes.length <= targetBytes) {
            if (!best || candidate.bytes.length > best.bytes.length) {
              best = candidate;
            }

            if (targetBytes - candidate.bytes.length <= 3 * 1024) {
              return best;
            }
          }

          await nextFrame();
        }

        if (best) {
          return best;
        }

        await nextFrame();
      }

      return best;
    }

    async function renderPages(buffer, scale) {
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      if (pdf.numPages > MAX_PAGES) {
        throw new Error(`This tool supports up to ${MAX_PAGES} pages per PDF.`);
      }

      const pages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setStatus(`Rendering page ${pageNumber} of ${pdf.numPages}...`);

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Browser canvas is not available.");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport
        }).promise;

        pages.push({
          canvas,
          width: viewport.width,
          height: viewport.height
        });

        await nextFrame();
      }

      return pages;
    }

    async function canvasToJpeg(canvas, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Could not encode a PDF page."));
          },
          "image/jpeg",
          quality
        );
      });
    }

    async function buildPdf(pages, quality) {
      if (!window.PDFLib) {
        throw new Error("PDF creation engine could not be loaded.");
      }

      const pdfDoc = await PDFLib.PDFDocument.create();

      for (let i = 0; i < pages.length; i++) {
        const jpgBlob = await canvasToJpeg(pages[i].canvas, quality);
        const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
        const image = await pdfDoc.embedJpg(jpgBytes);

        const page = pdfDoc.addPage([
          pages[i].width,
          pages[i].height
        ]);

        page.drawImage(image, {
          x: 0,
          y: 0,
          width: pages[i].width,
          height: pages[i].height
        });

        await nextFrame();
      }

      const bytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false
      });

      return {
        bytes,
        pageCount: pages.length
      };
    }

    resetButton.addEventListener("click", () => {
      revokeOutput();

      state.file = null;
      fileInput.value = "";
      targetSizeInput.value = "";

      fileInfo.textContent = "";
      fileInfo.classList.remove("visible");

      targetBox.classList.remove("visible");
      result.classList.remove("visible");

      downloadButton.removeAttribute("href");
      downloadButton.removeAttribute("download");

      setStatus("");
    });

    window.addEventListener("beforeunload", revokeOutput);

    function nextFrame() {
      return new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
    }

    function safeBaseName(filename) {
      const original = String(filename || "document")
        .replace(/\.[^/.]+$/, "");

      const safe = original
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);

      return safe || "document";
    }

    console.log("PDF Compressor initialized successfully.");
  });
})();
