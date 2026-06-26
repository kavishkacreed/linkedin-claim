document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  
  const loginForm = document.getElementById('login-form');
  const passwordInput = document.getElementById('admin-password');
  const loginError = document.getElementById('login-error');
  
  const btnLogout = document.getElementById('btn-logout');
  const btnRefresh = document.getElementById('btn-refresh');
  const logsTbody = document.getElementById('logs-tbody');

  // Check if password is saved in localStorage
  const savedPassword = localStorage.getItem('admin_password');
  if (savedPassword) {
    loadDashboard(savedPassword);
  }

  // Handle Login Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if (!password) return;

    loginError.textContent = '';
    const success = await fetchAndRenderLogs(password);
    
    if (success) {
      localStorage.setItem('admin_password', password);
      loginContainer.classList.add('hidden');
      dashboardContainer.classList.remove('hidden');
      btnLogout.classList.remove('hidden');
    } else {
      loginError.textContent = 'Invalid administrator password.';
      passwordInput.value = '';
    }
  });

  // Handle Logout
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('admin_password');
    location.reload();
  });

  // Handle Refresh
  btnRefresh.addEventListener('click', () => {
    const password = localStorage.getItem('admin_password');
    if (password) {
      fetchAndRenderLogs(password);
    }
  });

  async function loadDashboard(password) {
    const success = await fetchAndRenderLogs(password);
    if (success) {
      loginContainer.classList.add('hidden');
      dashboardContainer.classList.remove('hidden');
      btnLogout.classList.remove('hidden');
    } else {
      // Saved password was incorrect/expired
      localStorage.removeItem('admin_password');
    }
  }

  // Fetch log list and render in DOM
  async function fetchAndRenderLogs(password) {
    try {
      const response = await fetch('/api/admin/logs', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (!data.success) {
        return false;
      }

      renderLogs(data.logs);
      return true;

    } catch (err) {
      console.error('Error loading logs:', err);
      return false;
    }
  }

  // Populate table rows
  function renderLogs(logs) {
    logsTbody.innerHTML = '';
    
    if (logs.length === 0) {
      logsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #666;">No activation logs found in database.</td></tr>`;
      return;
    }

    logs.forEach(log => {
      const tr = document.createElement('tr');
      
      // 1. Date & Time
      const dateCell = document.createElement('td');
      const logDate = new Date(log.created_at);
      dateCell.textContent = logDate.toLocaleString();
      
      // 2. Code Entered
      const codeCell = document.createElement('td');
      codeCell.innerHTML = `<code>${log.code || '<i>(None)</i>'}</code>`;
      
      // 3. Status Badge
      const statusCell = document.createElement('td');
      let badgeClass = 'badge-error';
      let label = log.status;
      
      if (log.status === 'SUCCESS') {
        badgeClass = 'badge-success';
        label = 'SUCCESS';
      } else if (log.status === 'INVALID_CODE') {
        badgeClass = 'badge-invalid';
        label = 'Invalid Code';
      } else if (log.status === 'ALREADY_REDEEMED') {
        badgeClass = 'badge-used';
        label = 'Already Redeemed';
      } else if (log.status === 'SYSTEM_ERROR') {
        badgeClass = 'badge-error';
        label = 'System Error';
      }
      
      statusCell.innerHTML = `<span class="badge ${badgeClass}">${label}</span>`;
      
      // 4. IP Address
      const ipCell = document.createElement('td');
      ipCell.textContent = log.ip || 'N/A';
      
      // 5. Browser / OS
      const browserCell = document.createElement('td');
      browserCell.textContent = parseUserAgent(log.user_agent);
      browserCell.title = log.user_agent || 'Unknown'; // Tooltip of the full agent string
      
      tr.appendChild(dateCell);
      tr.appendChild(codeCell);
      tr.appendChild(statusCell);
      tr.appendChild(ipCell);
      tr.appendChild(browserCell);
      
      logsTbody.appendChild(tr);
    });
  }

  // Parse user agent into friendly text
  function parseUserAgent(ua) {
    if (!ua) return 'Unknown';
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    
    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';
    
    // Detect Browser
    if (ua.includes('WhatsApp/')) browser = 'WhatsApp Link Preview';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
    
    return `${browser} (${os})`;
  }
});
