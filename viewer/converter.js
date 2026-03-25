// DXF-to-IFCX converter (pure JavaScript, no dependencies)
// Parses ASCII DXF files and outputs IFCX JSON

export function convertDxfToIfcx(dxfText) {
  const tokens = tokenize(dxfText);
  const sections = parseSections(tokens);

  const doc = {
    ifcx: '1.0',
    header: { application: 'DXF Import', units: { linear: 'millimeters', measurement: 'metric' } },
    tables: { layers: {}, linetypes: {}, textStyles: {}, dimStyles: {} },
    blocks: {},
    entities: [],
    objects: []
  };

  if (sections.HEADER) parseHeader(sections.HEADER, doc);
  if (sections.TABLES) parseTables(sections.TABLES, doc);
  if (sections.BLOCKS) parseBlocks(sections.BLOCKS, doc);
  if (sections.ENTITIES) parseEntities(sections.ENTITIES, doc.entities);
  if (sections.OBJECTS) parseObjects(sections.OBJECTS, doc);

  return doc;
}

// ─── Tokenizer ─────────────────────────────────────────────
function tokenize(text) {
  const lines = text.split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1].trimEnd();
    if (!isNaN(code)) {
      pairs.push({ code, value });
    }
  }
  return pairs;
}

// ─── Section splitter ──────────────────────────────────────
function parseSections(tokens) {
  const sections = {};
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value.trim() === 'SECTION') {
      i++;
      if (i < tokens.length && tokens[i].code === 2) {
        const name = tokens[i].value.trim();
        i++;
        const start = i;
        while (i < tokens.length && !(tokens[i].code === 0 && tokens[i].value.trim() === 'ENDSEC')) {
          i++;
        }
        sections[name] = tokens.slice(start, i);
        i++; // skip ENDSEC
      }
    } else {
      i++;
    }
  }
  return sections;
}

// ─── HEADER ────────────────────────────────────────────────
function parseHeader(tokens, doc) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].code === 9) {
      const varName = tokens[i].value.trim();
      if (varName === '$ACADVER' && i + 1 < tokens.length) {
        doc.header.version = tokens[i + 1].value.trim();
      }
      if (varName === '$MEASUREMENT' && i + 1 < tokens.length) {
        const v = parseInt(tokens[i + 1].value.trim());
        doc.header.units.measurement = v === 1 ? 'metric' : 'imperial';
      }
      if (varName === '$INSUNITS' && i + 1 < tokens.length) {
        const u = parseInt(tokens[i + 1].value.trim());
        const unitMap = { 1: 'inches', 2: 'feet', 4: 'millimeters', 5: 'centimeters', 6: 'meters' };
        if (unitMap[u]) doc.header.units.linear = unitMap[u];
      }
      if (varName === '$CLAYER' && i + 1 < tokens.length) {
        doc.header.currentLayer = tokens[i + 1].value.trim();
      }
      if (varName === '$LTSCALE' && i + 1 < tokens.length) {
        doc.header.linetypeScale = parseFloat(tokens[i + 1].value);
      }
    }
  }
}

