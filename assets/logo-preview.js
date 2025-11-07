const canvasClass = ".logo-preview_canvas";
const logoPreviewClass = ".img-preview_canvas";

function firstLoadImage(dataMediaId, cb) {
  if (!dataMediaId) return;

  const currentCanvas = document.querySelector(
    `.product-gallery__carousel-item[data-media-id="${dataMediaId}"] ${canvasClass}`
  );
  if (!currentCanvas) return;

  const context = currentCanvas.getContext("2d");
  if (!context) return;

  const imgUrl = getBaseImageUrl(dataMediaId);
  if (!imgUrl) {
    console.warn("No base image for", dataMediaId);
    return;
  }

  if (!currentCanvas.hasAttribute("data-original-canvas")) {
    currentCanvas.setAttribute("data-original-canvas", imgUrl);
  }

  const previewImgOnce = document.querySelector(
    `${logoPreviewClass}[data-media-id="${dataMediaId}"]`
  );
  if (previewImgOnce && !previewImgOnce.hasAttribute("data-original")) {
    previewImgOnce.setAttribute("data-original", imgUrl);
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const scale = Math.min(
      currentCanvas.width / img.width,
      currentCanvas.height / img.height
    );
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const baseX = (currentCanvas.width - drawW) / 2;
    const baseY = (currentCanvas.height - drawH) / 2;

    context.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(img, baseX, baseY, drawW, drawH);

    currentCanvas.dataset.baseScale = String(scale);
    currentCanvas.dataset.baseX = String(baseX);
    currentCanvas.dataset.baseY = String(baseY);
    currentCanvas.dataset.baseDrawW = String(drawW);
    currentCanvas.dataset.baseDrawH = String(drawH);

    if (typeof cb === "function") cb();
  };
  img.src = imgUrl;
}

async function blobToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getBaseTransform(cv) {
  return {
    s: Number(cv.dataset.baseScale || 1),
    dx: Number(cv.dataset.baseX || 0),
    dy: Number(cv.dataset.baseY || 0),
    dw: Number(cv.dataset.baseDrawW || cv.width),
    dh: Number(cv.dataset.baseDrawH || cv.height),
  };
}

