/**
 * HexGrid — pointy-top axial-coordinate hexagonal grid renderer.
 *
 * Coordinate system: pointy-top hexagons, axial (q, r).
 * Pixel origin sits at canvas center (pan offset applied on top).
 */
class HexGrid {
  constructor(canvas, options = {}) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.hexes   = new Map();   // "q,r" → hex data object
    this.options = Object.assign({
      size:         40,         // hex "radius" in px
      onHexClick:   null,
      onHexHover:   null,
    }, options);

    // Viewport state
    this.panX    = 0;
    this.panY    = 0;
    this.zoom    = 1;
    this.minZoom = 0.3;
    this.maxZoom = 2.5;

    // Interaction state
    this.selected  = null;   // { q, r }
    this.hovered   = null;   // { q, r }
    this.dragging  = false;
    this.dragStart = { x: 0, y: 0, px: 0, py: 0 };

    // Pulse animation
    this._pulseT   = 0;
    this._animId   = null;

    this._bindEvents();
    this._startLoop();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Replace all hex data at once. data = [{ q, r, ...attrs }] */
  loadData(data) {
    this.hexes.clear();
    for (const h of data) {
      this.hexes.set(`${h.q},${h.r}`, h);
    }
    this.selected = null;
    this.hovered  = null;
  }

  /** Upsert a single hex. */
  setHex(q, r, data) {
    this.hexes.set(`${q},${r}`, { q, r, ...data });
  }

  /** Center the viewport on axial (q, r). */
  centerOn(q, r) {
    const { x, y } = this._hexToPixel(q, r);
    this.panX = -x;
    this.panY = -y;
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  /** Axial → canvas pixel (before pan/zoom). */
  _hexToPixel(q, r) {
    const s = this.options.size;
    const x = s * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = s * (3 / 2 * r);
    return { x, y };
  }

  /** Canvas pixel → fractional axial. */
  _pixelToHex(px, py) {
    const s = this.options.size;
    // Inverse of pointy-top hex layout
    const q = (Math.sqrt(3) / 3 * px - 1 / 3 * py) / s;
    const r = (2 / 3 * py) / s;
    return this._roundHex(q, r);
  }

  /** Round fractional axial coords to nearest hex. */
  _roundHex(q, r) {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);

    if (dq > dr && dq > ds) {
      rq = -rr - rs;
    } else if (dr > ds) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  }