// ─── TABLES ────────────────────────────────────────────────
function parseTables(tokens, doc) {
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value.trim() === 'TABLE') {
      i++;
      if (i < tokens.length && tokens[i].code === 2) {
        const tableName = tokens[i].value.trim();
        i++;
        const entries = [];
        let entryTokens = [];
        while (i < tokens.length && !(tokens[i].code === 0 && tokens[i].value.trim() === 'ENDTAB')) {
          if (tokens[i].code === 0) {
            if (entryTokens.length > 0) entries.push(entryTokens);
            entryTokens = [tokens[i]];
          } else {
            entryTokens.push(tokens[i]);
          }
          i++;
        }
        if (entryTokens.length > 0) entries.push(entryTokens);

        if (tableName === 'LAYER') {
          for (const entry of entries) {
            if (entry[0].value.trim() === 'LAYER') {
              const layer = parseLayerEntry(entry);
              if (layer.name) doc.tables.layers[layer.name] = layer.data;
            }
          }
        } else if (tableName === 'LTYPE') {
          for (const entry of entries) {
            if (entry[0].value.trim() === 'LTYPE') {
              const lt = parseLinetypeEntry(entry);
              if (lt.name) doc.tables.linetypes[lt.name] = lt.data;
            }
          }
        } else if (tableName === 'STYLE') {
          for (const entry of entries) {
            if (entry[0].value.trim() === 'STYLE') {
              const st = parseStyleEntry(entry);
              if (st.name) doc.tables.textStyles[st.name] = st.data;
            }
          }
        } else if (tableName === 'DIMSTYLE') {
          for (const entry of entries) {
            if (entry[0].value.trim() === 'DIMSTYLE') {
              const ds = parseDimStyleEntry(entry);
              if (ds.name) doc.tables.dimStyles[ds.name] = ds.data;
            }
          }
        }
        i++; // skip ENDTAB
      }
    } else {
      i++;
    }
  }
}

function parseLayerEntry(tokens) {
  const data = {};
  let name = '';
  for (const t of tokens) {
    switch (t.code) {
      case 2: name = t.value.trim(); break;
      case 62: data.color = parseInt(t.value); break;
      case 6: data.linetype = t.value.trim(); break;
      case 70: {
        const flags = parseInt(t.value);
        data.frozen = !!(flags & 1);
        data.locked = !!(flags & 4);
        break;
      }
      case 370: data.lineweight = parseInt(t.value); break;
    }
  }
  return { name, data };
}

function parseLinetypeEntry(tokens) {
  const data = { pattern: [] };
  let name = '';
  for (const t of tokens) {
    switch (t.code) {
      case 2: name = t.value.trim(); break;
      case 3: data.description = t.value.trim(); break;
      case 40: data.patternLength = parseFloat(t.value); break;
      case 49: data.pattern.push(parseFloat(t.value)); break;
    }
  }
  return { name, data };
}

function parseStyleEntry(tokens) {
  const data = {};
  let name = '';
  for (const t of tokens) {
    switch (t.code) {
      case 2: name = t.value.trim(); break;
      case 3: data.fontFamily = t.value.trim(); break;
      case 41: data.widthFactor = parseFloat(t.value); break;
      case 1071: {
        const flags = parseInt(t.value);
        data.isTrueType = !!(flags & 0x01000000);
        break;
      }
    }
  }
  return { name, data };
}

function parseDimStyleEntry(tokens) {
  const data = {};
  let name = '';
  for (const t of tokens) {
    switch (t.code) {
      case 2: name = t.value.trim(); break;
      case 140: data.textHeight = parseFloat(t.value); break;
      case 141: data.arrowSize = parseFloat(t.value) || undefined; break;
      case 40: data.overallScale = parseFloat(t.value); break;
      case 42: data.extensionOffset = parseFloat(t.value); break;
      case 44: data.extensionExtend = parseFloat(t.value); break;
      case 271: data.decimalPlaces = parseInt(t.value); break;
    }
  }
  // Clean undefined
  for (const k of Object.keys(data)) { if (data[k] === undefined) delete data[k]; }
  return { name, data };
}

