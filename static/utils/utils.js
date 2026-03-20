// static/utils/utils.js
function showToast(message, type = 'success') {
  window.Toastify({
    text: message,
    duration: 3000,
    style: {
      background: type === 'success' ? 'green' : 'red',
    },
  }).showToast();
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showModal(show) {
  document.getElementById('modal').style.display = show ? 'block' : 'none';
}

// Expose to global scope
window.utils = {
  showToast,
  showLoading,
  showModal,
};