  /** Convert screen (event) coordinates to world pixel. */
  _screenToWorld(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    const cx   = (sx - rect.left  - this.canvas.width  / 2) / this.zoom - this.panX;
    const cy   = (sy - rect.top   - this.canvas.height / 2) / this.zoom - this.panY;
    return { x: cx, y: cy };
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  _startLoop() {
    const loop = (ts) => {
      this._pulseT = ts * 0.001;
      this._draw();
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  _draw() {
    const canvas = this.canvas;
    const ctx    = this.ctx;

    // Sync canvas resolution to display size
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width  = canvas.clientWidth  || canvas.offsetWidth;
      canvas.height = canvas.clientHeight || canvas.offsetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply pan + zoom transform (origin = canvas center)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(this.panX, this.panY);

    // Draw all hexes
    for (const hex of this.hexes.values()) {
      this._drawHex(hex);
    }

    ctx.restore();
  }

  _drawHex(hex) {
    const ctx = this.ctx;
    const { x, y } = this._hexToPixel(hex.q, hex.r);
    const s = this.options.size;
    const key = `${hex.q},${hex.r}`;

    const isSelected = this.selected && this.selected.q === hex.q && this.selected.r === hex.r;
    const isHovered  = this.hovered  && this.hovered.q  === hex.q && this.hovered.r  === hex.r;

    // Build hex path (pointy-top)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      const hx = x + s * Math.cos(angle);
      const hy = y + s * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    // Fill
    const fillColor = hex.color || '#2D4A20';
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Hover overlay
    if (isHovered && !isSelected) {
      ctx.fillStyle = 'rgba(255, 220, 80, 0.12)';
      ctx.fill();
    }

    // Selected glow (pulsing)
    if (isSelected) {
      const pulse = 0.5 + 0.5 * Math.sin(this._pulseT * 3);
      const alpha = 0.25 + 0.25 * pulse;
      const glowR = s + 6 * pulse;

      // Outer glow
      const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR * 2);
      grad.addColorStop(0,   `rgba(255, 200, 50, ${alpha * 0.6})`);
      grad.addColorStop(0.5, `rgba(255, 160, 20, ${alpha * 0.3})`);
      grad.addColorStop(1,   'rgba(255, 140, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Fill tint
      ctx.fillStyle = `rgba(255, 200, 50, ${0.1 + 0.08 * pulse})`;
      ctx.fill();
    }

    // Border stroke
    let strokeColor, strokeWidth;
    if (isSelected) {
      const pulse = 0.5 + 0.5 * Math.sin(this._pulseT * 3);
      strokeColor = `rgba(255, ${Math.round(210 + 45 * pulse)}, 50, ${0.7 + 0.3 * pulse})`;
      strokeWidth = 2.5;
    } else if (isHovered) {
      strokeColor = 'rgba(255, 200, 80, 0.55)';
      strokeWidth = 1.8;
    } else {
      strokeColor = 'rgba(212, 175, 55, 0.22)';
      strokeWidth = 1;
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = strokeWidth / this.zoom;
    ctx.stroke();

    // Emoji icon (centered)
    if (hex.icon) {
      const fontSize = Math.max(10, s * 0.7);
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = 'rgba(255,255,255,0.95)';
      // Slight shadow for readability
      ctx.shadowColor  = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur   = 4;
      ctx.fillText(hex.icon, x, y - (hex.label ? fontSize * 0.35 : 0));
      ctx.shadowBlur   = 0;
    }

    // Label below icon
    if (hex.label) {
      const labelSize = Math.max(8, s * 0.22);
      ctx.font         = `700 ${labelSize}px 'Cinzel', serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = '#C9A96E';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 3;
      const labelY = hex.icon ? y + s * 0.28 : y + s * 0.02;
      ctx.fillText(hex.label, x, labelY);
      ctx.shadowBlur   = 0;
    }

    // Level indicator (top-right corner of hex)
    if (hex.level && hex.level > 0) {
      const lvlSize = Math.max(7, s * 0.20);
      ctx.font         = `700 ${lvlSize}px 'Cinzel', serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#FFD700';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 3;
      ctx.fillText(`${hex.level}`, x + s * 0.55, y - s * 0.55);
      ctx.shadowBlur   = 0;
    }
  }

  // ── Event binding ──────────────────────────────────────────────────────────

  _bindEvents() {
    const canvas = this.canvas;

    // Click
    canvas.addEventListener('click', (e) => {
      if (this.didDrag) return; // Ignore click after pan
      const { x, y } = this._screenToWorld(e.clientX, e.clientY);
      const { q, r } = this._pixelToHex(x, y);
      const hex = this.hexes.get(`${q},${r}`);
      if (hex) {
        this.selected = { q, r };
        if (this.options.onHexClick) this.options.onHexClick(hex);
      } else {
        this.selected = null;
        if (this.options.onHexClick) this.options.onHexClick(null);
      }
    });

    // Mouse move (hover + drag)
    canvas.addEventListener('mousemove', (e) => {
      if (this.dragging) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.didDrag = true;
        this.panX = this.dragStart.px + dx / this.zoom;
        this.panY = this.dragStart.py + dy / this.zoom;
      } else {
        const { x, y } = this._screenToWorld(e.clientX, e.clientY);
        const { q, r } = this._pixelToHex(x, y);
        const hex = this.hexes.get(`${q},${r}`);
        const prev = this.hovered;
        this.hovered = hex ? { q, r } : null;
        if (hex && (!prev || prev.q !== q || prev.r !== r)) {
          if (this.options.onHexHover) this.options.onHexHover(hex);
        }
      }
    });

    // Drag start
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.dragging  = true;
      this.didDrag   = false;
      this.dragStart = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY };
    });

    // Drag end
    window.addEventListener('mouseup',  () => { this.dragging = false; });
    window.addEventListener('mouseleave', () => { this.dragging = false; });

    // Touch drag
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      this.dragging  = true;
      this.didDrag   = false;
      this.dragStart = { x: t.clientX, y: t.clientY, px: this.panX, py: this.panY };
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.dragging || e.touches.length !== 1) return;
      const t  = e.touches[0];
      const dx = t.clientX - this.dragStart.x;
      const dy = t.clientY - this.dragStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.didDrag = true;
      this.panX = this.dragStart.px + dx / this.zoom;
      this.panY = this.dragStart.py + dy / this.zoom;
    }, { passive: true });

    canvas.addEventListener('touchend', () => { this.dragging = false; });

    // Zoom (wheel)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      const rect   = canvas.getBoundingClientRect();
      // Zoom towards cursor position
      const mx  = e.clientX - rect.left - canvas.width  / 2;
      const my  = e.clientY - rect.top  - canvas.height / 2;
      const wx  = mx / this.zoom - this.panX;
      const wy  = my / this.zoom - this.panY;

      const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
      this.panX  = mx / newZoom - wx;
      this.panY  = my / newZoom - wy;
      this.zoom  = newZoom;
    }, { passive: false });
  }
}