function mapRectToCanvas(cv, POS) {
  const { s, dx, dy, dw, dh } = getBaseTransform(cv);

  const BOOST = 1;
  if (POS.coordsAs === "canvas") {
    const cx = POS.xPos + POS.width  / 2;
    const cy = POS.yPos + POS.height / 2;
    const w  = POS.width  * BOOST;
    const h  = POS.height * BOOST;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  if (POS.coordsAs === "image") {
    return {
      x: dx + POS.xPos * s,
      y: dy + POS.yPos * s,
      w: POS.width  * s,
      h: POS.height * s,
    };
  }

  if (POS.coordsAs === "percent") {
    return {
      x: dx + POS.xPos * dw,
      y: dy + POS.yPos * dh,
      w: POS.width  * dw,
      h: POS.height * dh,
    };
  }

  return { x: POS.xPos, y: POS.yPos, w: POS.width, h: POS.height };
}

function num(v) {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

function readPosFromData(dataMediaId) {
  const img = document.querySelector(
    `${logoPreviewClass}[data-media-id="${dataMediaId}"]`
  );
  if (!img) return {};

  const d = img.dataset;
  const x = num(d.logoX);
  const y = num(d.logoY);
  const w = num(d.logoW);
  const h = num(d.logoH);

  const looksPercent = [x, y, w, h].every(
    (v) => v == null || (typeof v === "number" && v > 0 && v <= 1)
  );

  return {
    xPos: x,
    yPos: y,
    width: w,
    height: h,
    rotation: num(d.logoRot) || 0,
    img: d.logoImg || "",
    coordsAs: looksPercent ? "percent" : "image",
  };
}

function setLogoPositionFromImg(dataMediaId) {
  const img = document.querySelector(
    `${logoPreviewClass}[data-media-id="${dataMediaId}"]`
  );

  const n = (v) => {
    const num = Number(String(v ?? "").trim());
    return Number.isFinite(num) ? num : undefined;
  };

  const x = n(img?.dataset.logoX);
  const y = n(img?.dataset.logoY);
  const w = n(img?.dataset.logoW);
  const h = n(img?.dataset.logoH);

  LOGO_POSITION = {
    xPos: x ?? LOGO_DEFAULTS.xPos,
    yPos: y ?? LOGO_DEFAULTS.yPos,
    width: w ?? LOGO_DEFAULTS.width,
    height: h ?? LOGO_DEFAULTS.height,
    rotation: n(img?.dataset.logoRot) ?? LOGO_DEFAULTS.rotation,
    img: img?.dataset.logoImg || LOGO_DEFAULTS.img,
    coordsAs: "canvas",
  };

  return LOGO_POSITION;
}

function parsePositionsMapForMediaId(dataMediaId) {
  const img = document.querySelector(
    `${logoPreviewClass}[data-media-id="${dataMediaId}"]`
  );
  if (!img) return null;
  const raw = img.getAttribute("data-logo-positions");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Invalid data-logo-positions JSON:", raw, e);
    return null;
  }
}

function applyLogoPosToOneImage(img, pos) {
  if (pos.xPos != null) img.dataset.logoX = String(pos.xPos);
  if (pos.yPos != null) img.dataset.logoY = String(pos.yPos);
  if (pos.width != null) img.dataset.logoW = String(pos.width);
  if (pos.height != null) img.dataset.logoH = String(pos.height);
  if (pos.rotation != null) img.dataset.logoRot = String(pos.rotation);
  if (pos.img) img.dataset.logoImg = String(pos.img);
  img.dataset.logoCoordsAs = "canvas";
}

function getLastUploadedLogoFile() {
  const store = getSessionInformation() || {};
  const last = Object.values(store).reverse().find(v => v && v.logoDataUrl);
  if (!last) return null;
  try {
    return dataURLtoFile(last.logoDataUrl, last.logoName || "logo.png");
  } catch {
    return null;
  }
}

// Read base image directly from the <img> for this mediaId
function getBaseImageUrl(dataMediaId) {
  const cv = document.querySelector(
    `.product-gallery__carousel-item[data-media-id="${dataMediaId}"] ${canvasClass}`
  );
  const orig = cv?.getAttribute("data-original-canvas");
  if (orig) return orig;

  // First paint only — get the raw mug <img> source
  const imgEl = document.querySelector(
    `${logoPreviewClass}[data-media-id="${dataMediaId}"]`
  );
  const fromDom =
    imgEl?.getAttribute("data-zoom") ||
    imgEl?.getAttribute("data-src") ||
    imgEl?.currentSrc ||
    imgEl?.src ||
    "";
  return fromDom || "";
}
const LOGO_DEFAULTS = {
  xPos: 100,
  yPos: 220,
  width: 250,
  height: 150,
  rotation: 0,
  img: "",
  coordsAs: "image",
};

let LOGO_POSITION = { ...LOGO_DEFAULTS };

function changeLogoPosition(target) {
  const name = target?.value;
  if (!name) return;

  document.querySelectorAll(`${logoPreviewClass}[data-media-id]`).forEach((img) => {
    const mediaId = img.getAttribute("data-media-id");
    const map = parsePositionsMapForMediaId(mediaId);
    const arr = map ? map[name] : null;
    if (!arr) return;

    const pos = {
      xPos: Number(arr[0]) || 0,
      yPos: Number(arr[1]) || 0,
      width: Number(arr[2]) || 0,
      height: Number(arr[3]) || 0,
      img: String(arr[4] || ""),
      rotation: Number(arr[5] || 0),
      coordsAs: "canvas", // force canvas
    };

    applyLogoPosToOneImage(img, pos);
  });

  const fileInput = document.querySelector(".logo-preview_input-element");
  const file =
    (fileInput && fileInput.files && fileInput.files[0]) ||
    getLastUploadedLogoFile();

  if (file) setLogoPreview(file);
}

function resetPreviewForVariant(variantId, variantTitle) {
  const dataMediaId = `logo-preview_${variantId}`;

  const img = document.querySelector(
    `${logoPreviewClass}[data-media-id="${dataMediaId}"]`
  );
  const cv = document.querySelector(
    `.product-gallery__carousel-item[data-media-id="${dataMediaId}"] ${canvasClass}`
  );
  if (!img || !cv) return;

  const orig =
    img.getAttribute("data-original") ||
    cv.getAttribute("data-original-canvas") ||
    getBaseImageUrl(dataMediaId);

  if (orig) {
    img.src = orig;
    img.setAttribute("data-zoom", orig);
  }

  firstLoadImage(dataMediaId);

  const store = getSessionInformation() || {};
  const saved = store[variantTitle];
  if (saved && saved.logoDataUrl) {
    try {
      const file = dataURLtoFile(saved.logoDataUrl, saved.logoName || "logo.png");
      setTimeout(() => setLogoPreview(file), 0);
    } catch {}
  }
}

function scrollToPreviewByMediaId(dataMediaId) {
  const item = document.querySelector(`.product-gallery__carousel-item[data-media-id="${dataMediaId}"]`);
  const slide = item ? item.closest('[data-slide]') : null;
  const idx = slide ? parseInt(slide.getAttribute('data-slide'), 10) : NaN;

  if (!Number.isFinite(idx)) return;

  if (typeof window.galleryScrollToIndex === 'function') {
    window.galleryScrollToIndex(idx);
    return;
  }

  const slider = document.querySelector('.js-slider');
  if (!slider) return;

  const currentSlide = slider.querySelector(`[data-slide="${idx}"]`);
  if (!currentSlide) return;

  slider.scrollTo({
    top: 0,
    left: currentSlide.offsetLeft,
    behavior: 'smooth'
  });
}

function syncCanvasSize(cv) {
  const w = Math.round(cv.clientWidth || cv.width);
  const h = Math.round(cv.clientHeight || cv.height);
  if (cv.width !== w) cv.width = w;
  if (cv.height !== h) cv.height = h;
}

function onChangeFileInput(target) {
  const file = target.files[0];
  const activeColor = document.querySelector(
    ".color-swatch__item.border--focus"
  );

  try {
    const errorMessage = target
      .closest(".logo-preview_input")
      .querySelector(".error-message");
    if (errorMessage) errorMessage.parentElement.removeChild(errorMessage);

    if (checkFileFormat(file)) {
      const inputWrapperElement = document.querySelector(".logo-preview_input");
      if (inputWrapperElement) {
        inputWrapperElement.classList.add("invalid");
        const errorMessage = document.createElement("span");
        errorMessage.classList.add("error-message");
        errorMessage.innerText = "Invalid file";
        inputWrapperElement.appendChild(errorMessage);
        return false;
      }
    }
  } catch (error) {
    console.error({ error });
  }
  setLogoPreview(file);
  // setTimeout(() => {
  //   if (activeColor) activeColor.click();
  // }, 300);
}

function checkFileFormat(file) {
  const validFormats = new Array("ai", "png", "eps");
  const fileNameParts = file?.name.split(".");
  const fileExtension = fileNameParts
    ? fileNameParts[fileNameParts.length - 1].toLowerCase()
    : [];

  if (validFormats.indexOf(fileExtension) < 0) {
    return true;
  }

  return false;
}

const setLogoPreview = async (file) => {
  let fileConverted;
  const fileNameParts = file?.name.split(".");
  const type = fileNameParts ? fileNameParts[fileNameParts.length - 1] : [];

  try {
    if (type.toLowerCase() === "ai" || type.toLowerCase() === "eps") {
      const formData = new FormData();
      const inputButton = document.querySelector(".logo-preview_input-element");

      formData.append("inputFile", file);

      const swallResult = await Swal.fire({
        text: "We can remove the background color from your uploaded image prior to customizing your item, would you like to do this?",
        icon: "question",
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: "Yes please",
        denyButtonText: `No, thank you`,
      });

      if (inputButton) {
        inputButton.classList.add("button-loading2");
        const overlay =
          inputButton.parentElement.querySelector(".loading-overlay");
        if (overlay) overlay.classList.add("show");
      }

      const rawResponse = await fetch("https://ford-proxy-server-1c4643904975.herokuapp.com/convert-to-png", {
      method: "POST",
      body: formData,
    });
      const cloneResponse = rawResponse.clone();
      const [blob, json] = await Promise.allSettled([
        rawResponse.blob(),
        cloneResponse.json(),
      ]);
      // This means the api is not throwing error in the status code but returning a json response with all the details instead of the actual file
      if (rawResponse.status !== 200 || json.status === "fulfilled")
        throw "Invalid file";
      const newFileConverted = new File(
        [blob.value],
        `${fileNameParts[0]}.svg`,
        {
          type: blob.value.type,
        }
      );

      fileConverted = new File([blob.value], `${fileNameParts[0]}.png`, {
        type: blob.value.type,
      });

      if (swallResult.isConfirmed) {
        const formDataTransparent2 = new FormData();
        formDataTransparent2.append("image_file", newFileConverted);
        const rawTransparentResponse2 = await fetch("https://ford-proxy-server-1c4643904975.herokuapp.com/remove-background", {
          method: "POST",
          body: formDataTransparent2
        })
        const cloneResponseTransparent2 = rawTransparentResponse2.clone();
        const [blobTransparent2, jsonTransparent2] = await Promise.allSettled([
          rawTransparentResponse2.blob(),
          cloneResponseTransparent2.json(),
        ]);

        if (
          rawTransparentResponse2.status !== 200 ||
          jsonTransparent2.status === "fulfilled"
        )
          throw "Invalid file";
        fileConverted = new File(
          [blobTransparent2.value],
          `${fileNameParts[0]}.png`,
          {
            type: blobTransparent2.value.type,
          }
        );
      }

      if (inputButton) {
        inputButton.classList.remove("button-loading2");
        const overlay =
          inputButton.parentElement.querySelector(".loading-overlay");
        if (overlay) overlay.classList.remove("show");
      }
    }

    // if (((type.toLowerCase() == "ai") || (type.toLowerCase() == "eps")) && !fileConverted) throw "Invalid file";

    if (type.toLowerCase() === "png") {
      const formDataTransparent = new FormData();
      const inputButton2 = document.querySelector(
        ".logo-preview_input-element"
      );

      formDataTransparent.append("image_file", file);
      if (inputButton2) {
        inputButton2.classList.add("button-loading2");
        const overlay2 =
          inputButton2.parentElement.querySelector(".loading-overlay");
        if (overlay2) overlay2.classList.add("show");
      }

      const swallResult2 = await Swal.fire({
        text: "We can remove the background color from your uploaded image prior to customizing your item, would you like to do this?",
        icon: "question",
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: "Yes please",
        denyButtonText: `No, thank you`,
      });

      if (swallResult2.isConfirmed) {
        const rawTransparentResponse = await fetch("https://ford-proxy-server-1c4643904975.herokuapp.com/remove-background", {
          method: "POST",
          body: formDataTransparent
        })

        const cloneResponseTransparent = rawTransparentResponse.clone();
        const [blobTransparent, jsonTransparent] = await Promise.allSettled([
          rawTransparentResponse.blob(),
          cloneResponseTransparent.json(),
        ]);

        // This means the api is not throwing error in the status code but returning a json response with all the details instead of the actual file
        if (
          rawTransparentResponse.status !== 200 ||
          jsonTransparent.status === "fulfilled"
        )
          throw "Invalid file";
        fileConverted = new File(
          [blobTransparent.value],
          `${fileNameParts[0]}.png`,
          {
            type: blobTransparent.value.type,
          }
        );
      }

      if (inputButton2) {
        inputButton2.classList.remove("button-loading2");
        const overlay2 =
          inputButton2.parentElement.querySelector(".loading-overlay");
        if (overlay2) overlay2.classList.remove("show");
      }
    }

    ((file) => {
      const logoImage = URL.createObjectURL(file);
      const canvases = document.querySelectorAll(canvasClass);

      for (let i = 0; i < canvases.length; i++) {
        const currentCanvas = canvases[i];
        const context = currentCanvas.getContext("2d");
        const dataMediaId = currentCanvas.getAttribute("data-media-id");

        const POS = setLogoPositionFromImg(dataMediaId);

        firstLoadImage(dataMediaId, () => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const rect = mapRectToCanvas(currentCanvas, POS);
            const sectorWidth = rect.w;
            const sectorHeight = rect.h;

            const scale = Math.min(
              sectorWidth / img.width,
              sectorHeight / img.height
            );
            const newW = img.width * scale;
            const newH = img.height * scale;
            const x = rect.x + (sectorWidth - newW) / 2;
            const y = rect.y + (sectorHeight - newH) / 2;

            context.save();
            if (POS.rotation) {
              context.translate(x + newW / 2, y + newH / 2);
              context.rotate((POS.rotation * Math.PI) / 180);
              context.translate(-(x + newW / 2), -(y + newH / 2));
            }
            context.drawImage(img, x, y, newW, newH);
            context.restore();
 
            const newPreview = currentCanvas.toDataURL("image/png");
            const previewImg = document.querySelector(
              `${logoPreviewClass}[data-media-id="${dataMediaId}"]`
            );
            if (previewImg) {
              previewImg.src = newPreview;
              previewImg.setAttribute("data-zoom", newPreview);
            }
            scrollToPreviewByMediaId(dataMediaId);
            const dataMediaVariant =
              currentCanvas.getAttribute("data-media-option");
            const form = document.getElementById("modal-preview-form");
            if (fileConverted) {
              blobToBase64(fileConverted)
                .then((base64) => {
                  updateSessionInformation("lastTransparentLogo", {
                    logoDataUrl: base64,
                    logoName: fileConverted.name,
                  });
                  console.log("[setLogoPreview] Saved transparent logo for reuse");
                })
                .catch((e) => {
                  console.warn("Could not cache transparent logo", e);
                });
            }
            if (form) {
              createImagesProperties(
                {
                  logo: fileConverted ? fileConverted : file,
                  preview: dataURLtoFile(newPreview, "preview.png"),
                },
                dataMediaVariant
              );
            }
          };
          img.src = logoImage;
        });
      }
    })(fileConverted || file);
  } catch (error) {
    console.error({ error });
    const inputWrapperElement = document.querySelector(".logo-preview_input");
    if (inputWrapperElement) {
      inputWrapperElement.classList.add("invalid");
      const errorMessage = document.createElement("span");
      errorMessage.classList.add("error-message");
      errorMessage.innerText = "Invalid file";
      inputWrapperElement.appendChild(errorMessage);
    }
    const inputElement = document.querySelector(".logo-preview_input-element");
    // if (inputElement) {
    //   inputElement.value = "";
    // }
    const finalFile = fileConverted || file;
    renderLogoFile(finalFile);
  }
};