// ─── BLOCKS ────────────────────────────────────────────────
function parseBlocks(tokens, doc) {
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value.trim() === 'BLOCK') {
      i++;
      let blockName = '';
      let basePoint = [0, 0, 0];
      while (i < tokens.length && tokens[i].code !== 0) {
        if (tokens[i].code === 2) blockName = tokens[i].value.trim();
        if (tokens[i].code === 10) basePoint[0] = parseFloat(tokens[i].value);
        if (tokens[i].code === 20) basePoint[1] = parseFloat(tokens[i].value);
        if (tokens[i].code === 30) basePoint[2] = parseFloat(tokens[i].value);
        i++;
      }
      // Parse entities until ENDBLK
      const blockEntities = [];
      while (i < tokens.length && !(tokens[i].code === 0 && tokens[i].value.trim() === 'ENDBLK')) {
        if (tokens[i].code === 0) {
          const entityType = tokens[i].value.trim();
          i++;
          const entityTokens = [];
          while (i < tokens.length && tokens[i].code !== 0) {
            entityTokens.push(tokens[i]);
            i++;
          }
          const ent = parseEntityTokens(entityType, entityTokens);
          if (ent) blockEntities.push(ent);
        } else {
          i++;
        }
      }
      if (i < tokens.length) i++; // skip ENDBLK
      // Skip past ENDBLK attributes
      while (i < tokens.length && tokens[i].code !== 0) i++;

      if (blockName && !blockName.startsWith('*')) {
        doc.blocks[blockName] = {
          name: blockName,
          basePoint,
          entities: blockEntities
        };
      }
    } else {
      i++;
    }
  }
}

// ─── ENTITIES ──────────────────────────────────────────────
function parseEntities(tokens, entities) {
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].code === 0) {
      const entityType = tokens[i].value.trim();
      i++;
      const entityTokens = [];
      while (i < tokens.length && tokens[i].code !== 0) {
        entityTokens.push(tokens[i]);
        i++;
      }
      const ent = parseEntityTokens(entityType, entityTokens);
      if (ent) entities.push(ent);
    } else {
      i++;
    }
  }
}

function parseEntityTokens(type, tokens) {
  const common = {};
  for (const t of tokens) {
    switch (t.code) {
      case 5: common.handle = t.value.trim(); break;
      case 8: common.layer = t.value.trim(); break;
      case 6: common.linetype = t.value.trim(); break;
      case 62: common.color = parseInt(t.value); break;
      case 48: common.linetypeScale = parseFloat(t.value); break;
      case 370: common.lineweight = parseInt(t.value); break;
      case 330: common.ownerHandle = t.value.trim(); break;
      case 67: if (parseInt(t.value) === 1) common.space = 'paper'; break;
    }
  }

  switch (type) {
    case 'LINE': return parseLine(tokens, common);
    case 'POINT': return parsePoint(tokens, common);
    case 'CIRCLE': return parseCircle(tokens, common);
    case 'ARC': return parseArc(tokens, common);
    case 'ELLIPSE': return parseEllipse(tokens, common);
    case 'LWPOLYLINE': return parseLWPolyline(tokens, common);
    case 'POLYLINE': return { type: 'POLYLINE2D', ...common }; // simplified
    case 'SPLINE': return parseSpline(tokens, common);
    case 'TEXT': return parseText(tokens, common);
    case 'MTEXT': return parseMText(tokens, common);
    case 'INSERT': return parseInsert(tokens, common);
    case 'HATCH': return parseHatch(tokens, common);
    case 'DIMENSION': return parseDimension(tokens, common);
    case 'LEADER': return parseLeader(tokens, common);
    case 'SOLID': return parseSolid(tokens, common, 'SOLID');
    case 'TRACE': return parseSolid(tokens, common, 'TRACE');
    case '3DFACE': return parse3DFace(tokens, common);
    case 'VIEWPORT': return parseViewport(tokens, common);
    case 'RAY': return parseRayXLine(tokens, common, 'RAY');
    case 'XLINE': return parseRayXLine(tokens, common, 'XLINE');
    default: return null;
  }
}

function parseLine(tokens, common) {
  const e = { type: 'LINE', ...common, start: [0, 0, 0], end: [0, 0, 0] };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.start[0] = parseFloat(t.value); break;
      case 20: e.start[1] = parseFloat(t.value); break;
      case 30: e.start[2] = parseFloat(t.value); break;
      case 11: e.end[0] = parseFloat(t.value); break;
      case 21: e.end[1] = parseFloat(t.value); break;
      case 31: e.end[2] = parseFloat(t.value); break;
    }
  }
  return e;
}

