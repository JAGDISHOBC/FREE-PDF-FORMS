const GS_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@okathira/ghostpdl-wasm@1.1.0/dist/gs.js';
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs';

const $ = id => document.getElementById(id);
const fmt = bytes => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};
const pct = (a, b) => b > 0 ? ((1 - a / b) * 100) : 0;
const safeName = name => (name.replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'compressed') + '.pdf';

const fileInput = $('fileInput'), drop = $('drop'), choose = $('choose');
const fileInfo = $('fileInfo'), fileName = $('fileName'), fileSize = $('fileSize');
const controls = $('controls'), compress = $('compress'), clear = $('clear');
const status = $('status'), statusText = $('statusText'), bar = $('bar');
const result = $('result'), resultMessage = $('resultMessage'), originalSize = $('originalSize');
const compressedSize = $('compressedSize'), savedSize = $('savedSize');
const download = $('download'), outName = $('outName'), testAgain = $('testAgain');

let selectedFile = null, outputBlob = null, outputUrl = null, pdfjs = null, lastOriginalPages = null;

function setStatus(text, percent = null, kind = '') {
  status.className = 'status show ' + kind;
  statusText.textContent = text;
  if (percent !== null) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
}

function resetStatus() {
  status.className = 'status';
  bar.style.width = '0%';
  statusText.textContent = '';
}

function modeArgs(mode) {
  const common = [
    '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.7', '-dNOPAUSE', '-dBATCH', '-dSAFER',
    '-dDetectDuplicateImages=true', '-dCompressFonts=true', '-dSubsetFonts=true',
    '-dEmbedAllFonts=true', '-dCompressPages=true', '-dOptimize=true'
  ];
  if (mode === 'normal') return [...common, '-dPDFSETTINGS=/printer', '-dDownsampleColorImages=true', '-dColorImageDownsampleType=/Bicubic', '-dColorImageResolution=220', '-dDownsampleGrayImages=true', '-dGrayImageDownsampleType=/Bicubic', '-dGrayImageResolution=220', '-dDownsampleMonoImages=true', '-dMonoImageResolution=300'];
  if (mode === 'strong') return [...common, '-dPDFSETTINGS=/screen', '-dDownsampleColorImages=true', '-dColorImageDownsampleType=/Bicubic', '-dColorImageResolution=100', '-dDownsampleGrayImages=true', '-dGrayImageDownsampleType=/Bicubic', '-dGrayImageResolution=120', '-dDownsampleMonoImages=true', '-dMonoImageResolution=200'];
  return [...common, '-dPDFSETTINGS=/ebook', '-dDownsampleColorImages=true', '-dColorImageDownsampleType=/Bicubic', '-dColorImageResolution=150', '-dDownsampleGrayImages=true', '-dGrayImageDownsampleType=/Bicubic', '-dGrayImageResolution=150', '-dDownsampleMonoImages=true', '-dMonoImageResolution=240'];
}