window.setLogoPreview = setLogoPreview;

// === NEW: pure re-draw (no conversions, no dialogs) ===
function renderLogoFile(file, { skipUpload = true, targetMediaId = null } = {}) {
  console.log("[variant-swap] renderLogoFile() start", file?.name || "(blob)");

  const logoImage = URL.createObjectURL(file);
const canvases = targetMediaId
  ? document.querySelectorAll(`.logo-preview_canvas[data-media-id="${targetMediaId}"]`)
  : document.querySelectorAll(".logo-preview_canvas");

  for (let i = 0; i < canvases.length; i++) {
    const currentCanvas = canvases[i];
    const context = currentCanvas.getContext("2d");
    const dataMediaId = currentCanvas.getAttribute("data-media-id");

    const POS = setLogoPositionFromImg(dataMediaId);

    firstLoadImage(dataMediaId, () => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const rect = mapRectToCanvas(currentCanvas, POS);
        const sectorWidth = rect.w;
        const sectorHeight = rect.h;

        const scale = Math.min(sectorWidth / img.width, sectorHeight / img.height);
        const newW = img.width * scale;
        const newH = img.height * scale;
        const x = rect.x + (sectorWidth - newW) / 2;
        const y = rect.y + (sectorHeight - newH) / 2;

        context.save();
        if (POS.rotation) {
          context.translate(x + newW / 2, y + newH / 2);
          context.rotate((POS.rotation * Math.PI) / 180);
          context.translate(-(x + newW / 2), -(y + newH / 2));
        }
        context.drawImage(img, x, y, newW, newH);
        context.restore();

        const newPreview = currentCanvas.toDataURL("image/png");
        const previewImg = document.querySelector(
          `.img-preview_canvas[data-media-id="${dataMediaId}"]`
        );
        if (previewImg) {
          previewImg.src = newPreview;
          previewImg.setAttribute("data-zoom", newPreview);
        }

        scrollToPreviewByMediaId(dataMediaId);

        const dataMediaVariant = currentCanvas.getAttribute("data-media-option");
        const form = document.getElementById("modal-preview-form");
        if (form && !skipUpload) {
          createImagesProperties(
            {
              logo: file,
              preview: dataURLtoFile(newPreview, "preview.png"),
            },
            dataMediaVariant
          );
        }
      };
      img.src = logoImage;
    });
  }
}
window.renderLogoFile = renderLogoFile;

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[arr.length - 1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

const SESSION_STORAGE_NAME = "session-info-ford";

const getSessionInformation = () => {
  try {
    const payload = window.sessionStorage.getItem(SESSION_STORAGE_NAME);
    const parsedPayload = JSON.parse(payload);
    return parsedPayload;
  } catch (error) {
    return null;
  }
};

const setSessionInformation = (newPayload) => {
  try {
    const payload = JSON.stringify(newPayload);
    window.sessionStorage.setItem(SESSION_STORAGE_NAME, payload);
    return true;
  } catch (error) {
    return false;
  }
};

function create_UUID() {
  var dt = new Date().getTime();
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      const r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    }
  );
  return uuid;
}

