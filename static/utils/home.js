// Không cần import Toastify nếu dùng CDN

document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const uploadText = document.getElementById('upload-text');
  // const previewImg = document.getElementById('previewImg');
  // const imagePreview = document.getElementById('imagePreview');
  // const submitBtn = document.getElementById('submitBtn');

  // Kiểm tra null
  if (!uploadArea || !fileInput || !uploadText) {
    console.error('One or more elements not found');
    return;
  }

  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.classList.add('bg-gray-300');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('bg-gray-300');
  });

  uploadArea.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('bg-gray-300');
    const files = event.dataTransfer.files;
    handleFileSelect(files);
  });

  fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    handleFileSelect(files);
  });

  document.addEventListener('paste', (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        handleFileSelect([file]);
      }
    }
  });

  const images = document.querySelectorAll('.flex img');
  images.forEach((img) => {
    img.addEventListener('click', () => {
      const imgURL = img.src;
      localStorage.setItem('uploadedImage', imgURL);
      uploadText.classList.add('hidden');
      fileInput.value = '';
    });
  });


  function handleFileSelect(files) {
    if (files.length > 0) {
      const file = files[0];
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        showToast('Please select a PNG or JPEG image!', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = function () {
        localStorage.setItem('uploadedImage', reader.result);
        window.location.href = '/remove-bg';
        showToast('Image uploaded successfully!', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  function showToast(message, type = 'success') {
    window.Toastify({
      text: message,
      duration: 3000,
      style: {
        background: type === 'success' ? 'green' : 'red',
      },
    }).showToast();
  }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToFeatures() {
  const featuresSection = document.getElementById('features-section');
  if (featuresSection) {
    featuresSection.scrollIntoView({ behavior: 'smooth' });
  }
}