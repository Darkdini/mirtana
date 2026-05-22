const Combat = {
  async load() {
    try {
      const data = await API.get('/api/combat/my_attacks');
      this.renderOutgoing(data.outgoing);
      this.renderIncoming(data.incoming);
      await this.loadHistory();
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  renderOutgoing(attacks) {
    const el = document.getElementById('outgoing-attacks');
    if (!attacks.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Нет исходящих атак</p>';
      return;
    }
    el.innerHTML = attacks.map(a => {
      const status = a.status === 'returning' ? '↩️ Возвращается' : '⚔️ В пути';
      const timeField = a.status === 'returning' ? a.return_time : a.arrive_time;
      return `
        <div class="attack-item">
          <div>
            <div class="attack-target">${status} → ${a.defender_castle || a.defender_name}</div>
            <div style="font-size:12px;color:var(--text-dim)">${a.defender_name}</div>
          </div>
          <div class="attack-time" data-time="${timeField}">...</div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.attack-time').forEach(el => {
      UI.countdown(el.dataset.time, el);
    });
  },

  renderIncoming(attacks) {
    const el = document.getElementById('incoming-attacks');
    if (!attacks.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Нет входящих атак</p>';
      return;
    }
    el.innerHTML = attacks.map(a => `
      <div class="attack-item" style="border-color:var(--red)">
        <div>
          <div class="attack-target" style="color:var(--red-light)">⚠️ Атака от ${a.attacker_name}!</div>
        </div>
        <div class="attack-time" data-time="${a.arrive_time}">...</div>
      </div>
    `).join('');

    el.querySelectorAll('.attack-time').forEach(el => {
      UI.countdown(el.dataset.time, el);
    });
  },

  async loadHistory() {
    try {
      const data = await API.get('/api/combat/history');
      const el = document.getElementById('battle-history');
      if (!data.history.length) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">История пуста</p>';
        return;
      }
      const myId = parseInt(localStorage.getItem('player_id'));
      el.innerHTML = data.history.map(a => {
        const result = JSON.parse(a.result || '{}');
        const isAttacker = a.attacker_id === myId;
        const won = (isAttacker && result.winner === 'attacker') ||
                    (!isAttacker && result.winner === 'defender');
        const loot = JSON.parse(a.loot || '{}');
        const lootStr = Object.entries(loot).filter(([, v]) => v > 0)
          .map(([k, v]) => `${k}: +${v}`).join(', ');
        return `
          <div class="attack-item">
            <div>
              <div>
                ${isAttacker ? `Вы атаковали <strong>${a.defender_name}</strong>` : `<strong>${a.attacker_name}</strong> атаковал вас`}
              </div>
              ${lootStr ? `<div style="font-size:12px;color:var(--green-light)">${lootStr}</div>` : ''}
            </div>
            <div class="${won ? 'attack-result-win' : 'attack-result-loss'}">
              ${won ? '✅ Победа' : '❌ Поражение'}
            </div>
          </div>
        `;
      }).join('');
    } catch {}
  },

  async openAttackModal(targetId, targetName) {
    try {
      const state = await API.get('/api/city/state');
      const units = state.units;
      const hasUnits = Object.values(units).some(v => v > 0);

      if (!hasUnits) {
        UI.notify('Нет войск для атаки!', 'error');
        return;
      }

      const NAMES = {
        swordsman: '⚔️ Мечник', pikeman: '🗡️ Пикинёр', archer: '🏹 Лучник',
        crossbowman: '🎯 Арбалетчик', knight: '🐴 Рыцарь', horse_archer: '🏇 Конный лучник',
        catapult: '💣 Катапульта', trebuchet: '🏰 Требушет',
      };

      const unitRows = Object.entries(units)
        .filter(([, c]) => c > 0)
        .map(([utype, count]) => `
          <div class="attack-unit-item">
            <label>${NAMES[utype] || utype} (${count})</label>
            <input type="number" id="atk-${utype}" min="0" max="${count}" value="0" placeholder="0">
          </div>
        `).join('');

      UI.showModal(`
        <div class="modal-title">⚔️ Атака на ${targetName}</div>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px">
          Выберите войска для отправки в атаку:
        </p>
        <div class="attack-units-grid">${unitRows}</div>
        <button class="btn-danger btn-full" onclick="Combat.sendAttack(${targetId})">
          ⚔️ Отправить армию!
        </button>
      `);
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  async sendAttack(targetId) {
    const unitInputs = document.querySelectorAll('[id^="atk-"]');
    const units = {};
    unitInputs.forEach(input => {
      const utype = input.id.replace('atk-', '');
      const count = parseInt(input.value || 0);
      if (count > 0) units[utype] = count;
    });

    if (!Object.keys(units).length) {
      UI.notify('Выберите войска!', 'error');
      return;
    }

    UI.hideModal();
    try {
      const data = await API.post('/api/combat/attack', { target_id: targetId, units });
      UI.notify(`Армия отправлена! Прибудет через ${UI.formatTime(data.arrive_time)}`, 'success');
      await this.load();
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },
};