const updateSessionInformation = (field, payload) => {
  let actualInformation = getSessionInformation();
  if (!actualInformation)
    actualInformation = {
      id: create_UUID(),
    };
  actualInformation[field] = payload;
  return setSessionInformation(actualInformation);
};

const uploadFiles = async (logo, preview, variant) => {
  const sessionInfo = getSessionInformation() || { id: create_UUID() };
  const user_id = sessionInfo.id;

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("variant", variant);
    formData.append("user_id", user_id);

    const response = await fetch("https://ford-proxy-server-1c4643904975.herokuapp.com/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!response.ok || !result.success) throw new Error("Upload failed");
    return result.url;
  };

  const [previewUrl, logoUrl] = await Promise.allSettled([
    uploadFile(preview),
    uploadFile(logo),
  ]);

  if (previewUrl.status === "fulfilled" && logoUrl.status === "fulfilled") {
    updateSessionInformation(variant, {
      logo: logoUrl.value,
      preview: previewUrl.value,
    });

    document.querySelectorAll(`.product-preview_image[data-variant-option="${variant}"]`)
      .forEach((el) => el.value = previewUrl.value);
    document.querySelectorAll(`.product-vector_image[data-variant-option="${variant}"]`)
      .forEach((el) => el.value = logoUrl.value);
  }

  return { previewUrl, logoUrl };
};