async function loadPdfJs() {
  if (pdfjs) return pdfjs;
  pdfjs = await import(PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  return pdfjs;
}

async function inspectPdf(blob, originalPages) {
  try {
    const pdf = await loadPdfJs();
    const data = new Uint8Array(await blob.arrayBuffer());
    const doc = await pdf.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
    const pages = doc.numPages;
    let textChars = 0;
    
    // Sample a maximum of 12 pages for text validation to maintain speed
    const limit = Math.min(pages, 12);
    for (let i = 1; i <= limit; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      textChars += tc.items.reduce((n, x) => n + (x.str || '').length, 0);
    }
    
    const openEl = $('checkOpen'), pagesEl = $('checkPages'), textEl = $('checkText'), searchEl = $('checkSearch');
    openEl.className = 'check ok';
    openEl.textContent = '✓ PDF opens successfully';
    
    pagesEl.className = 'check ' + (pages === originalPages ? 'ok' : 'fail');
    pagesEl.textContent = (pages === originalPages ? '✓ ' : '✗ ') + `Pages preserved: ${pages}/${originalPages}`;
    
    textEl.className = 'check ' + (textChars > 0 ? 'ok' : 'fail');
    textEl.textContent = (textChars > 0 ? '✓ ' : '✗ ') + `Text layer detected: ${textChars.toLocaleString()} characters`;
    
    searchEl.className = 'check ' + (textChars > 0 ? 'ok' : 'fail');
    searchEl.textContent = (textChars > 0 ? '✓ ' : '✗ ') + (textChars > 0 ? 'Search/selectability should be available' : 'No extractable text detected in sampled pages');
    
    await doc.destroy();
  } catch (e) {
    for (const id of ['checkOpen', 'checkPages', 'checkText', 'checkSearch']) {
      $(id).className = 'check fail';
      $(id).textContent = '✗ Validation error: ' + (e.message || e);
    }
  }
}

async function compressWithGhostscript(file, mode) {
  const { default: loadWASM } = await import(GS_MODULE_URL);
  setStatus('Loading PDF engine…', 8);
  const Module = await loadWASM();
  
  setStatus('Preparing PDF…', 18);
  const inputName = 'input.pdf', outputName = 'output.pdf';
  
  // Ensure clean state
  try { Module.FS.unlink(inputName); } catch {}
  try { Module.FS.unlink(outputName); } catch {}
  
  Module.FS.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
  setStatus(`Compressing (${mode})…`, 35);
  
  const args = [...modeArgs(mode), '-sOutputFile=' + outputName, inputName];
  Module.callMain(args);
  
  setStatus('Reading optimized PDF…', 82);
  const bytes = Module.FS.readFile(outputName, { encoding: 'binary' });
  
  // Cleanup WASM FileSystem footprint
  try { Module.FS.unlink(inputName); } catch {}
  try { Module.FS.unlink(outputName); } catch {}
  
  return new Blob([bytes], { type: 'application/pdf' });
}

async function run() {
  if (!selectedFile) return;
  const mode = document.querySelector('input[name="level"]:checked').value;
  
  compress.disabled = true;
  clear.disabled = true;
  result.classList.remove('show');
  outputBlob = null;
  download.disabled = true;

  try {
    setStatus('Starting ' + mode + ' compression…', 3);
    
    outputBlob = await compressWithGhostscript(selectedFile, mode);
    const reduction = pct(outputBlob.size, selectedFile.size);
    
    originalSize.textContent = fmt(selectedFile.size);
    compressedSize.textContent = fmt(outputBlob.size);
    savedSize.textContent = reduction > 0 ? `${reduction.toFixed(1)}%` : '0%';
    outName.value = safeName(selectedFile.name.replace(/\.pdf$/i, '') + '_' + mode);

    if (outputBlob.size < selectedFile.size * 0.99) {
      resultMessage.className = 'status show ok';
      resultMessage.textContent = `✓ ${mode[0].toUpperCase() + mode.slice(1)} compression produced a smaller PDF.`;
      download.disabled = false;
    } else {
      resultMessage.className = 'status show';
      resultMessage.textContent = 'This PDF is already well optimized at this compression level. Further reduction may affect quality.';
      download.disabled = false;
    }

    result.classList.add('show');
    setStatus('Compression complete.', 100, 'ok');

    await inspectPdf(outputBlob, lastOriginalPages);
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    console.error(e);
    setStatus('Compression failed: ' + (e.message || e), 0, 'error');
    resultMessage.className = 'status show error';
    resultMessage.textContent = 'Compression failed. Open browser DevTools Console for the technical error.';
    result.classList.add('show');
  } finally {
    compress.disabled = false;
    clear.disabled = false;
  }
}

async function selectFile(file) {
  if (!file) return;
  
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    setStatus('Please choose a valid PDF file.', 0, 'error');
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    setStatus('File exceeds 50MB limit.', 0, 'error');
    return;
  }

  // Instant UI update independent of libraries
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = fmt(file.size);
  fileInfo.classList.add('show');
  controls.classList.remove('hidden');
  compress.disabled = false;
  resetStatus();
  result.classList.remove('show');
  outName.value = safeName(file.name.replace(/\.pdf$/i, '') + '_compressed');
  lastOriginalPages = null;

  // Background page counting
  try {
    const pdf = await loadPdfJs();
    const src = new Uint8Array(await selectedFile.arrayBuffer());
    const doc = await pdf.getDocument({ data: src, useWorkerFetch: false, isEvalSupported: false }).promise;
    lastOriginalPages = doc.numPages;
    await doc.destroy();
  } catch (err) {
    console.warn("Could not determine original page count:", err);
  }
}

// Bind events cleanly
function init() {
  choose.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
  });
  
  drop.addEventListener('click', (e) => {
    if (e.target !== choose && e.target !== fileInput) fileInput.click();
  });
  
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) selectFile(fileInput.files[0]);
  });

  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault();
    drop.classList.add('drag');
  }));
  
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault();
    drop.classList.remove('drag');
  }));
  
  drop.addEventListener('drop', e => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) selectFile(e.dataTransfer.files[0]);
  });

  compress.addEventListener('click', run);
  clear.addEventListener('click', () => location.reload());
  
  testAgain.addEventListener('click', () => {
    result.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  download.addEventListener('click', () => {
    if (!outputBlob) return;
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = safeName(outName.value);
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  document.querySelectorAll('.level').forEach(l => {
    l.addEventListener('click', () => {
      document.querySelectorAll('.level').forEach(x => x.classList.remove('selected'));
      l.classList.add('selected');
      l.querySelector('input').checked = true;
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}