function parsePoint(tokens, common) {
  const e = { type: 'POINT', ...common, position: [0, 0, 0] };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.position[0] = parseFloat(t.value); break;
      case 20: e.position[1] = parseFloat(t.value); break;
      case 30: e.position[2] = parseFloat(t.value); break;
    }
  }
  return e;
}

function parseCircle(tokens, common) {
  const e = { type: 'CIRCLE', ...common, center: [0, 0, 0], radius: 0 };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.center[0] = parseFloat(t.value); break;
      case 20: e.center[1] = parseFloat(t.value); break;
      case 30: e.center[2] = parseFloat(t.value); break;
      case 40: e.radius = parseFloat(t.value); break;
    }
  }
  return e;
}

function parseArc(tokens, common) {
  const e = { type: 'ARC', ...common, center: [0, 0, 0], radius: 0, startAngle: 0, endAngle: 0 };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.center[0] = parseFloat(t.value); break;
      case 20: e.center[1] = parseFloat(t.value); break;
      case 30: e.center[2] = parseFloat(t.value); break;
      case 40: e.radius = parseFloat(t.value); break;
      case 50: e.startAngle = parseFloat(t.value) * Math.PI / 180; break;
      case 51: e.endAngle = parseFloat(t.value) * Math.PI / 180; break;
    }
  }
  return e;
}

function parseEllipse(tokens, common) {
  const e = {
    type: 'ELLIPSE', ...common,
    center: [0, 0, 0], majorAxisEndpoint: [0, 0, 0],
    minorAxisRatio: 1, startParam: 0, endParam: Math.PI * 2
  };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.center[0] = parseFloat(t.value); break;
      case 20: e.center[1] = parseFloat(t.value); break;
      case 30: e.center[2] = parseFloat(t.value); break;
      case 11: e.majorAxisEndpoint[0] = parseFloat(t.value); break;
      case 21: e.majorAxisEndpoint[1] = parseFloat(t.value); break;
      case 31: e.majorAxisEndpoint[2] = parseFloat(t.value); break;
      case 40: e.minorAxisRatio = parseFloat(t.value); break;
      case 41: e.startParam = parseFloat(t.value); break;
      case 42: e.endParam = parseFloat(t.value); break;
    }
  }
  return e;
}

function parseLWPolyline(tokens, common) {
  const e = { type: 'LWPOLYLINE', ...common, closed: false, vertices: [] };
  let currentVertex = null;
  for (const t of tokens) {
    switch (t.code) {
      case 70: e.closed = !!(parseInt(t.value) & 1); break;
      case 10:
        if (currentVertex) e.vertices.push(currentVertex);
        currentVertex = { x: parseFloat(t.value), y: 0 };
        break;
      case 20:
        if (currentVertex) currentVertex.y = parseFloat(t.value);
        break;
      case 42:
        if (currentVertex) currentVertex.bulge = parseFloat(t.value);
        break;
    }
  }
  if (currentVertex) e.vertices.push(currentVertex);
  return e;
}

function parseSpline(tokens, common) {
  const e = {
    type: 'SPLINE', ...common,
    degree: 3, controlPoints: [], knots: [], fitPoints: []
  };
  let cp = null, fp = null;
  for (const t of tokens) {
    switch (t.code) {
      case 71: e.degree = parseInt(t.value); break;
      case 40: e.knots.push(parseFloat(t.value)); break;
      case 10:
        if (cp) e.controlPoints.push(cp);
        cp = [parseFloat(t.value), 0, 0];
        break;
      case 20: if (cp) cp[1] = parseFloat(t.value); break;
      case 30: if (cp) cp[2] = parseFloat(t.value); break;
      case 11:
        if (fp) e.fitPoints.push(fp);
        fp = [parseFloat(t.value), 0, 0];
        break;
      case 21: if (fp) fp[1] = parseFloat(t.value); break;
      case 31: if (fp) fp[2] = parseFloat(t.value); break;
    }
  }
  if (cp) e.controlPoints.push(cp);
  if (fp) e.fitPoints.push(fp);
  if (e.fitPoints.length === 0) delete e.fitPoints;
  return e;
}

