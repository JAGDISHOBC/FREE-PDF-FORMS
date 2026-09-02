(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       ELEMENTS - EXISTING index.html
    ========================================================= */

    const uploadArea = document.getElementById("uploadArea");
    const browseButton = document.getElementById("browseButton");
    const fileInput = document.getElementById("fileInput");

    const editor = document.getElementById("editor");
    const imagePreview = document.getElementById("imagePreview");
    const previewWrapper = document.querySelector(".preview-wrapper");

    const fileInfo = document.getElementById("fileInfo");
    const errorMessage = document.getElementById("errorMessage");

    const result = document.getElementById("result");
    const resultInfo = document.getElementById("resultInfo");
    const downloadButton = document.getElementById("downloadButton");

    const outputWidth = document.getElementById("outputWidth");
    const outputHeight = document.getElementById("outputHeight");
    const lockAspect = document.getElementById("lockAspect");

    const outputFormat = document.getElementById("outputFormat");
    const qualityRange = document.getElementById("qualityRange");
    const qualityValue = document.getElementById("qualityValue");

    const ratioWidth = document.getElementById("ratioWidth");
    const ratioHeight = document.getElementById("ratioHeight");
    const customRatioGroup =
      document.getElementById("customRatioGroup");

    const processButton =
      document.getElementById("processButton");

    const resetButton =
      document.getElementById("resetButton");

    const ratioButtons =
      document.querySelectorAll(".ratio-button");

    const controls =
      document.querySelector(".controls");


    /* =========================================================
       SAFETY CHECK
    ========================================================= */

    if (!uploadArea || !fileInput || !imagePreview) {
      console.error(
        "Image Crop & Resize: required HTML elements are missing."
      );
      return;
    }


    /* =========================================================
       CONSTANTS
    ========================================================= */

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const MAX_OUTPUT_DIMENSION = 10000;

    const state = {
      file: null,
      image: null,
      objectUrl: null,
      outputUrl: null,

      crop: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },

      ratio: null,

      advancedOpen: false
    };

    /*
      Save the ORIGINAL Advanced Settings from index.html.
      These values are captured once, before the tool changes
      anything after an image is uploaded.
    */
    const advancedDefaults = {
      outputFormat: outputFormat?.value || "image/jpeg",
      quality: qualityRange?.value || "85",
      lockAspect: Boolean(lockAspect?.checked),
      ratioWidth: ratioWidth?.value || "",
      ratioHeight: ratioHeight?.value || ""
    };


    /* =========================================================
       TARGET SIZE UI
    ========================================================= */

    let targetGroup = null;
    let targetSizeInput = null;
    let targetProcessButton = null;
    let targetResultMessage = null;


    function createTargetSizeUI() {

      if (!controls) {
        console.error("Controls container not found.");
        return;
      }

      /* Prevent duplicate UI */
      if (document.getElementById("targetSizeInput")) {
        targetSizeInput =
          document.getElementById("targetSizeInput");

        targetProcessButton =
          document.getElementById("targetProcessButton");

        targetResultMessage =
          document.getElementById("targetResultMessage");

        return;
      }

      targetGroup =
        document.createElement("div");

      targetGroup.className =
        "control-group target-size-group";

      targetGroup.innerHTML = `
        <div class="target-size-box">

          <label for="targetSizeInput">
            🎯 Target File Size
          </label>

          <div class="target-input-row">

            <input
              id="targetSizeInput"
              type="number"
              min="1"
              max="50000"
              step="1"
              inputmode="numeric"
              placeholder="Example: 80"
              aria-label="Target file size in KB"
            >

            <span class="target-unit">KB</span>

          </div>

          <p class="target-help">
            Enter the maximum file size you need.
            Final file will never intentionally exceed this size.
          </p>

          <button
            id="targetProcessButton"
            type="button"
            class="target-process-button"
          >
            Compress to Target Size
          </button>

          <div
            id="targetResultMessage"
            class="target-result-message"
            aria-live="polite"
          ></div>

        </div>
      `;

      controls.insertBefore(
        targetGroup,
        controls.firstChild
      );

      targetSizeInput =
        document.getElementById("targetSizeInput");

      targetProcessButton =
        document.getElementById("targetProcessButton");

      targetResultMessage =
        document.getElementById("targetResultMessage");

      targetProcessButton.addEventListener(
        "click",
        processTargetSize
      );
    }


    /* =========================================================
       ADVANCED SECTION
    ========================================================= */

    let advancedToggle = null;
    let advancedContent = null;


    function createAdvancedSection() {

      if (!controls) return;

      const existing =
        controls.querySelector(".advanced-content");

      if (existing) {
        advancedContent = existing;
        return;
      }

      const groups =
        Array.from(
          controls.querySelectorAll(".control-group")
        );

      const target =
        controls.querySelector(".target-size-group");

      advancedToggle =
        document.createElement("button");

      advancedToggle.type = "button";
      advancedToggle.className =
        "advanced-toggle";

      advancedToggle.innerHTML = `
        <span>Advanced Crop & Edit</span>
        <span class="advanced-arrow">⌄</span>
      `;

      advancedContent =
        document.createElement("div");

      advancedContent.className =
        "advanced-content";

      advancedContent.style.display =
        "none";

      groups
        .filter(group => group !== target)
        .forEach(group => {
          advancedContent.appendChild(group);
        });

      controls.appendChild(advancedToggle);
      controls.appendChild(advancedContent);

      advancedToggle.addEventListener(
        "click",
        () => {

          state.advancedOpen =
            !state.advancedOpen;

          advancedContent.style.display =
            state.advancedOpen
              ? "block"
              : "none";

          advancedToggle.classList.toggle(
            "open",
            state.advancedOpen
          );

        }
      );
    }


    /* =========================================================
       EXTRA CSS
    ========================================================= */

    function addStyles() {

      const style =
        document.createElement("style");

      style.textContent = `

        .target-size-group {
          margin-bottom: 20px;
        }

        .target-size-box {
          padding: 18px;
          border: 1px solid #bfdbfe;
          border-radius: 14px;
          background: #f8fbff;
        }

        .target-size-box > label {
          display: block;
          margin-bottom: 10px;
          font-size: 16px;
          font-weight: 800;
        }

        .target-input-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        #targetSizeInput {
          width: 100%;
          height: 46px;
          box-sizing: border-box;
          padding: 0 13px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #fff;
          color: #111827;
          font-size: 17px;
          font-weight: 700;
          outline: none;
        }

        #targetSizeInput:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(37,99,235,.10);
        }

        .target-unit {
          font-weight: 800;
          color: #475569;
        }

        .target-help {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .target-process-button {
          width: 100%;
          min-height: 46px;
          margin-top: 14px;
          padding: 10px 14px;
          border: 0;
          border-radius: 9px;
          background: #2563eb;
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .target-process-button:hover {
          background: #1d4ed8;
        }

        .target-process-button:disabled {
          opacity: .65;
          cursor: wait;
        }

        .target-result-message {
          margin-top: 10px;
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
        }

        .target-result-message.success {
          color: #15803d;
        }

        .target-result-message.error {
          color: #b91c1c;
        }

        .target-result-card {
          margin-top: 16px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
        }

        .target-result-card .result-title {
          font-size: 17px;
          font-weight: 800;
          margin-bottom: 9px;
        }

        .target-result-card .result-line {
          margin-top: 5px;
        }

        .target-result-card .safe {
          margin-top: 10px;
          font-weight: 800;
          color: #15803d;
        }

        .advanced-toggle {
          width: 100%;
          min-height: 46px;
          margin-top: 6px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #fff;
          color: #172033;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .advanced-toggle:hover {
          border-color: #93c5fd;
        }

        .reset-advanced-button {
          width: 100%;
          min-height: 42px;
          margin-bottom: 14px;
          padding: 9px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #f8fafc;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all .2s ease;
        }

        .reset-advanced-button:hover {
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .reset-advanced-button:active {
          transform: translateY(1px);
        }

        .advanced-arrow {
          font-size: 20px;
          transition: transform .2s ease;
        }

        .advanced-toggle.open .advanced-arrow {
          transform: rotate(180deg);
        }

        .advanced-content {
          margin-top: 15px;
        }

        #imagePreview {
          max-width: 100%;
          height: auto;
          display: block;
        }

        @media (max-width: 600px) {

          .target-input-row {
            gap: 7px;
          }

          #targetSizeInput {
            font-size: 16px;
          }

          .target-process-button {
            min-height: 48px;
          }

        }
      `;

      document.head.appendChild(style);
    }


    /* =========================================================
       ERROR HANDLING
    ========================================================= */

    function clearError() {

      if (!errorMessage) return;

      errorMessage.textContent = "";

      errorMessage.classList.remove(
        "visible"
      );
    }


    function showError(message) {

      if (!errorMessage) {
        alert(message);
        return;
      }

      errorMessage.textContent =
        message;

      errorMessage.classList.add(
        "visible"
      );
    }


    /* =========================================================
       FILE VALIDATION
    ========================================================= */

    function validateFile(file) {

      if (!file) {
        return "Please choose an image.";
      }

      const allowed =
        [
          "image/jpeg",
          "image/png",
          "image/webp"
        ];

      if (!allowed.includes(file.type)) {
        return
          "Please use JPG, JPEG, PNG or WebP.";
      }

      if (file.size <= 0) {
        return "The selected file is empty.";
      }

      if (file.size > MAX_FILE_SIZE) {
        return
          "Image is too large. Maximum allowed size is 20 MB.";
      }

      return null;
    }


    /* =========================================================
       FILE PICKER
    ========================================================= */

    function openFilePicker() {

      try {

        fileInput.value = "";

        fileInput.click();

      } catch (error) {

        console.error(
          "File picker error:",
          error
        );

      }
    }


    browseButton?.addEventListener(
      "click",
      (event) => {

        event.preventDefault();
        event.stopPropagation();

        openFilePicker();

      }
    );


    uploadArea.addEventListener(
      "click",
      (event) => {

        if (
          event.target.closest(
            "#browseButton"
          )
        ) {
          return;
        }

        openFilePicker();

      }
    );


    uploadArea.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          openFilePicker();

        }

      }
    );


    /* =========================================================
       FILE CHANGE
    ========================================================= */

    fileInput.addEventListener(
      "change",
      () => {

        const file =
          fileInput.files?.[0];

        if (file) {
          handleFile(file);
        }

      }
    );


    /* =========================================================
       DRAG & DROP
    ========================================================= */

    uploadArea.addEventListener(
      "dragover",
      (event) => {

        event.preventDefault();

        uploadArea.classList.add(
          "dragover"
        );

      }
    );


    uploadArea.addEventListener(
      "dragleave",
      () => {

        uploadArea.classList.remove(
          "dragover"
        );

      }
    );


    uploadArea.addEventListener(
      "drop",
      (event) => {

        event.preventDefault();

        uploadArea.classList.remove(
          "dragover"
        );

        const file =
          event.dataTransfer?.files?.[0];

        if (file) {
          handleFile(file);
        }

      }
    );


    /* =========================================================
       HANDLE FILE
    ========================================================= */

    async function handleFile(file) {

      clearError();

      clearResult();

      resetTargetMessage();

      const validationError =
        validateFile(file);

      if (validationError) {

        showError(
          validationError
        );

        return;
      }

      try {

        state.file = file;

        revokeObjectUrl();

        state.objectUrl =
          URL.createObjectURL(file);

        const image =
          await loadImage(
            state.objectUrl
          );

        state.image = image;

        state.crop = {
          x: 0,
          y: 0,
          width: image.naturalWidth,
          height: image.naturalHeight
        };

        state.ratio = null;

        /* SHOW PREVIEW */

        imagePreview.src =
          state.objectUrl;

        imagePreview.style.display =
          "block";

        /* SHOW EDITOR */

        if (editor) {
          editor.classList.add(
            "visible"
          );
        }

        if (fileInfo) {

          fileInfo.classList.add(
            "visible"
          );

          fileInfo.textContent =
            `${file.name} • ` +
            `${formatBytes(file.size)} • ` +
            `${image.naturalWidth} × ` +
            `${image.naturalHeight}px`;

        }

        /* SET DEFAULT DIMENSIONS */

        if (outputWidth) {
          outputWidth.value =
            image.naturalWidth;
        }

        if (outputHeight) {
          outputHeight.value =
            image.naturalHeight;
        }

        /* RESET TARGET */

        if (targetSizeInput) {
          targetSizeInput.value = "";
        }

        /* SHOW TARGET BOX */

        if (targetGroup) {
          targetGroup.style.display =
            "block";
        }

        if (advancedToggle) {
          advancedToggle.style.display =
            "flex";
        }

        /* RESET RESULT */

        if (result) {
          result.classList.remove(
            "visible"
          );
        }

        updateRatioButtons();

        requestAnimationFrame(
          updatePreview
        );

      } catch (error) {

        console.error(
          "Image loading error:",
          error
        );

        resetTool();

        showError(
          "This image could not be opened. Please choose another image."
        );

      }
    }


    /* =========================================================
       LOAD IMAGE
    ========================================================= */

    function loadImage(url) {

      return new Promise(
        (resolve, reject) => {

          const image =
            new Image();

          image.onload =
            () => resolve(image);

          image.onerror =
            () =>
              reject(
                new Error(
                  "Image loading failed."
                )
              );

          image.src = url;

        }
      );
    }


    /* =========================================================
       TARGET SIZE PROCESS
    ========================================================= */

    async function processTargetSize() {

      clearError();

      clearResult();

      resetTargetMessage();

      if (!state.image) {

        showError(
          "Please choose an image first."
        );

        return;
      }

      const targetKB =
        Number(
          targetSizeInput?.value
        );

      if (
        !Number.isFinite(targetKB) ||
        targetKB <= 0
      ) {

        showError(
          "Please enter a valid target size in KB."
        );

        targetSizeInput?.focus();

        return;
      }

      if (targetKB > 50000) {

        showError(
          "Target size cannot be more than 50,000 KB."
        );

        return;
      }

      const targetBytes =
        Math.floor(
          targetKB * 1024
        );

      targetProcessButton.disabled =
        true;

      targetProcessButton.textContent =
        "Finding the best possible size...";

      targetResultMessage.textContent =
        "Processing your image...";

      try {

        const best =
          await findBestTargetImage(
            targetBytes
          );

        if (!best) {

          throw new Error(
            "No suitable image could be created."
          );

        }

        /*
          IMPORTANT:
          Never accept a result above target.
        */

        if (
          best.blob.size >
          targetBytes
        ) {

          throw new Error(
            "Output exceeded target."
          );

        }

        showTargetResult(
          best,
          targetBytes
        );

      } catch (error) {

        console.error(
          "Target processing error:",
          error
        );

        targetResultMessage.className =
          "target-result-message error";

        targetResultMessage.textContent =
          "Could not reach this target safely. Try a slightly larger target size.";

      } finally {

        targetProcessButton.disabled =
          false;

        targetProcessButton.textContent =
          "Compress to Target Size";

      }
    }


    /* =========================================================
       FIND BEST TARGET IMAGE
    ========================================================= */

    async function findBestTargetImage(
      targetBytes
    ) {

      const crop =
        normalizeCrop();

      let baseWidth =
        Math.round(
          crop.width
        );

      let baseHeight =
        Math.round(
          crop.height
        );

      if (
        !baseWidth ||
        !baseHeight
      ) {

        baseWidth =
          state.image.naturalWidth;

        baseHeight =
          state.image.naturalHeight;

      }

      /*
        Try full resolution first,
        then gradually smaller dimensions.
      */

      const scales = [
        1,
        0.90,
        0.80,
        0.70,
        0.60,
        0.50,
        0.40,
        0.32,
        0.25,
        0.20,
        0.15,
        0.10,
        0.07,
        0.05
      ];

      let best =
        null;

      for (
        const scale of scales
      ) {

        const width =
          Math.max(
            1,
            Math.round(
              baseWidth * scale
            )
          );

        const height =
          Math.max(
            1,
            Math.round(
              baseHeight * scale
            )
          );

        const candidate =
          await findBestQuality(
            crop,
            width,
            height,
            targetBytes
          );

        if (!candidate) {
          continue;
        }

        if (
          candidate.blob.size <=
          targetBytes
        ) {

          if (
            !best ||
            candidate.blob.size >
              best.blob.size
          ) {

            best =
              candidate;

          }

          /*
            If within 3 KB of target,
            this is good enough.
          */

          if (
            targetBytes -
              candidate.blob.size
              <=
            3 * 1024
          ) {

            break;

          }
        }

        /*
          Allow browser to update UI
          between heavy canvas operations.
        */

        await nextFrame();
      }

      return best;
    }


    /* =========================================================
       QUALITY SEARCH
    ========================================================= */

    async function findBestQuality(
      crop,
      width,
      height,
      targetBytes
    ) {

      let low = 5;
      let high = 95;

      let best =
        null;

      /*
        Binary search for quality.
      */

      for (
        let i = 0;
        i < 8;
        i++
      ) {

        const quality =
          Math.floor(
            (low + high) / 2
          );

        const blob =
          await renderCropToBlob(
            crop,
            width,
            height,
            "image/jpeg",
            quality / 100
          );

        if (!blob) {
          continue;
        }

        if (
          blob.size <=
          targetBytes
        ) {

          best = {
            blob: blob,
            size: blob.size,
            width: width,
            height: height,
            quality: quality
          };

          low =
            quality + 1;

        } else {

          high =
            quality - 1;

        }

        await nextFrame();
      }


      /*
        Check nearby quality levels.
      */

      if (best) {

        const start =
          Math.max(
            5,
            best.quality - 3
          );

        const end =
          Math.min(
            95,
            best.quality + 3
          );

        for (
          let quality = start;
          quality <= end;
          quality++
        ) {

          const blob =
            await renderCropToBlob(
              crop,
              width,
              height,
              "image/jpeg",
              quality / 100
            );

          if (
            blob &&
            blob.size <=
            targetBytes
          ) {

            if (
              blob.size >
              best.blob.size
            ) {

              best = {
                blob: blob,
                size: blob.size,
                width: width,
                height: height,
                quality: quality
              };

            }

          }

        }

      }

      return best;
    }


    /* =========================================================
       RENDER CROP TO BLOB
    ========================================================= */

    function renderCropToBlob(
      crop,
      width,
      height,
      format,
      quality
    ) {

      return new Promise(
        (resolve) => {

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            Math.max(
              1,
              Math.round(width)
            );

          canvas.height =
            Math.max(
              1,
              Math.round(height)
            );

          const ctx =
            canvas.getContext(
              "2d",
              {
                alpha: false
              }
            );

          if (!ctx) {

            resolve(null);

            return;
          }

          ctx.fillStyle =
            "#ffffff";

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.imageSmoothingEnabled =
            true;

          ctx.imageSmoothingQuality =
            "high";

          ctx.drawImage(
            state.image,

            crop.x,
            crop.y,
            crop.width,
            crop.height,

            0,
            0,
            canvas.width,
            canvas.height
          );

          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            format,
            quality
          );

        }
      );
    }


    /* =========================================================
       SHOW TARGET RESULT
    ========================================================= */

    function showTargetResult(
      data,
      targetBytes
    ) {

      revokeOutputUrl();

      state.outputUrl =
        URL.createObjectURL(
          data.blob
        );

      const baseName =
        getSafeBaseName(
          state.file.name
        );

      const finalKB =
        data.blob.size / 1024;

      const targetKB =
        targetBytes / 1024;

      const difference =
        targetKB - finalKB;

      const filename =
        `${baseName}-${Math.round(finalKB)}kb.jpg`;

      downloadButton.href =
        state.outputUrl;

      downloadButton.download =
        filename;

      /*
        Existing result section
      */

      if (resultInfo) {

        resultInfo.textContent =
          `Target: ${targetKB.toFixed(1)} KB • ` +
          `Final size: ${finalKB.toFixed(1)} KB • ` +
          `${data.width} × ${data.height}px`;

      }

      if (result) {

        result.classList.add(
          "visible"
        );

      }

      /*
        Target information
      */

      targetResultMessage.className =
        "target-result-message success";

      targetResultMessage.innerHTML =
        `✅ Ready — Final size: <strong>${finalKB.toFixed(1)} KB</strong>`;

      /*
        Extra clear result card
      */

      let resultCard =
        document.getElementById(
          "targetResultCard"
        );

      if (!resultCard) {

        resultCard =
          document.createElement(
            "div"
          );

        resultCard.id =
          "targetResultCard";

        resultCard.className =
          "target-result-card";

        if (result) {
          result.appendChild(
            resultCard
          );
        }

      }

      resultCard.innerHTML = `
        <div class="result-title">
          ✅ Image Ready
        </div>

        <div class="result-line">
          Target Size:
          <strong>${targetKB.toFixed(1)} KB</strong>
        </div>

        <div class="result-line">
          Final Size:
          <strong>${finalKB.toFixed(1)} KB</strong>
        </div>

        <div class="result-line">
          Dimensions:
          <strong>${data.width} × ${data.height}px</strong>
        </div>

        <div class="safe">
          ✅ ${difference.toFixed(1)} KB below target
        </div>
      `;

      /*
        Scroll result into view
      */

      setTimeout(() => {

        result?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      }, 100);

    }


    /* =========================================================
       ADVANCED PROCESS
    ========================================================= */

    processButton?.addEventListener(
      "click",
      async () => {

        clearError();

        clearResult();

        if (!state.image) {

          showError(
            "Please choose an image first."
          );

          return;
        }

        const width =
          Number(
            outputWidth.value
          );

        const height =
          Number(
            outputHeight.value
          );

        if (
          !Number.isInteger(width) ||
          !Number.isInteger(height) ||
          width < 1 ||
          height < 1
        ) {

          showError(
            "Please enter valid output dimensions."
          );

          return;
        }

        if (
          width >
            MAX_OUTPUT_DIMENSION ||
          height >
            MAX_OUTPUT_DIMENSION
        ) {

          showError(
            "Maximum output dimension is 10,000 × 10,000 pixels."
          );

          return;
        }

        processButton.disabled =
          true;

        processButton.textContent =
          "Processing...";

        try {

          const crop =
            normalizeCrop();

          const format =
            outputFormat.value ||
            "image/jpeg";

          const quality =
            Number(
              qualityRange.value || 85
            ) / 100;

          const blob =
            await renderCropToBlob(
              crop,
              width,
              height,
              format,
              quality
            );

          if (!blob) {
            throw new Error(
              "Unable to create output."
            );
          }

          revokeOutputUrl();

          state.outputUrl =
            URL.createObjectURL(
              blob
            );

          const extension =
            getExtension(
              format
            );

          const baseName =
            getSafeBaseName(
              state.file.name
            );

          downloadButton.href =
            state.outputUrl;

          downloadButton.download =
            `${baseName}-processed.${extension}`;

          resultInfo.textContent =
            `Output: ${width} × ${height}px • ` +
            `${formatBytes(blob.size)} • ` +
            `${extension.toUpperCase()}`;

          result.classList.add(
            "visible"
          );

        } catch (error) {

          console.error(error);

          showError(
            "Image processing failed. Please try again."
          );

        } finally {

          processButton.disabled =
            false;

          processButton.textContent =
            "Process Image";

        }

      }
    );


    /* =========================================================
       RATIO BUTTONS
    ========================================================= */

    ratioButtons.forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const value =
              button.dataset.ratio;

            clearError();

            if (
              value === "free"
            ) {

              state.ratio =
                null;

              if (
                customRatioGroup
              ) {

                customRatioGroup.style.display =
                  "none";

              }

              updateRatioButtons();

              return;
            }

            if (
              value === "custom"
            ) {

              if (
                customRatioGroup
              ) {

                customRatioGroup.style.display =
                  "block";

              }

              updateCustomRatio();

              return;
            }

            if (
              customRatioGroup
            ) {

              customRatioGroup.style.display =
                "none";

            }

            const parts =
              value.split(":");

            if (
              parts.length !== 2
            ) {
              return;
            }

            const w =
              Number(parts[0]);

            const h =
              Number(parts[1]);

            if (
              !w ||
              !h ||
              w <= 0 ||
              h <= 0
            ) {

              return;

            }

            state.ratio =
              w / h;

            fitCropToRatio();

            updateRatioButtons();

            updateOutputDimensionsFromCrop();

          }
        );

      }
    );


    /* =========================================================
       CUSTOM RATIO
    ========================================================= */

    ratioWidth?.addEventListener(
      "input",
      updateCustomRatio
    );

    ratioHeight?.addEventListener(
      "input",
      updateCustomRatio
    );


    function updateCustomRatio() {

      const w =
        Number(
          ratioWidth?.value
        );

      const h =
        Number(
          ratioHeight?.value
        );

      if (
        !w ||
        !h ||
        w <= 0 ||
        h <= 0
      ) {

        return;

      }

      state.ratio =
        w / h;

      fitCropToRatio();

      updateRatioButtons();

      updateOutputDimensionsFromCrop();
    }


    /* =========================================================
       FIT CROP TO RATIO
    ========================================================= */

    function fitCropToRatio() {

      if (
        !state.image ||
        !state.ratio
      ) {
        return;
      }

      const imageWidth =
        state.image.naturalWidth;

      const imageHeight =
        state.image.naturalHeight;

      const imageRatio =
        imageWidth /
        imageHeight;

      let width;
      let height;

      if (
        imageRatio >
        state.ratio
      ) {

        height =
          imageHeight;

        width =
          height *
          state.ratio;

      } else {

        width =
          imageWidth;

        height =
          width /
          state.ratio;

      }

      state.crop.width =
        width;

      state.crop.height =
        height;

      state.crop.x =
        (imageWidth - width) /
        2;

      state.crop.y =
        (imageHeight - height) /
        2;

      updatePreview();
    }


    /* =========================================================
       UPDATE RATIO BUTTONS
    ========================================================= */

    function updateRatioButtons() {

      ratioButtons.forEach(
        (button) => {

          button.classList.remove(
            "active"
          );

        }
      );

      if (!state.ratio) {

        document
          .querySelector(
            '[data-ratio="free"]'
          )
          ?.classList.add(
            "active"
          );

        return;
      }

      let matched =
        false;

      ratioButtons.forEach(
        (button) => {

          const value =
            button.dataset.ratio;

          if (
            !value ||
            value === "free" ||
            value === "custom"
          ) {

            return;

          }

          const parts =
            value.split(":");

          if (
            parts.length === 2
          ) {

            const ratio =
              Number(parts[0]) /
              Number(parts[1]);

            if (
              Math.abs(
                ratio -
                state.ratio
              ) < 0.0001
            ) {

              button.classList.add(
                "active"
              );

              matched =
                true;

            }

          }

        }
      );

      if (!matched) {

        document
          .querySelector(
            '[data-ratio="custom"]'
          )
          ?.classList.add(
            "active"
          );

      }
    }


    /* =========================================================
       DIMENSION LOCK
    ========================================================= */

    outputWidth?.addEventListener(
      "input",
      () => {

        if (
          !lockAspect?.checked ||
          !state.ratio
        ) {
          return;
        }

        const width =
          Number(
            outputWidth.value
          );

        if (
          width > 0
        ) {

          outputHeight.value =
            Math.round(
              width /
              state.ratio
            );

        }

      }
    );


    outputHeight?.addEventListener(
      "input",
      () => {

        if (
          !lockAspect?.checked ||
          !state.ratio
        ) {
          return;
        }

        const height =
          Number(
            outputHeight.value
          );

        if (
          height > 0
        ) {

          outputWidth.value =
            Math.round(
              height *
              state.ratio
            );

        }

      }
    );


    /* =========================================================
       QUALITY
    ========================================================= */

    qualityRange?.addEventListener(
      "input",
      () => {

        if (qualityValue) {

          qualityValue.textContent =
            `${qualityRange.value}%`;

        }

      }
    );


    /* =========================================================
       PREVIEW / CROP STATE
    ========================================================= */

    function updatePreview() {

      if (!state.image) {
        return;
      }

      /*
        The actual image is already displayed
        by imagePreview.

        Crop coordinates are kept in state
        for advanced processing.
      */

      updateOutputDimensionsFromCrop();
    }


    function updateOutputDimensionsFromCrop() {

      if (!state.crop) {
        return;
      }

      if (outputWidth) {

        outputWidth.value =
          Math.round(
            state.crop.width
          );

      }

      if (outputHeight) {

        outputHeight.value =
          Math.round(
            state.crop.height
          );

      }
    }


    /* =========================================================
       RESET ADVANCED SETTINGS
    ========================================================= */

    let resetAdvancedButton = null;

    function createAdvancedResetButton() {

      if (!advancedContent) {
        return;
      }

      if (document.getElementById("resetAdvancedButton")) {
        resetAdvancedButton =
          document.getElementById("resetAdvancedButton");
        return;
      }

      resetAdvancedButton =
        document.createElement("button");

      resetAdvancedButton.id =
        "resetAdvancedButton";

      resetAdvancedButton.type =
        "button";

      resetAdvancedButton.className =
        "reset-advanced-button";

      resetAdvancedButton.textContent =
        "↺ Reset to Default";

      /*
        Keep Reset to Default at the bottom of the
        Advanced section, after all advanced settings.
      */
      advancedContent.appendChild(
        resetAdvancedButton
      );

      /*
        Move the existing Process Image button into
        the bottom of Advanced settings as well.
        This does not change its existing click logic.
      */
      if (processButton) {
        advancedContent.appendChild(
          processButton
        );
      }

      resetAdvancedButton.addEventListener(
        "click",
        resetAdvancedSettings
      );
    }


    function resetAdvancedSettings() {

      clearError();
      clearResult();

      if (!state.image) {
        return;
      }

      /*
        Restore the complete original image as the crop.
      */

      state.crop = {
        x: 0,
        y: 0,
        width: state.image.naturalWidth,
        height: state.image.naturalHeight
      };

      /*
        Restore the original/default aspect ratio state.
        The existing tool starts with Free / no ratio.
      */

      state.ratio = null;

      if (customRatioGroup) {
        customRatioGroup.style.display = "none";
      }

      if (ratioWidth) {
        ratioWidth.value =
          advancedDefaults.ratioWidth;
      }

      if (ratioHeight) {
        ratioHeight.value =
          advancedDefaults.ratioHeight;
      }

      /*
        Restore dimensions to the original image size.
      */

      if (outputWidth) {
        outputWidth.value =
          state.image.naturalWidth;
      }

      if (outputHeight) {
        outputHeight.value =
          state.image.naturalHeight;
      }

      /*
        Restore the actual defaults from index.html.
      */

      if (outputFormat) {
        outputFormat.value =
          advancedDefaults.outputFormat;
      }

      if (qualityRange) {
        qualityRange.value =
          advancedDefaults.quality;
      }

      if (qualityValue && qualityRange) {
        qualityValue.textContent =
          `${qualityRange.value}%`;
      }

      if (lockAspect) {
        lockAspect.checked =
          advancedDefaults.lockAspect;
      }

      updateRatioButtons();
      updatePreview();

      /*
        IMPORTANT:
        Target KB is intentionally NOT changed.
      */

      resetTargetMessage();

      /*
        Brief visual confirmation.
      */

      if (resetAdvancedButton) {

        const originalText =
          resetAdvancedButton.textContent;

        resetAdvancedButton.textContent =
          "✓ Reset to Default";

        setTimeout(() => {

          if (resetAdvancedButton) {
            resetAdvancedButton.textContent =
              originalText;
          }

        }, 1200);
      }
    }


    /* =========================================================
       RESET
    ========================================================= */

    resetButton?.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        resetTool();

      }
    );


    function resetTool() {

      revokeObjectUrl();

      revokeOutputUrl();

      state.file = null;

      state.image = null;

      state.crop = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };

      state.ratio = null;

      fileInput.value = "";

      imagePreview.removeAttribute(
        "src"
      );

      imagePreview.style.display =
        "";

      if (editor) {

        editor.classList.remove(
          "visible"
        );

      }

      if (fileInfo) {

        fileInfo.classList.remove(
          "visible"
        );

        fileInfo.textContent =
          "";

      }

      clearError();

      clearResult();

      resetTargetMessage();

      if (targetSizeInput) {

        targetSizeInput.value =
          "";

      }

      if (targetGroup) {

        targetGroup.style.display =
          "none";

      }

      if (advancedToggle) {

        advancedToggle.style.display =
          "none";

      }

      if (advancedContent) {

        advancedContent.style.display =
          "none";

      }

      state.advancedOpen =
        false;

      updateRatioButtons();

    }


    /* =========================================================
       CLEAR RESULT
    ========================================================= */

    function clearResult() {

      if (result) {

        result.classList.remove(
          "visible"
        );

      }

      downloadButton?.removeAttribute(
        "href"
      );

      downloadButton?.removeAttribute(
        "download"
      );

      const card =
        document.getElementById(
          "targetResultCard"
        );

      if (card) {
        card.remove();
      }
    }


    /* =========================================================
       TARGET MESSAGE RESET
    ========================================================= */

    function resetTargetMessage() {

      if (!targetResultMessage) {
        return;
      }

      targetResultMessage.textContent =
        "";

      targetResultMessage.className =
        "target-result-message";
    }


    /* =========================================================
       NORMALIZE CROP
    ========================================================= */

    function normalizeCrop() {

      if (!state.image) {

        return {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        };

      }

      const imageWidth =
        state.image.naturalWidth;

      const imageHeight =
        state.image.naturalHeight;

      let x =
        Number(state.crop.x);

      let y =
        Number(state.crop.y);

      let width =
        Number(state.crop.width);

      let height =
        Number(state.crop.height);

      x =
        clamp(
          x,
          0,
          imageWidth - 1
        );

      y =
        clamp(
          y,
          0,
          imageHeight - 1
        );

      width =
        clamp(
          width,
          1,
          imageWidth - x
        );

      height =
        clamp(
          height,
          1,
          imageHeight - y
        );

      return {
        x,
        y,
        width,
        height
      };
    }


    /* =========================================================
       URL CLEANUP
    ========================================================= */

    function revokeObjectUrl() {

      if (
        state.objectUrl
      ) {

        URL.revokeObjectURL(
          state.objectUrl
        );

        state.objectUrl =
          null;

      }
    }


    function revokeOutputUrl() {

      if (
        state.outputUrl
      ) {

        URL.revokeObjectURL(
          state.outputUrl
        );

        state.outputUrl =
          null;

      }
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    function clamp(
      value,
      min,
      max
    ) {

      return Math.min(
        Math.max(
          value,
          min
        ),
        max
      );

    }


    function nextFrame() {

      return new Promise(
        resolve => {
          requestAnimationFrame(
            () => resolve()
          );
        }
      );

    }


    function formatBytes(
      bytes
    ) {

      if (
        !Number.isFinite(bytes) ||
        bytes < 0
      ) {

        return "0 B";

      }

      if (
        bytes < 1024
      ) {

        return `${bytes} B`;

      }

      if (
        bytes <
        1024 * 1024
      ) {

        return `${(
          bytes / 1024
        ).toFixed(1)} KB`;

      }

      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(2)} MB`;
    }


    function getExtension(
      format
    ) {

      if (
        format ===
        "image/png"
      ) {

        return "png";

      }

      if (
        format ===
        "image/webp"
      ) {

        return "webp";

      }

      return "jpg";
    }


    function getSafeBaseName(
      filename
    ) {

      const original =
        String(
          filename ||
          "image"
        ).replace(
          /\.[^/.]+$/,
          ""
        );

      const safe =
        original
          .replace(
            /[^a-zA-Z0-9_-]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          )
          .slice(
            0,
            80
          );

      return (
        safe ||
        "image"
      );
    }


    /* =========================================================
       INITIALIZE
    ========================================================= */

    addStyles();

    createTargetSizeUI();

    createAdvancedSection();

    createAdvancedResetButton();

    /*
      Target box hidden until image is uploaded.
    */

    if (targetGroup) {
      targetGroup.style.display =
        "none";
    }

    if (advancedToggle) {
      advancedToggle.style.display =
        "none";
    }

    /*
      Existing editor/result remain hidden
      until an image is selected.
    */

    if (result) {
      result.classList.remove(
        "visible"
      );
    }

    /*
      Initial quality label
    */

    if (
      qualityValue &&
      qualityRange
    ) {

      qualityValue.textContent =
        `${qualityRange.value}%`;

    }

    updateRatioButtons();

    /*
      Clean URLs when leaving page.
    */

    window.addEventListener(
      "beforeunload",
      () => {

        revokeObjectUrl();

        revokeOutputUrl();

      }
    );

    console.log(
      "✅ Image Crop & Resize initialized successfully."
    );

  });

})();