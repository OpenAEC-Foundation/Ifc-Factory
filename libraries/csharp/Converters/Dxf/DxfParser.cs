namespace Ifcx.Converters.Dxf;

/// <summary>
/// In-memory representation of a parsed DXF file.
/// </summary>
public sealed class DxfFile
{
    public Dictionary<string, object?> Header { get; set; } = new();
    public Dictionary<string, List<Dictionary<string, object?>>> Tables { get; set; } = new();
    public Dictionary<string, Dictionary<string, object?>> Blocks { get; set; } = new();
    public List<Dictionary<string, object?>> Entities { get; set; } = [];
    public List<Dictionary<string, object?>> Objects { get; set; } = [];
}

/// <summary>
/// Peekable token stream wrapping an IEnumerator of DxfToken.
/// </summary>
internal sealed class TokenStream
{
    private readonly IEnumerator<DxfToken> _iter;
    private readonly List<DxfToken> _buffer = [];
    private bool _done;

    public TokenStream(IEnumerable<DxfToken> tokens)
    {
        _iter = tokens.GetEnumerator();
    }

    public DxfToken? Peek()
    {
        if (_buffer.Count > 0) return _buffer[0];
        if (_done) return null;
        if (_iter.MoveNext())
        {
            _buffer.Add(_iter.Current);
            return _iter.Current;
        }
        _done = true;
        return null;
    }

    public DxfToken? Next()
    {
        if (_buffer.Count > 0)
        {
            var tok = _buffer[0];
            _buffer.RemoveAt(0);
            return tok;
        }
        if (_done) return null;
        if (_iter.MoveNext()) return _iter.Current;
        _done = true;
        return null;
    }

    public void PushBack(DxfToken token)
    {
        _buffer.Insert(0, token);
    }
}

/// <summary>
/// Full DXF ASCII parser. Parses HEADER, TABLES, BLOCKS, ENTITIES, and OBJECTS sections.
/// Supports all major entity types. Built from scratch with no external dependencies.
/// </summary>
public sealed class DxfParser
{
    public DxfFile Parse(string content)
    {
        var tokens = new TokenStream(DxfTokenizer.Tokenize(content));
        var result = new DxfFile();

        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            var (code, value) = tok.Value;
            if (code == 0 && value is string s)
            {
                if (s == "EOF") break;
                if (s == "SECTION")
                {
                    var nameTok = tokens.Next();
                    if (nameTok is null) break;
                    var sectionName = nameTok.Value.StringValue.ToUpperInvariant();

                    switch (sectionName)
                    {
                        case "HEADER": result.Header = ParseHeader(tokens); break;
                        case "TABLES": result.Tables = ParseTables(tokens); break;
                        case "BLOCKS": result.Blocks = ParseBlocks(tokens); break;
                        case "ENTITIES": result.Entities = ParseEntities(tokens); break;
                        case "OBJECTS": result.Objects = ParseObjects(tokens); break;
                        default: SkipSection(tokens); break;
                    }
                }
            }
        }

