const WS = {
  socket: null,
  handlers: {},
  pingInterval: null,

  connect() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/ws?token=${token}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WS] connected');
      this.pingInterval = setInterval(() => {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    this.socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const handlers = this.handlers[msg.type] || [];
        handlers.forEach(h => h(msg));
        (this.handlers['*'] || []).forEach(h => h(msg));
      } catch {}
    };

    this.socket.onclose = () => {
      console.log('[WS] disconnected, reconnecting...');
      clearInterval(this.pingInterval);
      setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = () => this.socket.close();
  },

  on(type, handler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
  },

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  },
};
