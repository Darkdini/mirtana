const UI = {
  notify(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notifications');
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; }, duration);
    setTimeout(() => el.remove(), duration + 300);
  },

  showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
  },

  formatNumber(n) {
    n = Math.floor(n);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  },

  formatTime(isoString) {
    const diff = new Date(isoString + 'Z') - Date.now();
    if (diff <= 0) return 'Завершено';
    const s = Math.floor(diff / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}ч ${m}м`;
    if (m > 0) return `${m}м ${sec}с`;
    return `${sec}с`;
  },

  countdown(isoString, el) {
    const update = () => {
      if (!document.contains(el)) return;
      el.textContent = this.formatTime(isoString);
      const diff = new Date(isoString + 'Z') - Date.now();
      if (diff > 0) requestAnimationFrame(update);
      else el.textContent = 'Готово!';
    };
    update();
  },

  formatCost(cost) {
    const icons = { gold: '🪙', food: '🌾', wood: '🪵', stone: '🪨' };
    return Object.entries(cost)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${icons[k] || k} ${this.formatNumber(v)}`)
      .join('  ');
  },

  setRightPanel(html) {
    document.getElementById('right-panel-content').innerHTML = html;
  },
};

document.getElementById('modal-close').addEventListener('click', () => UI.hideModal());
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) UI.hideModal();
});
