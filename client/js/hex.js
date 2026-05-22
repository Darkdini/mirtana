/**
 * HexGrid — pointy-top axial-coordinate hexagonal grid renderer.
 *
 * Coordinate system: pointy-top hexagons, axial (q, r).
 * Pixel origin sits at canvas center (pan offset applied on top).
 */

// ── Shared image cache ────────────────────────────────────────────────────────
const _imgCache = new Map();

function _preloadImages(paths) {
  for (const src of paths) {
    if (!_imgCache.has(src)) {
      const img = new Image();
      img.src = src;
      _imgCache.set(src, img);
    }
  }
}

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

  _hexPath(x, y, s) {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      const hx = x + s * Math.cos(angle);
      const hy = y + s * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy); else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
  }

  _drawHex(hex) {
    const ctx = this.ctx;
    const { x, y } = this._hexToPixel(hex.q, hex.r);
    const s = this.options.size;

    const isSelected = this.selected && this.selected.q === hex.q && this.selected.r === hex.r;
    const isHovered  = this.hovered  && this.hovered.q  === hex.q && this.hovered.r  === hex.r;

    // ── 1. Base fill ──────────────────────────────────────────────────────────
    this._hexPath(x, y, s);
    ctx.fillStyle = hex.color || '#2D4A20';
    ctx.fill();

    // ── 2. Building image (clipped to hex) ────────────────────────────────────
    const effectivePx = s * this.zoom;
    const img = hex.image ? _imgCache.get(hex.image) : null;
    if (img && img.complete && img.naturalWidth > 0 && effectivePx >= 18) {
      ctx.save();
      this._hexPath(x, y, s);
      ctx.clip();

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // Scale image to cover the hex bounding box with slight padding
      const hexW = s * 1.85;
      const hexH = s * 1.85;
      const scale = Math.max(hexW / iw, hexH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      // Draw centered, nudged up slightly (buildings look better anchored to bottom)
      ctx.drawImage(img, x - dw / 2, y - dh / 2 - s * 0.08, dw, dh);

      // Darken unbuilt slots
      if (hex.type === 'building' && hex.built === false) {
        this._hexPath(x, y, s);
        ctx.fillStyle = 'rgba(0,0,0,0.58)';
        ctx.fill();
      }
      ctx.restore();
    } else if (hex.icon && effectivePx >= 14) {
      // ── Fallback emoji ────────────────────────────────────────────────────
      const fontSize = Math.max(10, s * 0.65);
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = 'rgba(255,255,255,0.92)';
      ctx.shadowColor  = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur   = 4;
      ctx.fillText(hex.icon, x, y - (hex.label ? fontSize * 0.3 : 0));
      ctx.shadowBlur   = 0;
    }

    // ── 3. Hover overlay ──────────────────────────────────────────────────────
    if (isHovered && !isSelected) {
      this._hexPath(x, y, s);
      ctx.fillStyle = 'rgba(255, 220, 80, 0.13)';
      ctx.fill();
    }

    // ── 4. Selected glow ──────────────────────────────────────────────────────
    if (isSelected) {
      const pulse = 0.5 + 0.5 * Math.sin(this._pulseT * 3);

      // Radial glow outside hex
      this._hexPath(x, y, s * (1.15 + 0.1 * pulse));
      const grad = ctx.createRadialGradient(x, y, 0, x, y, s * 2);
      grad.addColorStop(0,   `rgba(255, 200, 50, ${0.18 + 0.12 * pulse})`);
      grad.addColorStop(0.6, `rgba(255, 160, 20, ${0.1 + 0.08 * pulse})`);
      grad.addColorStop(1,   'rgba(255, 120, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner tint
      this._hexPath(x, y, s);
      ctx.fillStyle = `rgba(255, 210, 60, ${0.12 + 0.1 * pulse})`;
      ctx.fill();
    }

    // ── 5. Border stroke ──────────────────────────────────────────────────────
    this._hexPath(x, y, s);
    let strokeColor, strokeWidth;
    if (isSelected) {
      const pulse = 0.5 + 0.5 * Math.sin(this._pulseT * 3);
      strokeColor = `rgba(255, ${Math.round(210 + 45 * pulse)}, 50, ${0.75 + 0.25 * pulse})`;
      strokeWidth = 2.5;
    } else if (isHovered) {
      strokeColor = 'rgba(255, 210, 90, 0.6)';
      strokeWidth = 2.0;
    } else {
      strokeColor = 'rgba(212, 175, 55, 0.25)';
      strokeWidth = 1;
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = strokeWidth / this.zoom;
    ctx.stroke();

    // ── 6. Label ──────────────────────────────────────────────────────────────
    if (hex.label && effectivePx >= 28) {
      const labelSize = Math.max(8, s * 0.20);
      ctx.font         = `700 ${labelSize}px 'Cinzel', serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = isSelected ? '#FFE87A' : '#D4B870';
      ctx.shadowColor  = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur   = 3;
      ctx.fillText(hex.label, x, y + s * 0.52);
      ctx.shadowBlur   = 0;
    }

    // ── 7. Level badge ────────────────────────────────────────────────────────
    if (hex.level && hex.level > 0 && effectivePx >= 24) {
      const lvlSize = Math.max(7, s * 0.22);
      // Badge background
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.arc(x + s * 0.55, y - s * 0.58, lvlSize * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.font         = `900 ${lvlSize}px 'Cinzel', serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#FFD700';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 2;
      ctx.fillText(`${hex.level}`, x + s * 0.55, y - s * 0.58);
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
