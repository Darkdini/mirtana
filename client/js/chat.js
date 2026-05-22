const Chat = {
  messages: [],

  init() {
    document.getElementById('btn-chat-send').addEventListener('click', () => this.send());
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.send();
    });

    WS.on('chat', (msg) => {
      this.addMessage(msg.username, msg.content, msg.player_id);
    });
  },

  send() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    WS.send({ type: 'chat', content: text });
    input.value = '';
  },

  addMessage(username, content, playerId) {
    const now = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    const myId = parseInt(localStorage.getItem('player_id'));
    const isMe = playerId === myId;

    const container = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.className = 'chat-msg';
    el.innerHTML = `
      <span class="chat-msg-time">${now}</span>
      <span class="chat-msg-name" style="${isMe ? 'color:var(--gold-light)' : ''}">${username}:</span>
      <span>${this.escapeHtml(content)}</span>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;

    if (container.children.length > 200) {
      container.removeChild(container.firstChild);
    }
  },

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  load() {},
};
