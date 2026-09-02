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
  const status = $("status");
  const rotateAllLeft = $("rotateAllLeft");
  const rotateAllRight = $("rotateAllRight");
  const resetAll = $("resetAll");
  const processButton = $("processButton");
  const resetButton = $("resetButton");
  const result = $("result");
  const resultSize = $("resultSize");
  const outputName = $("outputName");
  const downloadButton = $("downloadButton");
  const anotherButton = $("anotherButton");

  let selectedFile = null;
  let originalBytes = null;       // Dedicated copy for pdf-lib; never passed to PDF.js.
  let pageRotations = [];
  let outputBlob = null;
  let pdfDocument = null;

  if (!uploadArea || !browseButton || !fileInput || !editor || !pageList) {
    console.error("Rotate PDF: required elements are missing.");
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

  function normalizeRotation(value) {
    let rotation = value % 360;
    if (rotation < 0) rotation += 360;
    return rotation;
  }

  function getBaseName(name) {
    return name.replace(/\.pdf$/i, "");
  }

  function rotationLabel(rotation) {
    return `${normalizeRotation(rotation)}° rotation`;
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

      // IMPORTANT:
      // Keep an independent byte copy for pdf-lib.
      // PDF.js can transfer/detach the ArrayBuffer it receives.
      const sourceBuffer = await file.arrayBuffer();
      originalBytes = new Uint8Array(sourceBuffer.slice(0));

      // Give PDF.js its OWN independent copy so it cannot detach originalBytes.
      const pdfjsBytes = originalBytes.slice(0);

      const loadingTask = pdfjsLib.getDocument({ data: pdfjsBytes });
      pdfDocument = await loadingTask.promise;

      pageRotations = Array(pdfDocument.numPages).fill(0);

      fileName.textContent = file.name;
      fileMeta.textContent =
        `${formatBytes(file.size)} • ${pdfDocument.numPages} pages`;

      fileInfo.classList.remove("hidden");
      editor.classList.remove("hidden");
      result.classList.add("hidden");

      outputName.value = `${getBaseName(file.name)}_Rotated`;

      await renderPages();

      showStatus(
        "PDF loaded. Rotate pages and check the live preview before continuing.",
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

      const baseViewport = page.getViewport({ scale: 0.75 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      canvas.width = Math.ceil(baseViewport.width);
      canvas.height = Math.ceil(baseViewport.height);
      canvas.style.transformOrigin = "center center";
      canvas.style.transition = "transform 180ms ease";
      canvas.style.maxWidth = "100%";
      canvas.style.maxHeight = "100%";

      await page.render({
        canvasContext: context,
        viewport: baseViewport
      }).promise;

      const card = document.createElement("div");
      card.className = "page-card";

      const preview = document.createElement("div");
      preview.className = "page-preview";
      preview.style.position = "relative";
      preview.style.overflow = "hidden";
      preview.appendChild(canvas);

      const number = document.createElement("div");
      number.className = "page-number";
      number.textContent = `Page ${pageNumber}`;

      const actions = document.createElement("div");
      actions.className = "page-actions";

      const left = document.createElement("button");
      left.type = "button";
      left.className = "button secondary";
      left.textContent = "↶ Left";

      const right = document.createElement("button");
      right.type = "button";
      right.className = "button secondary";
      right.textContent = "↷ Right";

      const rotationText = document.createElement("div");
      rotationText.style.textAlign = "center";
      rotationText.style.fontSize = "12px";
      rotationText.style.color = "#697386";
      rotationText.style.gridColumn = "1 / -1";

      function updateLivePreview() {
        const rotation = pageRotations[pageNumber - 1] || 0;

        // The preview rotates immediately when the user clicks Left/Right.
        canvas.style.transform = `rotate(${rotation}deg)`;

        rotationText.textContent = rotationLabel(rotation);
      }

      left.addEventListener("click", () => {
        pageRotations[pageNumber - 1] =
          normalizeRotation(pageRotations[pageNumber - 1] - 90);
        updateLivePreview();
        showStatus(
          `Page ${pageNumber} rotated ${pageRotations[pageNumber - 1]}°. Preview updated live.`,
          "success"
        );
      });

      right.addEventListener("click", () => {
        pageRotations[pageNumber - 1] =
          normalizeRotation(pageRotations[pageNumber - 1] + 90);
        updateLivePreview();
        showStatus(
          `Page ${pageNumber} rotated ${pageRotations[pageNumber - 1]}°. Preview updated live.`,
          "success"
        );
      });

      updateLivePreview();

      actions.appendChild(left);
      actions.appendChild(right);
      actions.appendChild(rotationText);

      card.appendChild(preview);
      card.appendChild(number);
      card.appendChild(actions);
      pageList.appendChild(card);
    }
  }

  function updateAllLivePreviews() {
    const cards = pageList.querySelectorAll(".page-card");

    cards.forEach((card, index) => {
      const canvas = card.querySelector("canvas");
      const label = card.querySelector(".page-actions div");
      const rotation = pageRotations[index] || 0;

      if (canvas) {
        canvas.style.transform = `rotate(${rotation}deg)`;
      }

      if (label) {
        label.textContent = rotationLabel(rotation);
      }
    });
  }

  rotateAllLeft.addEventListener("click", () => {
    pageRotations = pageRotations.map((rotation) =>
      normalizeRotation(rotation - 90)
    );

    updateAllLivePreviews();

    showStatus(
      "All pages rotated 90° left. Preview updated live.",
      "success"
    );
  });

  rotateAllRight.addEventListener("click", () => {
    pageRotations = pageRotations.map((rotation) =>
      normalizeRotation(rotation + 90)
    );

    updateAllLivePreviews();

    showStatus(
      "All pages rotated 90° right. Preview updated live.",
      "success"
    );
  });

  resetAll.addEventListener("click", () => {
    pageRotations = Array(
      pdfDocument ? pdfDocument.numPages : 0
    ).fill(0);

    updateAllLivePreviews();

    showStatus(
      "All page rotations reset. Preview restored.",
      "success"
    );
  });

  async function processPDF() {
    if (!originalBytes || !selectedFile) return;

    const hasChanges = pageRotations.some(
      (rotation) => normalizeRotation(rotation) !== 0
    );

    if (!hasChanges) {
      showStatus(
        "No rotation changes were made. Rotate at least one page first.",
        "error"
      );
      return;
    }

    try {
      processButton.disabled = true;
      processButton.textContent = "Creating PDF...";
      showStatus("Creating your rotated PDF...");

      // Use the untouched byte copy that was protected from PDF.js.
      const sourcePdf = await PDFLib.PDFDocument.load(
        originalBytes.slice(0),
        { ignoreEncryption: false }
      );

      const outputPdf = await PDFLib.PDFDocument.create();
      const pageCount = sourcePdf.getPageCount();

      for (let i = 0; i < pageCount; i++) {
        const [copiedPage] = await outputPdf.copyPages(sourcePdf, [i]);

        const rotation = normalizeRotation(pageRotations[i] || 0);

        // Rotation is stored as PDF page rotation metadata.
        copiedPage.setRotation(PDFLib.degrees(rotation));

        outputPdf.addPage(copiedPage);
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
        `New PDF: ${formatBytes(outputBlob.size)}`;

      editor.classList.add("hidden");
      result.classList.remove("hidden");

      showStatus(
        "PDF created successfully. You can rename it and download it.",
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
      processButton.textContent = "Rotate & Download PDF";
    }
  }

  function downloadPDF() {
    if (!outputBlob) return;

    let name = outputName.value.trim() || "Rotated_PDF";

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
    pageRotations = [];
    outputBlob = null;
    pdfDocument = null;

    fileInput.value = "";

    fileInfo.classList.add("hidden");
    editor.classList.add("hidden");
    result.classList.add("hidden");

    pageList.innerHTML = "";
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

    const file = event.dataTransfer.files[0];
    handleFile(file);
  });

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    handleFile(file);
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
