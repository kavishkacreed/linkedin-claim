document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('claim-form');
  const codeInput = document.getElementById('claim-code');
  const errorMsg = document.getElementById('error-message');
  const btnSubmit = document.getElementById('btn-submit');
  const btnText = btnSubmit.querySelector('.btn-text');
  const spinner = btnSubmit.querySelector('.spinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawCode = codeInput.value;
    if (!rawCode || rawCode.trim() === '') {
      showError('Please enter a valid activation code.');
      return;
    }

    const cleanedCode = rawCode.trim().toUpperCase();

    // Reset UI state
    clearError();
    setLoading(true);

    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: cleanedCode })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update button status for immediate feedback
        btnText.textContent = 'Activating...';
        
        // Brief delay for transition feedback, then redirect
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 800);
      } else {
        showError(data.error || 'Activation failed. Please check your code and try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Network error during activation:', error);
      showError('Unable to connect to the server. Please check your internet connection and try again.');
      setLoading(false);
    }
  });

  // Automatically make typed characters uppercase
  codeInput.addEventListener('input', () => {
    clearError();
    // Auto-capitalize for clean formatting
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    codeInput.value = codeInput.value.toUpperCase();
    codeInput.setSelectionRange(start, end);
  });

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.opacity = '1';
    codeInput.style.borderColor = '#d11124';
    codeInput.style.boxShadow = '0 0 0 1px #d11124';
  }

  function clearError() {
    errorMsg.textContent = '';
    errorMsg.style.opacity = '0';
    codeInput.style.borderColor = '';
    codeInput.style.boxShadow = '';
  }

  function setLoading(isLoading) {
    if (isLoading) {
      btnSubmit.disabled = true;
      btnText.textContent = 'Verifying Code...';
      spinner.classList.remove('hidden');
    } else {
      btnSubmit.disabled = false;
      btnText.textContent = 'Activate Premium';
      spinner.classList.add('hidden');
    }
  }
});