const createImagesProperties = async (images, variant) => {
  const store = getSessionInformation() || {};
  if (store.lastTransparentLogo && store.lastTransparentLogo.logoDataUrl) {
    try {
      const transparentFile = dataURLtoFile(
        store.lastTransparentLogo.logoDataUrl,
        store.lastTransparentLogo.logoName || "transparent_logo.png"
      );
      console.log("[createImagesProperties] using transparent logo from session");
      images.logo = transparentFile;
    } catch (e) {
      console.warn("[createImagesProperties] failed to load transparent logo", e);
    }
  }
  let { logo, preview } = images;
  if (store.lastTransparentLogo?.logoDataUrl) {
    logo = dataURLtoFile(
      store.lastTransparentLogo.logoDataUrl,
      store.lastTransparentLogo.logoName || "transparent_logo.png"
    );
    console.log("[createImagesProperties] forced transparent logo overwrite");
  }
  const [logoResult, previewResult] = await Promise.allSettled([
    new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(logo);
      fileReader.onload = (e) => resolve(e.target.result);
    }),
    new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(preview);
      fileReader.onload = (e) => resolve(e.target.result);
    }),
  ]);

  updateSessionInformation(variant, {
    logoDataUrl: logoResult.value,
    logoName: logo.name,
    previewDataUrl: previewResult.value,
    variantName: variant,
  });

  const logoElement = document.createElement("input");
  logoElement.type = "hidden";
  logoElement.name = "properties[_VectorImage]";
  logoElement.value = logoResult.value;

  // Avoid duplicate IDs across multiple forms in modern themes
  // (IDs aren't needed for properties to post)
  const previewElement = document.createElement("input");
  previewElement.type = "hidden";
  previewElement.name = "properties[_PreviewImage]";
  previewElement.value = previewResult.value;

  //const variantElement = document.createElement("input");
  //variantElement.type = "hidden";
  //variantElement.name = "properties[_VariantOption]";
  //variantElement.value = variant || "";

  // ===== NEW SERVICE FEE ELEMENT =====
  const serviceRequiredElement = document.createElement("input");
  serviceRequiredElement.type = "hidden";
  serviceRequiredElement.name = "properties[_service_required]";
  serviceRequiredElement.value = "true";

  // Find ALL add-to-cart forms in this theme
  const forms = Array.from(
    document.querySelectorAll('#modal-preview-form')
  );

  if (forms.length === 0) {
    console.warn(
      "No add-to-cart forms found; cannot inject preview/vector properties."
    );
    return; // gracefully exit
  }

  // Inject into every add-to-cart form (sticky + main, etc.)
  forms.forEach((form) => {
    // Remove any previous copies so we don't accumulate duplicates
    form.querySelector('input[name="properties[_PreviewImage]"]')?.remove();
    form.querySelector('input[name="properties[_VectorImage]"]')?.remove();
    form.querySelector('input[name="properties[_VariantOption]"]')?.remove();

    form.querySelector('input[name="properties[_service_required]"]')?.remove();

    // Append fresh inputs (clone so each form gets its own node)
    form.appendChild(previewElement.cloneNode(true));
    form.appendChild(logoElement.cloneNode(true));
    //form.appendChild(variantElement.cloneNode(true));

    form.appendChild(serviceRequiredElement.cloneNode(true));
  });
  try {
    const { previewUrl, logoUrl } = await uploadFiles(logo, preview, variant);
    const p = previewUrl?.status === "fulfilled" ? previewUrl.value : "";
    const v = logoUrl?.status === "fulfilled" ? logoUrl.value : "";

    if (p || v) {
      forms.forEach((form) => {
        const pInput = form.querySelector('input[name="properties[_PreviewImage]"]');
        const vInput = form.querySelector('input[name="properties[_VectorImage]"]');
        if (pInput && p) pInput.value = p;
        if (vInput && v) vInput.value = v;
      });
    }
  } catch (err) {
    console.warn("uploadFiles failed", err);
  }
};

