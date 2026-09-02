(() => {
"use strict";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@neslinesli93/qpdf-wasm@0.3.0/dist/qpdf.wasm";

const fileInput = document.getElementById("fileInput");
const chooseButton = document.getElementById("chooseButton");
const uploadArea = document.getElementById("uploadArea");
const fileName = document.getElementById("fileName");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const matchText = document.getElementById("matchText");
const protectButton = document.getElementById("protectButton");
const anotherButton = document.getElementById("anotherButton");
const status = document.getElementById("status");
const result = document.getElementById("result");
const resultInfo = document.getElementById("resultInfo");
const downloadButton = document.getElementById("downloadButton");

let selectedFile = null;
let downloadUrl = null;
let busy = false;

function setStatus(text, type) {
  status.textContent = text;
  status.className = "status show " + (type || "working");
}
function clearStatus() {
  status.textContent = "";
  status.className = "status";
}
function bytesText(n) {
  if (n < 1024) return n + " B";
  if (n < 1024*1024) return (n/1024).toFixed(1) + " KB";
  return (n/1024/1024).toFixed(2) + " MB";
}
function updateButton() {
  const p = password.value;
  const c = confirmPassword.value;
  const ok = selectedFile && p.length >= 6 && p === c && !busy;
  protectButton.disabled = !ok;

  if (!c) {
    matchText.textContent = "";
    matchText.style.color = "";
  } else if (p === c) {
    matchText.textContent = "Passwords match.";
    matchText.style.color = "#047857";
  } else {
    matchText.textContent = "Passwords do not match.";
    matchText.style.color = "#b91c1c";
  }
}

function chooseFile() {
  fileInput.click();
}

function selectFile(file) {
  clearStatus();
  result.classList.remove("show");
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }

  if (!file) return;

  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    selectedFile = null;
    fileName.textContent = "";
    setStatus("Please select a valid PDF file.", "error");
    updateButton();
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    selectedFile = null;
    fileName.textContent = "";
    setStatus("Maximum file size is 50 MB.", "error");
    updateButton();
    return;
  }

  selectedFile = file;
  fileName.textContent = "Selected: " + file.name + " • " + bytesText(file.size);
  updateButton();
}

chooseButton.addEventListener("click", chooseFile);
fileInput.addEventListener("change", () => selectFile(fileInput.files && fileInput.files[0]));

uploadArea.addEventListener("dragover", e => {
  e.preventDefault();
  uploadArea.classList.add("drag");
});
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag"));
uploadArea.addEventListener("drop", e => {
  e.preventDefault();
  uploadArea.classList.remove("drag");
  selectFile(e.dataTransfer.files && e.dataTransfer.files[0]);
});

password.addEventListener("input", updateButton);
confirmPassword.addEventListener("input", updateButton);

anotherButton.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  fileName.textContent = "";
  password.value = "";
  confirmPassword.value = "";
  result.classList.remove("show");
  clearStatus();
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  updateButton();
});

async function getQpdf() {
  if (typeof window.Module !== "function") {
    throw new Error("Secure PDF engine is still loading. Please wait a moment and try again.");
  }
  return window.Module({
    locateFile: () => WASM_URL,
    noInitialRun: true
  });
}

protectButton.addEventListener("click", async () => {
  if (!selectedFile || busy) return;

  if (password.value.length < 6) {
    setStatus("Please enter a password of at least 6 characters.", "error");
    return;
  }
  if (password.value !== confirmPassword.value) {
    setStatus("Passwords do not match.", "error");
    return;
  }

  busy = true;
  updateButton();
  result.classList.remove("show");
  setStatus("Loading secure PDF engine…", "working");

  let qpdf = null;

  try {
    qpdf = await getQpdf();
    setStatus("Encrypting PDF with AES-256…", "working");

    const inputBytes = new Uint8Array(await selectedFile.arrayBuffer());
    qpdf.FS.writeFile("/input.pdf", inputBytes);

    // Keep the interface simple: password protection only.
    // QPDF's default permissions are fully permissive.
    const ownerPassword = crypto.randomUUID() + crypto.randomUUID();

    const args = [
      "/input.pdf",
      "--encrypt",
      password.value,
      ownerPassword,
      "256",
      "--",
      "/output.pdf"
    ];

    const exitCode = qpdf.callMain(args);
    // qpdf-wasm exposes FS.writeFile/readFile/callMain; analyzePath is not part of this build.
    if (typeof exitCode === "number" && exitCode !== 0) {
      throw new Error("PDF encryption failed.");
    }

    let outputBytes;
    try {
      outputBytes = new Uint8Array(qpdf.FS.readFile("/output.pdf"));
    } catch (readError) {
      throw new Error("Protected PDF was not created. " + (readError?.message || ""));
    }
    const blob = new Blob([outputBytes], {type:"application/pdf"});

    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(blob);

    const base = selectedFile.name.replace(/\.pdf$/i, "");
    const outputName = base + "-protected.pdf";

    downloadButton.href = downloadUrl;
    downloadButton.download = outputName;
    resultInfo.textContent =
      "Original: " + bytesText(selectedFile.size) +
      " • Protected: " + bytesText(outputBytes.byteLength) +
      " • AES-256 encryption";

    result.classList.add("show");
    setStatus("PDF protected successfully.", "success");

    try { qpdf.FS.unlink("/input.pdf"); } catch {}
    try { qpdf.FS.unlink("/output.pdf"); } catch {}

  } catch (err) {
    console.error(err);
    setStatus(err && err.message ? err.message : "Could not protect this PDF.", "error");
  } finally {
    busy = false;
    updateButton();
  }
});

updateButton();
})();
