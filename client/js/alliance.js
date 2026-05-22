const Alliance = {
  async load() {
    try {
      const me = await API.get('/api/auth/me');
      const el = document.getElementById('alliance-content');

      if (me.alliance_id) {
        const data = await API.get(`/api/alliance/${me.alliance_id}`);
        this.renderMyAlliance(data, me);
      } else {
        this.renderNoAlliance(el);
      }
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  renderMyAlliance(data, me) {
    const el = document.getElementById('alliance-content');
    const isLeader = data.leader_id === me.id;
    const members = (data.members || []).map(m => `
      <tr>
        <td>${m.username}</td>
        <td>${m.score}</td>
        <td>${m.map_x}:${m.map_y}</td>
        ${isLeader && m.id !== me.id ? `<td><button class="btn-sm" onclick="Alliance.kickMember(${m.id})">Исключить</button></td>` : '<td></td>'}
      </tr>
    `).join('');

    el.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <span style="font-size:40px">🤝</span>
          <div>
            <div style="font-size:20px;font-weight:700;color:var(--gold-light)">${data.name}</div>
            <div style="font-size:13px;color:var(--text-dim)">[${data.tag}] · ${data.members?.length || 0} участников</div>
          </div>
        </div>
        ${data.description ? `<p style="font-size:13px;color:var(--text-dim);margin-bottom:12px">${data.description}</p>` : ''}
      </div>
      <h3 style="margin-bottom:12px;color:var(--text-dim)">Участники</h3>
      <table class="ranking-table" style="margin-bottom:20px">
        <thead><tr><th>Игрок</th><th>Очки</th><th>Позиция</th><th></th></tr></thead>
        <tbody>${members}</tbody>
      </table>
      <button class="btn-danger" onclick="Alliance.leave()">🚪 Покинуть альянс</button>
    `;
  },

  async renderNoAlliance(el) {
    const data = await API.get('/api/alliance/list');
    const list = (data.alliances || []).map(a => `
      <div class="alliance-card" onclick="Alliance.join(${a.id})">
        <span class="alliance-tag">${a.tag}</span>
        <span class="alliance-name">${a.name}</span>
        <div class="alliance-meta">
          👤 Лидер: ${a.leader_name} · 👥 ${a.member_count} участников
        </div>
        ${a.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${a.description}</div>` : ''}
      </div>
    `).join('');

    el.innerHTML = `
      <div style="margin-bottom:20px">
        <button class="btn-primary" onclick="Alliance.showCreateForm()">+ Создать альянс</button>
      </div>
      <h3 style="margin-bottom:12px;color:var(--text-dim)">Альянсы (нажмите чтобы вступить)</h3>
      ${list || '<p style="color:var(--text-muted)">Нет альянсов. Создайте первый!</p>'}
    `;
  },

  showCreateForm() {
    UI.showModal(`
      <div class="modal-title">🤝 Создать альянс</div>
      <div class="form-group" style="margin-bottom:12px">
        <label>Название альянса</label>
        <input type="text" id="al-name" placeholder="Великий альянс" maxlength="40"
               style="background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);font-size:14px;outline:none;width:100%">
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label>Тег (2-6 букв)</label>
        <input type="text" id="al-tag" placeholder="ВА" maxlength="6"
               style="background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);font-size:14px;outline:none;width:100%">
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label>Описание (необязательно)</label>
        <input type="text" id="al-desc" placeholder="Описание альянса"
               style="background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);font-size:14px;outline:none;width:100%">
      </div>
      <button class="btn-primary btn-full" onclick="Alliance.create()">Создать!</button>
    `);
  },

  async create() {
    const name = document.getElementById('al-name')?.value;
    const tag = document.getElementById('al-tag')?.value;
    const desc = document.getElementById('al-desc')?.value || '';
    if (!name || !tag) { UI.notify('Заполните все поля', 'error'); return; }
    UI.hideModal();
    try {
      await API.post('/api/alliance/create', { name, tag, description: desc });
      UI.notify('Альянс создан!', 'success');
      await this.load();
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  async join(allianceId) {
    try {
      await API.post(`/api/alliance/join/${allianceId}`, {});
      UI.notify('Вы вступили в альянс!', 'success');
      await this.load();
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  async leave() {
    if (!confirm('Покинуть альянс?')) return;
    try {
      await API.post('/api/alliance/leave', {});
      UI.notify('Вы покинули альянс', 'info');
      await this.load();
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },
};