const addNote = async (newNote = "") => {
  const cart = await fetch("/cart.json");
  const cartParsed = await cart.json();
  const actualCartNote = (cartParsed || {}).note || "";
  const note = (actualCartNote ? actualCartNote + ". " : "") + newNote;
  const result = await fetch("/cart/update.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      note,
    }),
  });

  return result.json();
};

function auxUpdatePreviewImage(target) {
  const dataMediaId = target.getAttribute("data-media-id");
  const imgElement = document.querySelector(
    `.img-preview_canvas[data-media-id="${dataMediaId}"]`
  );
  const actualPreview = imgElement.getAttribute("data-zoom");
  imgElement.setAttribute("data-src", actualPreview);
  imgElement.src = actualPreview;
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(canvasClass).forEach((cv) => {
    syncCanvasSize(cv);
    const id = cv.getAttribute("data-media-id");
    firstLoadImage(id);
  });
});

(() => {
  const d = document;

  const log = (...a) => console.debug('[variant-listener]', ...a);

  function debounce(fn, wait = 80) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function getCurrentVariantFromDOM() {
    const idInput = d.querySelector('form[action*="/cart/add"] input[name="id"]');
    const id = idInput?.value;
    let title =
      d.querySelector('[data-selected-variant-title]')?.textContent?.trim() || '';

    if (!title) {
      const sel = d.querySelector('select[name="id"]');
      if (sel && sel.selectedIndex >= 0) {
        title = sel.options[sel.selectedIndex]?.text?.trim() || '';
      }
    }
    return id ? { id, title } : null;
  }

  function onVariantChange(v) {
    const id = String(v.id);
    const title = (v.title || '').trim();
    log('change ->', { id, title });

    if (typeof window.swapVariantPreviewSlide === 'function') {
      window.swapVariantPreviewSlide(id, title);
    }

    if (typeof window.swapLogoPreviewToVariant === 'function') {
      window.swapLogoPreviewToVariant(id, title);
    }
  }

  const handleVariantChange = debounce((explicitVariant) => {
    const v = explicitVariant || getCurrentVariantFromDOM();
    if (!v || !v.id) {
      log('no variant found in DOM');
      return;
    }
    onVariantChange(v);
  }, 80);

  d.addEventListener('variant:change', (e) => {
    const v = e?.detail?.variant;
    log('event: variant:change', v);
    if (v?.id) handleVariantChange({ id: v.id, title: v.title || '' });
    else handleVariantChange();
  });

  d.addEventListener('change', (e) => {
    if (e.target && e.target.closest('select[name="id"]')) {
      log('event: <select name="id"> change');
      handleVariantChange();
    }
  });

  d.addEventListener(
    'click',
    (e) => {
      if (
        e.target &&
        (e.target.closest('.color-swatch__item') ||
         e.target.closest('button.color-swatch__item'))
      ) {
        log('event: swatch click');
        setTimeout(() => handleVariantChange(), 0);
      }
    },
    true
  );

  const idInput = d.querySelector('form[action*="/cart/add"] input[name="id"]');
  if (idInput && 'MutationObserver' in window) {
    new MutationObserver(() => {
      log('observer: id input mutated');
      handleVariantChange();
    }).observe(idInput, { attributes: true, attributeFilter: ['value'] });
  }

  document.addEventListener('DOMContentLoaded', () => {
    log('DOMContentLoaded hydrate');
    handleVariantChange();
  });
})();


