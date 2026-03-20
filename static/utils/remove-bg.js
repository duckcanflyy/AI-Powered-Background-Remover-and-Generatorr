document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const originalColumn = document.getElementById("originalColumn");
  const removedBackgroundColumn = document.getElementById(
    "removedBackgroundColumn"
  );
  const originalIndicator = document.getElementById("originalIndicator");
  const removedIndicator = document.getElementById("removedIndicator");
  const resultImg = document.getElementById("result");
  const loading = document.getElementById("loading");
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");
  const uploadText = document.getElementById("upload-text");
  const downloadBtn = document.getElementById("download-btn");
  const backgroundUploadInput = document.getElementById("dropzone-file");
  const defaultBackgrounds = document.querySelectorAll(".grid img");
  const colorInputs = document.querySelectorAll(".color-input, .flex-wrap div");
  // Get the modal elements
  const modal = document.getElementById("modal");
  const modalLoading = modal.querySelector("#loading");
  const generatedImage = document.getElementById("generatedImage");
  const applyBtn = document.getElementById("applyBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  // Get the generate button and text area
  const generateButton = document.querySelector(".generate-button");
  const backgroundTextArea = document.getElementById("backgroundText");

  // State variables
  let uploadedImage = localStorage.getItem("uploadedImage");
  let processedImage = null;
  let completedImage = null;
  let abortController = null;
  let lastToastMessage = "";
  let lastRequestTime = 0;
  let lastProcessedImage = null;
  let isGenerating = false;
  let generatedBackgroundUrl = null;
  let currentTab = "removed"; // Track the active tab
  const REQUEST_COOLDOWN = 1000;
  const PLACEHOLDER_IMAGE =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  // Check required elements
  const requiredElements = {
    originalColumn,
    removedBackgroundColumn,
    originalIndicator,
    removedIndicator,
    resultImg,
    loading,
    uploadArea,
    fileInput,
    uploadText,
    downloadBtn,
    backgroundUploadInput,
  };

  for (const [name, element] of Object.entries(requiredElements)) {
    if (!element) {
      console.error(`Required element not found: ${name}`);
      window.utils.showToast("Page error. Redirecting to home...", "error");
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
      return;
    }
  }

  // Check for valid uploaded image
  if (!uploadedImage || !isValidDataUrl(uploadedImage)) {
    console.error("No valid uploaded image found");
    window.utils.showToast(
      "No image selected. Redirecting to home...",
      "error"
    );
    setTimeout(() => {
      window.location.href = "/";
    }, 3000);
    return;
  }

  // Initialize image
  resultImg.src = uploadedImage;
  resultImg.classList.remove("hidden");

  // Validate data URL function
  function isValidDataUrl(url) {
    if (!url || typeof url !== "string" || !url.startsWith("data:image/")) {
      console.error(
        `Invalid data URL: ${url ? url.slice(0, 50) : "null or undefined"}...`
      );
      return false;
    }
    const base64Match = url.match(/^data:image\/[a-z]+;base64,(.+)$/);
    if (!base64Match) {
      console.error(`Invalid base64 format: ${url.slice(0, 50)}...`);
      return false;
    }
    try {
      const base64 = base64Match[1];
      atob(base64); // Decode to check validity
      return url.length > 100; // Ensure sufficient length for a real image
    } catch (e) {
      console.error(`Base64 decode error: ${e.message}`);
      return false;
    }
  }

  // Convert data URL to Blob
  function dataUrlToBlob(dataUrl) {
    const byteString = atob(dataUrl.split(",")[1]);
    const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  // Show toast message (with deduplication)
  function showToast(message, type = "success") {
    if (lastToastMessage !== message) {
      lastToastMessage = message;
      window.utils.showToast(message, type);
      setTimeout(() => {
        lastToastMessage = "";
      }, 3000);
    }
  }

  // Update loading state based on current tab
  function updateLoadingState(isLoading) {
    if (isLoading && currentTab === "removed") {
      window.utils.showLoading(true);
      resultImg.classList.add("hidden");
    } else {
      window.utils.showLoading(false);
      resultImg.classList.remove("hidden");
    }
  }

  // Tab switching
  window.showImage = function (type, element) {
    originalIndicator.classList.add("hidden");
    removedIndicator.classList.add("hidden");
    currentTab = type;

    if (type === "original") {
      originalIndicator.classList.remove("hidden");
      resultImg.src = uploadedImage;
      window.utils.showLoading(false); // Never show loading in original tab
      resultImg.classList.remove("hidden");
    } else {
      removedIndicator.classList.remove("hidden");
      const src =
        completedImage && isValidDataUrl(completedImage)
          ? completedImage
          : processedImage && isValidDataUrl(processedImage)
          ? processedImage
          : uploadedImage;
      resultImg.src = src;

      // Only show loading if we're currently processing
      if (abortController !== null && processing) {
        window.utils.showLoading(true);
        resultImg.classList.add("hidden");
      }
    }

    originalColumn.classList.remove("text-blue-700");
    removedBackgroundColumn.classList.remove("text-blue-700");
    element.classList.add("text-blue-700");
  };

  // Default to Result tab
  showImage("removed", removedBackgroundColumn);

  // Process image on startup
  let processing = false;
  if (uploadedImage) {
    processing = true;
    updateLoadingState(true);
    removeBackground(uploadedImage);
  }

  // Handle file selection for new image upload
  function handleFileSelect(files) {
    if (files.length > 0) {
      const file = files[0];
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        showToast("Please select a PNG or JPEG image!", "error");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        showToast("Image size exceeds 25MB limit!", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = function () {
        uploadedImage = reader.result;
        if (!isValidDataUrl(uploadedImage)) {
          showToast("Invalid image data!", "error");
          return;
        }
        localStorage.setItem("uploadedImage", uploadedImage);
        localStorage.removeItem("processedWithoutBackground"); // Clear old processed image
        processedImage = null;
        completedImage = null;

        // Switch to removed tab and start processing
        showImage("removed", removedBackgroundColumn);
        processing = true;
        updateLoadingState(true);
        removeBackground(uploadedImage);
      };
      reader.onerror = function () {
        showToast("Failed to read image!", "error");
      };
      reader.readAsDataURL(file);
    }
  }

  // Remove background function
  function removeBackground(imageData) {
    const now = Date.now();
    if (now - lastRequestTime < REQUEST_COOLDOWN) {
      showToast("Please wait a few seconds before retrying.", "error");
      return;
    }
    lastRequestTime = now;
    processing = true;

    if (currentTab === "removed") {
      updateLoadingState(true);
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();

    const timeoutId = setTimeout(() => {
      abortController.abort();
      processing = false;
      updateLoadingState(false);
      showToast(
        "Error: Request timed out. Try a smaller image or check the server.",
        "error"
      );
    }, 80000);

    const formData = new FormData();
    formData.append("image", dataUrlToBlob(imageData), "uploaded_image.png");

    fetch("/remove-background", {
      method: "POST",
      body: formData,
      signal: abortController.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.data || `API error: ${response.status}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        processing = false;
        updateLoadingState(false);

        if (data.status === "success" && isValidDataUrl(data.data)) {
          const cleanImage = data.data;
          // Store the clean background-removed image for later use
          localStorage.setItem("processedWithoutBackground", cleanImage);
          completedImage = cleanImage;

          if (completedImage !== lastProcessedImage) {
            lastProcessedImage = completedImage;
            if (currentTab === "removed") {
              resultImg.src = completedImage;
            }
            showToast("Background removed successfully!", "success");
          }
        } else {
          showToast(data.data || "Failed to remove background", "error");
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        processing = false;
        updateLoadingState(false);

        if (error.name === "AbortError") {
          return;
        }
        showToast(
          `Error: ${error.message || "Server not responding"}`,
          "error"
        );
      });
  }

  // Apply background function
  function applyBackground(backgroundData) {
    // Always use the initial background-removed image when applying a new background
    const sourceImage = localStorage.getItem("processedWithoutBackground");

    if (!sourceImage || !isValidDataUrl(sourceImage)) {
      showToast("Please remove background first!", "error");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < REQUEST_COOLDOWN) {
      showToast("Please wait a few seconds before retrying.", "error");
      return;
    }
    lastRequestTime = now;
    processing = true;

    if (currentTab === "removed") {
      updateLoadingState(true);
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();

    const timeoutId = setTimeout(() => {
      abortController.abort();
      processing = false;
      updateLoadingState(false);
      showToast(
        "Error: Request timed out. Try a smaller image or check the server.",
        "error"
      );
    }, 80000);

    const formData = new FormData();
    formData.append("image", dataUrlToBlob(sourceImage), "processed_image.png");
    formData.append(
      "background",
      dataUrlToBlob(backgroundData),
      "background_image.png"
    );

    // Call API to apply background
    fetch("/add-background", {
      method: "POST",
      body: formData,
      signal: abortController.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json(); // ← Lấy JSON thay vì blob
      })
      .then((data) => {
        processing = false;
        updateLoadingState(false);

        const dataUrl = data.data; // ← Đây là chuỗi base64 ảnh

        completedImage = dataUrl;
        lastProcessedImage = dataUrl;

        if (currentTab === "removed") {
          resultImg.src = dataUrl; // ← Dùng luôn chuỗi này để hiển thị
        }

        showToast("Background applied successfully!", "success");
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        processing = false;
        updateLoadingState(false);

        if (error.name === "AbortError") {
          return;
        }

        applyColorClientSide(backgroundData, sourceImage);
        showToast(
          `Error: ${
            error.message ||
            "Server not responding. Applied background locally."
          }`,
          "warning"
        );
      });
  }

  generateButton.addEventListener("click", function (e) {
    e.preventDefault(); // Prevent form submission

    const prompt = backgroundTextArea.value.trim();
    if (!prompt) {
      window.utils.showToast(
        "Please enter a description for your background.",
        "error"
      );
      return;
    }

    if (isGenerating) {
      window.utils.showToast(
        "Already generating a background, please wait.",
        "warning"
      );
      return;
    }

    generateAIBackground(prompt);
  });

  // Event listeners for the modal buttons
  applyBtn.addEventListener("click", function () {
    if (generatedBackgroundUrl) {
      applyBackground(generatedBackgroundUrl);
      closeModal();
    }
  });

  closeModalBtn.addEventListener("click", closeModal);

  // Close the modal when clicking outside
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Function to generate AI background
  function generateAIBackground(prompt) {
    isGenerating = true;

    // Show modal with loading indicator
    modal.classList.remove("hidden");
    modalLoading.classList.remove("hidden");
    generatedImage.classList.add("hidden");
    applyBtn.classList.add("hidden");

    // Make API call to generate background
    fetch("/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ background_text: prompt }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to generate background");
        }
        return response.json();
      })
      .then((json) => {
        // Lấy trực tiếp base64 từ JSON
        generatedBackgroundUrl = json.data;


        // Hiển thị ảnh trong modal
        generatedImage.src = generatedBackgroundUrl;
        generatedImage.classList.remove("hidden");
        applyBtn.classList.remove("hidden");
        modalLoading.classList.add("hidden");

        window.utils.showToast("Background generated successfully!", "success");
      })
      .catch((error) => {
        console.error("Error generating background:", error);
        window.utils.showToast(
          `Error: ${error.message || "Failed to generate background"}`,
          "error"
        );
        closeModal();
      })
      .finally(() => {
        isGenerating = false;
      });
  }

  // Function to close the modal
  function closeModal() {
    modal.classList.add("hidden");
    modalLoading.classList.add("hidden");
    generatedImage.classList.add("hidden");
    applyBtn.classList.add("hidden");
    generatedBackgroundUrl = null;
  }

  // Apply color client-side function
  function applyColorClientSide(backgroundData, sourceImage) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.src = sourceImage;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = backgroundData.includes("base64")
        ? "#FFFFFF"
        : backgroundData;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const newDataUrl = canvas.toDataURL("image/png");
      if (isValidDataUrl(newDataUrl)) {
        completedImage = newDataUrl;
        lastProcessedImage = completedImage;

        if (currentTab === "removed") {
          resultImg.src = completedImage;
        }
      } else {
        showToast("Failed to apply background locally.", "error");
      }
    };
    img.onerror = () => {
      showToast("Failed to apply background locally.", "error");
    };
  }

  // Event Listeners
  // File upload
  uploadArea.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) =>
    handleFileSelect(event.target.files)
  );

  // Drag and drop
  uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.classList.add("bg-gray-200");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("bg-gray-200");
  });

  uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadArea.classList.remove("bg-gray-200");
    handleFileSelect(event.dataTransfer.files);
  });

  // Paste
  document.addEventListener("paste", (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        handleFileSelect([items[i].getAsFile()]);
      }
    }
  });

  // Download button
  downloadBtn.addEventListener("click", () => {
    if (completedImage && isValidDataUrl(completedImage)) {
      const link = document.createElement("a");
      link.href = completedImage;
      link.download = "background-removed.png";
      link.click();
    } else {
      showToast("No processed image available!", "error");
    }
  });

  // Background upload
  backgroundUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && ["image/png", "image/jpeg"].includes(file.type)) {
      const reader = new FileReader();
      reader.onload = () => applyBackground(reader.result);
      reader.onerror = () =>
        showToast("Failed to read background image!", "error");
      reader.readAsDataURL(file);
    } else {
      showToast("Please select a PNG or JPEG background!", "error");
    }
  });

  // Default backgrounds
  defaultBackgrounds.forEach((bg) => {
    bg.addEventListener("click", () => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // nếu ảnh là nội bộ thì không vấn đề
      img.src = bg.src;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL("image/png");
        applyBackground(dataUrl);
      };

      img.onerror = () => {
        showToast("Không thể load ảnh nền!", "error");
      };
    });
  });

  // Color picker
  colorInputs.forEach((input) => {
    input.addEventListener("click", (e) => {
      const color =
        e.target.tagName === "INPUT"
          ? e.target.value
          : window.getComputedStyle(e.target).backgroundColor;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 512, 512);
      applyBackground(canvas.toDataURL("image/png"));
    });
  });
});