function parseText(tokens, common) {
  const e = { type: 'TEXT', ...common, text: '', insertionPoint: [0, 0, 0], height: 2.5 };
  for (const t of tokens) {
    switch (t.code) {
      case 1: e.text = t.value; break;
      case 10: e.insertionPoint[0] = parseFloat(t.value); break;
      case 20: e.insertionPoint[1] = parseFloat(t.value); break;
      case 30: e.insertionPoint[2] = parseFloat(t.value); break;
      case 40: e.height = parseFloat(t.value); break;
      case 7: e.style = t.value.trim(); break;
      case 50: e.rotation = parseFloat(t.value) * Math.PI / 180; break;
      case 72: {
        const v = parseInt(t.value);
        if (v === 1) e.horizontalAlignment = 'center';
        else if (v === 2) e.horizontalAlignment = 'right';
        break;
      }
    }
  }
  return e;
}

function parseMText(tokens, common) {
  const e = {
    type: 'MTEXT', ...common,
    text: '', insertionPoint: [0, 0, 0], height: 2.5, width: 0
  };
  for (const t of tokens) {
    switch (t.code) {
      case 1: e.text += t.value; break;
      case 3: e.text += t.value; break; // continuation
      case 10: e.insertionPoint[0] = parseFloat(t.value); break;
      case 20: e.insertionPoint[1] = parseFloat(t.value); break;
      case 30: e.insertionPoint[2] = parseFloat(t.value); break;
      case 40: e.height = parseFloat(t.value); break;
      case 41: e.width = parseFloat(t.value); break;
      case 7: e.style = t.value.trim(); break;
      case 71: {
        const att = parseInt(t.value);
        const map = { 1: 'top_left', 2: 'top_center', 3: 'top_right', 4: 'middle_left', 5: 'middle_center', 6: 'middle_right', 7: 'bottom_left', 8: 'bottom_center', 9: 'bottom_right' };
        e.attachment = map[att] || 'top_left';
        break;
      }
    }
  }
  return e;
}

function parseInsert(tokens, common) {
  const e = {
    type: 'INSERT', ...common,
    blockName: '', insertionPoint: [0, 0, 0], scaleX: 1, scaleY: 1, scaleZ: 1, rotation: 0
  };
  for (const t of tokens) {
    switch (t.code) {
      case 2: e.blockName = t.value.trim(); break;
      case 10: e.insertionPoint[0] = parseFloat(t.value); break;
      case 20: e.insertionPoint[1] = parseFloat(t.value); break;
      case 30: e.insertionPoint[2] = parseFloat(t.value); break;
      case 41: e.scaleX = parseFloat(t.value); break;
      case 42: e.scaleY = parseFloat(t.value); break;
      case 43: e.scaleZ = parseFloat(t.value); break;
      case 50: e.rotation = parseFloat(t.value) * Math.PI / 180; break;
    }
  }
  return e;
}

