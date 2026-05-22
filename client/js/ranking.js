const Ranking = {
  async load() {
    await this.loadPlayers();

    document.querySelectorAll('[data-rtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-rtab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.rtab === 'players') {
          document.getElementById('ranking-players').classList.remove('hidden');
          document.getElementById('ranking-alliances').classList.add('hidden');
          this.loadPlayers();
        } else {
          document.getElementById('ranking-players').classList.add('hidden');
          document.getElementById('ranking-alliances').classList.remove('hidden');
          this.loadAlliances();
        }
      });
    });
  },

  async loadPlayers() {
    try {
      const data = await API.get('/api/ranking/players');
      const myId = parseInt(localStorage.getItem('player_id'));
      const rows = data.players.map((p, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const isMe = p.id === myId;
        return `
          <tr onclick="GameMap.showPlayerInfo(${JSON.stringify(p).replace(/"/g, '&quot;')})"
              style="${isMe ? 'background:rgba(212,160,23,0.1)' : ''}">
            <td class="rank-num ${rankClass}">${rank}</td>
            <td>${isMe ? '👑 ' : ''}${p.username}</td>
            <td>${p.castle_name}</td>
            <td>${p.alliance_tag ? `[${p.alliance_tag}]` : '—'}</td>
            <td style="color:var(--gold)">${p.score}</td>
          </tr>
        `;
      }).join('');

      document.getElementById('ranking-players').innerHTML = `
        <table class="ranking-table">
          <thead><tr><th>#</th><th>Игрок</th><th>Замок</th><th>Альянс</th><th>Очки</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  async loadAlliances() {
    try {
      const data = await API.get('/api/ranking/alliances');
      const rows = data.alliances.map((a, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        return `
          <tr>
            <td class="rank-num ${rankClass}">${rank}</td>
            <td><span class="alliance-tag">${a.tag}</span> ${a.name}</td>
            <td>${a.members}</td>
            <td style="color:var(--gold)">${a.total_score}</td>
          </tr>
        `;
      }).join('');

      document.getElementById('ranking-alliances').innerHTML = `
        <table class="ranking-table">
          <thead><tr><th>#</th><th>Альянс</th><th>Участников</th><th>Очки</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },
};
