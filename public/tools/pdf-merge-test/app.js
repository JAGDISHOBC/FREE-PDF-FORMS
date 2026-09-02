(() => {
"use strict";

const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

const fileInput = document.getElementById("fileInput");
const chooseButton = document.getElementById("chooseButton");
const uploadArea = document.getElementById("uploadArea");
const fileCount = document.getElementById("fileCount");
const fileList = document.getElementById("fileList");
const mergeButton = document.getElementById("mergeButton");
const anotherButton = document.getElementById("anotherButton");
const status = document.getElementById("status");
const result = document.getElementById("result");
const resultInfo = document.getElementById("resultInfo");
const downloadButton = document.getElementById("downloadButton");

let items = [];
let downloadUrl = null;
let busy = false;
let draggedIndex = -1;

function bytesText(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(2) + " MB";
}

function setStatus(text, type = "working") {
  status.textContent = text;
  status.className = "status show " + type;
}

function clearStatus() {
  status.textContent = "";
  status.className = "status";
}

function totalBytes() {
  return items.reduce((sum, item) => sum + item.file.size, 0);
}

function updateButtons() {
  mergeButton.disabled = busy || items.length < 2;
  fileCount.hidden = items.length === 0;
  fileCount.textContent = items.length
    ? `${items.length} PDF${items.length === 1 ? "" : "s"} selected • ${bytesText(totalBytes())}`
    : "";
}

function renderList() {
  fileList.innerHTML = "";

  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item";
    row.draggable = !busy;
    row.dataset.index = String(index);

    const handle = document.createElement("div");
    handle.className = "handle";
    handle.title = "Drag to reorder";
    handle.textContent = "☷";

    const meta = document.createElement("div");
    meta.className = "meta";

    const name = document.createElement("div");
    name.className = "name";
    name.title = item.file.name;
    name.textContent = `${index + 1}. ${item.file.name}`;

    const size = document.createElement("div");
    size.className = "size";
    size.textContent = bytesText(item.file.size);

    meta.appendChild(name);
    meta.appendChild(size);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const up = document.createElement("button");
    up.className = "small";
    up.type = "button";
    up.textContent = "↑";
    up.title = "Move up";
    up.disabled = index === 0 || busy;
    up.addEventListener("click", () => moveItem(index, index - 1));

    const down = document.createElement("button");
    down.className = "small";
    down.type = "button";
    down.textContent = "↓";
    down.title = "Move down";
    down.disabled = index === items.length - 1 || busy;
    down.addEventListener("click", () => moveItem(index, index + 1));

    const remove = document.createElement("button");
    remove.className = "small remove";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.disabled = busy;
    remove.addEventListener("click", () => removeItem(index));

    actions.appendChild(up);
    actions.appendChild(down);
    actions.appendChild(remove);

    row.appendChild(handle);
    row.appendChild(meta);
    row.appendChild(actions);

    row.addEventListener("dragstart", () => {
      draggedIndex = index;
      row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => {
      draggedIndex = -1;
      row.classList.remove("dragging");
    });
    row.addEventListener("dragover", e => e.preventDefault());
    row.addEventListener("drop", e => {
      e.preventDefault();
      const targetIndex = Number(row.dataset.index);
      if (draggedIndex >= 0 && draggedIndex !== targetIndex) {
        moveItem(draggedIndex, targetIndex);
      }
    });

    fileList.appendChild(row);
  });

  updateButtons();
}

function moveItem(from, to) {
  if (busy || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
  const moved = items.splice(from, 1)[0];
  items.splice(to, 0, moved);
  renderList();
  result.classList.remove("show");
  clearStatus();
}

function removeItem(index) {
  if (busy) return;
  items.splice(index, 1);
  renderList();
  result.classList.remove("show");
  clearStatus();
}

function addFiles(fileArray) {
  clearStatus();
  result.classList.remove("show");

  const incoming = Array.from(fileArray || []);
  if (!incoming.length) return;

  const available = MAX_FILES - items.length;
  if (available <= 0) {
    setStatus(`You can select up to ${MAX_FILES} PDF files.`, "error");
    return;
  }

  const accepted = [];
  const rejected = [];

  for (const file of incoming.slice(0, available)) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      rejected.push(`${file.name}: not a PDF`);
      continue;
    }
    accepted.push({ file });
  }

  if (incoming.length > available) {
    rejected.push(`Only ${available} more PDF file${available === 1 ? "" : "s"} can be added.`);
  }

  const newTotal = totalBytes() + accepted.reduce((s, x) => s + x.file.size, 0);
  if (newTotal > MAX_TOTAL_BYTES) {
    setStatus("The total size of selected PDFs must not exceed 100 MB.", "error");
    return;
  }

  items.push(...accepted);
  renderList();

  if (rejected.length) {
    setStatus(rejected.join(" • "), "error");
  } else if (items.length >= 2) {
    setStatus("PDFs ready. Check the order, then click Merge PDF.", "success");
  }
}

chooseButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

uploadArea.addEventListener("dragover", e => {
  e.preventDefault();
  uploadArea.classList.add("drag");
});
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag"));
uploadArea.addEventListener("drop", e => {
  e.preventDefault();
  uploadArea.classList.remove("drag");
  addFiles(e.dataTransfer.files);
});

anotherButton.addEventListener("click", () => {
  if (busy) return;
  items = [];
  fileInput.value = "";
  fileList.innerHTML = "";
  result.classList.remove("show");
  clearStatus();
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  downloadButton.removeAttribute("href");
  renderList();
});

mergeButton.addEventListener("click", async () => {
  if (busy || items.length < 2) return;

  if (!window.PDFLib || !window.PDFLib.PDFDocument) {
    setStatus("PDF engine could not be loaded. Please refresh and try again.", "error");
    return;
  }

  busy = true;
  updateButtons();
  result.classList.remove("show");
  setStatus("Merging PDFs…", "working");

  try {
    const { PDFDocument } = window.PDFLib;
    const merged = await PDFDocument.create();
    let pageCount = 0;

    for (let i = 0; i < items.length; i++) {
      setStatus(`Reading PDF ${i + 1} of ${items.length}…`, "working");

      const bytes = new Uint8Array(await items[i].file.arrayBuffer());
      const source = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false
      });

      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach(page => merged.addPage(page));
      pageCount += pages.length;
    }

    setStatus("Creating merged PDF…", "working");

    const outputBytes = await merged.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false
    });

    if (!outputBytes || !outputBytes.length) {
      throw new Error("Merged PDF was empty.");
    }

    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(
      new Blob([outputBytes], { type: "application/pdf" })
    );

    downloadButton.href = downloadUrl;
    downloadButton.download = "merged-pdf.pdf";

    resultInfo.textContent =
      `${items.length} PDFs • ${pageCount} pages • ${bytesText(outputBytes.byteLength)}`;

    result.classList.add("show");
    setStatus("PDFs merged successfully.", "success");
  } catch (err) {
    console.error(err);
    let message = err && err.message ? err.message : "Could not merge the PDFs.";
    if (/encrypted|password/i.test(message)) {
      message = "One of the PDFs is password-protected. Unlock it first, then try again.";
    }
    setStatus(message, "error");
  } finally {
    busy = false;
    updateButtons();
  }
});

renderList();
})();