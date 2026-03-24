"""DXF section-level parser -- pure Python, no external dependencies.

Parses tokenised DXF group-code/value pairs into a structured ``DxfFile``
object containing header variables, tables, blocks, entities and objects.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterator

from ifcx.converters.dxf_tokenizer import DxfValue, tokenize


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class DxfFile:
    """In-memory representation of a parsed DXF file."""

    header: dict[str, Any] = field(default_factory=dict)
    tables: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    blocks: dict[str, dict[str, Any]] = field(default_factory=dict)
    entities: list[dict[str, Any]] = field(default_factory=list)
    objects: list[dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Token stream helper
# ---------------------------------------------------------------------------

class _TokenStream:
    """Peekable wrapper around a token iterator."""

    def __init__(self, tokens: Iterator[tuple[int, DxfValue]]) -> None:
        self._iter = tokens
        self._buffer: list[tuple[int, DxfValue]] = []
        self._done = False

    def peek(self) -> tuple[int, DxfValue] | None:
        if self._buffer:
            return self._buffer[0]
        if self._done:
            return None
        try:
            tok = next(self._iter)
            self._buffer.append(tok)
            return tok
        except StopIteration:
            self._done = True
            return None

    def next(self) -> tuple[int, DxfValue] | None:
        if self._buffer:
            return self._buffer.pop(0)
        if self._done:
            return None
        try:
            return next(self._iter)
        except StopIteration:
            self._done = True
            return None

    def push_back(self, token: tuple[int, DxfValue]) -> None:
        self._buffer.insert(0, token)


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

class DxfParser:
    """Parses DXF ASCII content into a :class:`DxfFile`."""

    def parse(self, content: str) -> DxfFile:
        """Parse a full DXF string and return a ``DxfFile``."""
        tokens = _TokenStream(tokenize(content))
        result = DxfFile()

        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and isinstance(value, str) and value == "EOF":
                break
            if code == 0 and isinstance(value, str) and value == "SECTION":
                # Next pair should be (2, section_name)
                name_tok = tokens.next()
                if name_tok is None:
                    break
                _, section_name = name_tok
                section_name = str(section_name).upper()

                if section_name == "HEADER":
                    result.header = self._parse_header(tokens)
                elif section_name == "TABLES":
                    result.tables = self._parse_tables(tokens)
                elif section_name == "BLOCKS":
                    result.blocks = self._parse_blocks(tokens)
                elif section_name == "ENTITIES":
                    result.entities = self._parse_entities(tokens)
                elif section_name == "OBJECTS":
                    result.objects = self._parse_objects(tokens)
                else:
                    # Skip unknown sections
                    self._skip_section(tokens)

        return result

    # -----------------------------------------------------------------
    # HEADER
    # -----------------------------------------------------------------

    def _parse_header(self, tokens: _TokenStream) -> dict[str, Any]:
        header: dict[str, Any] = {}
        current_var: str | None = None
        current_values: list[tuple[int, DxfValue]] = []

        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok

            if code == 0 and str(value) == "ENDSEC":
                break

            if code == 9:
                # Flush previous variable
                if current_var is not None:
                    header[current_var] = self._collapse_header_var(current_values)
                current_var = str(value)
                current_values = []
            else:
                current_values.append((code, value))

        if current_var is not None:
            header[current_var] = self._collapse_header_var(current_values)

        return header

    @staticmethod
    def _collapse_header_var(pairs: list[tuple[int, DxfValue]]) -> Any:
        """Collapse a header variable's group-code pairs into a single value."""
        if not pairs:
            return None
        if len(pairs) == 1:
            return pairs[0][1]
        # If there are coordinate codes (10/20/30 etc.), return a list.
        codes = {c for c, _ in pairs}
        if codes & {10, 20, 30}:
            x = y = z = 0.0
            for c, v in pairs:
                if c == 10:
                    x = float(v)
                elif c == 20:
                    y = float(v)
                elif c == 30:
                    z = float(v)
            return [x, y, z]
        # Otherwise return dict of code->value
        return {c: v for c, v in pairs}

    # -----------------------------------------------------------------
    # TABLES
    # -----------------------------------------------------------------

    def _parse_tables(self, tokens: _TokenStream) -> dict[str, list[dict[str, Any]]]:
        tables: dict[str, list[dict[str, Any]]] = {}

        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "ENDSEC":
                break
            if code == 0 and str(value) == "TABLE":
                # Next pair: (2, table_name)
                name_tok = tokens.next()
                if name_tok is None:
                    break
                _, table_name = name_tok
                table_name = str(table_name).upper()
                entries = self._parse_table_entries(tokens, table_name)
                tables[table_name] = entries

        return tables

    def _parse_table_entries(self, tokens: _TokenStream, table_name: str) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []
        # Read table-level codes until first entry or ENDTAB
        table_props: dict[int, DxfValue] = {}

        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "ENDTAB":
                break
            if code == 0:
                # This is a table entry (e.g., LAYER, LTYPE, STYLE, ...)
                entry_type = str(value)
                entry = self._parse_table_entry(tokens, entry_type, table_name)
                entry["_entry_type"] = entry_type
                entries.append(entry)
            else:
                table_props[code] = value

        return entries

    def _parse_table_entry(self, tokens: _TokenStream, entry_type: str, table_name: str) -> dict[str, Any]:
        entry: dict[str, Any] = {}
        pattern_elements: list[float] = []

        while True:
            tok = tokens.peek()
            if tok is None:
                break
            code, value = tok
            if code == 0:
                break
            tokens.next()

            if table_name == "LAYER":
                self._apply_layer_code(entry, code, value)
            elif table_name == "LTYPE":
                self._apply_ltype_code(entry, code, value, pattern_elements)
            elif table_name == "STYLE":
                self._apply_style_code(entry, code, value)
            elif table_name == "DIMSTYLE":
                self._apply_dimstyle_code(entry, code, value)
            elif table_name in ("VPORT", "VIEW", "UCS", "APPID", "BLOCK_RECORD"):
                self._apply_generic_table_code(entry, code, value)
            else:
                self._apply_generic_table_code(entry, code, value)

        if pattern_elements:
            entry["pattern"] = pattern_elements

        return entry

    # --- Layer ---
    @staticmethod
    def _apply_layer_code(entry: dict, code: int, value: DxfValue) -> None:
        if code == 2:
            entry["name"] = str(value)
        elif code == 5:
            entry["handle"] = str(value)
        elif code == 6:
            entry["linetype"] = str(value)
        elif code == 62:
            color = int(value)
            entry["color"] = abs(color)
            if color < 0:
                entry["off"] = True
        elif code == 70:
            flags = int(value)
            entry["flags"] = flags
            entry["frozen"] = bool(flags & 1)
            entry["locked"] = bool(flags & 4)
        elif code == 290:
            entry["plot"] = bool(value)
        elif code == 370:
            entry["lineweight"] = int(value)
        elif code == 390:
            entry["plotStyleHandle"] = str(value)
        elif code == 420:
            entry["trueColor"] = int(value)
        elif code == 100:
            pass  # subclass marker
        elif code == 330:
            entry["ownerHandle"] = str(value)

    # --- Linetype ---
    @staticmethod
    def _apply_ltype_code(entry: dict, code: int, value: DxfValue, elements: list) -> None:
        if code == 2:
            entry["name"] = str(value)
        elif code == 5:
            entry["handle"] = str(value)
        elif code == 3:
            entry["description"] = str(value)
        elif code == 73:
            entry["elementCount"] = int(value)
        elif code == 40:
            entry["totalLength"] = float(value)
        elif code == 49:
            elements.append(float(value))
        elif code == 70:
            entry["flags"] = int(value)
        elif code == 100:
            pass

    # --- Style ---
    @staticmethod
    def _apply_style_code(entry: dict, code: int, value: DxfValue) -> None:
        if code == 2:
            entry["name"] = str(value)
        elif code == 5:
            entry["handle"] = str(value)
        elif code == 3:
            entry["font"] = str(value)
        elif code == 4:
            entry["bigFont"] = str(value)
        elif code == 40:
            entry["height"] = float(value)
        elif code == 41:
            entry["widthFactor"] = float(value)
        elif code == 42:
            entry["lastHeight"] = float(value)
        elif code == 50:
            entry["obliqueAngle"] = float(value)
        elif code == 70:
            entry["flags"] = int(value)
        elif code == 71:
            entry["textGenerationFlags"] = int(value)
        elif code == 100:
            pass
        elif code == 1071:
            entry["fontFlags"] = int(value)

    # --- Dimstyle ---
    @staticmethod
    def _apply_dimstyle_code(entry: dict, code: int, value: DxfValue) -> None:
        if code == 2:
            entry["name"] = str(value)
        elif code == 5:
            entry["handle"] = str(value)
        elif code == 3:
            entry["DIMPOST"] = str(value)
        elif code == 4:
            entry["DIMAPOST"] = str(value)
        elif code == 40:
            entry["DIMSCALE"] = float(value)
        elif code == 41:
            entry["DIMASZ"] = float(value)
        elif code == 42:
            entry["DIMEXO"] = float(value)
        elif code == 43:
            entry["DIMDLI"] = float(value)
        elif code == 44:
            entry["DIMEXE"] = float(value)
        elif code == 45:
            entry["DIMRND"] = float(value)
        elif code == 46:
            entry["DIMDLE"] = float(value)
        elif code == 47:
            entry["DIMTP"] = float(value)
        elif code == 48:
            entry["DIMTM"] = float(value)
        elif code == 140:
            entry["DIMTXT"] = float(value)
        elif code == 141:
            entry["DIMCEN"] = float(value)
        elif code == 142:
            entry["DIMTSZ"] = float(value)
        elif code == 143:
            entry["DIMALTF"] = float(value)
        elif code == 144:
            entry["DIMLFAC"] = float(value)
        elif code == 145:
            entry["DIMTVP"] = float(value)
        elif code == 146:
            entry["DIMTFAC"] = float(value)
        elif code == 147:
            entry["DIMGAP"] = float(value)
        elif code == 71:
            entry["DIMTOL"] = int(value)
        elif code == 72:
            entry["DIMLIM"] = int(value)
        elif code == 73:
            entry["DIMTIH"] = int(value)
        elif code == 74:
            entry["DIMTOH"] = int(value)
        elif code == 75:
            entry["DIMSE1"] = int(value)
        elif code == 76:
            entry["DIMSE2"] = int(value)
        elif code == 77:
            entry["DIMTAD"] = int(value)
        elif code == 78:
            entry["DIMZIN"] = int(value)
        elif code == 170:
            entry["DIMALT"] = int(value)
        elif code == 171:
            entry["DIMALTD"] = int(value)
        elif code == 172:
            entry["DIMTOFL"] = int(value)
        elif code == 173:
            entry["DIMSAH"] = int(value)
        elif code == 174:
            entry["DIMTIX"] = int(value)
        elif code == 175:
            entry["DIMSOXD"] = int(value)
        elif code == 176:
            entry["DIMCLRD"] = int(value)
        elif code == 177:
            entry["DIMCLRE"] = int(value)
        elif code == 178:
            entry["DIMCLRT"] = int(value)
        elif code == 270:
            entry["DIMUNIT"] = int(value)
        elif code == 271:
            entry["DIMDEC"] = int(value)
        elif code == 272:
            entry["DIMTDEC"] = int(value)
        elif code == 273:
            entry["DIMALTU"] = int(value)
        elif code == 274:
            entry["DIMALTDEC"] = int(value) if "DIMALTDEC" not in entry else entry["DIMALTDEC"]
        elif code == 275:
            entry["DIMAUNIT"] = int(value)
        elif code == 276:
            entry["DIMFRAC"] = int(value)
        elif code == 277:
            entry["DIMLUNIT"] = int(value)
        elif code == 278:
            entry["DIMDSEP"] = int(value)
        elif code == 279:
            entry["DIMTMOVE"] = int(value)
        elif code == 280:
            entry["DIMJUST"] = int(value)
        elif code == 281:
            entry["DIMSD1"] = int(value)
        elif code == 282:
            entry["DIMSD2"] = int(value)
        elif code == 283:
            entry["DIMTOLJ"] = int(value)
        elif code == 284:
            entry["DIMTZIN"] = int(value)
        elif code == 285:
            entry["DIMALTZ"] = int(value)
        elif code == 286:
            entry["DIMALTTZ"] = int(value)
        elif code == 288:
            entry["DIMUPT"] = int(value)
        elif code == 289:
            entry["DIMATFIT"] = int(value)
        elif code == 340:
            entry["DIMTXSTY"] = str(value)
        elif code == 341:
            entry["DIMLDRBLK"] = str(value)
        elif code == 342:
            entry["DIMBLK"] = str(value)
        elif code == 343:
            entry["DIMBLK1"] = str(value)
        elif code == 344:
            entry["DIMBLK2"] = str(value)
        elif code == 371:
            entry["DIMLWD"] = int(value)
        elif code == 372:
            entry["DIMLWE"] = int(value)
        elif code == 100:
            pass

    # --- Generic table entry (VPORT, VIEW, UCS, APPID, BLOCK_RECORD) ---
    @staticmethod
    def _apply_generic_table_code(entry: dict, code: int, value: DxfValue) -> None:
        if code == 2:
            entry["name"] = str(value)
        elif code == 5:
            entry["handle"] = str(value)
        elif code == 70:
            entry["flags"] = int(value)
        elif code == 100:
            pass
        else:
            entry[code] = value

    # -----------------------------------------------------------------
    # BLOCKS
    # -----------------------------------------------------------------

    def _parse_blocks(self, tokens: _TokenStream) -> dict[str, dict[str, Any]]:
        blocks: dict[str, dict[str, Any]] = {}

        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "ENDSEC":
                break
            if code == 0 and str(value) == "BLOCK":
                block = self._parse_block(tokens)
                name = block.get("name", "")
                blocks[name] = block

        return blocks

    def _parse_block(self, tokens: _TokenStream) -> dict[str, Any]:
        block: dict[str, Any] = {}
        base_x = base_y = base_z = 0.0

        # Read block header fields
        while True:
            tok = tokens.peek()
            if tok is None:
                break
            code, value = tok
            if code == 0:
                break
            tokens.next()

            if code == 2:
                block["name"] = str(value)
            elif code == 3:
                block["name2"] = str(value)
            elif code == 5:
                block["handle"] = str(value)
            elif code == 8:
                block["layer"] = str(value)
            elif code == 10:
                base_x = float(value)
            elif code == 20:
                base_y = float(value)
            elif code == 30:
                base_z = float(value)
            elif code == 70:
                block["flags"] = int(value)

        block["basePoint"] = [base_x, base_y, base_z]

        # Read entities inside block until ENDBLK
        entities: list[dict[str, Any]] = []
        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "ENDBLK":
                # Skip ENDBLK attributes
                self._skip_to_next_entity(tokens)
                break
            if code == 0:
                entity_type = str(value)
                entity = self._parse_entity(entity_type, tokens)
                entities.append(entity)

        block["entities"] = entities
        return block

    # -----------------------------------------------------------------
    # ENTITIES
    # -----------------------------------------------------------------

    def _parse_entities(self, tokens: _TokenStream) -> list[dict[str, Any]]:
        entities: list[dict[str, Any]] = []

        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "ENDSEC":
                break
            if code == 0:
                entity_type = str(value)
                entity = self._parse_entity(entity_type, tokens)
                entities.append(entity)

        return entities

    # -----------------------------------------------------------------
    # OBJECTS
    # -----------------------------------------------------------------

    def _parse_objects(self, tokens: _TokenStream) -> list[dict[str, Any]]:
        objects: list[dict[str, Any]] = []

        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "ENDSEC":
                break
            if code == 0:
                obj_type = str(value)
                obj = self._parse_generic_object(obj_type, tokens)
                objects.append(obj)

        return objects

    def _parse_generic_object(self, obj_type: str, tokens: _TokenStream) -> dict[str, Any]:
        obj: dict[str, Any] = {"type": obj_type}
        while True:
            tok = tokens.peek()
            if tok is None:
                break
            code, value = tok
            if code == 0:
                break
            tokens.next()
            if code == 5:
                obj["handle"] = str(value)
            elif code == 2:
                obj["name"] = str(value)
            elif code == 330:
                obj["ownerHandle"] = str(value)
            elif code == 100:
                obj.setdefault("subclasses", []).append(str(value))
            elif code == 3:
                obj.setdefault("entries", []).append(str(value))
            elif code == 350:
                obj.setdefault("entryHandles", []).append(str(value))
            else:
                obj[code] = value
        return obj

    # -----------------------------------------------------------------
    # Single entity parser
    # -----------------------------------------------------------------

    def _parse_entity(self, entity_type: str, tokens: _TokenStream) -> dict[str, Any]:
        dispatch = {
            "LINE": self._parse_line,
            "POINT": self._parse_point,
            "CIRCLE": self._parse_circle,
            "ARC": self._parse_arc,
            "ELLIPSE": self._parse_ellipse,
            "SPLINE": self._parse_spline,
            "LWPOLYLINE": self._parse_lwpolyline,
            "POLYLINE": self._parse_polyline,
            "TEXT": self._parse_text,
            "MTEXT": self._parse_mtext,
            "DIMENSION": self._parse_dimension,
            "LEADER": self._parse_leader,
            "HATCH": self._parse_hatch,
            "INSERT": self._parse_insert,
            "ATTDEF": self._parse_attdef,
            "ATTRIB": self._parse_attrib,
            "SOLID": self._parse_solid_trace,
            "TRACE": self._parse_solid_trace,
            "3DFACE": self._parse_3dface,
            "VIEWPORT": self._parse_viewport,
            "XLINE": self._parse_xline_ray,
            "RAY": self._parse_xline_ray,
            "IMAGE": self._parse_image,
            "WIPEOUT": self._parse_wipeout,
            "TABLE": self._parse_table_entity,
            "3DSOLID": self._parse_acis,
            "BODY": self._parse_acis,
            "REGION": self._parse_acis,
            "SURFACE": self._parse_acis,
            "MESH": self._parse_mesh,
        }
        handler = dispatch.get(entity_type)
        if handler is not None:
            entity = handler(entity_type, tokens)
        else:
            entity = self._parse_generic_entity(entity_type, tokens)
        entity["type"] = entity_type
        return entity

    # --- Common property extraction ---

    @staticmethod
    def _apply_common(entity: dict, code: int, value: DxfValue) -> bool:
        """Apply common entity group codes.  Return True if consumed."""
        if code == 5:
            entity["handle"] = str(value)
            return True
        if code == 8:
            entity["layer"] = str(value)
            return True
        if code == 6:
            entity["linetype"] = str(value)
            return True
        if code == 62:
            entity["color"] = int(value)
            return True
        if code == 370:
            entity["lineweight"] = int(value)
            return True
        if code == 420:
            entity["trueColor"] = int(value)
            return True
        if code == 440:
            entity["transparency"] = int(value)
            return True
        if code == 60:
            entity["visibility"] = int(value)
            return True
        if code == 67:
            entity["paperSpace"] = int(value)
            return True
        if code == 210:
            entity.setdefault("extrusion", [0.0, 0.0, 1.0])[0] = float(value)
            return True
        if code == 220:
            entity.setdefault("extrusion", [0.0, 0.0, 1.0])[1] = float(value)
            return True
        if code == 230:
            entity.setdefault("extrusion", [0.0, 0.0, 1.0])[2] = float(value)
            return True
        if code == 100:
            return True  # subclass marker
        if code == 330:
            entity["ownerHandle"] = str(value)
            return True
        if code == 102:
            return True  # control string
        return False

    # --- Collect raw codes until next entity boundary ---

    def _collect_codes(self, tokens: _TokenStream) -> list[tuple[int, DxfValue]]:
        pairs: list[tuple[int, DxfValue]] = []
        while True:
            tok = tokens.peek()
            if tok is None:
                break
            code, value = tok
            if code == 0:
                break
            tokens.next()
            pairs.append((code, value))
        return pairs

    # --- LINE ---
    def _parse_line(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        sx = sy = sz = 0.0
        ex = ey = ez = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                sx = float(value)
            elif code == 20:
                sy = float(value)
            elif code == 30:
                sz = float(value)
            elif code == 11:
                ex = float(value)
            elif code == 21:
                ey = float(value)
            elif code == 31:
                ez = float(value)
        e["start"] = [sx, sy, sz]
        e["end"] = [ex, ey, ez]
        return e

    # --- POINT ---
    def _parse_point(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        px = py = pz = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                px = float(value)
            elif code == 20:
                py = float(value)
            elif code == 30:
                pz = float(value)
        e["position"] = [px, py, pz]
        return e

    # --- CIRCLE ---
    def _parse_circle(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        cx = cy = cz = 0.0
        r = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                cx = float(value)
            elif code == 20:
                cy = float(value)
            elif code == 30:
                cz = float(value)
            elif code == 40:
                r = float(value)
        e["center"] = [cx, cy, cz]
        e["radius"] = r
        return e

    # --- ARC ---
    def _parse_arc(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        cx = cy = cz = 0.0
        r = 0.0
        sa = ea = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                cx = float(value)
            elif code == 20:
                cy = float(value)
            elif code == 30:
                cz = float(value)
            elif code == 40:
                r = float(value)
            elif code == 50:
                sa = float(value)
            elif code == 51:
                ea = float(value)
        e["center"] = [cx, cy, cz]
        e["radius"] = r
        e["startAngle"] = sa
        e["endAngle"] = ea
        return e

    # --- ELLIPSE ---
    def _parse_ellipse(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        cx = cy = cz = 0.0
        mx = my = mz = 0.0
        ratio = 1.0
        sp = 0.0
        ep = 6.283185307179586
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                cx = float(value)
            elif code == 20:
                cy = float(value)
            elif code == 30:
                cz = float(value)
            elif code == 11:
                mx = float(value)
            elif code == 21:
                my = float(value)
            elif code == 31:
                mz = float(value)
            elif code == 40:
                ratio = float(value)
            elif code == 41:
                sp = float(value)
            elif code == 42:
                ep = float(value)
        e["center"] = [cx, cy, cz]
        e["majorAxisEndpoint"] = [mx, my, mz]
        e["minorAxisRatio"] = ratio
        e["startParam"] = sp
        e["endParam"] = ep
        return e

    # --- SPLINE ---
    def _parse_spline(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        degree = 3
        knots: list[float] = []
        ctrl_pts: list[list[float]] = []
        fit_pts: list[list[float]] = []
        weights: list[float] = []
        flags = 0
        _cx = _cy = _cz = 0.0
        _fx = _fy = _fz = 0.0
        ctrl_count = 0
        fit_count = 0
        in_ctrl = False
        in_fit = False

        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 70:
                flags = int(value)
            elif code == 71:
                degree = int(value)
            elif code == 72:
                pass  # num knots
            elif code == 73:
                ctrl_count = int(value)
            elif code == 74:
                fit_count = int(value)
            elif code == 40:
                knots.append(float(value))
            elif code == 41:
                weights.append(float(value))
            elif code == 10:
                if in_ctrl and _cx != 0.0 or in_ctrl:
                    ctrl_pts.append([_cx, _cy, _cz])
                _cx = float(value)
                _cy = _cz = 0.0
                in_ctrl = True
                in_fit = False
            elif code == 20:
                if in_ctrl:
                    _cy = float(value)
                elif in_fit:
                    _fy = float(value)
            elif code == 30:
                if in_ctrl:
                    _cz = float(value)
                elif in_fit:
                    _fz = float(value)
            elif code == 11:
                if in_fit:
                    fit_pts.append([_fx, _fy, _fz])
                _fx = float(value)
                _fy = _fz = 0.0
                in_fit = True
                in_ctrl = False
            elif code == 21:
                if in_fit:
                    _fy = float(value)
            elif code == 31:
                if in_fit:
                    _fz = float(value)

        # Flush last point
        if in_ctrl:
            ctrl_pts.append([_cx, _cy, _cz])
        if in_fit:
            fit_pts.append([_fx, _fy, _fz])

        e["degree"] = degree
        e["closed"] = bool(flags & 1)
        if knots:
            e["knots"] = knots
        if ctrl_pts:
            e["controlPoints"] = ctrl_pts
        if fit_pts:
            e["fitPoints"] = fit_pts
        if weights and any(w != 1.0 for w in weights):
            e["weights"] = weights
            e["rational"] = True
        return e

    # --- LWPOLYLINE ---
    def _parse_lwpolyline(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        vertices: list[dict[str, Any]] = []
        current_v: dict[str, Any] | None = None
        elevation = 0.0

        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 90:
                pass  # vertex count
            elif code == 70:
                flags = int(value)
                e["closed"] = bool(flags & 1)
            elif code == 38:
                elevation = float(value)
            elif code == 10:
                if current_v is not None:
                    vertices.append(current_v)
                current_v = {"x": float(value), "y": 0.0}
            elif code == 20:
                if current_v is not None:
                    current_v["y"] = float(value)
            elif code == 40:
                if current_v is not None:
                    sw = float(value)
                    if sw != 0:
                        current_v["startWidth"] = sw
            elif code == 41:
                if current_v is not None:
                    ew = float(value)
                    if ew != 0:
                        current_v["endWidth"] = ew
            elif code == 42:
                if current_v is not None:
                    b = float(value)
                    if b != 0:
                        current_v["bulge"] = b

        if current_v is not None:
            vertices.append(current_v)

        e["vertices"] = vertices
        if elevation != 0.0:
            e["elevation"] = elevation
        return e

    # --- POLYLINE ---
    def _parse_polyline(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        flags = 0

        # Read POLYLINE header codes
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 70:
                flags = int(value)

        is_3d = bool(flags & 8) or bool(flags & 16)
        e["closed"] = bool(flags & 1)
        e["flags"] = flags

        # Now read VERTEX entities until SEQEND
        vertices: list[Any] = []
        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "SEQEND":
                self._skip_to_next_entity(tokens)
                break
            if code == 0 and str(value) == "VERTEX":
                vtx = self._parse_vertex(tokens)
                vertices.append(vtx)

        if is_3d:
            e["type"] = "POLYLINE3D"
            e["vertices"] = [[v.get("x", 0), v.get("y", 0), v.get("z", 0)] for v in vertices]
        else:
            e["type"] = "POLYLINE2D"
            result_verts = []
            for v in vertices:
                vd: dict[str, Any] = {"position": [v.get("x", 0), v.get("y", 0), v.get("z", 0)]}
                b = v.get("bulge", 0)
                if b:
                    vd["bulge"] = b
                result_verts.append(vd)
            e["vertices"] = result_verts
        return e

    def _parse_vertex(self, tokens: _TokenStream) -> dict[str, Any]:
        v: dict[str, Any] = {"x": 0.0, "y": 0.0, "z": 0.0}
        for code, value in self._collect_codes(tokens):
            if code == 10:
                v["x"] = float(value)
            elif code == 20:
                v["y"] = float(value)
            elif code == 30:
                v["z"] = float(value)
            elif code == 42:
                v["bulge"] = float(value)
            elif code == 70:
                v["flags"] = int(value)
            elif code == 40:
                v["startWidth"] = float(value)
            elif code == 41:
                v["endWidth"] = float(value)
        return v

    # --- TEXT ---
    def _parse_text(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        ax = ay = az = 0.0
        has_align = False
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 1:
                e["text"] = str(value)
            elif code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 11:
                ax = float(value)
                has_align = True
            elif code == 21:
                ay = float(value)
            elif code == 31:
                az = float(value)
            elif code == 40:
                e["height"] = float(value)
            elif code == 50:
                e["rotation"] = float(value)
            elif code == 7:
                e["style"] = str(value)
            elif code == 72:
                e["horizontalAlignment"] = int(value)
            elif code == 73:
                e["verticalAlignment"] = int(value)
            elif code == 71:
                e["textGenerationFlags"] = int(value)
            elif code == 41:
                e["widthFactor"] = float(value)
            elif code == 51:
                e["obliqueAngle"] = float(value)
        e["insertionPoint"] = [ix, iy, iz]
        if has_align:
            e["alignmentPoint"] = [ax, ay, az]
        return e

    # --- MTEXT ---
    def _parse_mtext(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        text_parts: list[str] = []
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 1:
                text_parts.append(str(value))
            elif code == 3:
                text_parts.append(str(value))
            elif code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 40:
                e["height"] = float(value)
            elif code == 41:
                e["width"] = float(value)
            elif code == 50:
                e["rotation"] = float(value)
            elif code == 7:
                e["style"] = str(value)
            elif code == 71:
                e["attachment"] = int(value)
            elif code == 72:
                e["drawingDirection"] = int(value)
            elif code == 44:
                e["lineSpacingFactor"] = float(value)
            elif code == 73:
                e["lineSpacingStyle"] = int(value)
        e["insertionPoint"] = [ix, iy, iz]
        e["text"] = "".join(text_parts)
        return e

    # --- DIMENSION ---
    def _parse_dimension(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        dp_x = dp_y = dp_z = 0.0
        mp_x = mp_y = mp_z = 0.0
        d1_x = d1_y = d1_z = 0.0
        d2_x = d2_y = d2_z = 0.0
        d3_x = d3_y = d3_z = 0.0
        d4_x = d4_y = d4_z = 0.0
        dimtype = 0

        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 2:
                e["blockName"] = str(value)
            elif code == 3:
                e["dimStyle"] = str(value)
            elif code == 1:
                e["overrideText"] = str(value)
            elif code == 70:
                dimtype = int(value)
            elif code == 53:
                e["rotationAngle"] = float(value)
            elif code == 10:
                dp_x = float(value)
            elif code == 20:
                dp_y = float(value)
            elif code == 30:
                dp_z = float(value)
            elif code == 11:
                mp_x = float(value)
            elif code == 21:
                mp_y = float(value)
            elif code == 31:
                mp_z = float(value)
            elif code == 13:
                d1_x = float(value)
            elif code == 23:
                d1_y = float(value)
            elif code == 33:
                d1_z = float(value)
            elif code == 14:
                d2_x = float(value)
            elif code == 24:
                d2_y = float(value)
            elif code == 34:
                d2_z = float(value)
            elif code == 15:
                d3_x = float(value)
            elif code == 25:
                d3_y = float(value)
            elif code == 35:
                d3_z = float(value)
            elif code == 16:
                d4_x = float(value)
            elif code == 26:
                d4_y = float(value)
            elif code == 36:
                d4_z = float(value)

        subtype = dimtype & 0x0F
        type_map = {
            0: "DIMENSION_LINEAR",
            1: "DIMENSION_ALIGNED",
            2: "DIMENSION_ANGULAR",
            3: "DIMENSION_DIAMETER",
            4: "DIMENSION_RADIUS",
            5: "DIMENSION_ANGULAR3P",
            6: "DIMENSION_ORDINATE",
        }
        e["dimType"] = type_map.get(subtype, "DIMENSION_LINEAR")
        e["dimTypeRaw"] = dimtype

        e["dimLinePoint"] = [dp_x, dp_y, dp_z]
        e["textPosition"] = [mp_x, mp_y, mp_z]
        e["defPoint1"] = [d1_x, d1_y, d1_z]
        e["defPoint2"] = [d2_x, d2_y, d2_z]
        if subtype in (2, 5):
            e["defPoint3"] = [d3_x, d3_y, d3_z]
            e["defPoint4"] = [d4_x, d4_y, d4_z]
        return e

    # --- LEADER ---
    def _parse_leader(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        vertices: list[list[float]] = []
        vx = vy = vz = 0.0
        have_vertex = False

        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 76:
                pass  # num vertices
            elif code == 71:
                e["hasArrowhead"] = bool(int(value))
            elif code == 72:
                e["pathType"] = "spline" if int(value) == 1 else "straight"
            elif code == 73:
                e["creationFlag"] = int(value)
            elif code == 74:
                e["hooklineDirection"] = int(value)
            elif code == 75:
                e["hasHookline"] = bool(int(value))
            elif code == 40:
                e["textHeight"] = float(value)
            elif code == 41:
                e["textWidth"] = float(value)
            elif code == 10:
                if have_vertex:
                    vertices.append([vx, vy, vz])
                vx = float(value)
                vy = vz = 0.0
                have_vertex = True
            elif code == 20:
                vy = float(value)
            elif code == 30:
                vz = float(value)

        if have_vertex:
            vertices.append([vx, vy, vz])
        e["vertices"] = vertices
        return e

    # --- HATCH ---
    def _parse_hatch(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        boundaries: list[dict[str, Any]] = []

        codes = self._collect_codes(tokens)
        idx = 0
        n = len(codes)

        while idx < n:
            code, value = codes[idx]
            idx += 1

            if self._apply_common(e, code, value):
                continue
            if code == 2:
                e["patternName"] = str(value)
            elif code == 70:
                e["solid"] = int(value) == 1
            elif code == 71:
                e["associative"] = int(value) == 1
            elif code == 91:
                num_boundaries = int(value)
            elif code == 92:
                boundary_flags = int(value)
                boundary, idx = self._parse_hatch_boundary(codes, idx, boundary_flags)
                boundaries.append(boundary)
            elif code == 75:
                e["hatchStyle"] = int(value)
            elif code == 76:
                e["patternType"] = int(value)
            elif code == 52:
                e["patternAngle"] = float(value)
            elif code == 41:
                e["patternScale"] = float(value)
            elif code == 47:
                e["pixelSize"] = float(value)
            elif code == 98:
                pass  # num seed points

        e["boundaries"] = boundaries
        return e

    def _parse_hatch_boundary(self, codes: list, idx: int, flags: int) -> tuple[dict[str, Any], int]:
        boundary: dict[str, Any] = {"flags": flags}
        n = len(codes)
        is_polyline = bool(flags & 2)

        if is_polyline:
            # Polyline boundary
            has_bulge = False
            is_closed = False
            vertices: list[dict[str, Any]] = []
            vx = vy = 0.0
            bulge = 0.0

            if idx < n and codes[idx][0] == 72:
                has_bulge = bool(int(codes[idx][1]))
                idx += 1
            if idx < n and codes[idx][0] == 73:
                is_closed = bool(int(codes[idx][1]))
                idx += 1
            num_verts = 0
            if idx < n and codes[idx][0] == 93:
                num_verts = int(codes[idx][1])
                idx += 1

            for _ in range(num_verts):
                vx = vy = 0.0
                bulge = 0.0
                while idx < n:
                    c, v = codes[idx]
                    if c == 10:
                        vx = float(v)
                        idx += 1
                    elif c == 20:
                        vy = float(v)
                        idx += 1
                    elif c == 42:
                        bulge = float(v)
                        idx += 1
                    else:
                        break
                vtx: dict[str, Any] = {"x": vx, "y": vy}
                if bulge != 0:
                    vtx["bulge"] = bulge
                vertices.append(vtx)

            boundary["type"] = "polyline"
            boundary["polyline"] = {"vertices": vertices, "closed": is_closed}
        else:
            # Edge boundary
            num_edges = 0
            if idx < n and codes[idx][0] == 93:
                num_edges = int(codes[idx][1])
                idx += 1

            edges: list[dict[str, Any]] = []
            for _ in range(num_edges):
                if idx >= n:
                    break
                if codes[idx][0] == 72:
                    edge_type = int(codes[idx][1])
                    idx += 1
                    edge, idx = self._parse_hatch_edge(codes, idx, edge_type)
                    edges.append(edge)

            boundary["type"] = "edges"
            boundary["edges"] = edges

        return boundary, idx

    @staticmethod
    def _parse_hatch_edge(codes: list, idx: int, edge_type: int) -> tuple[dict[str, Any], int]:
        edge: dict[str, Any] = {}
        n = len(codes)

        if edge_type == 1:  # Line
            edge["edgeType"] = "line"
            sx = sy = ex = ey = 0.0
            while idx < n:
                c, v = codes[idx]
                if c == 10:
                    sx = float(v); idx += 1
                elif c == 20:
                    sy = float(v); idx += 1
                elif c == 11:
                    ex = float(v); idx += 1
                elif c == 21:
                    ey = float(v); idx += 1
                else:
                    break
            edge["start"] = [sx, sy]
            edge["end"] = [ex, ey]

        elif edge_type == 2:  # Arc
            edge["edgeType"] = "arc"
            cx = cy = r = sa = ea = 0.0
            ccw = True
            while idx < n:
                c, v = codes[idx]
                if c == 10:
                    cx = float(v); idx += 1
                elif c == 20:
                    cy = float(v); idx += 1
                elif c == 40:
                    r = float(v); idx += 1
                elif c == 50:
                    sa = float(v); idx += 1
                elif c == 51:
                    ea = float(v); idx += 1
                elif c == 73:
                    ccw = bool(int(v)); idx += 1
                else:
                    break
            edge["center"] = [cx, cy]
            edge["radius"] = r
            edge["startAngle"] = sa
            edge["endAngle"] = ea
            edge["counterClockwise"] = ccw

        elif edge_type == 3:  # Ellipse
            edge["edgeType"] = "ellipse"
            cx = cy = mx = my = ratio = sa = ea = 0.0
            ccw = True
            while idx < n:
                c, v = codes[idx]
                if c == 10:
                    cx = float(v); idx += 1
                elif c == 20:
                    cy = float(v); idx += 1
                elif c == 11:
                    mx = float(v); idx += 1
                elif c == 21:
                    my = float(v); idx += 1
                elif c == 40:
                    ratio = float(v); idx += 1
                elif c == 50:
                    sa = float(v); idx += 1
                elif c == 51:
                    ea = float(v); idx += 1
                elif c == 73:
                    ccw = bool(int(v)); idx += 1
                else:
                    break
            edge["center"] = [cx, cy]
            edge["majorAxis"] = [mx, my]
            edge["minorAxisRatio"] = ratio
            edge["startAngle"] = sa
            edge["endAngle"] = ea
            edge["counterClockwise"] = ccw

        elif edge_type == 4:  # Spline
            edge["edgeType"] = "spline"
            degree = 3
            rational = False
            periodic = False
            knots: list[float] = []
            ctrl_pts: list[list[float]] = []
            num_knots = num_ctrl = 0
            while idx < n:
                c, v = codes[idx]
                if c == 94:
                    degree = int(v); idx += 1
                elif c == 73:
                    rational = bool(int(v)); idx += 1
                elif c == 74:
                    periodic = bool(int(v)); idx += 1
                elif c == 95:
                    num_knots = int(v); idx += 1
                elif c == 96:
                    num_ctrl = int(v); idx += 1
                elif c == 40:
                    knots.append(float(v)); idx += 1
                elif c == 10:
                    px = float(v); idx += 1
                    py = 0.0
                    if idx < n and codes[idx][0] == 20:
                        py = float(codes[idx][1]); idx += 1
                    ctrl_pts.append([px, py])
                else:
                    break
            edge["degree"] = degree
            edge["knots"] = knots
            edge["controlPoints"] = ctrl_pts

        return edge, idx

    # --- INSERT ---
    def _parse_insert(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        has_attribs = False

        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 2:
                e["blockName"] = str(value)
            elif code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 41:
                e["scaleX"] = float(value)
            elif code == 42:
                e["scaleY"] = float(value)
            elif code == 43:
                e["scaleZ"] = float(value)
            elif code == 44:
                e["columnSpacing"] = float(value)
            elif code == 45:
                e["rowSpacing"] = float(value)
            elif code == 50:
                e["rotation"] = float(value)
            elif code == 66:
                has_attribs = bool(int(value))
            elif code == 70:
                e["columnCount"] = int(value)
            elif code == 71:
                e["rowCount"] = int(value)

        e["insertionPoint"] = [ix, iy, iz]

        # If attribs-follow flag set, read ATTRIBs until SEQEND
        if has_attribs:
            attribs: list[dict[str, Any]] = []
            while True:
                tok = tokens.next()
                if tok is None:
                    break
                code, value = tok
                if code == 0 and str(value) == "SEQEND":
                    self._skip_to_next_entity(tokens)
                    break
                if code == 0 and str(value) == "ATTRIB":
                    attr = self._parse_attrib("ATTRIB", tokens)
                    attr["type"] = "ATTRIB"
                    attribs.append(attr)
            if attribs:
                e["attributes"] = attribs

        return e

    # --- ATTDEF ---
    def _parse_attdef(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 1:
                e["defaultValue"] = str(value)
            elif code == 2:
                e["tag"] = str(value)
            elif code == 3:
                e["prompt"] = str(value)
            elif code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 40:
                e["height"] = float(value)
            elif code == 50:
                e["rotation"] = float(value)
            elif code == 7:
                e["style"] = str(value)
            elif code == 70:
                e["flags"] = int(value)
            elif code == 72:
                e["horizontalAlignment"] = int(value)
            elif code == 74:
                e["verticalAlignment"] = int(value)
        e["insertionPoint"] = [ix, iy, iz]
        return e

    # --- ATTRIB ---
    def _parse_attrib(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 1:
                e["value"] = str(value)
            elif code == 2:
                e["tag"] = str(value)
            elif code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 40:
                e["height"] = float(value)
            elif code == 50:
                e["rotation"] = float(value)
            elif code == 7:
                e["style"] = str(value)
            elif code == 70:
                e["flags"] = int(value)
            elif code == 72:
                e["horizontalAlignment"] = int(value)
            elif code == 74:
                e["verticalAlignment"] = int(value)
        e["insertionPoint"] = [ix, iy, iz]
        return e

    # --- SOLID / TRACE ---
    def _parse_solid_trace(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        pts = [[0.0, 0.0, 0.0] for _ in range(4)]
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                pts[0][0] = float(value)
            elif code == 20:
                pts[0][1] = float(value)
            elif code == 30:
                pts[0][2] = float(value)
            elif code == 11:
                pts[1][0] = float(value)
            elif code == 21:
                pts[1][1] = float(value)
            elif code == 31:
                pts[1][2] = float(value)
            elif code == 12:
                pts[2][0] = float(value)
            elif code == 22:
                pts[2][1] = float(value)
            elif code == 32:
                pts[2][2] = float(value)
            elif code == 13:
                pts[3][0] = float(value)
            elif code == 23:
                pts[3][1] = float(value)
            elif code == 33:
                pts[3][2] = float(value)
        for i in range(4):
            e[f"point{i + 1}"] = pts[i]
        return e

    # --- 3DFACE ---
    def _parse_3dface(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        pts = [[0.0, 0.0, 0.0] for _ in range(4)]
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                pts[0][0] = float(value)
            elif code == 20:
                pts[0][1] = float(value)
            elif code == 30:
                pts[0][2] = float(value)
            elif code == 11:
                pts[1][0] = float(value)
            elif code == 21:
                pts[1][1] = float(value)
            elif code == 31:
                pts[1][2] = float(value)
            elif code == 12:
                pts[2][0] = float(value)
            elif code == 22:
                pts[2][1] = float(value)
            elif code == 32:
                pts[2][2] = float(value)
            elif code == 13:
                pts[3][0] = float(value)
            elif code == 23:
                pts[3][1] = float(value)
            elif code == 33:
                pts[3][2] = float(value)
            elif code == 70:
                e["invisibleEdges"] = int(value)
        for i in range(4):
            e[f"point{i + 1}"] = pts[i]
        return e

    # --- VIEWPORT ---
    def _parse_viewport(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        cx = cy = cz = 0.0
        vcx = vcy = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                cx = float(value)
            elif code == 20:
                cy = float(value)
            elif code == 30:
                cz = float(value)
            elif code == 40:
                e["width"] = float(value)
            elif code == 41:
                e["height"] = float(value)
            elif code == 69:
                e["id"] = int(value)
            elif code == 12:
                vcx = float(value)
            elif code == 22:
                vcy = float(value)
            elif code == 45:
                e["viewHeight"] = float(value)
            elif code == 13:
                e.setdefault("snapBase", [0.0, 0.0])
                e["snapBase"][0] = float(value)
            elif code == 23:
                e.setdefault("snapBase", [0.0, 0.0])
                e["snapBase"][1] = float(value)
            elif code == 14:
                e.setdefault("snapSpacing", [0.0, 0.0])
                e["snapSpacing"][0] = float(value)
            elif code == 24:
                e.setdefault("snapSpacing", [0.0, 0.0])
                e["snapSpacing"][1] = float(value)
            elif code == 51:
                e["snapAngle"] = float(value)
            elif code == 72:
                e["circleZoomPercent"] = int(value)
            elif code == 90:
                e["statusFlags"] = int(value)
            elif code == 110:
                e.setdefault("ucsOrigin", [0.0, 0.0, 0.0])[0] = float(value)
            elif code == 120:
                e.setdefault("ucsOrigin", [0.0, 0.0, 0.0])[1] = float(value)
            elif code == 130:
                e.setdefault("ucsOrigin", [0.0, 0.0, 0.0])[2] = float(value)
        e["center"] = [cx, cy, cz]
        if vcx != 0 or vcy != 0:
            e["viewCenter"] = [vcx, vcy]
        return e

    # --- XLINE / RAY ---
    def _parse_xline_ray(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ox = oy = oz = 0.0
        dx = dy = dz = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                ox = float(value)
            elif code == 20:
                oy = float(value)
            elif code == 30:
                oz = float(value)
            elif code == 11:
                dx = float(value)
            elif code == 21:
                dy = float(value)
            elif code == 31:
                dz = float(value)
        e["origin"] = [ox, oy, oz]
        e["direction"] = [dx, dy, dz]
        return e

    # --- IMAGE ---
    def _parse_image(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        ux = uy = uz = 0.0
        vx = vy = vz = 0.0
        sx = sy = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 11:
                ux = float(value)
            elif code == 21:
                uy = float(value)
            elif code == 31:
                uz = float(value)
            elif code == 12:
                vx = float(value)
            elif code == 22:
                vy = float(value)
            elif code == 32:
                vz = float(value)
            elif code == 13:
                sx = float(value)
            elif code == 23:
                sy = float(value)
            elif code == 340:
                e["imageDefHandle"] = str(value)
            elif code == 70:
                e["displayFlags"] = int(value)
            elif code == 280:
                e["clippingState"] = int(value)
            elif code == 281:
                e["brightness"] = int(value)
            elif code == 282:
                e["contrast"] = int(value)
            elif code == 283:
                e["fade"] = int(value)
        e["insertionPoint"] = [ix, iy, iz]
        e["uVector"] = [ux, uy, uz]
        e["vVector"] = [vx, vy, vz]
        e["size"] = [sx, sy]
        return e

    # --- WIPEOUT ---
    def _parse_wipeout(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        ux = uy = uz = 0.0
        vx = vy = vz = 0.0
        clip_verts: list[list[float]] = []
        cv_x = cv_y = 0.0
        have_cv = False

        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 11:
                ux = float(value)
            elif code == 21:
                uy = float(value)
            elif code == 31:
                uz = float(value)
            elif code == 12:
                vx = float(value)
            elif code == 22:
                vy = float(value)
            elif code == 32:
                vz = float(value)
            elif code == 14:
                if have_cv:
                    clip_verts.append([cv_x, cv_y])
                cv_x = float(value)
                cv_y = 0.0
                have_cv = True
            elif code == 24:
                cv_y = float(value)
            elif code == 71:
                e["clipType"] = int(value)
            elif code == 91:
                pass  # num clip verts

        if have_cv:
            clip_verts.append([cv_x, cv_y])

        e["insertionPoint"] = [ix, iy, iz]
        e["uVector"] = [ux, uy, uz]
        e["vVector"] = [vx, vy, vz]
        if clip_verts:
            e["clipVertices"] = clip_verts
        return e

    # --- TABLE entity ---
    def _parse_table_entity(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        ix = iy = iz = 0.0
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 2:
                e["blockName"] = str(value)
            elif code == 10:
                ix = float(value)
            elif code == 20:
                iy = float(value)
            elif code == 30:
                iz = float(value)
            elif code == 41:
                e["horizontalDirection"] = float(value)
            elif code == 70:
                e["tableFlags"] = int(value)
            elif code == 90:
                e["rowCount"] = int(value)
            elif code == 91:
                e["columnCount"] = int(value)
        e["insertionPoint"] = [ix, iy, iz]
        return e

    # --- ACIS entities (3DSOLID, BODY, REGION, SURFACE) ---
    def _parse_acis(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        acis_lines: list[str] = []
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            if code == 1:
                acis_lines.append(str(value))
            elif code == 3:
                acis_lines.append(str(value))
            elif code == 70:
                e["modelerVersion"] = int(value)
        if acis_lines:
            e["acisData"] = "\n".join(acis_lines)
        return e

    # --- MESH ---
    def _parse_mesh(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        vertices: list[list[float]] = []
        faces: list[list[int]] = []
        vx = vy = vz = 0.0
        have_v = False

        # Collect all codes
        codes = self._collect_codes(tokens)
        idx = 0
        n = len(codes)
        reading_vertices = False
        reading_faces = False
        num_verts = 0
        num_faces = 0
        face_data: list[int] = []

        while idx < n:
            code, value = codes[idx]
            idx += 1

            if self._apply_common(e, code, value):
                continue
            if code == 71:
                e["version"] = int(value)
            elif code == 72:
                e["subdivisionLevel"] = int(value)
            elif code == 91:
                # Could be vertex count or face data count
                if not reading_vertices and not reading_faces:
                    pass  # overridden flag
            elif code == 92:
                num_verts = int(value)
                reading_vertices = True
                reading_faces = False
            elif code == 93:
                num_faces = int(value)
                reading_faces = True
                reading_vertices = False
            elif code == 10 and reading_vertices:
                if have_v:
                    vertices.append([vx, vy, vz])
                vx = float(value)
                vy = vz = 0.0
                have_v = True
            elif code == 20 and reading_vertices:
                vy = float(value)
            elif code == 30 and reading_vertices:
                vz = float(value)
            elif code == 90:
                if reading_faces:
                    face_data.append(int(value))

        if have_v:
            vertices.append([vx, vy, vz])

        # Parse face data: each face is preceded by its vertex count
        fi = 0
        while fi < len(face_data):
            count = face_data[fi]
            fi += 1
            face_indices = []
            for _ in range(count):
                if fi < len(face_data):
                    face_indices.append(face_data[fi])
                    fi += 1
            faces.append(face_indices)

        e["vertices"] = vertices
        e["faces"] = faces
        return e

    # --- Generic fallback ---
    def _parse_generic_entity(self, etype: str, tokens: _TokenStream) -> dict[str, Any]:
        e: dict[str, Any] = {}
        for code, value in self._collect_codes(tokens):
            if self._apply_common(e, code, value):
                continue
            e[code] = value
        return e

    # -----------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------

    def _skip_section(self, tokens: _TokenStream) -> None:
        while True:
            tok = tokens.next()
            if tok is None:
                break
            code, value = tok
            if code == 0 and str(value) == "ENDSEC":
                break

    def _skip_to_next_entity(self, tokens: _TokenStream) -> None:
        """Consume non-entity codes (e.g., after ENDBLK / SEQEND)."""
        while True:
            tok = tokens.peek()
            if tok is None:
                break
            code, _ = tok
            if code == 0:
                break
            tokens.next()