        return result;
    }

    // -----------------------------------------------------------------
    // HEADER
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ParseHeader(TokenStream tokens)
    {
        var header = new Dictionary<string, object?>();
        string? currentVar = null;
        var currentValues = new List<(int Code, object Value)>();

        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            var (code, value) = tok.Value;
            if (code == 0 && tok.Value.StringValue == "ENDSEC") break;
            if (code == 9)
            {
                if (currentVar is not null)
                    header[currentVar] = CollapseHeaderVar(currentValues);
                currentVar = tok.Value.StringValue;
                currentValues = [];
            }
            else
            {
                currentValues.Add((code, value));
            }
        }

        if (currentVar is not null)
            header[currentVar] = CollapseHeaderVar(currentValues);

        return header;
    }

    private static object? CollapseHeaderVar(List<(int Code, object Value)> pairs)
    {
        if (pairs.Count == 0) return null;
        if (pairs.Count == 1) return pairs[0].Value;

        var codes = pairs.Select(p => p.Code).ToHashSet();
        if (codes.Overlaps(new[] { 10, 20, 30 }))
        {
            double x = 0, y = 0, z = 0;
            foreach (var (c, v) in pairs)
            {
                if (c == 10) x = Convert.ToDouble(v);
                else if (c == 20) y = Convert.ToDouble(v);
                else if (c == 30) z = Convert.ToDouble(v);
            }
            return new List<double> { x, y, z };
        }

        return pairs.ToDictionary(p => p.Code.ToString(), p => p.Value);
    }

    // -----------------------------------------------------------------
    // TABLES
    // -----------------------------------------------------------------

    private Dictionary<string, List<Dictionary<string, object?>>> ParseTables(TokenStream tokens)
    {
        var tables = new Dictionary<string, List<Dictionary<string, object?>>>();

        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            var (code, value) = tok.Value;
            if (code == 0 && tok.Value.StringValue == "ENDSEC") break;
            if (code == 0 && tok.Value.StringValue == "TABLE")
            {
                var nameTok = tokens.Next();
                if (nameTok is null) break;
                var tableName = nameTok.Value.StringValue.ToUpperInvariant();
                var entries = ParseTableEntries(tokens, tableName);
                tables[tableName] = entries;
            }
        }

        return tables;
    }

    private List<Dictionary<string, object?>> ParseTableEntries(TokenStream tokens, string tableName)
    {
        var entries = new List<Dictionary<string, object?>>();

        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            var (code, value) = tok.Value;
            if (code == 0 && tok.Value.StringValue == "ENDTAB") break;
            if (code == 0)
            {
                var entryType = tok.Value.StringValue;
                var entry = ParseTableEntry(tokens, entryType, tableName);
                entry["_entry_type"] = entryType;
                entries.Add(entry);
            }
        }

        return entries;
    }

    private Dictionary<string, object?> ParseTableEntry(TokenStream tokens, string entryType, string tableName)
    {
        var entry = new Dictionary<string, object?>();
        var patternElements = new List<double>();

        while (true)
        {
            var tok = tokens.Peek();
            if (tok is null) break;
            if (tok.Value.Code == 0) break;
            tokens.Next();

            var (code, value) = tok.Value;

            switch (tableName)
            {
                case "LAYER": ApplyLayerCode(entry, code, value); break;
                case "LTYPE": ApplyLtypeCode(entry, code, value, patternElements); break;
                case "STYLE": ApplyStyleCode(entry, code, value); break;
                case "DIMSTYLE": ApplyDimstyleCode(entry, code, value); break;
                default: ApplyGenericTableCode(entry, code, value); break;
            }
        }

        if (patternElements.Count > 0)
            entry["pattern"] = patternElements;

        return entry;
    }

    // --- Layer ---
    private static void ApplyLayerCode(Dictionary<string, object?> entry, int code, object value)
    {
        switch (code)
        {
            case 2: entry["name"] = Convert.ToString(value); break;
            case 5: entry["handle"] = Convert.ToString(value); break;
            case 6: entry["linetype"] = Convert.ToString(value); break;
            case 62:
                var color = Convert.ToInt32(value);
                entry["color"] = Math.Abs(color);
                if (color < 0) entry["off"] = true;
                break;
            case 70:
                var flags = Convert.ToInt32(value);
                entry["flags"] = flags;
                entry["frozen"] = (flags & 1) != 0;
                entry["locked"] = (flags & 4) != 0;
                break;
            case 290: entry["plot"] = Convert.ToBoolean(value); break;
            case 370: entry["lineweight"] = Convert.ToInt32(value); break;
            case 390: entry["plotStyleHandle"] = Convert.ToString(value); break;
            case 420: entry["trueColor"] = Convert.ToInt32(value); break;
            case 100: break; // subclass marker
            case 330: entry["ownerHandle"] = Convert.ToString(value); break;
        }
    }

    // --- Linetype ---
    private static void ApplyLtypeCode(Dictionary<string, object?> entry, int code, object value,
        List<double> elements)
    {
        switch (code)
        {
            case 2: entry["name"] = Convert.ToString(value); break;
            case 5: entry["handle"] = Convert.ToString(value); break;
            case 3: entry["description"] = Convert.ToString(value); break;
            case 73: entry["elementCount"] = Convert.ToInt32(value); break;
            case 40: entry["totalLength"] = Convert.ToDouble(value); break;
            case 49: elements.Add(Convert.ToDouble(value)); break;
            case 70: entry["flags"] = Convert.ToInt32(value); break;
            case 100: break;
        }
    }

    // --- Style ---
    private static void ApplyStyleCode(Dictionary<string, object?> entry, int code, object value)
    {
        switch (code)
        {
            case 2: entry["name"] = Convert.ToString(value); break;
            case 5: entry["handle"] = Convert.ToString(value); break;
            case 3: entry["font"] = Convert.ToString(value); break;
            case 4: entry["bigFont"] = Convert.ToString(value); break;
            case 40: entry["height"] = Convert.ToDouble(value); break;
            case 41: entry["widthFactor"] = Convert.ToDouble(value); break;
            case 42: entry["lastHeight"] = Convert.ToDouble(value); break;
            case 50: entry["obliqueAngle"] = Convert.ToDouble(value); break;
            case 70: entry["flags"] = Convert.ToInt32(value); break;
            case 71: entry["textGenerationFlags"] = Convert.ToInt32(value); break;
            case 100: break;
            case 1071: entry["fontFlags"] = Convert.ToInt32(value); break;
        }
    }

    // --- Dimstyle ---
    private static void ApplyDimstyleCode(Dictionary<string, object?> entry, int code, object value)
    {
        switch (code)
        {
            case 2: entry["name"] = Convert.ToString(value); break;
            case 5: entry["handle"] = Convert.ToString(value); break;
            case 3: entry["DIMPOST"] = Convert.ToString(value); break;
            case 4: entry["DIMAPOST"] = Convert.ToString(value); break;
            case 40: entry["DIMSCALE"] = Convert.ToDouble(value); break;
            case 41: entry["DIMASZ"] = Convert.ToDouble(value); break;
            case 42: entry["DIMEXO"] = Convert.ToDouble(value); break;
            case 43: entry["DIMDLI"] = Convert.ToDouble(value); break;
            case 44: entry["DIMEXE"] = Convert.ToDouble(value); break;
            case 45: entry["DIMRND"] = Convert.ToDouble(value); break;
            case 46: entry["DIMDLE"] = Convert.ToDouble(value); break;
            case 47: entry["DIMTP"] = Convert.ToDouble(value); break;
            case 48: entry["DIMTM"] = Convert.ToDouble(value); break;
            case 140: entry["DIMTXT"] = Convert.ToDouble(value); break;
            case 141: entry["DIMCEN"] = Convert.ToDouble(value); break;
            case 142: entry["DIMTSZ"] = Convert.ToDouble(value); break;
            case 143: entry["DIMALTF"] = Convert.ToDouble(value); break;
            case 144: entry["DIMLFAC"] = Convert.ToDouble(value); break;
            case 145: entry["DIMTVP"] = Convert.ToDouble(value); break;
            case 146: entry["DIMTFAC"] = Convert.ToDouble(value); break;
            case 147: entry["DIMGAP"] = Convert.ToDouble(value); break;
            case 71: entry["DIMTOL"] = Convert.ToInt32(value); break;
            case 72: entry["DIMLIM"] = Convert.ToInt32(value); break;
            case 73: entry["DIMTIH"] = Convert.ToInt32(value); break;
            case 74: entry["DIMTOH"] = Convert.ToInt32(value); break;
            case 75: entry["DIMSE1"] = Convert.ToInt32(value); break;
            case 76: entry["DIMSE2"] = Convert.ToInt32(value); break;
            case 77: entry["DIMTAD"] = Convert.ToInt32(value); break;
            case 78: entry["DIMZIN"] = Convert.ToInt32(value); break;
            case 170: entry["DIMALT"] = Convert.ToInt32(value); break;
            case 171: entry["DIMALTD"] = Convert.ToInt32(value); break;
            case 172: entry["DIMTOFL"] = Convert.ToInt32(value); break;
            case 173: entry["DIMSAH"] = Convert.ToInt32(value); break;
            case 174: entry["DIMTIX"] = Convert.ToInt32(value); break;
            case 175: entry["DIMSOXD"] = Convert.ToInt32(value); break;
            case 176: entry["DIMCLRD"] = Convert.ToInt32(value); break;
            case 177: entry["DIMCLRE"] = Convert.ToInt32(value); break;
            case 178: entry["DIMCLRT"] = Convert.ToInt32(value); break;
            case 270: entry["DIMUNIT"] = Convert.ToInt32(value); break;
            case 271: entry["DIMDEC"] = Convert.ToInt32(value); break;
            case 272: entry["DIMTDEC"] = Convert.ToInt32(value); break;
            case 273: entry["DIMALTU"] = Convert.ToInt32(value); break;
            case 274: entry["DIMALTDEC"] = Convert.ToInt32(value); break;
            case 275: entry["DIMAUNIT"] = Convert.ToInt32(value); break;
            case 276: entry["DIMFRAC"] = Convert.ToInt32(value); break;
            case 277: entry["DIMLUNIT"] = Convert.ToInt32(value); break;
            case 278: entry["DIMDSEP"] = Convert.ToInt32(value); break;
            case 279: entry["DIMTMOVE"] = Convert.ToInt32(value); break;
            case 280: entry["DIMJUST"] = Convert.ToInt32(value); break;
            case 281: entry["DIMSD1"] = Convert.ToInt32(value); break;
            case 282: entry["DIMSD2"] = Convert.ToInt32(value); break;
            case 283: entry["DIMTOLJ"] = Convert.ToInt32(value); break;
            case 284: entry["DIMTZIN"] = Convert.ToInt32(value); break;
            case 285: entry["DIMALTZ"] = Convert.ToInt32(value); break;
            case 286: entry["DIMALTTZ"] = Convert.ToInt32(value); break;
            case 288: entry["DIMUPT"] = Convert.ToInt32(value); break;
            case 289: entry["DIMATFIT"] = Convert.ToInt32(value); break;
            case 340: entry["DIMTXSTY"] = Convert.ToString(value); break;
            case 341: entry["DIMLDRBLK"] = Convert.ToString(value); break;
            case 342: entry["DIMBLK"] = Convert.ToString(value); break;
            case 343: entry["DIMBLK1"] = Convert.ToString(value); break;
            case 344: entry["DIMBLK2"] = Convert.ToString(value); break;
            case 371: entry["DIMLWD"] = Convert.ToInt32(value); break;
            case 372: entry["DIMLWE"] = Convert.ToInt32(value); break;
            case 100: break;
        }
    }

    // --- Generic table entry ---
    private static void ApplyGenericTableCode(Dictionary<string, object?> entry, int code, object value)
    {
        switch (code)
        {
            case 2: entry["name"] = Convert.ToString(value); break;
            case 5: entry["handle"] = Convert.ToString(value); break;
            case 70: entry["flags"] = Convert.ToInt32(value); break;
            case 100: break;
            default: entry[code.ToString()] = value; break;
        }
    }

    // -----------------------------------------------------------------
    // BLOCKS
    // -----------------------------------------------------------------

    private Dictionary<string, Dictionary<string, object?>> ParseBlocks(TokenStream tokens)
    {
        var blocks = new Dictionary<string, Dictionary<string, object?>>();

        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            var (code, _) = tok.Value;
            if (code == 0 && tok.Value.StringValue == "ENDSEC") break;
            if (code == 0 && tok.Value.StringValue == "BLOCK")
            {
                var block = ParseBlock(tokens);
                var name = block.TryGetValue("name", out var n) ? n?.ToString() ?? "" : "";
                blocks[name] = block;
            }
        }

        return blocks;
    }

    private Dictionary<string, object?> ParseBlock(TokenStream tokens)
    {
        var block = new Dictionary<string, object?>();
        double bx = 0, by = 0, bz = 0;

        while (true)
        {
            var tok = tokens.Peek();
            if (tok is null) break;
            if (tok.Value.Code == 0) break;
            tokens.Next();
            var (code, value) = tok.Value;

            switch (code)
            {
                case 2: block["name"] = tok.Value.StringValue; break;
                case 3: block["name2"] = tok.Value.StringValue; break;
                case 5: block["handle"] = tok.Value.StringValue; break;
                case 8: block["layer"] = tok.Value.StringValue; break;
                case 10: bx = Convert.ToDouble(value); break;
                case 20: by = Convert.ToDouble(value); break;
                case 30: bz = Convert.ToDouble(value); break;
                case 70: block["flags"] = Convert.ToInt32(value); break;
            }
        }

        block["basePoint"] = new List<double> { bx, by, bz };

        var entities = new List<Dictionary<string, object?>>();
        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            var (code, _) = tok.Value;
            if (code == 0 && tok.Value.StringValue == "ENDBLK")
            {
                SkipToNextEntity(tokens);
                break;
            }
            if (code == 0)
            {
                var entityType = tok.Value.StringValue;
                var entity = ParseEntity(entityType, tokens);
                entities.Add(entity);
            }
        }

        block["entities"] = entities;
        return block;
    }

    // -----------------------------------------------------------------
    // ENTITIES
    // -----------------------------------------------------------------

    private List<Dictionary<string, object?>> ParseEntities(TokenStream tokens)
    {
        var entities = new List<Dictionary<string, object?>>();

        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            if (tok.Value.Code == 0 && tok.Value.StringValue == "ENDSEC") break;
            if (tok.Value.Code == 0)
            {
                var entity = ParseEntity(tok.Value.StringValue, tokens);
                entities.Add(entity);
            }
        }

        return entities;
    }

    // -----------------------------------------------------------------
    // OBJECTS
    // -----------------------------------------------------------------

    private List<Dictionary<string, object?>> ParseObjects(TokenStream tokens)
    {
        var objects = new List<Dictionary<string, object?>>();

        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            if (tok.Value.Code == 0 && tok.Value.StringValue == "ENDSEC") break;
            if (tok.Value.Code == 0)
            {
                var obj = ParseGenericObject(tok.Value.StringValue, tokens);
                objects.Add(obj);
            }
        }

        return objects;
    }

    private Dictionary<string, object?> ParseGenericObject(string objType, TokenStream tokens)
    {
        var obj = new Dictionary<string, object?> { ["type"] = objType };
        while (true)
        {
            var tok = tokens.Peek();
            if (tok is null) break;
            if (tok.Value.Code == 0) break;
            tokens.Next();
            var (code, value) = tok.Value;

            switch (code)
            {
                case 5: obj["handle"] = tok.Value.StringValue; break;
                case 2: obj["name"] = tok.Value.StringValue; break;
                case 330: obj["ownerHandle"] = tok.Value.StringValue; break;
                case 100:
                    if (!obj.ContainsKey("subclasses"))
                        obj["subclasses"] = new List<string>();
                    ((List<string>)obj["subclasses"]!).Add(tok.Value.StringValue);
                    break;
                case 3:
                    if (!obj.ContainsKey("entries"))
                        obj["entries"] = new List<string>();
                    ((List<string>)obj["entries"]!).Add(tok.Value.StringValue);
                    break;
                case 350:
                    if (!obj.ContainsKey("entryHandles"))
                        obj["entryHandles"] = new List<string>();
                    ((List<string>)obj["entryHandles"]!).Add(tok.Value.StringValue);
                    break;
                default:
                    obj[code.ToString()] = value;
                    break;
            }
        }
        return obj;
    }

    // -----------------------------------------------------------------
    // Entity dispatch
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseEntity(string entityType, TokenStream tokens)
    {
        Dictionary<string, object?> entity = entityType switch
        {
            "LINE" => ParseLine(tokens),
            "POINT" => ParsePoint(tokens),
            "CIRCLE" => ParseCircle(tokens),
            "ARC" => ParseArc(tokens),
            "ELLIPSE" => ParseEllipse(tokens),
            "SPLINE" => ParseSpline(tokens),
            "LWPOLYLINE" => ParseLwPolyline(tokens),
            "POLYLINE" => ParsePolyline(tokens),
            "TEXT" => ParseText(tokens),
            "MTEXT" => ParseMtext(tokens),
            "DIMENSION" => ParseDimension(tokens),
            "LEADER" => ParseLeader(tokens),
            "HATCH" => ParseHatch(tokens),
            "INSERT" => ParseInsert(tokens),
            "ATTDEF" => ParseAttdef(tokens),
            "ATTRIB" => ParseAttrib(tokens),
            "SOLID" or "TRACE" => ParseSolidTrace(tokens),
            "3DFACE" => Parse3DFace(tokens),
            "VIEWPORT" => ParseViewport(tokens),
            "XLINE" or "RAY" => ParseXlineRay(tokens),
            "IMAGE" => ParseImage(tokens),
            "WIPEOUT" => ParseWipeout(tokens),
            "TABLE" => ParseTableEntity(tokens),
            "3DSOLID" or "BODY" or "REGION" or "SURFACE" => ParseAcis(tokens),
            "MESH" => ParseMesh(tokens),
            _ => ParseGenericEntity(tokens),
        };
        entity["type"] = entityType;
        return entity;
    }

    // -----------------------------------------------------------------
    // Common property extraction
    // -----------------------------------------------------------------

    private static bool ApplyCommon(Dictionary<string, object?> entity, int code, object value)
    {
        switch (code)
        {
            case 5: entity["handle"] = Convert.ToString(value); return true;
            case 8: entity["layer"] = Convert.ToString(value); return true;
            case 6: entity["linetype"] = Convert.ToString(value); return true;
            case 62: entity["color"] = Convert.ToInt32(value); return true;
            case 370: entity["lineweight"] = Convert.ToInt32(value); return true;
            case 420: entity["trueColor"] = Convert.ToInt32(value); return true;
            case 440: entity["transparency"] = Convert.ToInt32(value); return true;
            case 60: entity["visibility"] = Convert.ToInt32(value); return true;
            case 67: entity["paperSpace"] = Convert.ToInt32(value); return true;
            case 210:
                EnsureExtrusion(entity)[0] = Convert.ToDouble(value); return true;
            case 220:
                EnsureExtrusion(entity)[1] = Convert.ToDouble(value); return true;
            case 230:
                EnsureExtrusion(entity)[2] = Convert.ToDouble(value); return true;
            case 100: return true;
            case 330: entity["ownerHandle"] = Convert.ToString(value); return true;
            case 102: return true;
            default: return false;
        }
    }

    private static List<double> EnsureExtrusion(Dictionary<string, object?> entity)
    {
        if (!entity.TryGetValue("extrusion", out var ext) || ext is not List<double> list)
        {
            list = [0.0, 0.0, 1.0];
            entity["extrusion"] = list;
        }
        return list;
    }

    private List<(int Code, object Value)> CollectCodes(TokenStream tokens)
    {
        var pairs = new List<(int, object)>();
        while (true)
        {
            var tok = tokens.Peek();
            if (tok is null) break;
            if (tok.Value.Code == 0) break;
            tokens.Next();
            pairs.Add((tok.Value.Code, tok.Value.Value));
        }
        return pairs;
    }

    // -----------------------------------------------------------------
    // Entity parsers
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseLine(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double sx = 0, sy = 0, sz = 0, ex = 0, ey = 0, ez = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: sx = Convert.ToDouble(value); break;
                case 20: sy = Convert.ToDouble(value); break;
                case 30: sz = Convert.ToDouble(value); break;
                case 11: ex = Convert.ToDouble(value); break;
                case 21: ey = Convert.ToDouble(value); break;
                case 31: ez = Convert.ToDouble(value); break;
            }
        }
        e["start"] = new List<double> { sx, sy, sz };
        e["end"] = new List<double> { ex, ey, ez };
        return e;
    }

    private Dictionary<string, object?> ParsePoint(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double px = 0, py = 0, pz = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: px = Convert.ToDouble(value); break;
                case 20: py = Convert.ToDouble(value); break;
                case 30: pz = Convert.ToDouble(value); break;
            }
        }
        e["position"] = new List<double> { px, py, pz };
        return e;
    }

    private Dictionary<string, object?> ParseCircle(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double cx = 0, cy = 0, cz = 0, r = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: cx = Convert.ToDouble(value); break;
                case 20: cy = Convert.ToDouble(value); break;
                case 30: cz = Convert.ToDouble(value); break;
                case 40: r = Convert.ToDouble(value); break;
            }
        }
        e["center"] = new List<double> { cx, cy, cz };
        e["radius"] = r;
        return e;
    }

    private Dictionary<string, object?> ParseArc(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double cx = 0, cy = 0, cz = 0, r = 0, sa = 0, ea = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: cx = Convert.ToDouble(value); break;
                case 20: cy = Convert.ToDouble(value); break;
                case 30: cz = Convert.ToDouble(value); break;
                case 40: r = Convert.ToDouble(value); break;
                case 50: sa = Convert.ToDouble(value); break;
                case 51: ea = Convert.ToDouble(value); break;
            }
        }
        e["center"] = new List<double> { cx, cy, cz };
        e["radius"] = r;
        e["startAngle"] = sa;
        e["endAngle"] = ea;
        return e;
    }

    private Dictionary<string, object?> ParseEllipse(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double cx = 0, cy = 0, cz = 0, mx = 0, my = 0, mz = 0;
        double ratio = 1.0, sp = 0.0, ep = 2 * Math.PI;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: cx = Convert.ToDouble(value); break;
                case 20: cy = Convert.ToDouble(value); break;
                case 30: cz = Convert.ToDouble(value); break;
                case 11: mx = Convert.ToDouble(value); break;
                case 21: my = Convert.ToDouble(value); break;
                case 31: mz = Convert.ToDouble(value); break;
                case 40: ratio = Convert.ToDouble(value); break;
                case 41: sp = Convert.ToDouble(value); break;
                case 42: ep = Convert.ToDouble(value); break;
            }
        }
        e["center"] = new List<double> { cx, cy, cz };
        e["majorAxisEndpoint"] = new List<double> { mx, my, mz };
        e["minorAxisRatio"] = ratio;
        e["startParam"] = sp;
        e["endParam"] = ep;
        return e;
    }

    private Dictionary<string, object?> ParseSpline(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        int degree = 3, flags = 0;
        var knots = new List<double>();
        var ctrlPts = new List<List<double>>();
        var fitPts = new List<List<double>>();
        var weights = new List<double>();
        double cx = 0, cy = 0, cz = 0, fx = 0, fy = 0, fz = 0;
        bool inCtrl = false, inFit = false;

        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 70: flags = Convert.ToInt32(value); break;
                case 71: degree = Convert.ToInt32(value); break;
                case 72: break; // num knots
                case 73: break; // ctrl count
                case 74: break; // fit count
                case 40: knots.Add(Convert.ToDouble(value)); break;
                case 41: weights.Add(Convert.ToDouble(value)); break;
                case 10:
                    if (inCtrl) ctrlPts.Add([cx, cy, cz]);
                    cx = Convert.ToDouble(value); cy = cz = 0;
                    inCtrl = true; inFit = false;
                    break;
                case 20:
                    if (inCtrl) cy = Convert.ToDouble(value);
                    else if (inFit) fy = Convert.ToDouble(value);
                    break;
                case 30:
                    if (inCtrl) cz = Convert.ToDouble(value);
                    else if (inFit) fz = Convert.ToDouble(value);
                    break;
                case 11:
                    if (inFit) fitPts.Add([fx, fy, fz]);
                    fx = Convert.ToDouble(value); fy = fz = 0;
                    inFit = true; inCtrl = false;
                    break;
                case 21:
                    if (inFit) fy = Convert.ToDouble(value);
                    break;
                case 31:
                    if (inFit) fz = Convert.ToDouble(value);
                    break;
            }
        }
        if (inCtrl) ctrlPts.Add([cx, cy, cz]);
        if (inFit) fitPts.Add([fx, fy, fz]);

        e["degree"] = degree;
        e["closed"] = (flags & 1) != 0;
        if (knots.Count > 0) e["knots"] = knots;
        if (ctrlPts.Count > 0) e["controlPoints"] = ctrlPts;
        if (fitPts.Count > 0) e["fitPoints"] = fitPts;
        if (weights.Count > 0 && weights.Any(w => w != 1.0))
        {
            e["weights"] = weights;
            e["rational"] = true;
        }
        return e;
    }

    private Dictionary<string, object?> ParseLwPolyline(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        var vertices = new List<Dictionary<string, object?>>();
        Dictionary<string, object?>? currentV = null;
        double elevation = 0;

        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 90: break; // vertex count
                case 70:
                    e["closed"] = (Convert.ToInt32(value) & 1) != 0;
                    break;
                case 38: elevation = Convert.ToDouble(value); break;
                case 10:
                    if (currentV is not null) vertices.Add(currentV);
                    currentV = new Dictionary<string, object?> { ["x"] = Convert.ToDouble(value), ["y"] = 0.0 };
                    break;
                case 20:
                    if (currentV is not null) currentV["y"] = Convert.ToDouble(value);
                    break;
                case 40:
                    if (currentV is not null)
                    {
                        var sw = Convert.ToDouble(value);
                        if (sw != 0) currentV["startWidth"] = sw;
                    }
                    break;
                case 41:
                    if (currentV is not null)
                    {
                        var ew = Convert.ToDouble(value);
                        if (ew != 0) currentV["endWidth"] = ew;
                    }
                    break;
                case 42:
                    if (currentV is not null)
                    {
                        var b = Convert.ToDouble(value);
                        if (b != 0) currentV["bulge"] = b;
                    }
                    break;
            }
        }
        if (currentV is not null) vertices.Add(currentV);
        e["vertices"] = vertices;
        if (elevation != 0.0) e["elevation"] = elevation;
        return e;
    }

    private Dictionary<string, object?> ParsePolyline(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        int flags = 0;

        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            if (code == 70) flags = Convert.ToInt32(value);
        }

        bool is3d = (flags & 8) != 0 || (flags & 16) != 0;
        e["closed"] = (flags & 1) != 0;
        e["flags"] = flags;

        var vertices = new List<Dictionary<string, object?>>();
        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            if (tok.Value.Code == 0 && tok.Value.StringValue == "SEQEND")
            {
                SkipToNextEntity(tokens);
                break;
            }
            if (tok.Value.Code == 0 && tok.Value.StringValue == "VERTEX")
            {
                vertices.Add(ParseVertex(tokens));
            }
        }

        if (is3d)
        {
            e["type"] = "POLYLINE3D";
            e["vertices"] = vertices.Select(v => new List<double>
            {
                v.TryGetValue("x", out var vx) ? Convert.ToDouble(vx) : 0,
                v.TryGetValue("y", out var vy) ? Convert.ToDouble(vy) : 0,
                v.TryGetValue("z", out var vz) ? Convert.ToDouble(vz) : 0
            }).ToList();
        }
        else
        {
            e["type"] = "POLYLINE2D";
            e["vertices"] = vertices.Select(v =>
            {
                var vd = new Dictionary<string, object?>
                {
                    ["position"] = new List<double>
                    {
                        v.TryGetValue("x", out var vx) ? Convert.ToDouble(vx) : 0,
                        v.TryGetValue("y", out var vy) ? Convert.ToDouble(vy) : 0,
                        v.TryGetValue("z", out var vz) ? Convert.ToDouble(vz) : 0
                    }
                };
                if (v.TryGetValue("bulge", out var b) && Convert.ToDouble(b) != 0)
                    vd["bulge"] = b;
                return vd;
            }).ToList();
        }
        return e;
    }

    private Dictionary<string, object?> ParseVertex(TokenStream tokens)
    {
        var v = new Dictionary<string, object?> { ["x"] = 0.0, ["y"] = 0.0, ["z"] = 0.0 };
        foreach (var (code, value) in CollectCodes(tokens))
        {
            switch (code)
            {
                case 10: v["x"] = Convert.ToDouble(value); break;
                case 20: v["y"] = Convert.ToDouble(value); break;
                case 30: v["z"] = Convert.ToDouble(value); break;
                case 42: v["bulge"] = Convert.ToDouble(value); break;
                case 70: v["flags"] = Convert.ToInt32(value); break;
                case 40: v["startWidth"] = Convert.ToDouble(value); break;
                case 41: v["endWidth"] = Convert.ToDouble(value); break;
            }
        }
        return v;
    }

    private Dictionary<string, object?> ParseText(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double ix = 0, iy = 0, iz = 0, ax = 0, ay = 0, az = 0;
        bool hasAlign = false;

        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 1: e["text"] = Convert.ToString(value); break;
                case 10: ix = Convert.ToDouble(value); break;
                case 20: iy = Convert.ToDouble(value); break;
                case 30: iz = Convert.ToDouble(value); break;
                case 11: ax = Convert.ToDouble(value); hasAlign = true; break;
                case 21: ay = Convert.ToDouble(value); break;
                case 31: az = Convert.ToDouble(value); break;
                case 40: e["height"] = Convert.ToDouble(value); break;
                case 50: e["rotation"] = Convert.ToDouble(value); break;
                case 7: e["style"] = Convert.ToString(value); break;
                case 72: e["horizontalAlignment"] = Convert.ToInt32(value); break;
                case 73: e["verticalAlignment"] = Convert.ToInt32(value); break;
                case 71: e["textGenerationFlags"] = Convert.ToInt32(value); break;
                case 41: e["widthFactor"] = Convert.ToDouble(value); break;
                case 51: e["obliqueAngle"] = Convert.ToDouble(value); break;
            }
        }
        e["insertionPoint"] = new List<double> { ix, iy, iz };
        if (hasAlign) e["alignmentPoint"] = new List<double> { ax, ay, az };
        return e;
    }

    private Dictionary<string, object?> ParseMtext(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double ix = 0, iy = 0, iz = 0;
        var textParts = new List<string>();

        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 1: textParts.Add(Convert.ToString(value) ?? ""); break;
                case 3: textParts.Add(Convert.ToString(value) ?? ""); break;
                case 10: ix = Convert.ToDouble(value); break;
                case 20: iy = Convert.ToDouble(value); break;
                case 30: iz = Convert.ToDouble(value); break;
                case 40: e["height"] = Convert.ToDouble(value); break;
                case 41: e["width"] = Convert.ToDouble(value); break;
                case 50: e["rotation"] = Convert.ToDouble(value); break;
                case 7: e["style"] = Convert.ToString(value); break;
                case 71: e["attachment"] = Convert.ToInt32(value); break;
                case 72: e["drawingDirection"] = Convert.ToInt32(value); break;
                case 44: e["lineSpacingFactor"] = Convert.ToDouble(value); break;
                case 73: e["lineSpacingStyle"] = Convert.ToInt32(value); break;
            }
        }
        e["insertionPoint"] = new List<double> { ix, iy, iz };
        e["text"] = string.Join("", textParts);
        return e;
    }

    private Dictionary<string, object?> ParseDimension(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double dpx = 0, dpy = 0, dpz = 0;
        double mpx = 0, mpy = 0, mpz = 0;
        double d1x = 0, d1y = 0, d1z = 0;
        double d2x = 0, d2y = 0, d2z = 0;
        double d3x = 0, d3y = 0, d3z = 0;
        double d4x = 0, d4y = 0, d4z = 0;
        int dimtype = 0;

        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 2: e["blockName"] = Convert.ToString(value); break;
                case 3: e["dimStyle"] = Convert.ToString(value); break;
                case 1: e["overrideText"] = Convert.ToString(value); break;
                case 70: dimtype = Convert.ToInt32(value); break;
                case 53: e["rotationAngle"] = Convert.ToDouble(value); break;
                case 10: dpx = Convert.ToDouble(value); break;
                case 20: dpy = Convert.ToDouble(value); break;
                case 30: dpz = Convert.ToDouble(value); break;
                case 11: mpx = Convert.ToDouble(value); break;
                case 21: mpy = Convert.ToDouble(value); break;
                case 31: mpz = Convert.ToDouble(value); break;
                case 13: d1x = Convert.ToDouble(value); break;
                case 23: d1y = Convert.ToDouble(value); break;
                case 33: d1z = Convert.ToDouble(value); break;
                case 14: d2x = Convert.ToDouble(value); break;
                case 24: d2y = Convert.ToDouble(value); break;
                case 34: d2z = Convert.ToDouble(value); break;
                case 15: d3x = Convert.ToDouble(value); break;
                case 25: d3y = Convert.ToDouble(value); break;
                case 35: d3z = Convert.ToDouble(value); break;
                case 16: d4x = Convert.ToDouble(value); break;
                case 26: d4y = Convert.ToDouble(value); break;
                case 36: d4z = Convert.ToDouble(value); break;
            }
        }

        var subtype = dimtype & 0x0F;
        var typeMap = new Dictionary<int, string>
        {
            [0] = "DIMENSION_LINEAR", [1] = "DIMENSION_ALIGNED", [2] = "DIMENSION_ANGULAR",
            [3] = "DIMENSION_DIAMETER", [4] = "DIMENSION_RADIUS",
            [5] = "DIMENSION_ANGULAR3P", [6] = "DIMENSION_ORDINATE",
        };
        e["dimType"] = typeMap.GetValueOrDefault(subtype, "DIMENSION_LINEAR");
        e["dimTypeRaw"] = dimtype;
        e["dimLinePoint"] = new List<double> { dpx, dpy, dpz };
        e["textPosition"] = new List<double> { mpx, mpy, mpz };
        e["defPoint1"] = new List<double> { d1x, d1y, d1z };
        e["defPoint2"] = new List<double> { d2x, d2y, d2z };
        if (subtype is 2 or 5)
        {
            e["defPoint3"] = new List<double> { d3x, d3y, d3z };
            e["defPoint4"] = new List<double> { d4x, d4y, d4z };
        }
        return e;
    }

    private Dictionary<string, object?> ParseLeader(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        var vertices = new List<List<double>>();
        double vx = 0, vy = 0, vz = 0;
        bool haveVertex = false;

        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 76: break;
                case 71: e["hasArrowhead"] = Convert.ToInt32(value) != 0; break;
                case 72: e["pathType"] = Convert.ToInt32(value) == 1 ? "spline" : "straight"; break;
                case 73: e["creationFlag"] = Convert.ToInt32(value); break;
                case 74: e["hooklineDirection"] = Convert.ToInt32(value); break;
                case 75: e["hasHookline"] = Convert.ToInt32(value) != 0; break;
                case 40: e["textHeight"] = Convert.ToDouble(value); break;
                case 41: e["textWidth"] = Convert.ToDouble(value); break;
                case 10:
                    if (haveVertex) vertices.Add([vx, vy, vz]);
                    vx = Convert.ToDouble(value); vy = vz = 0;
                    haveVertex = true;
                    break;
                case 20: vy = Convert.ToDouble(value); break;
                case 30: vz = Convert.ToDouble(value); break;
            }
        }
        if (haveVertex) vertices.Add([vx, vy, vz]);
        e["vertices"] = vertices;
        return e;
    }

    private Dictionary<string, object?> ParseHatch(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        var boundaries = new List<Dictionary<string, object?>>();
        var codes = CollectCodes(tokens);
        int idx = 0, n = codes.Count;

        while (idx < n)
        {
            var (code, value) = codes[idx]; idx++;
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 2: e["patternName"] = Convert.ToString(value); break;
                case 70: e["solid"] = Convert.ToInt32(value) == 1; break;
                case 71: e["associative"] = Convert.ToInt32(value) == 1; break;
                case 91: break; // num boundaries
                case 92:
                    var bf = Convert.ToInt32(value);
                    (var boundary, idx) = ParseHatchBoundary(codes, idx, bf);
                    boundaries.Add(boundary);
                    break;
                case 75: e["hatchStyle"] = Convert.ToInt32(value); break;
                case 76: e["patternType"] = Convert.ToInt32(value); break;
                case 52: e["patternAngle"] = Convert.ToDouble(value); break;
                case 41: e["patternScale"] = Convert.ToDouble(value); break;
                case 98: break;
            }
        }
        e["boundaries"] = boundaries;
        return e;
    }

    private static (Dictionary<string, object?>, int) ParseHatchBoundary(
        List<(int Code, object Value)> codes, int idx, int flags)
    {
        var boundary = new Dictionary<string, object?> { ["flags"] = flags };
        int n = codes.Count;
        bool isPolyline = (flags & 2) != 0;

        if (isPolyline)
        {
            bool hasBulge = false, isClosed = false;
            var vertices = new List<Dictionary<string, object?>>();
            int numVerts = 0;

            if (idx < n && codes[idx].Code == 72) { hasBulge = Convert.ToInt32(codes[idx].Value) != 0; idx++; }
            if (idx < n && codes[idx].Code == 73) { isClosed = Convert.ToInt32(codes[idx].Value) != 0; idx++; }
            if (idx < n && codes[idx].Code == 93) { numVerts = Convert.ToInt32(codes[idx].Value); idx++; }

            for (int i = 0; i < numVerts; i++)
            {
                double vx = 0, vy = 0, bulge = 0;
                while (idx < n)
                {
                    var (c, v) = codes[idx];
                    if (c == 10) { vx = Convert.ToDouble(v); idx++; }
                    else if (c == 20) { vy = Convert.ToDouble(v); idx++; }
                    else if (c == 42) { bulge = Convert.ToDouble(v); idx++; }
                    else break;
                }
                var vtx = new Dictionary<string, object?> { ["x"] = vx, ["y"] = vy };
                if (bulge != 0) vtx["bulge"] = bulge;
                vertices.Add(vtx);
            }

            boundary["type"] = "polyline";
            boundary["polyline"] = new Dictionary<string, object?> { ["vertices"] = vertices, ["closed"] = isClosed };
        }
        else
        {
            int numEdges = 0;
            if (idx < n && codes[idx].Code == 93) { numEdges = Convert.ToInt32(codes[idx].Value); idx++; }
            var edges = new List<Dictionary<string, object?>>();
            for (int i = 0; i < numEdges; i++)
            {
                if (idx >= n) break;
                if (codes[idx].Code == 72)
                {
                    var edgeType = Convert.ToInt32(codes[idx].Value); idx++;
                    Dictionary<string, object?> edge;
                    (edge, idx) = ParseHatchEdge(codes, idx, edgeType);
                    edges.Add(edge);
                }
            }
            boundary["type"] = "edges";
            boundary["edges"] = edges;
        }

        return (boundary, idx);
    }

    private static (Dictionary<string, object?>, int) ParseHatchEdge(
        List<(int Code, object Value)> codes, int idx, int edgeType)
    {
        var edge = new Dictionary<string, object?>();
        int n = codes.Count;

        if (edgeType == 1) // Line
        {
            edge["edgeType"] = "line";
            double sx = 0, sy = 0, ex = 0, ey = 0;
            while (idx < n)
            {
                var (c, v) = codes[idx];
                if (c == 10) { sx = Convert.ToDouble(v); idx++; }
                else if (c == 20) { sy = Convert.ToDouble(v); idx++; }
                else if (c == 11) { ex = Convert.ToDouble(v); idx++; }
                else if (c == 21) { ey = Convert.ToDouble(v); idx++; }
                else break;
            }
            edge["start"] = new List<double> { sx, sy };
            edge["end"] = new List<double> { ex, ey };
        }
        else if (edgeType == 2) // Arc
        {
            edge["edgeType"] = "arc";
            double cx = 0, cy = 0, r = 0, sa = 0, ea = 0;
            bool ccw = true;
            while (idx < n)
            {
                var (c, v) = codes[idx];
                if (c == 10) { cx = Convert.ToDouble(v); idx++; }
                else if (c == 20) { cy = Convert.ToDouble(v); idx++; }
                else if (c == 40) { r = Convert.ToDouble(v); idx++; }
                else if (c == 50) { sa = Convert.ToDouble(v); idx++; }
                else if (c == 51) { ea = Convert.ToDouble(v); idx++; }
                else if (c == 73) { ccw = Convert.ToInt32(v) != 0; idx++; }
                else break;
            }
            edge["center"] = new List<double> { cx, cy };
            edge["radius"] = r;
            edge["startAngle"] = sa;
            edge["endAngle"] = ea;
            edge["counterClockwise"] = ccw;
        }

        return (edge, idx);
    }

    private Dictionary<string, object?> ParseInsert(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double ix = 0, iy = 0, iz = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 2: e["blockName"] = Convert.ToString(value); break;
                case 10: ix = Convert.ToDouble(value); break;
                case 20: iy = Convert.ToDouble(value); break;
                case 30: iz = Convert.ToDouble(value); break;
                case 41: e["scaleX"] = Convert.ToDouble(value); break;
                case 42: e["scaleY"] = Convert.ToDouble(value); break;
                case 43: e["scaleZ"] = Convert.ToDouble(value); break;
                case 50: e["rotation"] = Convert.ToDouble(value); break;
                case 66: e["hasAttributes"] = Convert.ToInt32(value) == 1; break;
                case 70: e["columnCount"] = Convert.ToInt32(value); break;
                case 71: e["rowCount"] = Convert.ToInt32(value); break;
                case 44: e["columnSpacing"] = Convert.ToDouble(value); break;
                case 45: e["rowSpacing"] = Convert.ToDouble(value); break;
            }
        }
        e["insertionPoint"] = new List<double> { ix, iy, iz };
        return e;
    }

    private Dictionary<string, object?> ParseAttdef(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double ix = 0, iy = 0, iz = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 1: e["defaultValue"] = Convert.ToString(value); break;
                case 2: e["tag"] = Convert.ToString(value); break;
                case 3: e["prompt"] = Convert.ToString(value); break;
                case 10: ix = Convert.ToDouble(value); break;
                case 20: iy = Convert.ToDouble(value); break;
                case 30: iz = Convert.ToDouble(value); break;
                case 40: e["height"] = Convert.ToDouble(value); break;
                case 70: e["flags"] = Convert.ToInt32(value); break;
            }
        }
        e["insertionPoint"] = new List<double> { ix, iy, iz };
        return e;
    }

    private Dictionary<string, object?> ParseAttrib(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double ix = 0, iy = 0, iz = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 1: e["value"] = Convert.ToString(value); break;
                case 2: e["tag"] = Convert.ToString(value); break;
                case 10: ix = Convert.ToDouble(value); break;
                case 20: iy = Convert.ToDouble(value); break;
                case 30: iz = Convert.ToDouble(value); break;
                case 40: e["height"] = Convert.ToDouble(value); break;
                case 70: e["flags"] = Convert.ToInt32(value); break;
            }
        }
        e["insertionPoint"] = new List<double> { ix, iy, iz };
        return e;
    }

    private Dictionary<string, object?> ParseSolidTrace(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        var pts = new double[4, 3];
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: pts[0, 0] = Convert.ToDouble(value); break;
                case 20: pts[0, 1] = Convert.ToDouble(value); break;
                case 30: pts[0, 2] = Convert.ToDouble(value); break;
                case 11: pts[1, 0] = Convert.ToDouble(value); break;
                case 21: pts[1, 1] = Convert.ToDouble(value); break;
                case 31: pts[1, 2] = Convert.ToDouble(value); break;
                case 12: pts[2, 0] = Convert.ToDouble(value); break;
                case 22: pts[2, 1] = Convert.ToDouble(value); break;
                case 32: pts[2, 2] = Convert.ToDouble(value); break;
                case 13: pts[3, 0] = Convert.ToDouble(value); break;
                case 23: pts[3, 1] = Convert.ToDouble(value); break;
                case 33: pts[3, 2] = Convert.ToDouble(value); break;
            }
        }
        for (int i = 0; i < 4; i++)
            e[$"point{i + 1}"] = new List<double> { pts[i, 0], pts[i, 1], pts[i, 2] };
        return e;
    }

    private Dictionary<string, object?> Parse3DFace(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        var pts = new double[4, 3];
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: pts[0, 0] = Convert.ToDouble(value); break;
                case 20: pts[0, 1] = Convert.ToDouble(value); break;
                case 30: pts[0, 2] = Convert.ToDouble(value); break;
                case 11: pts[1, 0] = Convert.ToDouble(value); break;
                case 21: pts[1, 1] = Convert.ToDouble(value); break;
                case 31: pts[1, 2] = Convert.ToDouble(value); break;
                case 12: pts[2, 0] = Convert.ToDouble(value); break;
                case 22: pts[2, 1] = Convert.ToDouble(value); break;
                case 32: pts[2, 2] = Convert.ToDouble(value); break;
                case 13: pts[3, 0] = Convert.ToDouble(value); break;
                case 23: pts[3, 1] = Convert.ToDouble(value); break;
                case 33: pts[3, 2] = Convert.ToDouble(value); break;
                case 70: e["invisibleEdges"] = Convert.ToInt32(value); break;
            }
        }
        for (int i = 0; i < 4; i++)
            e[$"point{i + 1}"] = new List<double> { pts[i, 0], pts[i, 1], pts[i, 2] };
        return e;
    }

    private Dictionary<string, object?> ParseViewport(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double cx = 0, cy = 0, cz = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: cx = Convert.ToDouble(value); break;
                case 20: cy = Convert.ToDouble(value); break;
                case 30: cz = Convert.ToDouble(value); break;
                case 40: e["width"] = Convert.ToDouble(value); break;
                case 41: e["height"] = Convert.ToDouble(value); break;
                case 69: e["id"] = Convert.ToInt32(value); break;
                case 45: e["viewHeight"] = Convert.ToDouble(value); break;
                case 90: e["statusFlags"] = Convert.ToInt32(value); break;
            }
        }
        e["center"] = new List<double> { cx, cy, cz };
        return e;
    }

    private Dictionary<string, object?> ParseXlineRay(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double ox = 0, oy = 0, oz = 0, dx = 0, dy = 0, dz = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: ox = Convert.ToDouble(value); break;
                case 20: oy = Convert.ToDouble(value); break;
                case 30: oz = Convert.ToDouble(value); break;
                case 11: dx = Convert.ToDouble(value); break;
                case 21: dy = Convert.ToDouble(value); break;
                case 31: dz = Convert.ToDouble(value); break;
            }
        }
        e["origin"] = new List<double> { ox, oy, oz };
        e["direction"] = new List<double> { dx, dy, dz };
        return e;
    }

    private Dictionary<string, object?> ParseImage(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        double ix = 0, iy = 0, iz = 0;
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 10: ix = Convert.ToDouble(value); break;
                case 20: iy = Convert.ToDouble(value); break;
                case 30: iz = Convert.ToDouble(value); break;
                case 340: e["imageDefHandle"] = Convert.ToString(value); break;
                case 70: e["displayFlags"] = Convert.ToInt32(value); break;
                case 280: e["clippingState"] = Convert.ToInt32(value); break;
                case 281: e["brightness"] = Convert.ToInt32(value); break;
                case 282: e["contrast"] = Convert.ToInt32(value); break;
                case 283: e["fade"] = Convert.ToInt32(value); break;
            }
        }
        e["insertionPoint"] = new List<double> { ix, iy, iz };
        return e;
    }

    private Dictionary<string, object?> ParseWipeout(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
        }
        return e;
    }

    private Dictionary<string, object?> ParseTableEntity(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
        }
        return e;
    }

    private Dictionary<string, object?> ParseAcis(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        var acisLines = new List<string>();
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            if (code == 1) acisLines.Add(Convert.ToString(value) ?? "");
            else if (code == 70) e["modelerVersion"] = Convert.ToInt32(value);
        }
        if (acisLines.Count > 0) e["acisData"] = string.Join("\n", acisLines);
        return e;
    }

    private Dictionary<string, object?> ParseMesh(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        foreach (var (code, value) in CollectCodes(tokens))
        {
            if (ApplyCommon(e, code, value)) continue;
            switch (code)
            {
                case 71: e["version"] = Convert.ToInt32(value); break;
                case 72: e["subdivisionLevel"] = Convert.ToInt32(value); break;
            }
        }
        return e;
    }

    private Dictionary<string, object?> ParseGenericEntity(TokenStream tokens)
    {
        var e = new Dictionary<string, object?>();
        foreach (var (code, value) in CollectCodes(tokens))
        {
            ApplyCommon(e, code, value);
        }
        return e;
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private static void SkipSection(TokenStream tokens)
    {
        while (true)
        {
            var tok = tokens.Next();
            if (tok is null) break;
            if (tok.Value.Code == 0 && tok.Value.StringValue == "ENDSEC") break;
        }
    }

    private static void SkipToNextEntity(TokenStream tokens)
    {
        while (true)
        {
            var tok = tokens.Peek();
            if (tok is null) break;
            if (tok.Value.Code == 0) break;
            tokens.Next();
        }
    }
}