function parseHatch(tokens, common) {
  const e = {
    type: 'HATCH', ...common,
    patternName: '', solid: false, boundaries: []
  };

  // Hatch parsing is complex; simplified version
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    switch (t.code) {
      case 2: e.patternName = t.value.trim(); break;
      case 70: e.solid = parseInt(t.value) === 1; break;
      case 52: e.patternAngle = parseFloat(t.value) * Math.PI / 180; break;
      case 41: e.patternScale = parseFloat(t.value); break;
      case 91: {
        // Number of boundary paths
        const numPaths = parseInt(t.value);
        for (let p = 0; p < numPaths && i < tokens.length; p++) {
          i++;
          // Find boundary type flag (92)
          while (i < tokens.length && tokens[i].code !== 92 && tokens[i].code !== 91) i++;
          if (i >= tokens.length || tokens[i].code === 91) break;
          const pathType = parseInt(tokens[i].value);
          i++;
          const isPolyline = !!(pathType & 2);
          if (isPolyline) {
            // Skip hasBulge (72) and closed (73)
            let closed = false;
            while (i < tokens.length && tokens[i].code !== 93) {
              if (tokens[i].code === 73) closed = !!(parseInt(tokens[i].value));
              i++;
            }
            // 93 = number of vertices
            if (i < tokens.length && tokens[i].code === 93) {
              const numVerts = parseInt(tokens[i].value);
              i++;
              const verts = [];
              for (let v = 0; v < numVerts && i < tokens.length; v++) {
                const vert = { x: 0, y: 0 };
                while (i < tokens.length) {
                  if (tokens[i].code === 10) { vert.x = parseFloat(tokens[i].value); i++; }
                  else if (tokens[i].code === 20) { vert.y = parseFloat(tokens[i].value); i++; }
                  else if (tokens[i].code === 42) { vert.bulge = parseFloat(tokens[i].value); i++; }
                  else break;
                }
                verts.push(vert);
              }
              e.boundaries.push({ type: 'polyline', polyline: { vertices: verts, closed } });
            }
          } else {
            // Edge-type boundary
            // Find number of edges (93)
            while (i < tokens.length && tokens[i].code !== 93) i++;
            if (i < tokens.length) {
              const numEdges = parseInt(tokens[i].value);
              i++;
              const edges = [];
              for (let ed = 0; ed < numEdges && i < tokens.length; ed++) {
                // edge type (72): 1=line, 2=arc, 3=elliptic arc, 4=spline
                while (i < tokens.length && tokens[i].code !== 72) i++;
                if (i >= tokens.length) break;
                const edgeType = parseInt(tokens[i].value);
                i++;
                if (edgeType === 1) {
                  const edge = { type: 'LINE', start: [0, 0], end: [0, 0] };
                  while (i < tokens.length && tokens[i].code !== 72 && tokens[i].code !== 97 && !(tokens[i].code === 0)) {
                    if (tokens[i].code === 10) edge.start[0] = parseFloat(tokens[i].value);
                    if (tokens[i].code === 20) edge.start[1] = parseFloat(tokens[i].value);
                    if (tokens[i].code === 11) edge.end[0] = parseFloat(tokens[i].value);
                    if (tokens[i].code === 21) edge.end[1] = parseFloat(tokens[i].value);
                    i++;
                  }
                  edges.push(edge);
                } else if (edgeType === 2) {
                  const edge = { type: 'ARC', center: [0, 0], radius: 0, startAngle: 0, endAngle: Math.PI * 2 };
                  while (i < tokens.length && tokens[i].code !== 72 && tokens[i].code !== 97 && !(tokens[i].code === 0)) {
                    if (tokens[i].code === 10) edge.center[0] = parseFloat(tokens[i].value);
                    if (tokens[i].code === 20) edge.center[1] = parseFloat(tokens[i].value);
                    if (tokens[i].code === 40) edge.radius = parseFloat(tokens[i].value);
                    if (tokens[i].code === 50) edge.startAngle = parseFloat(tokens[i].value) * Math.PI / 180;
                    if (tokens[i].code === 51) edge.endAngle = parseFloat(tokens[i].value) * Math.PI / 180;
                    i++;
                  }
                  edges.push(edge);
                } else {
                  // Skip unsupported edge types
                  while (i < tokens.length && tokens[i].code !== 72 && tokens[i].code !== 97 && !(tokens[i].code === 0)) i++;
                }
              }
              if (edges.length > 0) e.boundaries.push({ type: 'edges', edges });
            }
          }
        }
        break;
      }
    }
    i++;
  }
  return e;
}

