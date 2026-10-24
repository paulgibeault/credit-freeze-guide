/**
 * Credit Freeze Guide — Main Application
 * 
 * Manages UI state, tab navigation, PIN storage, freeze status tracking,
 * and toast notifications. All data persisted to localStorage.
 */
const App = (() => {
  const BUREAUS = ['equifax', 'experian', 'transunion'];
  
  // === INITIALIZATION ===
  
  async function init() {
    setupNavigation();
    setupBureauButtons();
    setupPinHandlers();
    await loadState();
    registerServiceWorker();
  }
  
  // === NAVIGATION ===
  
  function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        switchTab(target);
      });
    });
  }
  
  function switchTab(target) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isActive = tab.dataset.tab === target;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });
    
    // Update content sections
    document.querySelectorAll('.tab-content').forEach(section => {
      const isActive = section.id === `tab-${target}`;
      section.classList.toggle('active', isActive);
    });
    
    // If switching to pins tab, refresh PIN display
    if (target === 'pins') {
      refreshPinDisplay();
    }
    
    // If switching to dashboard, refresh status
    if (target === 'dashboard') {
      refreshDashboard();
    }
  }
  
  // === BUREAU STATUS ===
  
  function setupBureauButtons() {
    document.querySelectorAll('.mark-complete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bureau = btn.dataset.bureau;
        toggleBureauStatus(bureau);
      });
    });
  }
  
  async function toggleBureauStatus(bureau) {
    const status = getStatus(bureau);
    const newStatus = status === 'complete' ? 'pending' : 'complete';
    setStatus(bureau, newStatus);
    
    if (newStatus === 'complete') {
      showToast(`${capitalize(bureau)} freeze marked as complete`);
    } else {
      showToast(`${capitalize(bureau)} freeze marked as pending`);
    }
    
    // Refresh all views
    refreshAll();
  }
  
  function getStatus(bureau) {
    const data = getStore();
    return data.statuses?.[bureau] || 'pending';
  }
  
  function setStatus(bureau, status) {
    const data = getStore();
    if (!data.statuses) data.statuses = {};
    data.statuses[bureau] = status;
    saveStore(data);
  }
  
  function getCompleteCount() {
    return BUREAUS.filter(b => getStatus(b) === 'complete').length;
  }
  
  // === PIN HANDLERS ===
  
  function setupPinHandlers() {
    // Save PIN buttons
    document.querySelectorAll('.btn-save-pin').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bureau = btn.dataset.bureau;
        const input = document.getElementById(`pin-input-${bureau}`);
        const pin = input.value.trim();
        
        if (!pin) {
          showToast('Please enter your PIN');
          input.focus();
          return;
        }
        
        const success = await Encryption.savePin(bureau, pin);
        if (success) {
          showToast(`${capitalize(bureau)} PIN saved`);
          input.value = '';
          refreshPinDisplay();
          refreshDashboard();
          
          // Also mark as complete if still pending
          if (getStatus(bureau) === 'pending') {
            setStatus(bureau, 'complete');
            refreshAll();
          }
        } else {
          showToast('Failed to save PIN. Please try again.');
        }
      });
    });
    
    // Show/hide PIN buttons
    document.querySelectorAll('.pin-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pin = btn.dataset.pin;
        togglePinVisibility(pin, btn);
      });
    });
    
    // Copy PIN buttons
    document.querySelectorAll('.pin-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pin = btn.dataset.pin;
        await copyPin(pin, btn);
      });
    });
    
    // Delete PIN buttons
    document.querySelectorAll('.pin-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bureau = btn.dataset.bureau;
        if (confirm(`Delete your saved ${bureau} PIN? This cannot be undone.`)) {
          Encryption.deletePin(bureau);
          showToast(`${capitalize(bureau)} PIN deleted`);
          refreshPinDisplay();
          refreshDashboard();
        }
      });
    });
  }
  
  async function togglePinVisibility(bureau, btn) {
    const pinDisplay = document.getElementById(`pin-${bureau}`);
    const masked = pinDisplay.querySelector('.pin-masked');
    const isHidden = btn.textContent === 'Show';
    
    if (isHidden) {
      const pin = await Encryption.getPin(bureau);
      masked.textContent = pin || '••••••••';
      masked.style.letterSpacing = '0.15em';
      btn.textContent = 'Hide';
    } else {
      masked.textContent = '••••••••';
      masked.style.letterSpacing = '0.1em';
      btn.textContent = 'Show';
    }
  }
  
  async function copyPin(bureau, btn) {
    const pin = await Encryption.getPin(bureau);
    if (!pin) {
      showToast(`No PIN saved for ${bureau}`);
      return;
    }
    
    try {
      await navigator.clipboard.writeText(pin);
      showToast(`${capitalize(bureau)} PIN copied to clipboard`);
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = pin;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(`${capitalize(bureau)} PIN copied to clipboard`);
    }
  }
  
  async function refreshPinDisplay() {
    for (const bureau of BUREAUS) {
      const pinDisplay = document.getElementById(`pin-${bureau}`);
      if (!pinDisplay) continue;
      
      const masked = pinDisplay.querySelector('.pin-masked');
      const statusEl = pinDisplay.closest('.pin-card').querySelector(`[data-pin-status="${bureau}"]`);
      const toggleBtn = pinDisplay.querySelector('.pin-toggle');
      const copyBtn = pinDisplay.querySelector('.pin-copy');
      const deleteBtn = pinDisplay.closest('.pin-card').querySelector('.pin-delete');
      const inputGroup = pinDisplay.closest('.pin-card').querySelector('.pin-input-group');
      
      const hasSaved = await Encryption.hasPin(bureau);
      
      if (hasSaved) {
        statusEl.textContent = 'Saved';
        statusEl.style.color = 'var(--green-700)';
        masked.textContent = '••••••••';
        masked.style.letterSpacing = '0.1em';
        toggleBtn.style.display = '';
        copyBtn.style.display = '';
        deleteBtn.style.display = '';
        deleteBtn.hidden = false;
        inputGroup.style.display = 'none';
      } else {
        statusEl.textContent = 'Not saved';
        statusEl.style.color = '';
        masked.textContent = '••••••••';
        toggleBtn.textContent = 'Show';
        copyBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        deleteBtn.hidden = true;
        inputGroup.style.display = '';
      }
    }
  }
  
  // === DASHBOARD ===
  
  function refreshDashboard() {
    const count = getCompleteCount();
    
    // Update progress ring
    const circumference = 2 * Math.PI * 58; // r=58
    const fill = document.querySelector('.progress-ring-fill');
    const text = document.getElementById('progress-text');
    const label = document.getElementById('progress-label');
    
    const progress = count / 3;
    const offset = circumference * (1 - progress);
    fill.style.strokeDashoffset = offset;
    text.textContent = `${count} of 3`;
    
    // Update label
    if (count === 0) {
      label.textContent = 'Start by freezing your credit at each bureau';
    } else if (count < 3) {
      const remaining = BUREAUS.filter(b => getStatus(b) !== 'complete');
      label.textContent = `${capitalize(remaining[0])} remaining — you're doing great!`;
    } else {
      label.textContent = 'All three bureaus frozen! You\'re protected.';
    }
    
    // Update status items
    for (const bureau of BUREAUS) {
      const item = document.querySelector(`.status-item[data-bureau="${bureau}"]`);
      if (!item) continue;
      
      const status = getStatus(bureau);
      const detail = item.querySelector('[data-status-detail]');
      const pinEl = item.querySelector('[data-status-pin]');
      const completeBtn = item.querySelector('.mark-complete');
      const pendingBtn = item.querySelector('.mark-pending');
      
      if (status === 'complete') {
        item.classList.add('complete');
        detail.textContent = 'Frozen';
        completeBtn.hidden = true;
        pendingBtn.hidden = false;
      } else {
        item.classList.remove('complete');
        detail.textContent = 'Not yet frozen';
        completeBtn.hidden = false;
        pendingBtn.hidden = true;
      }
      
      // Update PIN display in status
      updateStatusPin(bureau, pinEl);
    }
    
    // Show/hide complete message
    const completeMsg = document.getElementById('complete-message');
    if (count === 3) {
      completeMsg.hidden = false;
    } else {
      completeMsg.hidden = true;
    }
  }
  
  async function updateStatusPin(bureau, pinEl) {
    const pin = await Encryption.getPin(bureau);
    if (pin) {
      pinEl.textContent = `PIN: ${pin}`;
      pinEl.hidden = false;
    } else {
      pinEl.textContent = 'No PIN saved';
      pinEl.hidden = true;
    }
  }
  
  // === STATE MANAGEMENT ===
  
  function getStore() {
    try {
      const data = localStorage.getItem('freeze_app_data');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }
  
  function saveStore(data) {
    try {
      localStorage.setItem('freeze_app_data', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }
  
  async function loadState() {
    refreshPinDisplay();
    refreshDashboard();
  }
  
  function refreshAll() {
    refreshPinDisplay();
    refreshDashboard();
    
    // Update bureau cards on guide tab
    for (const bureau of BUREAUS) {
      const status = getStatus(bureau);
      const statusEl = document.querySelector(`.bureau-card[data-bureau="${bureau}"] [data-status="${bureau}"]`);
      if (statusEl) {
        statusEl.textContent = status === 'complete' ? 'Frozen' : 'Pending';
        statusEl.className = `bureau-status status-${status === 'complete' ? 'complete' : 'pending'}`;
      }
    }
  }
  
  // === TOAST NOTIFICATIONS ===
  
  let toastTimeout;
  
  function showToast(message) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    
    clearTimeout(toastTimeout);
    msgEl.textContent = message;
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  // === SERVICE WORKER ===
  
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('Service Worker registered:', reg.scope))
          .catch(err => console.error('Service Worker registration failed:', err));
      });
    }
  }
  
  // === UTILITIES ===
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // === PUBLIC API ===
  
  return {
    init
  };
})();

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