function readVariantPreviewMap() {
  try {
    const el = document.getElementById("variant-preview-map");
    if (!el) return {};
    return JSON.parse(el.textContent || "{}") || {};
  } catch { return {}; }
}

// “Main” product form (kept for future use if needed)
function getProductForm() {
  const explicit = document.querySelector('form[action*="/cart/add"]:not(#modal-preview-form)');
  if (explicit) return explicit;
  return document.querySelector('.product-form, [data-product-form], form[action*="/cart/add"]');
}

function swapVariantPreviewSlide(variantId, variantTitle) {
  const map = readVariantPreviewMap();
  const baseUrl = map && map[variantId] ? map[variantId] : null;

  // Find the extra preview card you render (data-media-id starts with "logo-preview_")
  const item = document.querySelector('.product-gallery__carousel-item[data-media-id^="logo-preview_"]');
  if (!item) return;

  const img = item.querySelector('.img-preview_canvas');
  const cv  = item.querySelector('.logo-preview_canvas');

  const newDmId = `logo-preview_${variantId}`;

  item.setAttribute('data-media-id', newDmId);
  item.setAttribute('data-media-option', variantTitle || '');

  if (img) {
    img.setAttribute('data-media-id', newDmId);
    img.setAttribute('data-media-option', variantTitle || '');
    if (baseUrl) {
      img.src = baseUrl;
      img.setAttribute('data-zoom', baseUrl);
      img.setAttribute('data-original', baseUrl);
    }
  }

  if (cv) {
    cv.setAttribute('data-media-id', newDmId);
    cv.setAttribute('data-media-option', variantTitle || '');
    cv.removeAttribute('data-original-canvas');
  }

  if (baseUrl && cv && typeof cv.getContext === 'function') {
    firstLoadImage(newDmId);
  }
}


window.swapLogoPreviewToVariant = function(variantId, variantTitle) {
  if (!variantId) return;

  const el = document.getElementById('variant-preview-map');
  if (!el) return;

  let map = {};
  try { map = JSON.parse(el.textContent || '{}'); } catch (e) { console.warn('Bad JSON in #variant-preview-map', e); }

  const raw = map[String(variantId)] || null;
  const baseUrl = raw ? (raw.startsWith('//') ? ('https:' + raw) : raw) : null;

  const wrap = document.querySelector('.product-gallery__carousel-item[data-media-id^="logo-preview_"]');
  if (!wrap) return;

  const newMediaId = `logo-preview_${variantId}`;
  wrap.setAttribute('data-media-id', newMediaId);
  if (variantTitle != null) wrap.setAttribute('data-media-option', variantTitle);

  const img = wrap.querySelector('.img-preview_canvas');
  const cv  = wrap.querySelector('.logo-preview_canvas');

  if (img) {
    const fallback = img.getAttribute('data-original') || img.getAttribute('data-zoom') || img.src || '';
    const url = baseUrl || fallback;
    if (url) {
      img.src = url;
      img.setAttribute('data-zoom', url);
      img.setAttribute('data-original', url);
    }
    img.setAttribute('data-media-id', newMediaId);
    if (variantTitle != null) img.setAttribute('data-media-option', variantTitle);
  }

  if (cv) {
    cv.setAttribute('data-media-id', newMediaId);
    if (variantTitle != null) cv.setAttribute('data-media-option', variantTitle);
    cv.removeAttribute('data-original-canvas');

    firstLoadImage(newMediaId, () => {
      const store = getSessionInformation() || {};
      const saved = store[variantTitle || ''];
      if (saved && saved.logoDataUrl) {
        try {
          const file = dataURLtoFile(saved.logoDataUrl, saved.logoName || 'logo.png');
          setLogoPreview(file);
          renderLogoFile(file);
        } catch (e) {}
      }
    });
  }
};