function parseDimension(tokens, common) {
  const e = { ...common };
  let dimType = 0;
  const pts = {
    defPoint: [0, 0, 0], defPoint1: [0, 0, 0], defPoint2: [0, 0, 0],
    dimLinePoint: [0, 0, 0], textMidpoint: [0, 0, 0]
  };
  let measurement;

  for (const t of tokens) {
    switch (t.code) {
      case 70: dimType = parseInt(t.value) & 0x0F; break;
      case 3: e.dimStyle = t.value.trim(); break;
      case 42: measurement = parseFloat(t.value); break;
      case 10: pts.defPoint[0] = parseFloat(t.value); break;
      case 20: pts.defPoint[1] = parseFloat(t.value); break;
      case 30: pts.defPoint[2] = parseFloat(t.value); break;
      case 11: pts.textMidpoint[0] = parseFloat(t.value); break;
      case 21: pts.textMidpoint[1] = parseFloat(t.value); break;
      case 13: pts.defPoint1[0] = parseFloat(t.value); break;
      case 23: pts.defPoint1[1] = parseFloat(t.value); break;
      case 33: pts.defPoint1[2] = parseFloat(t.value); break;
      case 14: pts.defPoint2[0] = parseFloat(t.value); break;
      case 24: pts.defPoint2[1] = parseFloat(t.value); break;
      case 34: pts.defPoint2[2] = parseFloat(t.value); break;
      case 15: pts.dimLinePoint[0] = parseFloat(t.value); break;
      case 25: pts.dimLinePoint[1] = parseFloat(t.value); break;
    }
  }

  if (measurement !== undefined) e.measurement = measurement;

  switch (dimType) {
    case 0: // Linear (rotated)
    case 1: // Aligned
      e.type = dimType === 0 ? 'DIMENSION_LINEAR' : 'DIMENSION_ALIGNED';
      e.defPoint1 = pts.defPoint1;
      e.defPoint2 = pts.defPoint2;
      e.dimLinePoint = pts.textMidpoint;
      break;
    case 2: // Angular
      e.type = 'DIMENSION_ANGULAR';
      e.center = pts.defPoint;
      e.defPoint1 = pts.defPoint1;
      e.defPoint2 = pts.defPoint2;
      e.arcPoint = pts.textMidpoint;
      break;
    case 3: // Diameter
      e.type = 'DIMENSION_DIAMETER';
      e.center = pts.defPoint;
      e.chordPoint = pts.defPoint1;
      break;
    case 4: // Radius
      e.type = 'DIMENSION_RADIUS';
      e.center = pts.defPoint;
      e.chordPoint = pts.defPoint1;
      break;
    case 6: // Ordinate
      e.type = 'DIMENSION_ORDINATE';
      e.featurePoint = pts.defPoint1;
      e.leaderEndpoint = pts.defPoint2;
      break;
    default:
      e.type = 'DIMENSION_LINEAR';
      e.defPoint1 = pts.defPoint1;
      e.defPoint2 = pts.defPoint2;
      e.dimLinePoint = pts.textMidpoint;
  }
  return e;
}

function parseLeader(tokens, common) {
  const e = { type: 'LEADER', ...common, vertices: [], hasArrowhead: true };
  let vx = null;
  for (const t of tokens) {
    switch (t.code) {
      case 10:
        if (vx !== null) e.vertices.push(vx);
        vx = [parseFloat(t.value), 0, 0];
        break;
      case 20: if (vx) vx[1] = parseFloat(t.value); break;
      case 30: if (vx) vx[2] = parseFloat(t.value); break;
      case 71: e.hasArrowhead = parseInt(t.value) === 1; break;
    }
  }
  if (vx) e.vertices.push(vx);
  return e;
}

