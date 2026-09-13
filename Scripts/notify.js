// SHARED NOTIFICATIONS: toast + confirm modal
// Include this script on every page, before any page-specific script that calls showToast/showConfirm.

(function () {
  const style = document.createElement('style');
  style.textContent = `
    #toastStack {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-width: 340px;
    }
    .toast {
      background: white;
      border-radius: 10px;
      padding: 0.9rem 1.1rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      border-left: 4px solid var(--sa-green, #007A3D);
      animation: toastIn 0.25s ease-out;
    }
    .toast.error { border-left-color: #ef4444; }
    .toast.info { border-left-color: var(--sa-blue, #002244); }
    .toast i { margin-top: 0.15rem; }
    .toast.success i { color: var(--sa-green, #007A3D); }
    .toast.error i { color: #ef4444; }
    .toast.info i { color: var(--sa-blue, #002244); }
    .toast span { color: #1a202c; line-height: 1.4; flex: 1; }
    .toast .toast-close {
      background: none; border: none; color: #94a3b8;
      cursor: pointer; font-size: 1rem; padding: 0; line-height: 1;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(20px); }
    }

    #confirmOverlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      padding: 1rem;
    }
    #confirmOverlay.active { display: flex; }
    .confirm-box {
      background: white;
      border-radius: 14px;
      padding: 1.75rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .confirm-box p {
      font-size: 1rem;
      color: #1a202c;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .confirm-box .confirm-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }
    .confirm-box button {
      padding: 0.65rem 1.4rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
    }
    .confirm-cancel-btn {
      background: #f1f5f9;
      color: #1a202c;
    }
    .confirm-ok-btn {
      background: var(--sa-green, #007A3D);
      color: white;
    }
    .confirm-ok-btn.danger {
      background: #ef4444;
    }
  `;
  document.head.appendChild(style);

  const stack = document.createElement('div');
  stack.id = 'toastStack';
  document.body.appendChild(stack);

  const overlay = document.createElement('div');
  overlay.id = 'confirmOverlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p id="confirmMessage"></p>
      <div class="confirm-actions">
        <button class="confirm-cancel-btn" id="confirmCancelBtn">Cancel</button>
        <button class="confirm-ok-btn" id="confirmOkBtn">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info'
  };

  window.showToast = function (message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info}"></i>
      <span>${message}</span>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;
    stack.appendChild(toast);

    const remove = () => {
      toast.style.animation = 'toastOut 0.2s ease-in forwards';
      setTimeout(() => toast.remove(), 200);
    };

    toast.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, duration);
  };

  window.showConfirm = function (message, { danger = false, confirmLabel = 'Confirm' } = {}) {
    return new Promise((resolve) => {
      document.getElementById('confirmMessage').textContent = message;
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');

      okBtn.textContent = confirmLabel;
      okBtn.className = danger ? 'confirm-ok-btn danger' : 'confirm-ok-btn';

      overlay.classList.add('active');

      function cleanup(result) {
        overlay.classList.remove('active');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  };
})();