document.addEventListener("DOMContentLoaded", function () {
  console.log("[variant-swap] DOMContentLoaded fired");

  // Parse the JSON map once
  let previewMap = {};
  try {
    const el = document.getElementById("variant-preview-map");
    previewMap = el ? JSON.parse(el.textContent || "{}") : {};
    console.log("[variant-swap] map loaded, keys:", Object.keys(previewMap).length);
  } catch (e) {
    console.warn("[variant-swap] bad JSON in #variant-preview-map", e);
  }

  // --- helpers ---------------------------------------------------------

  function hasAnyUploadedLogo() {
    const fi = document.querySelector(".logo-preview_input-element");
    const hasInput = !!(fi && fi.files && fi.files.length);
    const store = (typeof getSessionInformation === "function" && getSessionInformation()) || null;
    const hasStore = !!(store && Object.values(store).some(v => v && v.logoDataUrl));
    console.log("[variant-swap] hasAnyUploadedLogo?", { hasInput, hasStore });
    return hasInput || hasStore;
  }

  function getExistingLogoFile(preferredKey) {
  // 1) Prefer the last transparent logo if cached
  const store = (typeof getSessionInformation === "function" && getSessionInformation()) || {};
  if (store.lastTransparentLogo && store.lastTransparentLogo.logoDataUrl) {
    console.log("[variant-swap] using cached transparent logo");
    try {
      return dataURLtoFile(
        store.lastTransparentLogo.logoDataUrl,
        store.lastTransparentLogo.logoName || "transparent_logo.png"
      );
    } catch (e) {
      console.warn("[variant-swap] failed to rebuild transparent logo from cache", e);
    }
  }

  // 2) Otherwise check <input type=file>
  const fi = document.querySelector(".logo-preview_input-element");
  if (fi && fi.files && fi.files[0]) {
    console.log("[variant-swap] logo file from <input type=file>");
    return fi.files[0];
  }

  // 3) Otherwise check variant-specific session storage
  if (preferredKey && store[preferredKey] && store[preferredKey].logoDataUrl) {
    try {
      console.log("[variant-swap] logo file from session by title:", preferredKey);
      return dataURLtoFile(
        store[preferredKey].logoDataUrl,
        store[preferredKey].logoName || "logo.png"
      );
    } catch (e) {
      console.warn("[variant-swap] failed to convert session logoDataUrl for", preferredKey, e);
    }
  }

  // 4) Lastly, fallback to last uploaded
  if (typeof getLastUploadedLogoFile === "function") {
    const f = getLastUploadedLogoFile();
    if (f) {
      console.log("[variant-swap] logo file from last-uploaded fallback");
      return f;
    }
  }

  console.log("[variant-swap] no logo file available");
  return null;
}


  function swapToVariantAndReapply(variantId, variantTitle) {
    console.group("[variant-swap] swapToVariantAndReapply");
    console.log("input:", { variantId, variantTitle });

    // 1) URL from map
    let raw = previewMap[String(variantId)];
    console.log("map lookup:", { key: String(variantId), raw });
    if (!raw) {
      console.warn("[variant-swap] no URL in map for variant", variantId);
      console.groupEnd();
      return;
    }
    const url = raw.startsWith("//") ? "https:" + raw : raw;
    console.log("resolved base url:", url);

    // 2) Find wrapper
    const wrap = document.querySelector('.product-gallery__carousel-item[data-media-id^="logo-preview_"]');
    console.log("wrapper found?", !!wrap, wrap);
    if (!wrap) {
      console.warn("[variant-swap] preview wrapper not found");
      console.groupEnd();
      return;
    }

    const newMediaId = `logo-preview_${variantId}`;
    wrap.setAttribute("data-media-id", newMediaId);
    wrap.setAttribute("data-media-option", variantTitle || "");

    // 3) swap the <img>
    const img = wrap.querySelector(".img-preview_canvas");
    console.log("<img> found?", !!img, img);
    if (img) {
      img.src = url;
      img.setAttribute("data-zoom", url);
      img.setAttribute("data-original", url);
      img.setAttribute("data-media-id", newMediaId);
      img.setAttribute("data-media-option", variantTitle || "");
      console.log("img updated ->", { newMediaId, url });
    }

    // 4) update the canvas + redraw base
    const cv = wrap.querySelector(".logo-preview_canvas");
    console.log("<canvas> found?", !!cv, cv);
    if (!cv) {
      console.warn("[variant-swap] canvas not found");
      console.groupEnd();
      return;
    }

    cv.setAttribute("data-media-id", newMediaId);
    cv.setAttribute("data-media-option", variantTitle || "");
    cv.removeAttribute("data-original-canvas"); // force fresh base
    console.log("canvas attrs updated; calling firstLoadImage…");

    if (typeof window.firstLoadImage !== "function") {
      console.warn("[variant-swap] firstLoadImage is not defined");
      console.groupEnd();
      return;
    }

    firstLoadImage(newMediaId, () => {
      console.log("firstLoadImage() callback fired for", newMediaId);

      // 5) re-apply the user’s logo (if any)
      const anyLogo = hasAnyUploadedLogo();
      if (!anyLogo) {
        console.log("no uploaded logo present — nothing to re-apply");
        console.groupEnd();
        return;
      }

      const file = getExistingLogoFile(variantTitle);
      if (!file) {
        console.warn("could not obtain a File to re-apply");
        console.groupEnd();
        return;
      }

      if (typeof window.setLogoPreview !== "function") {
        console.warn("setLogoPreview is not defined");
        console.groupEnd();
        return;
      }

      console.log("calling renderLogoFile(file)…", { name: file.name, size: file.size, type: file.type });
      renderLogoFile(file, { targetMediaId: `logo-preview_${variantId}`, skipUpload: true });
      console.log("renderLogoFile dispatched");
      console.groupEnd();
    });
  }


  document.addEventListener(
    "click",
    function (e) {
      const btn = e.target.closest(".color-swatch__item");
      if (!btn) return;

      const swatchText = btn.textContent.trim();
      console.log("[variant-swap] swatch clicked:", swatchText);

      setTimeout(() => {
        const idInput = document.querySelector('form[action*="/cart/add"] input[name="id"]');
        const id = new URLSearchParams(location.search).get("variant") || idInput?.value;
        console.log("[variant-swap] variant after click:", id);
        if (!id) {
          console.warn("[variant-swap] no variant id available after click");
          return;
        }
        swapToVariantAndReapply(String(id), swatchText);
      }, 80);
    },
    true 
  );
});