function parseSolid(tokens, common, type) {
  const e = { type, ...common, point1: [0, 0, 0], point2: [0, 0, 0], point3: [0, 0, 0] };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.point1[0] = parseFloat(t.value); break;
      case 20: e.point1[1] = parseFloat(t.value); break;
      case 30: e.point1[2] = parseFloat(t.value); break;
      case 11: e.point2[0] = parseFloat(t.value); break;
      case 21: e.point2[1] = parseFloat(t.value); break;
      case 31: e.point2[2] = parseFloat(t.value); break;
      case 12: e.point3[0] = parseFloat(t.value); break;
      case 22: e.point3[1] = parseFloat(t.value); break;
      case 32: e.point3[2] = parseFloat(t.value); break;
      case 13: e.point4 = e.point4 || [0, 0, 0]; e.point4[0] = parseFloat(t.value); break;
      case 23: e.point4 = e.point4 || [0, 0, 0]; e.point4[1] = parseFloat(t.value); break;
      case 33: e.point4 = e.point4 || [0, 0, 0]; e.point4[2] = parseFloat(t.value); break;
    }
  }
  return e;
}

function parse3DFace(tokens, common) {
  const e = { type: '3DFACE', ...common, point1: [0, 0, 0], point2: [0, 0, 0], point3: [0, 0, 0] };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.point1[0] = parseFloat(t.value); break;
      case 20: e.point1[1] = parseFloat(t.value); break;
      case 30: e.point1[2] = parseFloat(t.value); break;
      case 11: e.point2[0] = parseFloat(t.value); break;
      case 21: e.point2[1] = parseFloat(t.value); break;
      case 31: e.point2[2] = parseFloat(t.value); break;
      case 12: e.point3[0] = parseFloat(t.value); break;
      case 22: e.point3[1] = parseFloat(t.value); break;
      case 32: e.point3[2] = parseFloat(t.value); break;
      case 13: e.point4 = e.point4 || [0, 0, 0]; e.point4[0] = parseFloat(t.value); break;
      case 23: e.point4 = e.point4 || [0, 0, 0]; e.point4[1] = parseFloat(t.value); break;
      case 33: e.point4 = e.point4 || [0, 0, 0]; e.point4[2] = parseFloat(t.value); break;
    }
  }
  return e;
}

function parseViewport(tokens, common) {
  const e = { type: 'VIEWPORT', ...common, center: [0, 0, 0], width: 0, height: 0 };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.center[0] = parseFloat(t.value); break;
      case 20: e.center[1] = parseFloat(t.value); break;
      case 30: e.center[2] = parseFloat(t.value); break;
      case 40: e.height = parseFloat(t.value); break;
      case 41: e.width = parseFloat(t.value); break;
      case 12: e.viewCenter = e.viewCenter || [0, 0]; e.viewCenter[0] = parseFloat(t.value); break;
      case 22: e.viewCenter = e.viewCenter || [0, 0]; e.viewCenter[1] = parseFloat(t.value); break;
      case 45: e.viewHeight = parseFloat(t.value); break;
    }
  }
  return e;
}

function parseRayXLine(tokens, common, type) {
  const e = { type, ...common, origin: [0, 0, 0], direction: [1, 0, 0] };
  for (const t of tokens) {
    switch (t.code) {
      case 10: e.origin[0] = parseFloat(t.value); break;
      case 20: e.origin[1] = parseFloat(t.value); break;
      case 30: e.origin[2] = parseFloat(t.value); break;
      case 11: e.direction[0] = parseFloat(t.value); break;
      case 21: e.direction[1] = parseFloat(t.value); break;
      case 31: e.direction[2] = parseFloat(t.value); break;
    }
  }
  return e;
}

// ─── OBJECTS ───────────────────────────────────────────────
function parseObjects(tokens, doc) {
  // Minimal objects parsing - just extract layouts
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value.trim() === 'LAYOUT') {
      i++;
      const layout = { objectType: 'LAYOUT' };
      while (i < tokens.length && tokens[i].code !== 0) {
        if (tokens[i].code === 1) layout.name = tokens[i].value.trim();
        if (tokens[i].code === 71) layout.tabOrder = parseInt(tokens[i].value);
        i++;
      }
      if (layout.name) {
        layout.isModelSpace = layout.name === 'Model';
        doc.objects.push(layout);
      }
    } else {
      i++;
    }
  }
}
