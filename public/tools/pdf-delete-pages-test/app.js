(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const uploadArea = $("uploadArea");
  const browseButton = $("browseButton");
  const fileInput = $("fileInput");
  const fileInfo = $("fileInfo");
  const fileName = $("fileName");
  const fileMeta = $("fileMeta");
  const changeFileButton = $("changeFileButton");
  const editor = $("editor");
  const pageList = $("pageList");
  const selectionInfo = $("selectionInfo");
  const status = $("status");
  const selectAll = $("selectAll");
  const clearSelection = $("clearSelection");
  const processButton = $("processButton");
  const resetButton = $("resetButton");
  const result = $("result");
  const resultSize = $("resultSize");
  const outputName = $("outputName");
  const downloadButton = $("downloadButton");
  const anotherButton = $("anotherButton");

  let selectedFile = null;
  let originalBytes = null;
  let pdfDocument = null;
  let deletedPages = new Set();
  let outputBlob = null;

  if (!uploadArea || !browseButton || !fileInput || !pageList) {
    console.error("Delete Pages: required elements are missing.");
    return;
  }

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function getBaseName(name) {
    return name.replace(/\.pdf$/i, "");
  }

  function showStatus(message, type = "") {
    status.textContent = message;
    status.className = "status";
    if (type === "success") status.classList.add("success");
    if (type === "error") status.classList.add("error");
    status.classList.remove("hidden");
  }

  function hideStatus() {
    status.classList.add("hidden");
  }

  function updateSelectionInfo() {
    const count = deletedPages.size;
    const total = pdfDocument ? pdfDocument.numPages : 0;
    const remaining = total - count;

    selectionInfo.textContent =
      `${count} page${count === 1 ? "" : "s"} selected for deletion • ` +
      `${remaining} page${remaining === 1 ? "" : "s"} will remain`;
  }

  function updateCardState(pageNumber) {
    const card = pageList.querySelector(`[data-page-number="${pageNumber}"]`);
    if (!card) return;

    card.classList.toggle("selected", deletedPages.has(pageNumber));

    const button = card.querySelector(".delete-toggle");
    if (button) {
      button.textContent = deletedPages.has(pageNumber)
        ? "↩ Keep Page"
        : "🗑 Delete";
    }
  }

  async function handleFile(file) {
    hideStatus();

    if (!file) return;

    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      showStatus("Please select a valid PDF file.", "error");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showStatus("This PDF is larger than the 50 MB limit.", "error");
      return;
    }

    try {
      selectedFile = file;

      // Keep an untouched copy for pdf-lib.
      const buffer = await file.arrayBuffer();
      originalBytes = new Uint8Array(buffer.slice(0));

      // PDF.js gets its own copy so it cannot detach our pdf-lib bytes.
      const pdfjsBytes = originalBytes.slice(0);
      const loadingTask = pdfjsLib.getDocument({ data: pdfjsBytes });
      pdfDocument = await loadingTask.promise;

      deletedPages = new Set();

      fileName.textContent = file.name;
      fileMeta.textContent =
        `${formatBytes(file.size)} • ${pdfDocument.numPages} pages`;

      fileInfo.classList.remove("hidden");
      editor.classList.remove("hidden");
      result.classList.add("hidden");

      outputName.value = `${getBaseName(file.name)}_Without_Pages`;

      await renderPages();
      updateSelectionInfo();

      showStatus(
        "PDF loaded. Select the pages you want to delete. The selection is shown immediately.",
        "success"
      );
    } catch (error) {
      console.error(error);
      resetTool();
      showStatus(
        `Could not open this PDF: ${error.message || "Unknown error"}`,
        "error"
      );
    }
  }

  async function renderPages() {
    pageList.innerHTML = "";

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.75 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      const card = document.createElement("div");
      card.className = "page-card";
      card.dataset.pageNumber = String(pageNumber);

      const preview = document.createElement("div");
      preview.className = "page-preview";

      const badge = document.createElement("div");
      badge.className = "delete-badge";
      badge.textContent = "MARKED FOR DELETION";

      preview.appendChild(canvas);
      preview.appendChild(badge);

      const number = document.createElement("div");
      number.className = "page-number";
      number.textContent = `Page ${pageNumber}`;

      const actions = document.createElement("div");
      actions.className = "page-actions";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "button secondary delete-toggle";
      toggle.textContent = "🗑 Delete";

      toggle.addEventListener("click", () => {
        if (deletedPages.has(pageNumber)) {
          deletedPages.delete(pageNumber);
        } else {
          deletedPages.add(pageNumber);
        }

        updateCardState(pageNumber);
        updateSelectionInfo();

        showStatus(
          deletedPages.has(pageNumber)
            ? `Page ${pageNumber} marked for deletion.`
            : `Page ${pageNumber} restored.`,
          "success"
        );
      });

      actions.appendChild(toggle);
      card.appendChild(preview);
      card.appendChild(number);
      card.appendChild(actions);
      pageList.appendChild(card);
    }
  }

  selectAll.addEventListener("click", () => {
    if (!pdfDocument) return;

    // Never allow the user to delete every page.
    if (pdfDocument.numPages <= 1) {
      showStatus(
        "A PDF must keep at least one page.",
        "error"
      );
      return;
    }

    deletedPages = new Set(
      Array.from(
        { length: pdfDocument.numPages - 1 },
        (_, index) => index + 1
      )
    );

    // Keep the last page so the PDF can still be created.
    for (let page = 1; page <= pdfDocument.numPages; page++) {
      updateCardState(page);
    }

    updateSelectionInfo();

    showStatus(
      `All pages except page ${pdfDocument.numPages} are marked for deletion.`,
      "success"
    );
  });

  clearSelection.addEventListener("click", () => {
    deletedPages.clear();

    for (let page = 1; page <= (pdfDocument?.numPages || 0); page++) {
      updateCardState(page);
    }

    updateSelectionInfo();
    showStatus("All deletion selections cleared.", "success");
  });

  async function processPDF() {
    if (!originalBytes || !selectedFile || !pdfDocument) return;

    if (deletedPages.size === 0) {
      showStatus(
        "No pages selected. Select at least one page to delete.",
        "error"
      );
      return;
    }

    if (deletedPages.size >= pdfDocument.numPages) {
      showStatus(
        "At least one page must remain in the PDF.",
        "error"
      );
      return;
    }

    try {
      processButton.disabled = true;
      processButton.textContent = "Creating PDF...";
      showStatus("Creating your new PDF...");

      // IMPORTANT: pdf-lib receives a fresh copy.
      const sourcePdf = await PDFLib.PDFDocument.load(
        originalBytes.slice(0),
        { ignoreEncryption: false }
      );

      const outputPdf = await PDFLib.PDFDocument.create();

      const keepIndexes = [];

      for (let i = 0; i < sourcePdf.getPageCount(); i++) {
        const pageNumber = i + 1;
        if (!deletedPages.has(pageNumber)) {
          keepIndexes.push(i);
        }
      }

      const copiedPages = await outputPdf.copyPages(
        sourcePdf,
        keepIndexes
      );

      for (const page of copiedPages) {
        outputPdf.addPage(page);
      }

      const outputBytes = await outputPdf.save({
        useObjectStreams: true,
        addDefaultPage: false
      });

      outputBlob = new Blob([outputBytes], {
        type: "application/pdf"
      });

      resultSize.textContent =
        `Original: ${formatBytes(selectedFile.size)} • ` +
        `New PDF: ${formatBytes(outputBlob.size)} • ` +
        `${keepIndexes.length} pages remaining`;

      editor.classList.add("hidden");
      result.classList.remove("hidden");

      showStatus(
        "PDF created successfully.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showStatus(
        `Could not create the PDF: ${error.message || "Unknown error"}`,
        "error"
      );
    } finally {
      processButton.disabled = false;
      processButton.textContent = "Delete Selected Pages";
    }
  }

  function downloadPDF() {
    if (!outputBlob) return;

    let name = outputName.value.trim() || "PDF_Without_Pages";
    name = name.replace(/\.pdf$/i, "");
    name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

    const url = URL.createObjectURL(outputBlob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${name}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetTool() {
    selectedFile = null;
    originalBytes = null;
    pdfDocument = null;
    deletedPages.clear();
    outputBlob = null;

    fileInput.value = "";
    fileInfo.classList.add("hidden");
    editor.classList.add("hidden");
    result.classList.add("hidden");
    pageList.innerHTML = "";

    updateSelectionInfo();
    hideStatus();
  }

  browseButton.addEventListener("click", (event) => {
    event.stopPropagation();
    fileInput.click();
  });

  uploadArea.addEventListener("click", (event) => {
    if (event.target === browseButton) return;
    fileInput.click();
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
    handleFile(event.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", (event) => {
    handleFile(event.target.files[0]);
  });

  changeFileButton.addEventListener("click", () => {
    resetTool();
    fileInput.click();
  });

  anotherButton.addEventListener("click", () => {
    resetTool();
    fileInput.click();
  });

  resetButton.addEventListener("click", resetTool);
  processButton.addEventListener("click", processPDF);
  downloadButton.addEventListener("click", downloadPDF);
})();
