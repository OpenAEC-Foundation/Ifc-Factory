import { ACI_COLORS } from './aci-colors.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.doc = null;

    // View transform
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;

    // Interaction state
    this.layerVisibility = {};
    this.hoveredEntity = null;
    this.selectedEntity = null;

    // Cached extents
    this.minX = 0; this.minY = 0;
    this.maxX = 100; this.maxY = 100;

    // Hit-test geometry cache: array of { entity, path }
    this._hitPaths = [];
  }

  // ─── Coordinate transforms ───────────────────────────────
  worldToScreenX(x) { return (x - this.panX) * this.zoom; }
  worldToScreenY(y) { return this.canvas.height - (y - this.panY) * this.zoom; }
  worldToScreen(x, y) { return [this.worldToScreenX(x), this.worldToScreenY(y)]; }

  screenToWorldX(sx) { return sx / this.zoom + this.panX; }
  screenToWorldY(sy) { return (this.canvas.height - sy) / this.zoom + this.panY; }
  screenToWorld(sx, sy) { return [this.screenToWorldX(sx), this.screenToWorldY(sy)]; }

  worldLen(v) { return v * this.zoom; }

  // ─── Load document ───────────────────────────────────────
  loadDocument(doc) {
    this.doc = doc;
    this.layerVisibility = {};
    if (doc.tables && doc.tables.layers) {
      for (const name of Object.keys(doc.tables.layers)) {
        const lyr = doc.tables.layers[name];
        this.layerVisibility[name] = !(lyr.frozen || lyr.off);
      }
    }
    // Always ensure layer "0" visible
    if (!('0' in this.layerVisibility)) this.layerVisibility['0'] = true;

    this._computeExtents();
    this.zoomExtents();
  }

  // ─── Compute bounding box ────────────────────────────────
  _computeExtents() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const expand = (x, y) => {
      if (!isFinite(x) || !isFinite(y)) return;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    const expandEntity = (e) => {
      switch (e.type) {
        case 'LINE':
          expand(e.start[0], e.start[1]);
          expand(e.end[0], e.end[1]);
          break;
        case 'POINT':
          expand(e.position[0], e.position[1]);
          break;
        case 'CIRCLE':
          expand(e.center[0] - e.radius, e.center[1] - e.radius);
          expand(e.center[0] + e.radius, e.center[1] + e.radius);
          break;
        case 'ARC':
          expand(e.center[0] - e.radius, e.center[1] - e.radius);
          expand(e.center[0] + e.radius, e.center[1] + e.radius);
          break;
        case 'ELLIPSE':
          if (e.center && e.majorAxisEndpoint) {
            const mx = Math.abs(e.majorAxisEndpoint[0]);
            const my = Math.abs(e.majorAxisEndpoint[1]);
            const majorLen = Math.sqrt(mx * mx + my * my);
            expand(e.center[0] - majorLen, e.center[1] - majorLen);
            expand(e.center[0] + majorLen, e.center[1] + majorLen);
          }
          break;
        case 'LWPOLYLINE':
        case 'POLYLINE2D':
        case 'POLYLINE3D':
          if (e.vertices) {
            for (const v of e.vertices) {
              expand(v.x ?? v[0], v.y ?? v[1]);
            }
          }
          break;
        case 'SPLINE':
          if (e.controlPoints) for (const p of e.controlPoints) expand(p[0], p[1]);
          if (e.fitPoints) for (const p of e.fitPoints) expand(p[0], p[1]);
          break;
        case 'TEXT':
        case 'MTEXT':
          if (e.insertionPoint) expand(e.insertionPoint[0], e.insertionPoint[1]);
          break;
        case 'INSERT': {
          if (e.insertionPoint) expand(e.insertionPoint[0], e.insertionPoint[1]);
          const blk = this.doc.blocks && this.doc.blocks[e.blockName];
          if (blk && blk.entities) {
            const sx = e.scaleX ?? 1, sy = e.scaleY ?? 1;
            for (const be of blk.entities) {
              const pts = this._entityPoints(be);
              for (const p of pts) {
                expand(e.insertionPoint[0] + p[0] * sx, e.insertionPoint[1] + p[1] * sy);
              }
            }
          }
          break;
        }
        case 'HATCH':
          if (e.boundaries) {
            for (const b of e.boundaries) {
              if (b.polyline && b.polyline.vertices) {
                for (const v of b.polyline.vertices) expand(v.x, v.y);
              }
              if (b.edges) {
                for (const edge of b.edges) {
                  if (edge.start) expand(edge.start[0], edge.start[1]);
                  if (edge.end) expand(edge.end[0], edge.end[1]);
                  if (edge.center) {
                    const r = edge.radius || 0;
                    expand(edge.center[0] - r, edge.center[1] - r);
                    expand(edge.center[0] + r, edge.center[1] + r);
                  }
                }
              }
            }
          }
          break;
        case 'SOLID':
        case 'TRACE':
        case '3DFACE':
          if (e.point1) expand(e.point1[0], e.point1[1]);
          if (e.point2) expand(e.point2[0], e.point2[1]);
          if (e.point3) expand(e.point3[0], e.point3[1]);
          if (e.point4) expand(e.point4[0], e.point4[1]);
          break;
        case 'DIMENSION_LINEAR':
        case 'DIMENSION_ALIGNED':
          if (e.defPoint1) expand(e.defPoint1[0], e.defPoint1[1]);
          if (e.defPoint2) expand(e.defPoint2[0], e.defPoint2[1]);
          if (e.dimLinePoint) expand(e.dimLinePoint[0], e.dimLinePoint[1]);
          break;
        case 'DIMENSION_RADIUS':
        case 'DIMENSION_DIAMETER':
          if (e.center) expand(e.center[0], e.center[1]);
          if (e.chordPoint) expand(e.chordPoint[0], e.chordPoint[1]);
          break;
        case 'DIMENSION_ANGULAR':
          if (e.center) expand(e.center[0], e.center[1]);
          if (e.defPoint1) expand(e.defPoint1[0], e.defPoint1[1]);
          if (e.defPoint2) expand(e.defPoint2[0], e.defPoint2[1]);
          if (e.arcPoint) expand(e.arcPoint[0], e.arcPoint[1]);
          break;
        case 'DIMENSION_ORDINATE':
          if (e.featurePoint) expand(e.featurePoint[0], e.featurePoint[1]);
          if (e.leaderEndpoint) expand(e.leaderEndpoint[0], e.leaderEndpoint[1]);
          break;
        case 'LEADER':
          if (e.vertices) for (const v of e.vertices) expand(v[0], v[1]);
          break;
        case 'VIEWPORT':
          if (e.center && e.width && e.height) {
            expand(e.center[0] - e.width / 2, e.center[1] - e.height / 2);
            expand(e.center[0] + e.width / 2, e.center[1] + e.height / 2);
          }
          break;
        case 'TABLE':
          if (e.insertionPoint) {
            expand(e.insertionPoint[0], e.insertionPoint[1]);
            const tw = (e.columnWidths || []).reduce((a, b) => a + b, 0);
            const th = (e.rowHeights || []).reduce((a, b) => a + b, 0);
            expand(e.insertionPoint[0] + tw, e.insertionPoint[1] - th);
          }
          break;
        case 'WIPEOUT':
          if (e.vertices) for (const v of e.vertices) expand(v[0], v[1]);
          break;
        case 'MESH':
          if (e.vertices) for (const v of e.vertices) expand(v[0], v[1]);
          break;
        case 'RAY':
        case 'XLINE':
          if (e.origin) expand(e.origin[0], e.origin[1]);
          break;
      }
    };

    if (this.doc.entities) {
      for (const e of this.doc.entities) expandEntity(e);
    }

    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }
    this.minX = minX; this.minY = minY;
    this.maxX = maxX; this.maxY = maxY;
  }

  _entityPoints(e) {
    const pts = [];
    if (e.start) pts.push(e.start);
    if (e.end) pts.push(e.end);
    if (e.center) pts.push(e.center);
    if (e.position) pts.push(e.position);
    if (e.insertionPoint) pts.push(e.insertionPoint);
    if (e.point1) pts.push(e.point1);
    if (e.point2) pts.push(e.point2);
    if (e.point3) pts.push(e.point3);
    if (e.point4) pts.push(e.point4);
    if (e.vertices) {
      for (const v of e.vertices) {
        if (Array.isArray(v)) pts.push(v);
        else pts.push([v.x ?? 0, v.y ?? 0, v.z ?? 0]);
      }
    }
    if (e.controlPoints) for (const p of e.controlPoints) pts.push(p);
    return pts;
  }

  // ─── Zoom extents ────────────────────────────────────────
  zoomExtents() {
    const margin = 40; // px
    const w = this.canvas.width - margin * 2;
    const h = this.canvas.height - margin * 2;
    const dw = this.maxX - this.minX || 1;
    const dh = this.maxY - this.minY || 1;
    this.zoom = Math.min(w / dw, h / dh);
    this.panX = this.minX - (w / this.zoom - dw) / 2 - margin / this.zoom;
    this.panY = this.minY - (h / this.zoom - dh) / 2 - margin / this.zoom;
  }

  // ─── Color resolution ────────────────────────────────────
  _resolveColor(entity) {
    // Entity-level color
    if (entity.color !== undefined && entity.color !== null) {
      if (typeof entity.color === 'object' && entity.color.r !== undefined) {
        const r = Math.round(entity.color.r * 255);
        const g = Math.round(entity.color.g * 255);
        const b = Math.round(entity.color.b * 255);
        return `rgb(${r},${g},${b})`;
      }
      if (typeof entity.color === 'number') {
        if (entity.color === 0) return '#FFFFFF'; // BYBLOCK - default white
        if (entity.color >= 1 && entity.color <= 255) return ACI_COLORS[entity.color];
      }
      if (typeof entity.color === 'string') return entity.color;
    }
    // Layer color
    const layerName = entity.layer || '0';
    const layers = this.doc.tables && this.doc.tables.layers;
    if (layers && layers[layerName]) {
      const lc = layers[layerName].color;
      if (lc !== undefined && lc !== null) {
        if (typeof lc === 'object' && lc.r !== undefined) {
          const r = Math.round(lc.r * 255);
          const g = Math.round(lc.g * 255);
          const b = Math.round(lc.b * 255);
          return `rgb(${r},${g},${b})`;
        }
        if (typeof lc === 'number' && lc >= 1 && lc <= 255) return ACI_COLORS[lc];
      }
    }
    return '#FFFFFF';
  }

  _resolveLineWidth(entity) {
    // Minimal lineweight handling
    const lw = entity.lineweight ?? entity.lineWidth;
    if (lw && lw > 0) return Math.max(1, lw * this.zoom * 0.01);
    return 1;
  }

  // ─── Main render ─────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    if (!this.doc || !this.doc.entities) return;

    // Draw grid
    this._drawGrid();

    // Clear hit paths
    this._hitPaths = [];

    // Render entities
    for (const entity of this.doc.entities) {
      this._renderEntity(entity, ctx);
    }
  }

  _drawGrid() {
    const ctx = this.ctx;
    // Determine grid spacing based on zoom
    const rawStep = 50 / this.zoom;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    let step = mag;
    if (rawStep / mag > 5) step = mag * 10;
    else if (rawStep / mag > 2) step = mag * 5;
    else if (rawStep / mag > 1) step = mag * 2;

    const [x0] = this.screenToWorld(0, 0);
    const [x1] = this.screenToWorld(this.canvas.width, 0);
    const [, y0] = this.screenToWorld(0, this.canvas.height);
    const [, y1] = this.screenToWorld(0, 0);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = Math.floor(x0 / step) * step;
    const startY = Math.floor(y0 / step) * step;

    for (let x = startX; x <= x1; x += step) {
      const sx = this.worldToScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.canvas.height);
    }
    for (let y = startY; y <= y1; y += step) {
      const sy = this.worldToScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(this.canvas.width, sy);
    }
    ctx.stroke();

    // Origin axes
    ctx.strokeStyle = 'rgba(255,80,80,0.15)';
    ctx.lineWidth = 1;
    const ox = this.worldToScreenX(0);
    const oy = this.worldToScreenY(0);
    ctx.beginPath();
    ctx.moveTo(ox, 0); ctx.lineTo(ox, this.canvas.height);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,255,80,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, oy); ctx.lineTo(this.canvas.width, oy);
    ctx.stroke();
  }

  // ─── Entity rendering ───────────────────────────────────
  _renderEntity(entity, ctx, parentColor) {
    const layerName = entity.layer || '0';
    if (this.layerVisibility[layerName] === false) return;

    const color = parentColor || this._resolveColor(entity);
    const isSelected = (this.selectedEntity === entity);
    const lineWidth = this._resolveLineWidth(entity);

    ctx.strokeStyle = isSelected ? '#00ffff' : color;
    ctx.fillStyle = isSelected ? '#00ffff' : color;
    ctx.lineWidth = isSelected ? lineWidth + 1 : lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Build a Path2D for hit-testing where applicable
    let hitPath = null;

    switch (entity.type) {
      case 'LINE':
        hitPath = this._drawLine(ctx, entity);
        break;
      case 'POINT':
        this._drawPoint(ctx, entity);
        break;
      case 'CIRCLE':
        hitPath = this._drawCircle(ctx, entity);
        break;
      case 'ARC':
        hitPath = this._drawArc(ctx, entity);
        break;
      case 'ELLIPSE':
        hitPath = this._drawEllipse(ctx, entity);
        break;
      case 'LWPOLYLINE':
      case 'POLYLINE2D':
      case 'POLYLINE3D':
        hitPath = this._drawPolyline(ctx, entity);
        break;
      case 'SPLINE':
        hitPath = this._drawSpline(ctx, entity);
        break;
      case 'TEXT':
        this._drawText(ctx, entity);
        break;
      case 'MTEXT':
        this._drawMText(ctx, entity);
        break;
      case 'HATCH':
        this._drawHatch(ctx, entity, color);
        break;
      case 'INSERT':
        this._drawInsert(ctx, entity, color);
        break;
      case 'DIMENSION_LINEAR':
      case 'DIMENSION_ALIGNED':
        this._drawDimensionLinear(ctx, entity, color);
        break;
      case 'DIMENSION_RADIUS':
        this._drawDimensionRadius(ctx, entity, color);
        break;
      case 'DIMENSION_DIAMETER':
        this._drawDimensionDiameter(ctx, entity, color);
        break;
      case 'DIMENSION_ANGULAR':
        this._drawDimensionAngular(ctx, entity, color);
        break;
      case 'DIMENSION_ORDINATE':
        this._drawDimensionOrdinate(ctx, entity, color);
        break;
      case 'LEADER':
        hitPath = this._drawLeader(ctx, entity);
        break;
      case 'SOLID':
      case 'TRACE':
        hitPath = this._drawSolid(ctx, entity, color);
        break;
      case '3DFACE':
        hitPath = this._draw3DFace(ctx, entity);
        break;
      case 'VIEWPORT':
        this._drawViewport(ctx, entity);
        break;
      case 'RAY':
        this._drawRay(ctx, entity);
        break;
      case 'XLINE':
        this._drawXLine(ctx, entity);
        break;
      case 'TABLE':
        this._drawTable(ctx, entity, color);
        break;
      case 'WIPEOUT':
        this._drawWipeout(ctx, entity);
        break;
      case 'MESH':
        this._drawMesh(ctx, entity);
        break;
      default:
        // Unknown entity - skip
        break;
    }

    if (hitPath) {
      this._hitPaths.push({ entity, path: hitPath });
    } else {
      // For entities without a hit path, create a bounding-box based one
      this._hitPaths.push({ entity, path: null });
    }
  }

  // ─── Individual entity draw methods ──────────────────────
  _drawLine(ctx, e) {
    const [x1, y1] = this.worldToScreen(e.start[0], e.start[1]);
    const [x2, y2] = this.worldToScreen(e.end[0], e.end[1]);
    const path = new Path2D();
    path.moveTo(x1, y1);
    path.lineTo(x2, y2);
    ctx.stroke(path);
    return path;
  }

  _drawPoint(ctx, e) {
    const [x, y] = this.worldToScreen(e.position[0], e.position[1]);
    const s = 3;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
    ctx.stroke();
  }

  _drawCircle(ctx, e) {
    const [cx, cy] = this.worldToScreen(e.center[0], e.center[1]);
    const r = this.worldLen(e.radius);
    const path = new Path2D();
    path.arc(cx, cy, Math.max(r, 0.5), 0, Math.PI * 2);
    ctx.stroke(path);
    return path;
  }

  _drawArc(ctx, e) {
    const [cx, cy] = this.worldToScreen(e.center[0], e.center[1]);
    const r = this.worldLen(e.radius);
    // Canvas Y is flipped, so negate angles and swap direction
    const startAngle = -e.startAngle;
    const endAngle = -e.endAngle;
    const path = new Path2D();
    path.arc(cx, cy, Math.max(r, 0.5), startAngle, endAngle, true);
    ctx.stroke(path);
    return path;
  }

  _drawEllipse(ctx, e) {
    const [cx, cy] = this.worldToScreen(e.center[0], e.center[1]);
    const mx = e.majorAxisEndpoint[0];
    const my = e.majorAxisEndpoint[1];
    const majorLen = Math.sqrt(mx * mx + my * my);
    const minorLen = majorLen * (e.minorAxisRatio || 1);
    const rotation = Math.atan2(my, mx);
    const startParam = e.startParam ?? 0;
    const endParam = e.endParam ?? Math.PI * 2;

    const path = new Path2D();
    path.ellipse(cx, cy, this.worldLen(majorLen), this.worldLen(minorLen),
      -rotation, -startParam, -endParam, true);
    ctx.stroke(path);
    return path;
  }

  _drawPolyline(ctx, e) {
    if (!e.vertices || e.vertices.length < 2) return null;
    const path = new Path2D();
    const verts = e.vertices;

    const vx = (v) => v.x ?? v[0];
    const vy = (v) => v.y ?? v[1];

    const [sx, sy] = this.worldToScreen(vx(verts[0]), vy(verts[0]));
    path.moveTo(sx, sy);

    for (let i = 0; i < verts.length; i++) {
      const curr = verts[i];
      const next = verts[(i + 1) % verts.length];
      if (i === verts.length - 1 && !e.closed) break;

      const bulge = curr.bulge || 0;
      if (Math.abs(bulge) > 1e-6) {
        this._drawBulgeSegment(path, vx(curr), vy(curr), vx(next), vy(next), bulge);
      } else {
        const [nx, ny] = this.worldToScreen(vx(next), vy(next));
        path.lineTo(nx, ny);
      }
    }

    if (e.closed) path.closePath();
    ctx.stroke(path);
    return path;
  }

  _drawBulgeSegment(path, x1, y1, x2, y2, bulge) {
    // bulge = tan(included_angle / 4)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-10) return;

    const sagitta = Math.abs(bulge) * dist / 2;
    const radius = ((dist / 2) * (dist / 2) + sagitta * sagitta) / (2 * sagitta);

    const angle = Math.atan2(dy, dx);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Offset from midpoint to center
    const d = radius - sagitta;
    const sign = bulge > 0 ? 1 : -1;
    const cx = midX - sign * d * Math.sin(angle);
    const cy = midY + sign * d * Math.cos(angle);

    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    const endAngle = Math.atan2(y2 - cy, x2 - cx);
    const counterClockwise = bulge < 0;

    const [scx, scy] = this.worldToScreen(cx, cy);
    const sr = this.worldLen(Math.abs(radius));

    // Canvas Y flip: negate angles, swap direction
    path.arc(scx, scy, sr, -startAngle, -endAngle, !counterClockwise);
  }

  _drawSpline(ctx, e) {
    // Approximate spline: use fit points if available, else control points
    const points = e.fitPoints || e.controlPoints;
    if (!points || points.length < 2) return null;

    const path = new Path2D();
    const [sx, sy] = this.worldToScreen(points[0][0], points[0][1]);
    path.moveTo(sx, sy);

    if (points.length === 2) {
      const [ex, ey] = this.worldToScreen(points[1][0], points[1][1]);
      path.lineTo(ex, ey);
    } else if (e.fitPoints && points.length >= 3) {
      // Use quadratic through fit points
      for (let i = 1; i < points.length; i++) {
        const [px, py] = this.worldToScreen(points[i][0], points[i][1]);
        path.lineTo(px, py);
      }
    } else {
      // B-spline approximation: evaluate with de Boor's or just subdivide
      const degree = e.degree || 3;
      const knots = e.knots;
      if (knots && knots.length >= points.length + degree + 1) {
        // de Boor evaluation
        const n = points.length;
        const tMin = knots[degree];
        const tMax = knots[n];
        const steps = Math.max(n * 10, 50);
        for (let s = 1; s <= steps; s++) {
          const t = tMin + (tMax - tMin) * s / steps;
          const pt = this._deBoor(degree, points, knots, t);
          const [px, py] = this.worldToScreen(pt[0], pt[1]);
          path.lineTo(px, py);
        }
      } else {
        // Fallback: connect control points
        for (let i = 1; i < points.length; i++) {
          const [px, py] = this.worldToScreen(points[i][0], points[i][1]);
          path.lineTo(px, py);
        }
      }
    }

    ctx.stroke(path);
    return path;
  }

  _deBoor(degree, controlPoints, knots, t) {
    // Find knot span
    const n = controlPoints.length;
    let k = degree;
    for (let i = degree; i < n; i++) {
      if (t >= knots[i] && t < knots[i + 1]) { k = i; break; }
    }
    // Handle t == tMax
    if (t >= knots[n]) k = n - 1;

    // Copy relevant control points
    const d = [];
    for (let j = 0; j <= degree; j++) {
      const idx = Math.min(Math.max(k - degree + j, 0), n - 1);
      d[j] = [controlPoints[idx][0], controlPoints[idx][1]];
    }

    for (let r = 1; r <= degree; r++) {
      for (let j = degree; j >= r; j--) {
        const i = k - degree + j;
        const ki = knots[i] ?? 0;
        const kipr = knots[i + degree - r + 1] ?? 1;
        const denom = kipr - ki;
        const alpha = denom < 1e-10 ? 0 : (t - ki) / denom;
        d[j][0] = (1 - alpha) * d[j - 1][0] + alpha * d[j][0];
        d[j][1] = (1 - alpha) * d[j - 1][1] + alpha * d[j][1];
      }
    }
    return d[degree];
  }

  _drawText(ctx, e) {
    if (!e.insertionPoint || !e.text) return;
    const [x, y] = this.worldToScreen(e.insertionPoint[0], e.insertionPoint[1]);
    const fontSize = Math.max(this.worldLen(e.height || 2.5), 4);
    const fontFamily = 'Arial, sans-serif';
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'bottom';

    const ha = e.horizontalAlignment || 'left';
    if (ha === 'center') ctx.textAlign = 'center';
    else if (ha === 'right') ctx.textAlign = 'right';
    else ctx.textAlign = 'left';

    ctx.fillText(e.text, x, y);
    ctx.textAlign = 'left'; // reset
  }

  _drawMText(ctx, e) {
    if (!e.insertionPoint || !e.text) return;
    const [x, y] = this.worldToScreen(e.insertionPoint[0], e.insertionPoint[1]);
    const fontSize = Math.max(this.worldLen(e.height || 2.5), 4);
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'top';

    // Parse MTEXT: \\P is paragraph break, strip formatting codes
    let text = e.text;
    // Remove common MTEXT formatting codes
    text = text.replace(/\\[AaCcFfHhQqTtWw][^;]*;/g, '');
    text = text.replace(/\{|\}/g, '');
    const lines = text.split(/\\P|\\n/i);

    const maxWidth = e.width ? this.worldLen(e.width) : Infinity;

    let offsetY = 0;
    for (const line of lines) {
      // Simple word wrap
      if (maxWidth < Infinity) {
        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
          const test = currentLine ? currentLine + ' ' + word : word;
          if (ctx.measureText(test).width > maxWidth && currentLine) {
            ctx.fillText(currentLine, x, y + offsetY);
            offsetY += fontSize * 1.2;
            currentLine = word;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) {
          ctx.fillText(currentLine, x, y + offsetY);
          offsetY += fontSize * 1.2;
        }
      } else {
        ctx.fillText(line, x, y + offsetY);
        offsetY += fontSize * 1.2;
      }
    }
  }

  _drawHatch(ctx, e, color) {
    if (!e.boundaries) return;

    for (const boundary of e.boundaries) {
      const path = new Path2D();
      if (boundary.polyline && boundary.polyline.vertices) {
        const verts = boundary.polyline.vertices;
        const [sx, sy] = this.worldToScreen(verts[0].x, verts[0].y);
        path.moveTo(sx, sy);

        for (let i = 0; i < verts.length; i++) {
          const curr = verts[i];
          const next = verts[(i + 1) % verts.length];
          if (i === verts.length - 1 && !boundary.polyline.closed) {
            // close it anyway for hatch
          }
          const bulge = curr.bulge || 0;
          if (Math.abs(bulge) > 1e-6) {
            this._drawBulgeSegment(path, curr.x, curr.y, next.x, next.y, bulge);
          } else {
            const [nx, ny] = this.worldToScreen(next.x, next.y);
            path.lineTo(nx, ny);
          }
        }
        path.closePath();
      } else if (boundary.edges) {
        let first = true;
        for (const edge of boundary.edges) {
          if (edge.type === 'LINE' || edge.type === 'line') {
            const [sx, sy] = this.worldToScreen(edge.start[0], edge.start[1]);
            const [ex, ey] = this.worldToScreen(edge.end[0], edge.end[1]);
            if (first) { path.moveTo(sx, sy); first = false; }
            path.lineTo(ex, ey);
          } else if (edge.type === 'ARC' || edge.type === 'arc') {
            const [cx, cy] = this.worldToScreen(edge.center[0], edge.center[1]);
            const r = this.worldLen(edge.radius);
            path.arc(cx, cy, r, -(edge.startAngle || 0), -(edge.endAngle || Math.PI * 2), true);
            first = false;
          }
        }
        path.closePath();
      }

      if (e.solid) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = color;
        ctx.fill(path);
        ctx.globalAlpha = 1.0;
      } else {
        // Hatch pattern: draw diagonal lines inside boundary using clipping
        ctx.save();
        ctx.clip(path);
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;

        // Get screen bounds of boundary
        const pts = [];
        if (boundary.polyline && boundary.polyline.vertices) {
          for (const v of boundary.polyline.vertices) {
            pts.push(this.worldToScreen(v.x, v.y));
          }
        }
        if (pts.length > 0) {
          let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
          for (const [px, py] of pts) {
            if (px < bMinX) bMinX = px;
            if (py < bMinY) bMinY = py;
            if (px > bMaxX) bMaxX = px;
            if (py > bMaxY) bMaxY = py;
          }
          const angle = e.patternAngle || 0.7854;
          const spacing = Math.max(4, this.worldLen((e.patternScale || 1) * 3));
          const diag = Math.sqrt((bMaxX - bMinX) ** 2 + (bMaxY - bMinY) ** 2);
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const cx = (bMinX + bMaxX) / 2;
          const cy = (bMinY + bMaxY) / 2;
          const numLines = Math.ceil(diag / spacing);
          ctx.beginPath();
          for (let i = -numLines; i <= numLines; i++) {
            const offset = i * spacing;
            const ox = cx + offset * (-sin);
            const oy = cy + offset * cos;
            ctx.moveTo(ox - diag * cos, oy - diag * sin);
            ctx.lineTo(ox + diag * cos, oy + diag * sin);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();
      }

      // Draw boundary outline
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.stroke(path);
      this._hitPaths.push({ entity: e, path });
    }
  }

  _drawInsert(ctx, e, color) {
    if (!this.doc.blocks || !e.blockName) return;
    const block = this.doc.blocks[e.blockName];
    if (!block || !block.entities) return;

    const ix = e.insertionPoint ? e.insertionPoint[0] : 0;
    const iy = e.insertionPoint ? e.insertionPoint[1] : 0;
    const sx = e.scaleX ?? 1;
    const sy = e.scaleY ?? 1;
    const rot = e.rotation ?? 0;

    ctx.save();
    const [scx, scy] = this.worldToScreen(ix, iy);
    ctx.translate(scx, scy);
    ctx.scale(1, -1); // Undo Y flip for proper rotation
    if (rot) ctx.rotate(rot);
    ctx.scale(sx * this.zoom, sy * this.zoom);

    // Render block entities in local coords
    for (const be of block.entities) {
      const beColor = this._resolveColor(be) === '#FFFFFF' ? color : this._resolveColor(be);
      this._renderBlockEntity(ctx, be, beColor);
    }
    ctx.restore();

    // Render attributes if present
    if (e.attributes) {
      for (const attr of e.attributes) {
        if (attr.insertionPoint && attr.value) {
          const [ax, ay] = this.worldToScreen(attr.insertionPoint[0], attr.insertionPoint[1]);
          const fontSize = Math.max(this.worldLen(attr.height || 2.5), 4);
          ctx.font = `${fontSize}px Arial, sans-serif`;
          ctx.fillStyle = color;
          ctx.textBaseline = 'bottom';
          ctx.fillText(attr.value, ax, ay);
        }
      }
    }
  }

  _renderBlockEntity(ctx, e, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1 / this.zoom; // 1px in screen space

    switch (e.type) {
      case 'LINE': {
        const bx = (e.start[0] ?? 0);
        const by = (e.start[1] ?? 0);
        const ex = (e.end[0] ?? 0);
        const ey = (e.end[1] ?? 0);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        break;
      }
      case 'CIRCLE': {
        ctx.beginPath();
        ctx.arc(e.center[0], e.center[1], e.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'ARC': {
        ctx.beginPath();
        ctx.arc(e.center[0], e.center[1], e.radius, e.startAngle || 0, e.endAngle || Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'SOLID':
      case 'TRACE': {
        ctx.beginPath();
        ctx.moveTo(e.point1[0], e.point1[1]);
        ctx.lineTo(e.point2[0], e.point2[1]);
        ctx.lineTo(e.point3[0], e.point3[1]);
        if (e.point4) ctx.lineTo(e.point4[0], e.point4[1]);
        ctx.closePath();
        ctx.globalAlpha = 0.4;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();
        break;
      }
      case 'TEXT': {
        if (e.text && e.insertionPoint) {
          const fontSize = e.height || 2.5;
          ctx.save();
          ctx.scale(1, -1);
          ctx.font = `${fontSize}px Arial, sans-serif`;
          ctx.fillText(e.text, e.insertionPoint[0], -e.insertionPoint[1]);
          ctx.restore();
        }
        break;
      }
      case 'LWPOLYLINE':
      case 'POLYLINE2D': {
        if (!e.vertices || e.vertices.length < 2) break;
        ctx.beginPath();
        const vx = (v) => v.x ?? v[0];
        const vy = (v) => v.y ?? v[1];
        ctx.moveTo(vx(e.vertices[0]), vy(e.vertices[0]));
        for (let i = 1; i < e.vertices.length; i++) {
          ctx.lineTo(vx(e.vertices[i]), vy(e.vertices[i]));
        }
        if (e.closed) ctx.closePath();
        ctx.stroke();
        break;
      }
      default:
        break;
    }
  }

  _drawDimensionLinear(ctx, e, color) {
    if (!e.defPoint1 || !e.defPoint2 || !e.dimLinePoint) return;
    const [x1, y1] = this.worldToScreen(e.defPoint1[0], e.defPoint1[1]);
    const [x2, y2] = this.worldToScreen(e.defPoint2[0], e.defPoint2[1]);
    const [dx, dy] = this.worldToScreen(e.dimLinePoint[0], e.dimLinePoint[1]);

    // Determine if horizontal or vertical
    const isHoriz = Math.abs(e.defPoint1[1] - e.dimLinePoint[1]) > Math.abs(e.defPoint1[0] - e.dimLinePoint[0]);
    let dly1, dly2, dlx1, dlx2;
    if (!isHoriz) {
      // Horizontal dimension line at dimLinePoint.y
      dly1 = dly2 = dy;
      dlx1 = x1;
      dlx2 = x2;
    } else {
      dlx1 = dlx2 = dx;
      dly1 = y1;
      dly2 = y2;
    }

    // Extension lines
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(dlx1, dly1);
    ctx.moveTo(x2, y2); ctx.lineTo(dlx2, dly2);
    // Dimension line
    ctx.moveTo(dlx1, dly1); ctx.lineTo(dlx2, dly2);
    ctx.stroke();

    // Arrows
    this._drawArrowhead(ctx, dlx2, dly2, dlx1, dly1);
    this._drawArrowhead(ctx, dlx1, dly1, dlx2, dly2);

    // Measurement text
    const dist = Math.sqrt(
      (e.defPoint2[0] - e.defPoint1[0]) ** 2 +
      (e.defPoint2[1] - e.defPoint1[1]) ** 2
    );
    const dimStyle = (this.doc.tables && this.doc.tables.dimStyles && e.dimStyle)
      ? this.doc.tables.dimStyles[e.dimStyle] : {};
    const textH = Math.max(this.worldLen(dimStyle.textHeight || 2.5), 8);
    const prec = dimStyle.linearPrecision ?? dimStyle.decimalPlaces ?? 0;
    const text = e.measurement != null ? e.measurement.toFixed(prec) : dist.toFixed(prec);

    ctx.font = `${textH}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, (dlx1 + dlx2) / 2, Math.min(dly1, dly2) - 2);
    ctx.textAlign = 'left';
  }

  _drawDimensionRadius(ctx, e, color) {
    if (!e.center || !e.chordPoint) return;
    const [cx, cy] = this.worldToScreen(e.center[0], e.center[1]);
    const [px, py] = this.worldToScreen(e.chordPoint[0], e.chordPoint[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    this._drawArrowhead(ctx, cx, cy, px, py);

    const r = Math.sqrt(
      (e.chordPoint[0] - e.center[0]) ** 2 +
      (e.chordPoint[1] - e.center[1]) ** 2
    );
    const textH = Math.max(this.worldLen(2.5), 8);
    const text = `R${r.toFixed(1)}`;
    ctx.font = `${textH}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, (cx + px) / 2, (cy + py) / 2 - 2);
  }

  _drawDimensionDiameter(ctx, e, color) {
    if (!e.center || !e.chordPoint) return;
    const [cx, cy] = this.worldToScreen(e.center[0], e.center[1]);
    const [px, py] = this.worldToScreen(e.chordPoint[0], e.chordPoint[1]);
    // Extend through center to opposite side
    const dx = px - cx, dy = py - cy;
    const ox = cx - dx, oy = cy - dy;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(px, py);
    ctx.stroke();
    this._drawArrowhead(ctx, ox, oy, px, py);
    this._drawArrowhead(ctx, px, py, ox, oy);

    const r = Math.sqrt(
      (e.chordPoint[0] - e.center[0]) ** 2 +
      (e.chordPoint[1] - e.center[1]) ** 2
    );
    const textH = Math.max(this.worldLen(2.5), 8);
    ctx.font = `${textH}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'bottom';
    ctx.fillText(`\u2300${(r * 2).toFixed(1)}`, (cx + px) / 2, (cy + py) / 2 - 2);
  }

  _drawDimensionAngular(ctx, e, color) {
    if (!e.center || !e.defPoint1 || !e.defPoint2) return;
    const [cx, cy] = this.worldToScreen(e.center[0], e.center[1]);
    const [p1x, p1y] = this.worldToScreen(e.defPoint1[0], e.defPoint1[1]);
    const [p2x, p2y] = this.worldToScreen(e.defPoint2[0], e.defPoint2[1]);

    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(p1x, p1y);
    ctx.moveTo(cx, cy); ctx.lineTo(p2x, p2y);
    ctx.stroke();

    // Arc
    const r = Math.min(
      Math.sqrt((p1x - cx) ** 2 + (p1y - cy) ** 2),
      Math.sqrt((p2x - cx) ** 2 + (p2y - cy) ** 2)
    ) * 0.6;
    const a1 = Math.atan2(-(p1y - cy), p1x - cx);
    const a2 = Math.atan2(-(p2y - cy), p2x - cx);
    ctx.beginPath();
    ctx.arc(cx, cy, r, a1, a2, false);
    ctx.stroke();

    // Angle text
    let angle = Math.abs(
      Math.atan2(e.defPoint2[1] - e.center[1], e.defPoint2[0] - e.center[0]) -
      Math.atan2(e.defPoint1[1] - e.center[1], e.defPoint1[0] - e.center[0])
    );
    angle = angle * 180 / Math.PI;
    if (angle > 180) angle = 360 - angle;
    const textH = Math.max(this.worldLen(2.5), 8);
    ctx.font = `${textH}px Arial, sans-serif`;
    ctx.fillStyle = color;
    const arcMid = (a1 + a2) / 2;
    const tx = cx + r * 1.2 * Math.cos(arcMid);
    const ty = cy + r * 1.2 * Math.sin(arcMid);
    ctx.fillText(`${angle.toFixed(1)}\u00B0`, tx, ty);
  }

  _drawDimensionOrdinate(ctx, e, color) {
    if (!e.featurePoint || !e.leaderEndpoint) return;
    const [fx, fy] = this.worldToScreen(e.featurePoint[0], e.featurePoint[1]);
    const [lx, ly] = this.worldToScreen(e.leaderEndpoint[0], e.leaderEndpoint[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(lx, ly);
    ctx.stroke();

    const val = e.isXOrdinate ? e.featurePoint[0] : e.featurePoint[1];
    const textH = Math.max(this.worldLen(2.5), 8);
    ctx.font = `${textH}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(val.toFixed(1), lx + 3, ly - 2);
  }

  _drawLeader(ctx, e) {
    if (!e.vertices || e.vertices.length < 2) return null;
    const path = new Path2D();
    const [sx, sy] = this.worldToScreen(e.vertices[0][0], e.vertices[0][1]);
    path.moveTo(sx, sy);
    for (let i = 1; i < e.vertices.length; i++) {
      const [px, py] = this.worldToScreen(e.vertices[i][0], e.vertices[i][1]);
      path.lineTo(px, py);
    }
    ctx.stroke(path);

    if (e.hasArrowhead && e.vertices.length >= 2) {
      const [ax, ay] = this.worldToScreen(e.vertices[0][0], e.vertices[0][1]);
      const [bx, by] = this.worldToScreen(e.vertices[1][0], e.vertices[1][1]);
      this._drawArrowhead(ctx, bx, by, ax, ay);
    }
    return path;
  }

  _drawArrowhead(ctx, fromX, fromY, toX, toY) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const size = 8;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - size * Math.cos(angle - 0.3), toY - size * Math.sin(angle - 0.3));
    ctx.lineTo(toX - size * Math.cos(angle + 0.3), toY - size * Math.sin(angle + 0.3));
    ctx.closePath();
    ctx.fill();
  }

  _drawSolid(ctx, e, color) {
    const path = new Path2D();
    const [x1, y1] = this.worldToScreen(e.point1[0], e.point1[1]);
    const [x2, y2] = this.worldToScreen(e.point2[0], e.point2[1]);
    const [x3, y3] = this.worldToScreen(e.point3[0], e.point3[1]);
    path.moveTo(x1, y1);
    path.lineTo(x2, y2);
    // DXF SOLID has swapped point order: 1-2-4-3
    if (e.point4) {
      const [x4, y4] = this.worldToScreen(e.point4[0], e.point4[1]);
      path.lineTo(x4, y4);
      path.lineTo(x3, y3);
    } else {
      path.lineTo(x3, y3);
    }
    path.closePath();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.globalAlpha = 1.0;
    ctx.stroke(path);
    return path;
  }

  _draw3DFace(ctx, e) {
    const path = new Path2D();
    const [x1, y1] = this.worldToScreen(e.point1[0], e.point1[1]);
    const [x2, y2] = this.worldToScreen(e.point2[0], e.point2[1]);
    const [x3, y3] = this.worldToScreen(e.point3[0], e.point3[1]);
    path.moveTo(x1, y1);
    path.lineTo(x2, y2);
    path.lineTo(x3, y3);
    if (e.point4) {
      const [x4, y4] = this.worldToScreen(e.point4[0], e.point4[1]);
      path.lineTo(x4, y4);
    }
    path.closePath();
    ctx.stroke(path);
    return path;
  }

  _drawViewport(ctx, e) {
    if (!e.center || !e.width || !e.height) return;
    const [cx, cy] = this.worldToScreen(e.center[0], e.center[1]);
    const w = this.worldLen(e.width);
    const h = this.worldLen(e.height);
    ctx.strokeStyle = 'rgba(100,100,255,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = 'rgba(100,100,255,0.5)';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillText('VIEWPORT', cx - w / 2 + 4, cy - h / 2 + 12);
  }

  _drawRay(ctx, e) {
    if (!e.origin || !e.direction) return;
    const dir = e.direction;
    const len = Math.max(this.maxX - this.minX, this.maxY - this.minY) * 10;
    const endX = e.origin[0] + dir[0] * len;
    const endY = e.origin[1] + dir[1] * len;
    const [x1, y1] = this.worldToScreen(e.origin[0], e.origin[1]);
    const [x2, y2] = this.worldToScreen(endX, endY);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  _drawXLine(ctx, e) {
    if (!e.origin || !e.direction) return;
    const dir = e.direction;
    const len = Math.max(this.maxX - this.minX, this.maxY - this.minY) * 10;
    const [x1, y1] = this.worldToScreen(e.origin[0] - dir[0] * len, e.origin[1] - dir[1] * len);
    const [x2, y2] = this.worldToScreen(e.origin[0] + dir[0] * len, e.origin[1] + dir[1] * len);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  _drawTable(ctx, e, color) {
    if (!e.insertionPoint) return;
    const ix = e.insertionPoint[0];
    const iy = e.insertionPoint[1];
    const colWidths = e.columnWidths || [];
    const rowHeights = e.rowHeights || [];
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const totalH = rowHeights.reduce((a, b) => a + b, 0);

    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;

    // Draw grid lines
    // Top border
    let curY = iy;
    for (let r = 0; r <= rowHeights.length; r++) {
      const [lx, ly] = this.worldToScreen(ix, curY);
      const [rx, ry] = this.worldToScreen(ix + totalW, curY);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      if (r < rowHeights.length) curY -= rowHeights[r];
    }
    let curX = ix;
    for (let c = 0; c <= colWidths.length; c++) {
      const [tx, ty] = this.worldToScreen(curX, iy);
      const [bx, by] = this.worldToScreen(curX, iy - totalH);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx, by);
      ctx.stroke();
      if (c < colWidths.length) curX += colWidths[c];
    }

    // Draw cell text
    if (e.cells) {
      for (const cell of e.cells) {
        let cx = ix;
        for (let c = 0; c < cell.column; c++) cx += colWidths[c] || 0;
        let cy = iy;
        for (let r = 0; r < cell.row; r++) cy -= rowHeights[r] || 0;
        const rh = rowHeights[cell.row] || 6;

        const [sx, sy] = this.worldToScreen(cx + 1, cy - rh * 0.3);
        const fontSize = Math.max(this.worldLen(rh * 0.5), 6);
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.text || '', sx, sy);
      }
    }
  }

  _drawWipeout(ctx, e) {
    if (!e.vertices || e.vertices.length < 3) return;
    const path = new Path2D();
    const [sx, sy] = this.worldToScreen(e.vertices[0][0], e.vertices[0][1]);
    path.moveTo(sx, sy);
    for (let i = 1; i < e.vertices.length; i++) {
      const [px, py] = this.worldToScreen(e.vertices[i][0], e.vertices[i][1]);
      path.lineTo(px, py);
    }
    path.closePath();
    ctx.fillStyle = '#1a1a2e';
    ctx.fill(path);
  }

  _drawMesh(ctx, e) {
    if (!e.vertices || !e.faces) return;
    ctx.lineWidth = 0.5;
    for (const face of e.faces) {
      ctx.beginPath();
      for (let i = 0; i < face.length; i++) {
        const v = e.vertices[face[i]];
        const [sx, sy] = this.worldToScreen(v[0], v[1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // ─── Hit testing ─────────────────────────────────────────
  hitTest(screenX, screenY) {
    const ctx = this.ctx;
    const tolerance = 6;

    // Walk hit paths in reverse order (top-most first)
    for (let i = this._hitPaths.length - 1; i >= 0; i--) {
      const { entity, path } = this._hitPaths[i];
      if (!path) continue;
      // Check stroke hit with tolerance
      ctx.lineWidth = tolerance * 2;
      if (ctx.isPointInStroke(path, screenX, screenY)) {
        return entity;
      }
      if (ctx.isPointInPath(path, screenX, screenY)) {
        return entity;
      }
    }
    return null;
  }

  // ─── Get layer list ──────────────────────────────────────
  getLayers() {
    const layers = {};
    if (this.doc && this.doc.tables && this.doc.tables.layers) {
      for (const [name, data] of Object.entries(this.doc.tables.layers)) {
        layers[name] = {
          visible: this.layerVisibility[name] !== false,
          color: this._layerColor(name),
          frozen: data.frozen || false,
          locked: data.locked || false
        };
      }
    }
    // Add layers from entities that may not be in the table
    if (this.doc && this.doc.entities) {
      for (const e of this.doc.entities) {
        const ln = e.layer || '0';
        if (!(ln in layers)) {
          layers[ln] = {
            visible: this.layerVisibility[ln] !== false,
            color: '#FFFFFF',
            frozen: false,
            locked: false
          };
          if (!(ln in this.layerVisibility)) this.layerVisibility[ln] = true;
        }
      }
    }
    return layers;
  }

  _layerColor(name) {
    const layers = this.doc.tables && this.doc.tables.layers;
    if (!layers || !layers[name]) return '#FFFFFF';
    const lc = layers[name].color;
    if (!lc) return '#FFFFFF';
    if (typeof lc === 'object' && lc.r !== undefined) {
      return `rgb(${Math.round(lc.r * 255)},${Math.round(lc.g * 255)},${Math.round(lc.b * 255)})`;
    }
    if (typeof lc === 'number' && lc >= 1 && lc <= 255) return ACI_COLORS[lc];
    return '#FFFFFF';
  }

  setLayerVisibility(name, visible) {
    this.layerVisibility[name] = visible;
  }

  // ─── Entity info ─────────────────────────────────────────
  getEntityInfo(entity) {
    if (!entity) return null;
    const info = { type: entity.type };
    const skip = new Set(['type']);
    for (const [k, v] of Object.entries(entity)) {
      if (skip.has(k)) continue;
      if (Array.isArray(v)) {
        if (v.length <= 4 && v.every(x => typeof x === 'number')) {
          info[k] = v.map(x => typeof x === 'number' ? Math.round(x * 10000) / 10000 : x).join(', ');
        } else if (k === 'vertices' || k === 'controlPoints' || k === 'fitPoints' || k === 'knots') {
          info[k] = `[${v.length} items]`;
        } else if (k === 'boundaries') {
          info[k] = `[${v.length} boundaries]`;
        } else if (k === 'cells') {
          info[k] = `[${v.length} cells]`;
        } else if (k === 'attributes') {
          info[k] = v.map(a => `${a.tag}: ${a.value}`).join(', ');
        } else {
          info[k] = JSON.stringify(v).substring(0, 80);
        }
      } else if (typeof v === 'object' && v !== null) {
        info[k] = JSON.stringify(v);
      } else {
        info[k] = v;
      }
    }
    return info;
  }

  // Entity count by type
  getStats() {
    if (!this.doc || !this.doc.entities) return {};
    const counts = {};
    for (const e of this.doc.entities) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }
}
