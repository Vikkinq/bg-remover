// Load TensorFlow.js and BodyPix Model
let net = null;

// Ensure BodyPix loads before allowing processing
const modelPromise = bodyPix.load().then(model => {
    net = model;
    updateLoadingProgress(100, "Model loaded!");
    console.log("✅ BodyPix Model Loaded");
});

// Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewContainer = document.getElementById('preview-container');
const removeBgButton = document.getElementById('remove-bg');
const resultContainer = document.getElementById('result-container');
const resultCanvas = document.getElementById('result'); // Canvas for output
const downloadButton = document.getElementById('download');
const tryAnotherButton = document.getElementById('try-another');
const dragOverlay = document.getElementById('drag-overlay');
const loadingOverlay = document.querySelector('.loading-overlay');
const progressBar = document.querySelector('.loading-progress');
const percentageText = document.querySelector('.loading-percentage');
const stepText = document.querySelector('.loading-step');

// Handle File Selection
fileInput.addEventListener("change", handleFile);

function handleFile() {
    const file = fileInput.files[0];
    if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function (event) {
            preview.src = event.target.result;
            previewContainer.classList.remove("hidden");
            resultContainer.classList.add("hidden");
            removeBgButton.disabled = false;
        };
        reader.readAsDataURL(file);
    }
}

// Update Loading Progress Bar
function updateLoadingProgress(progress, step) {
    progressBar.style.width = `${progress}%`;
    percentageText.textContent = `${progress}%`;
    stepText.textContent = step;
}

// Background Removal Process
removeBgButton.addEventListener("click", async () => {
    if (!preview.src) {
        alert("Please upload an image first.");
        return;
    }

    if (!net) {
        alert("The AI model is still loading. Please wait.");
        return;
    }

    removeBgButton.disabled = true;
    loadingOverlay.classList.remove("hidden");

    updateLoadingProgress(10, "Preparing image...");

    // Load Image from Preview
    const img = new Image();
    img.src = preview.src;
    await img.decode();

    // Resize Image for Faster Processing
    updateLoadingProgress(30, "Resizing image...");
    const resizedCanvas = resizeImage(img);
    const resizedCtx = resizedCanvas.getContext("2d");

    // Set Up Result Canvas
    resultCanvas.width = resizedCanvas.width;
    resultCanvas.height = resizedCanvas.height;
    const ctx = resultCanvas.getContext("2d");

    // Process Image with BodyPix
    updateLoadingProgress(50, "Applying AI model...");
    const segmentation = await net.segmentPerson(resizedCanvas, {
        internalResolution: "full", // Faster processing
        segmentationThreshold: 0.8, // Adjust for better detection
    });

    updateLoadingProgress(70, "Processing image...");

    // Draw Image on Canvas
    ctx.drawImage(resizedCanvas, 0, 0);
    const imageData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const pixelData = imageData.data;

    for (let i = 0; i < pixelData.length; i += 4) {
        if (!segmentation.data[i / 4]) {
            pixelData[i + 3] = 0; // Make Transparent
        }
    }

    ctx.putImageData(imageData, 0, 0);

    updateLoadingProgress(90, "Finalizing image...");

    // Show Result
    resultContainer.classList.remove("hidden");

    updateLoadingProgress(100, "Complete!");
    setTimeout(() => {
        loadingOverlay.classList.add("hidden");
    }, 500);

    removeBgButton.disabled = false;
});

// Resize Image Before Processing for Better Speed
function resizeImage(img, maxWidth = 512) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
}

// Download Processed Transparent Image
downloadButton.addEventListener("click", () => {
    if (!resultCanvas) {
        alert("No processed image available to download.");
        return;
    }
    const link = document.createElement("a");
    link.download = "background_removed.png";
    link.href = resultCanvas.toDataURL("image/png");
    link.click();
});

// Try Another Image
tryAnotherButton.addEventListener("click", () => {
    previewContainer.classList.add("hidden");
    resultContainer.classList.add("hidden");
    fileInput.value = "";
    preview.src = "";
    resultCanvas.getContext("2d").clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    removeBgButton.disabled = false;
});

// Highlight Drop Zone
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

// Full Screen Drag Overlay
document.body.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragOverlay.classList.remove('hidden');
});

dragOverlay.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('hidden');
});

dragOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
});

dragOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('hidden');
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

// File Handling
dropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            removeBgButton.disabled = false;
        }
        reader.readAsDataURL(file);
    }
}