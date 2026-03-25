using System.Text.Json;
using System.Text.Json.Nodes;
using Ifcx.Types;

namespace Ifcx.Converters.V2;

/// <summary>
/// Converts a v1 <see cref="IfcxDocument"/> to the v2 IFC5-node-based JSON format.
/// </summary>
public static class V2Converter
{
    // ---------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------

    private static readonly JsonArray V2Imports = new()
    {
        new JsonObject { ["uri"] = "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx" },
        new JsonObject { ["uri"] = "https://ifcx.dev/@openusd.org/usd@v1.ifcx" },
        new JsonObject { ["uri"] = "https://ifcx.openaec.org/schemas/geom@v1.ifcx" },
        new JsonObject { ["uri"] = "https://ifcx.openaec.org/schemas/annotation@v1.ifcx" },
        new JsonObject { ["uri"] = "https://ifcx.openaec.org/schemas/sheet@v1.ifcx" },
    };

    private static readonly Dictionary<string, string> UnitToMm = new()
    {
        ["millimeters"] = "mm",
        ["centimeters"] = "cm",
        ["meters"] = "m",
        ["kilometers"] = "km",
        ["inches"] = "in",
        ["feet"] = "ft",
        ["miles"] = "mi",
        ["unitless"] = "mm",
        ["scientific"] = "mm",
        ["decimal"] = "mm",
        ["engineering"] = "in",
        ["architectural"] = "in",
        ["fractional"] = "in",
    };

    private static readonly Dictionary<int, (double R, double G, double B)> AciTable = new()
    {
        [1] = (1.0, 0.0, 0.0),
        [2] = (1.0, 1.0, 0.0),
        [3] = (0.0, 1.0, 0.0),
        [4] = (0.0, 1.0, 1.0),
        [5] = (0.0, 0.0, 1.0),
        [6] = (1.0, 0.0, 1.0),
        [7] = (1.0, 1.0, 1.0),
        [8] = (0.5, 0.5, 0.5),
        [9] = (0.75, 0.75, 0.75),
    };

    // ---------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------

    /// <summary>
    /// Convert a v1 <see cref="IfcxDocument"/> to a v2 JSON document.
    /// Returns a <see cref="JsonDocument"/> with keys: header, imports, data, media.
    /// </summary>
    public static JsonDocument FromV1(IfcxDocument doc)
    {
        var ctx = new ConvertContext(doc);
        ctx.Convert();
        return JsonDocument.Parse(ctx.Result.ToJsonString());
    }

    /// <summary>
    /// Convert a v1 <see cref="IfcxDocument"/> to a v2 <see cref="JsonObject"/>.
    /// </summary>
    public static JsonObject FromV1AsObject(IfcxDocument doc)
    {
        var ctx = new ConvertContext(doc);
        ctx.Convert();
        return ctx.Result;
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private static string Uid() => Guid.NewGuid().ToString("N")[..12];

    private static JsonArray Ensure3D(JsonElement? pt)
    {
        if (pt == null || pt.Value.ValueKind != JsonValueKind.Array)
            return new JsonArray(0.0, 0.0, 0.0);

        var arr = new List<double>();
        foreach (var el in pt.Value.EnumerateArray())
            arr.Add(el.GetDouble());

        while (arr.Count < 3) arr.Add(0.0);
        return new JsonArray(arr[0], arr[1], arr[2]);
    }

    private static JsonArray Ensure3DFromObj(object? pt)
    {
        if (pt is JsonElement je)
            return Ensure3D(je);
        return new JsonArray(0.0, 0.0, 0.0);
    }

    private static JsonArray BuildInsertMatrix(
        JsonArray insertPt, double xScale, double yScale, double zScale, double rotation)
    {
        double c = Math.Cos(rotation);
        double s = Math.Sin(rotation);
        double tx = insertPt[0]!.GetValue<double>();
        double ty = insertPt[1]!.GetValue<double>();
        double tz = insertPt[2]!.GetValue<double>();

        return new JsonArray(
            new JsonArray(xScale * c, xScale * s, 0.0, 0.0),
            new JsonArray(-yScale * s, yScale * c, 0.0, 0.0),
            new JsonArray(0.0, 0.0, zScale, 0.0),
            new JsonArray(tx, ty, tz, 1.0)
        );
    }

    private static JsonObject? AciToRgb(object? aci)
    {
        int aciVal;
        if (aci is JsonElement je)
        {
            if (je.ValueKind != JsonValueKind.Number) return null;
            aciVal = je.GetInt32();
        }
        else if (aci is int i)
            aciVal = i;
        else
            return null;

        if (aciVal < 1) return null;

        if (AciTable.TryGetValue(aciVal, out var rgb))
            return new JsonObject { ["r"] = rgb.R, ["g"] = rgb.G, ["b"] = rgb.B };

        if (aciVal is >= 1 and <= 255)
        {
            double v = Math.Round(aciVal / 255.0, 3);
            return new JsonObject { ["r"] = v, ["g"] = v, ["b"] = v };
        }
        return null;
    }

    // Helpers for reading entity dicts (which are Dictionary<string, object?>)
    private static bool TryGet(Dictionary<string, object?> d, string key, out JsonElement value)
    {
        if (d.TryGetValue(key, out var obj) && obj is JsonElement je)
        {
            value = je;
            return true;
        }
        value = default;
        return false;
    }

    private static string GetString(Dictionary<string, object?> d, string key, string def = "")
    {
        if (d.TryGetValue(key, out var obj))
        {
            if (obj is string s) return s;
            if (obj is JsonElement je && je.ValueKind == JsonValueKind.String)
                return je.GetString() ?? def;
        }
        return def;
    }

    private static double GetDouble(Dictionary<string, object?> d, string key, double def = 0.0)
    {
        if (d.TryGetValue(key, out var obj))
        {
            if (obj is double dv) return dv;
            if (obj is int iv) return iv;
            if (obj is JsonElement je && je.ValueKind == JsonValueKind.Number)
                return je.GetDouble();
        }
        return def;
    }

    private static bool GetBool(Dictionary<string, object?> d, string key, bool def = false)
    {
        if (d.TryGetValue(key, out var obj))
        {
            if (obj is bool b) return b;
            if (obj is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.True) return true;
                if (je.ValueKind == JsonValueKind.False) return false;
            }
        }
        return def;
    }

    private static JsonElement? GetElement(Dictionary<string, object?> d, string key)
    {
        if (d.TryGetValue(key, out var obj) && obj is JsonElement je)
            return je;
        return null;
    }

    // ---------------------------------------------------------------
    // ConvertContext
    // ---------------------------------------------------------------

    private sealed class ConvertContext
    {
        private readonly IfcxDocument _doc;
        private readonly List<JsonObject> _nodes = [];
        private readonly Dictionary<string, string> _layerPaths = new();
        private readonly Dictionary<string, string> _stylePaths = new();
        private readonly Dictionary<string, string> _blockPaths = new();
        private readonly JsonObject _media = new();

        public JsonObject Result { get; private set; } = new();

        public ConvertContext(IfcxDocument doc) => _doc = doc;

        public void Convert()
        {
            // Determine length unit
            string lengthUnit = "mm";
            if (_doc.Header.TryGetValue("units", out var unitsObj) && unitsObj is JsonElement unitsEl
                && unitsEl.ValueKind == JsonValueKind.Object)
            {
                if (unitsEl.TryGetProperty("linear", out var linearEl))
                {
                    string raw = linearEl.GetString() ?? "millimeters";
                    lengthUnit = UnitToMm.GetValueOrDefault(raw, "mm");
                }
            }

            var header = new JsonObject
            {
                ["ifcxVersion"] = "2.0",
                ["id"] = Guid.NewGuid().ToString(),
                ["timestamp"] = DateTimeOffset.UtcNow.ToString("o"),
                ["units"] = new JsonObject { ["length"] = lengthUnit, ["angle"] = "rad" },
            };

            // Structural root nodes
            var projectNode = new JsonObject
            {
                ["path"] = "project",
                ["children"] = new JsonObject
                {
                    ["drawings"] = "drawings",
                    ["definitions"] = "definitions",
                    ["styles"] = "styles",
                },
                ["attributes"] = new JsonObject { ["ifcx::purpose"] = "drawing" },
            };
            _nodes.Add(projectNode);

            var stylesNode = new JsonObject
            {
                ["path"] = "styles",
                ["children"] = new JsonObject(),
                ["attributes"] = new JsonObject { ["ifcx::purpose"] = "drawing" },
            };
            var definitionsNode = new JsonObject
            {
                ["path"] = "definitions",
                ["children"] = new JsonObject(),
                ["attributes"] = new JsonObject { ["ifcx::purpose"] = "definition" },
            };
            var drawingsNode = new JsonObject
            {
                ["path"] = "drawings",
                ["children"] = new JsonObject(),
                ["attributes"] = new JsonObject { ["ifcx::purpose"] = "drawing" },
            };

            ConvertLayers(stylesNode);
            ConvertTextStyles(stylesNode);
            ConvertDimStyles(stylesNode);
            ConvertLinetypes(stylesNode);
            ConvertBlocks(definitionsNode);

            var viewNode = new JsonObject
            {
                ["path"] = "view-main",
                ["children"] = new JsonObject(),
                ["attributes"] = new JsonObject
                {
                    ["ifcx::purpose"] = "drawing",
                    ["ifcx::view::name"] = "Main",
                    ["ifcx::view::scale"] = 1,
                },
            };
            ConvertEntities(viewNode);

            drawingsNode["children"]!.AsObject()["main"] = "view-main";

            _nodes.Add(stylesNode);
            _nodes.Add(definitionsNode);
            _nodes.Add(drawingsNode);
            _nodes.Add(viewNode);

            var dataArr = new JsonArray();
            foreach (var n in _nodes) dataArr.Add(JsonNode.Parse(n.ToJsonString())!);

            Result = new JsonObject
            {
                ["header"] = header,
                ["imports"] = JsonNode.Parse(V2Imports.ToJsonString())!.AsArray(),
                ["data"] = dataArr,
                ["media"] = JsonNode.Parse(_media.ToJsonString()),
            };
        }

        // ---- Layers ---

        private void ConvertLayers(JsonObject stylesNode)
        {
            if (!_doc.Tables.TryGetValue("layers", out var layersObj)) return;
            if (layersObj is not JsonElement layersEl || layersEl.ValueKind != JsonValueKind.Object) return;

            foreach (var prop in layersEl.EnumerateObject())
            {
                string name = prop.Name;
                var props = prop.Value;
                string path = $"layer-{Uid()}";
                _layerPaths[name] = path;

                var attrs = new JsonObject { ["ifcx::purpose"] = "drawing" };
                var styleVal = new JsonObject();

                if (props.TryGetProperty("color", out var colorEl))
                {
                    var colour = AciToRgb(colorEl);
                    if (colour != null) styleVal["colour"] = colour;
                }
                if (props.TryGetProperty("lineweight", out var lwEl) && lwEl.ValueKind == JsonValueKind.Number)
                {
                    double lw = lwEl.GetDouble();
                    if (lw >= 0) styleVal["lineWeight"] = lw > 10 ? lw / 100.0 : lw;
                }
                if (props.TryGetProperty("frozen", out var frozenEl))
                    styleVal["frozen"] = frozenEl.GetBoolean();
                if (props.TryGetProperty("locked", out var lockedEl))
                    styleVal["locked"] = lockedEl.GetBoolean();
                if (props.TryGetProperty("off", out var offEl))
                    styleVal["visible"] = !offEl.GetBoolean();
                if (props.TryGetProperty("plot", out var plotEl))
                    styleVal["plot"] = plotEl.GetBoolean();

                attrs["ifcx::layer::style"] = styleVal;
                attrs["ifcx::layer::assignment"] = new JsonObject { ["name"] = name };

                var node = new JsonObject { ["path"] = path, ["attributes"] = attrs };
                _nodes.Add(node);
                stylesNode["children"]!.AsObject()[$"layer-{name}"] = path;
            }
        }

        // ---- Text Styles ---

        private void ConvertTextStyles(JsonObject stylesNode)
        {
            if (!_doc.Tables.TryGetValue("textStyles", out var tsObj)) return;
            if (tsObj is not JsonElement tsEl || tsEl.ValueKind != JsonValueKind.Object) return;

            foreach (var prop in tsEl.EnumerateObject())
            {
                string name = prop.Name;
                var props = prop.Value;
                string path = $"textstyle-{Uid()}";
                _stylePaths[$"text:{name}"] = path;

                var styleVal = new JsonObject();
                if (props.TryGetProperty("fontFamily", out var ff))
                    styleVal["font"] = ff.GetString();
                if (props.TryGetProperty("height", out var h))
                    styleVal["size"] = h.GetDouble();
                if (props.TryGetProperty("widthFactor", out var wf))
                    styleVal["widthFactor"] = wf.GetDouble();

                var node = new JsonObject
                {
                    ["path"] = path,
                    ["attributes"] = new JsonObject
                    {
                        ["ifcx::purpose"] = "drawing",
                        ["ifcx::style::textStyle"] = styleVal,
                    },
                };
                _nodes.Add(node);
                stylesNode["children"]!.AsObject()[$"textstyle-{name}"] = path;
            }
        }

        // ---- Dim Styles ---

        private void ConvertDimStyles(JsonObject stylesNode)
        {
            if (!_doc.Tables.TryGetValue("dimStyles", out var dsObj)) return;
            if (dsObj is not JsonElement dsEl || dsEl.ValueKind != JsonValueKind.Object) return;

            foreach (var prop in dsEl.EnumerateObject())
            {
                string name = prop.Name;
                string path = $"dimstyle-{Uid()}";
                _stylePaths[$"dim:{name}"] = path;

                var node = new JsonObject
                {
                    ["path"] = path,
                    ["attributes"] = new JsonObject
                    {
                        ["ifcx::purpose"] = "drawing",
                        ["ifcx::style::dimensionStyle"] = JsonNode.Parse(prop.Value.GetRawText()),
                    },
                };
                _nodes.Add(node);
                stylesNode["children"]!.AsObject()[$"dimstyle-{name}"] = path;
            }
        }

        // ---- Linetypes ---

        private void ConvertLinetypes(JsonObject stylesNode)
        {
            if (!_doc.Tables.TryGetValue("linetypes", out var ltObj)) return;
            if (ltObj is not JsonElement ltEl || ltEl.ValueKind != JsonValueKind.Object) return;

            foreach (var prop in ltEl.EnumerateObject())
            {
                string name = prop.Name;
                var props = prop.Value;
                string path = $"linetype-{Uid()}";
                _stylePaths[$"lt:{name}"] = path;

                var styleVal = new JsonObject();
                if (props.TryGetProperty("description", out var desc))
                    styleVal["description"] = desc.GetString();
                if (props.TryGetProperty("pattern", out var pat))
                    styleVal["dashPattern"] = JsonNode.Parse(pat.GetRawText());

                var node = new JsonObject
                {
                    ["path"] = path,
                    ["attributes"] = new JsonObject
                    {
                        ["ifcx::purpose"] = "drawing",
                        ["ifcx::style::curveStyle"] = styleVal,
                    },
                };
                _nodes.Add(node);
                stylesNode["children"]!.AsObject()[$"linetype-{name}"] = path;
            }
        }

        // ---- Blocks ---

        private void ConvertBlocks(JsonObject definitionsNode)
        {
            if (_doc.Blocks.Count == 0) return;

            foreach (var kvp in _doc.Blocks)
            {
                string name = kvp.Key;
                if (kvp.Value is not JsonElement blockEl || blockEl.ValueKind != JsonValueKind.Object) continue;

                string path = $"def-{Uid()}";
                _blockPaths[name] = path;

                var basePt = blockEl.TryGetProperty("basePoint", out var bp) ? Ensure3D(bp) : new JsonArray(0.0, 0.0, 0.0);
                var children = new JsonObject();

                if (blockEl.TryGetProperty("entities", out var entsEl) && entsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var entEl in entsEl.EnumerateArray())
                    {
                        string entPath = $"e-{Uid()}";
                        var entNode = EntityToNode(entEl, entPath);
                        if (entNode != null)
                        {
                            _nodes.Add(entNode);
                            string childKey = entEl.TryGetProperty("handle", out var hEl)
                                ? hEl.GetString() ?? Uid()
                                : Uid();
                            children[childKey] = entPath;
                        }
                    }
                }

                var node = new JsonObject
                {
                    ["path"] = path,
                    ["children"] = children,
                    ["attributes"] = new JsonObject
                    {
                        ["ifcx::purpose"] = "definition",
                        ["ifcx::component::definition"] = new JsonObject
                        {
                            ["name"] = name,
                            ["basePoint"] = basePt,
                        },
                    },
                };
                _nodes.Add(node);
                definitionsNode["children"]!.AsObject()[name] = path;
            }
        }

        // ---- Entities ---

        private void ConvertEntities(JsonObject viewNode)
        {
            foreach (var ent in _doc.Entities)
            {
                // Each entity is Dictionary<string, object?>, serialize to JsonElement
                string entJson = JsonSerializer.Serialize(ent);
                var entEl = JsonDocument.Parse(entJson).RootElement;

                string path = $"e-{Uid()}";
                var node = EntityToNode(entEl, path);
                if (node != null)
                {
                    _nodes.Add(node);
                    string childKey = entEl.TryGetProperty("handle", out var hEl)
                        ? hEl.GetString() ?? path
                        : path;
                    viewNode["children"]!.AsObject()[childKey] = path;
                }
            }
        }

        // ---- Entity -> Node ---

        private JsonObject? EntityToNode(JsonElement ent, string path)
        {
            string etype = ent.TryGetProperty("type", out var tEl) ? tEl.GetString() ?? "" : "";
            var attrs = new JsonObject { ["ifcx::purpose"] = "drawing" };
            JsonArray? inherits = null;

            switch (etype)
            {
                case "LINE":
                {
                    var start = ent.TryGetProperty("start", out var s) ? Ensure3D(s) : new JsonArray(0.0, 0.0, 0.0);
                    var end = ent.TryGetProperty("end", out var e) ? Ensure3D(e) : new JsonArray(0.0, 0.0, 0.0);
                    attrs["ifcx::geom::line"] = new JsonObject { ["points"] = new JsonArray(start, end) };
                    break;
                }
                case "CIRCLE":
                {
                    var center = ent.TryGetProperty("center", out var c) ? Ensure3D(c) : new JsonArray(0.0, 0.0, 0.0);
                    double radius = ent.TryGetProperty("radius", out var r) ? r.GetDouble() : 0;
                    attrs["ifcx::geom::circle"] = new JsonObject { ["center"] = center, ["radius"] = radius };
                    break;
                }
                case "ARC":
                {
                    var center = ent.TryGetProperty("center", out var c) ? Ensure3D(c) : new JsonArray(0.0, 0.0, 0.0);
                    double radius = ent.TryGetProperty("radius", out var r) ? r.GetDouble() : 0;
                    double sa = ent.TryGetProperty("startAngle", out var saEl) ? saEl.GetDouble() : 0;
                    double ea = ent.TryGetProperty("endAngle", out var eaEl) ? eaEl.GetDouble() : 0;
                    attrs["ifcx::geom::trimmedCurve"] = new JsonObject
                    {
                        ["center"] = center, ["radius"] = radius,
                        ["startAngle"] = sa, ["endAngle"] = ea,
                    };
                    break;
                }
                case "ELLIPSE":
                {
                    var center = ent.TryGetProperty("center", out var c) ? Ensure3D(c) : new JsonArray(0.0, 0.0, 0.0);
                    double semi1 = ent.TryGetProperty("semiAxis1", out var s1) ? s1.GetDouble()
                        : ent.TryGetProperty("majorAxis", out var ma) ? ma.GetDouble() : 0;
                    double semi2 = ent.TryGetProperty("semiAxis2", out var s2) ? s2.GetDouble()
                        : ent.TryGetProperty("minorAxis", out var mi) ? mi.GetDouble() : 0;
                    double rot = ent.TryGetProperty("rotation", out var rEl) ? rEl.GetDouble() : 0;
                    attrs["ifcx::geom::ellipse"] = new JsonObject
                    {
                        ["center"] = center, ["semiAxis1"] = semi1, ["semiAxis2"] = semi2, ["rotation"] = rot,
                    };
                    break;
                }
                case "SPLINE":
                {
                    var bspline = new JsonObject();
                    if (ent.TryGetProperty("degree", out var deg))
                        bspline["degree"] = deg.GetInt32();
                    if (ent.TryGetProperty("controlPoints", out var cp))
                        bspline["controlPoints"] = Ensure3DArray(cp);
                    else if (ent.TryGetProperty("vertices", out var vts))
                        bspline["controlPoints"] = Ensure3DArray(vts);
                    if (ent.TryGetProperty("knots", out var k))
                        bspline["knots"] = JsonNode.Parse(k.GetRawText());
                    if (ent.TryGetProperty("weights", out var w))
                        bspline["weights"] = JsonNode.Parse(w.GetRawText());
                    attrs["ifcx::geom::bspline"] = bspline;
                    break;
                }
                case "LWPOLYLINE":
                {
                    bool closed = ent.TryGetProperty("closed", out var cl) && cl.GetBoolean();
                    bool hasBulge = false;
                    if (ent.TryGetProperty("bulges", out var bulgesEl) && bulgesEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var b in bulgesEl.EnumerateArray())
                            if (b.GetDouble() != 0) { hasBulge = true; break; }
                    }
                    if (hasBulge)
                    {
                        var segments = LwpolyToSegments(ent);
                        attrs["ifcx::geom::compositeCurve"] = new JsonObject
                        {
                            ["segments"] = segments, ["closed"] = closed,
                        };
                    }
                    else
                    {
                        var pts = ent.TryGetProperty("vertices", out var v) ? Ensure3DArray(v) : new JsonArray();
                        attrs["ifcx::geom::polyline"] = new JsonObject
                        {
                            ["points"] = pts, ["closed"] = closed,
                        };
                    }
                    break;
                }
                case "POLYLINE2D":
                case "POLYLINE3D":
                {
                    bool closed = ent.TryGetProperty("closed", out var cl) && cl.GetBoolean();
                    var pts = ent.TryGetProperty("vertices", out var v) ? Ensure3DArray(v) : new JsonArray();
                    attrs["ifcx::geom::polyline"] = new JsonObject { ["points"] = pts, ["closed"] = closed };
                    break;
                }
                case "TEXT":
                {
                    var textVal = new JsonObject { ["value"] = ent.TryGetProperty("text", out var tx) ? tx.GetString() ?? "" : "" };
                    if (ent.TryGetProperty("insertionPoint", out var ip))
                        textVal["placement"] = Ensure3D(ip);
                    if (ent.TryGetProperty("height", out var h))
                        textVal["height"] = h.GetDouble();
                    if (ent.TryGetProperty("rotation", out var rot))
                        textVal["style"] = new JsonObject { ["rotation"] = rot.GetDouble() };
                    if (ent.TryGetProperty("horizontalAlignment", out var ha))
                        textVal["alignment"] = ha.GetString();
                    if (ent.TryGetProperty("style", out var ts))
                    {
                        string tsName = ts.GetString() ?? "";
                        if (_stylePaths.TryGetValue($"text:{tsName}", out var tsPath))
                            attrs["ifcx::connects::style"] = new JsonObject { ["ref"] = tsPath };
                    }
                    attrs["ifcx::annotation::text"] = textVal;
                    break;
                }
                case "MTEXT":
                {
                    var textVal = new JsonObject { ["value"] = ent.TryGetProperty("text", out var tx) ? tx.GetString() ?? "" : "" };
                    if (ent.TryGetProperty("insertionPoint", out var ip))
                        textVal["placement"] = Ensure3D(ip);
                    if (ent.TryGetProperty("height", out var h))
                        textVal["height"] = h.GetDouble();
                    if (ent.TryGetProperty("width", out var w))
                        textVal["width"] = w.GetDouble();
                    if (ent.TryGetProperty("attachment", out var att))
                        textVal["attachment"] = att.GetString();
                    if (ent.TryGetProperty("style", out var ts))
                    {
                        string tsName = ts.GetString() ?? "";
                        if (_stylePaths.TryGetValue($"text:{tsName}", out var tsPath))
                            attrs["ifcx::connects::style"] = new JsonObject { ["ref"] = tsPath };
                    }
                    attrs["ifcx::annotation::text"] = textVal;
                    break;
                }
                case var dim when dim.StartsWith("DIMENSION"):
                {
                    var subtypeMap = new Dictionary<string, string>
                    {
                        ["DIMENSION_LINEAR"] = "linear",
                        ["DIMENSION_ALIGNED"] = "aligned",
                        ["DIMENSION_ANGULAR"] = "angular",
                        ["DIMENSION_ANGULAR3P"] = "angular",
                        ["DIMENSION_DIAMETER"] = "diameter",
                        ["DIMENSION_RADIUS"] = "radius",
                        ["DIMENSION_ORDINATE"] = "ordinate",
                        ["DIMENSION"] = "linear",
                    };
                    var dimVal = new JsonObject { ["subtype"] = subtypeMap.GetValueOrDefault(etype, "linear") };
                    var measurePts = new JsonArray();
                    if (ent.TryGetProperty("defPoint1", out var dp1)) measurePts.Add(Ensure3D(dp1));
                    if (ent.TryGetProperty("defPoint2", out var dp2)) measurePts.Add(Ensure3D(dp2));
                    if (measurePts.Count > 0) dimVal["measurePoints"] = measurePts;
                    if (ent.TryGetProperty("dimLine", out var dl)) dimVal["dimensionLine"] = Ensure3D(dl);
                    if (ent.TryGetProperty("text", out var dtx)) dimVal["text"] = dtx.GetString();
                    if (ent.TryGetProperty("measurement", out var meas)) dimVal["value"] = meas.GetDouble();
                    if (ent.TryGetProperty("dimStyle", out var ds))
                    {
                        string dsName = ds.GetString() ?? "";
                        if (_stylePaths.TryGetValue($"dim:{dsName}", out var dsPath))
                            attrs["ifcx::connects::style"] = new JsonObject { ["ref"] = dsPath };
                    }
                    attrs["ifcx::annotation::dimension"] = dimVal;
                    break;
                }
                case "LEADER":
                {
                    var leaderVal = new JsonObject();
                    if (ent.TryGetProperty("vertices", out var vts))
                        leaderVal["path"] = Ensure3DArray(vts);
                    leaderVal["arrowhead"] = ent.TryGetProperty("hasArrowhead", out var ah) ? ah.GetBoolean() : true;
                    attrs["ifcx::annotation::leader"] = leaderVal;
                    break;
                }
                case "HATCH":
                {
                    bool solid = (ent.TryGetProperty("solid", out var solEl) && solEl.GetBoolean())
                        || (ent.TryGetProperty("patternType", out var ptEl) && ptEl.GetString() == "SOLID");
                    if (solid)
                    {
                        var fill = new JsonObject();
                        if (ent.TryGetProperty("color", out var colEl))
                        {
                            var colour = AciToRgb(colEl);
                            if (colour != null) fill["colour"] = colour;
                        }
                        attrs["ifcx::hatch::solid"] = fill;
                    }
                    else
                    {
                        var pattern = new JsonObject();
                        if (ent.TryGetProperty("patternName", out var pn)) pattern["name"] = pn.GetString();
                        if (ent.TryGetProperty("patternAngle", out var pa)) pattern["angle"] = pa.GetDouble();
                        if (ent.TryGetProperty("patternScale", out var ps)) pattern["scale"] = ps.GetDouble();
                        attrs["ifcx::hatch::pattern"] = pattern;
                    }
                    if (ent.TryGetProperty("boundary", out var bnd))
                        attrs["ifcx::hatch::boundary"] = JsonNode.Parse(bnd.GetRawText());
                    break;
                }
                case "INSERT":
                {
                    string blockName = ent.TryGetProperty("name", out var nm) ? nm.GetString() ?? ""
                        : ent.TryGetProperty("blockName", out var bn) ? bn.GetString() ?? "" : "";
                    if (!string.IsNullOrEmpty(blockName) && _blockPaths.TryGetValue(blockName, out var bPath))
                        inherits = new JsonArray(bPath);

                    var insertPt = ent.TryGetProperty("insertionPoint", out var ipEl) ? Ensure3D(ipEl) : new JsonArray(0.0, 0.0, 0.0);
                    double xScale = ent.TryGetProperty("xScale", out var xs) ? xs.GetDouble()
                        : ent.TryGetProperty("scaleX", out var sx) ? sx.GetDouble() : 1.0;
                    double yScale = ent.TryGetProperty("yScale", out var ys) ? ys.GetDouble()
                        : ent.TryGetProperty("scaleY", out var sy) ? sy.GetDouble() : 1.0;
                    double zScale = ent.TryGetProperty("zScale", out var zs) ? zs.GetDouble()
                        : ent.TryGetProperty("scaleZ", out var sz) ? sz.GetDouble() : 1.0;
                    double rotation = ent.TryGetProperty("rotation", out var rEl) ? rEl.GetDouble() : 0.0;

                    attrs["ifcx::xform::matrix"] = BuildInsertMatrix(insertPt, xScale, yScale, zScale, rotation);
                    break;
                }
                case "SOLID":
                case "TRACE":
                case "3DFACE":
                {
                    var points = new JsonArray();
                    foreach (var key in new[] { "p1", "p2", "p3", "p4" })
                        if (ent.TryGetProperty(key, out var p)) points.Add(Ensure3D(p));
                    if (points.Count == 0 && ent.TryGetProperty("vertices", out var v))
                        points = Ensure3DArray(v);
                    attrs["ifcx::geom::polygon"] = new JsonObject { ["points"] = points };
                    break;
                }
                case "VIEWPORT":
                {
                    var vp = new JsonObject();
                    if (ent.TryGetProperty("center", out var c))
                    {
                        var c3 = Ensure3D(c);
                        vp["center"] = new JsonArray(c3[0]!.GetValue<double>(), c3[1]!.GetValue<double>());
                    }
                    if (ent.TryGetProperty("width", out var w)) vp["width"] = w.GetDouble();
                    if (ent.TryGetProperty("height", out var h)) vp["height"] = h.GetDouble();
                    if (ent.TryGetProperty("viewTarget", out var vt)) vp["viewTarget"] = Ensure3D(vt);
                    if (ent.TryGetProperty("viewScale", out var vs)) vp["viewScale"] = vs.GetDouble();
                    else if (ent.TryGetProperty("customScale", out var cs)) vp["viewScale"] = cs.GetDouble();
                    attrs["ifcx::sheet::viewport"] = vp;
                    break;
                }
                case "POINT":
                {
                    var pos = ent.TryGetProperty("position", out var p) ? Ensure3D(p)
                        : ent.TryGetProperty("insertionPoint", out var ip) ? Ensure3D(ip) : new JsonArray(0.0, 0.0, 0.0);
                    attrs["ifcx::geom::point"] = new JsonObject { ["position"] = pos };
                    break;
                }
                case "RAY":
                {
                    var origin = ent.TryGetProperty("origin", out var o) ? Ensure3D(o)
                        : ent.TryGetProperty("start", out var s) ? Ensure3D(s) : new JsonArray(0.0, 0.0, 0.0);
                    var dir = ent.TryGetProperty("direction", out var d) ? Ensure3D(d) : new JsonArray(1.0, 0.0, 0.0);
                    attrs["ifcx::geom::ray"] = new JsonObject { ["origin"] = origin, ["direction"] = dir };
                    break;
                }
                case "XLINE":
                {
                    var origin = ent.TryGetProperty("origin", out var o) ? Ensure3D(o)
                        : ent.TryGetProperty("start", out var s) ? Ensure3D(s) : new JsonArray(0.0, 0.0, 0.0);
                    var dir = ent.TryGetProperty("direction", out var d) ? Ensure3D(d) : new JsonArray(1.0, 0.0, 0.0);
                    attrs["ifcx::geom::constructionLine"] = new JsonObject { ["origin"] = origin, ["direction"] = dir };
                    break;
                }
                case "3DSOLID":
                case "BODY":
                case "REGION":
                {
                    string data = ent.TryGetProperty("acisData", out var ad) ? ad.GetString() ?? ""
                        : ent.TryGetProperty("data", out var dd) ? dd.GetString() ?? "" : "";
                    attrs["ifcx::geom::solid"] = new JsonObject { ["data"] = data };
                    break;
                }
                case "MESH":
                {
                    var meshVal = new JsonObject();
                    if (ent.TryGetProperty("vertices", out var v))
                        meshVal["points"] = Ensure3DArray(v);
                    if (ent.TryGetProperty("faces", out var f))
                        meshVal["faceVertexIndices"] = JsonNode.Parse(f.GetRawText());
                    attrs["ifcx::geom::mesh"] = meshVal;
                    break;
                }
                case "IMAGE":
                {
                    var img = new JsonObject();
                    if (ent.TryGetProperty("insertionPoint", out var ip))
                        img["insertionPoint"] = Ensure3D(ip);
                    if (ent.TryGetProperty("imageSize", out var isz))
                        img["imageSize"] = JsonNode.Parse(isz.GetRawText());
                    if (ent.TryGetProperty("imagePath", out var ipath))
                    {
                        string mediaId = Uid();
                        img["mediaId"] = mediaId;
                        _media[mediaId] = new JsonObject { ["path"] = ipath.GetString() };
                    }
                    attrs["ifcx::image::raster"] = img;
                    break;
                }
                case "WIPEOUT":
                {
                    JsonArray boundary;
                    if (ent.TryGetProperty("boundary", out var bnd))
                        boundary = Ensure3DArray(bnd);
                    else if (ent.TryGetProperty("vertices", out var v))
                        boundary = Ensure3DArray(v);
                    else
                        boundary = new JsonArray();
                    attrs["ifcx::image::wipeout"] = new JsonObject { ["boundary"] = boundary };
                    break;
                }
                case "TEXT_NODE":
                {
                    var textVal = new JsonObject { ["value"] = "" };
                    if (ent.TryGetProperty("origin", out var o))
                        textVal["placement"] = Ensure3D(o);
                    if (ent.TryGetProperty("height", out var h))
                        textVal["height"] = h.GetDouble();
                    attrs["ifcx::annotation::text"] = textVal;
                    break;
                }
                case "COMPLEX_CHAIN":
                case "COMPLEX_SHAPE":
                {
                    attrs["ifcx::geom::compositeCurve"] = new JsonObject
                    {
                        ["segments"] = new JsonArray(),
                        ["closed"] = etype == "COMPLEX_SHAPE",
                    };
                    break;
                }
                case "3DSURFACE":
                {
                    attrs["ifcx::geom::solid"] = new JsonObject { ["data"] = "" };
                    break;
                }
                case "BSPLINE_CURVE":
                {
                    attrs["ifcx::geom::bspline"] = new JsonObject();
                    break;
                }
                case "BSPLINE_POLE":
                {
                    var verts = ent.TryGetProperty("vertices", out var v) ? Ensure3DArray(v) : new JsonArray();
                    attrs["ifcx::geom::bspline"] = new JsonObject { ["controlPoints"] = verts };
                    break;
                }
                default:
                {
                    var data = new JsonObject();
                    var skip = new HashSet<string> { "type", "handle", "layer", "color", "linetype", "lineweight", "style" };
                    foreach (var prop in ent.EnumerateObject())
                    {
                        if (!skip.Contains(prop.Name))
                            data[prop.Name] = JsonNode.Parse(prop.Value.GetRawText());
                    }
                    attrs["ifcx::unknown::entity"] = new JsonObject { ["originalType"] = etype, ["data"] = data };
                    break;
                }
            }

            // Connections: layer
            string layerName = ent.TryGetProperty("layer", out var lEl) ? lEl.GetString() ?? "0" : "0";
            if (_layerPaths.TryGetValue(layerName, out var layerPath))
                attrs["ifcx::connects::layer"] = new JsonObject { ["ref"] = layerPath };

            // Curve style overrides
            var curveStyle = new JsonObject();
            if (ent.TryGetProperty("color", out var colorEl2))
            {
                var colour = AciToRgb(colorEl2);
                if (colour != null) curveStyle["colour"] = colour;
            }
            if (ent.TryGetProperty("lineweight", out var lwEl2))
                curveStyle["width"] = lwEl2.GetDouble();
            if (ent.TryGetProperty("linetype", out var ltEl2) && ltEl2.ValueKind == JsonValueKind.String)
            {
                string lt = ltEl2.GetString() ?? "";
                if (!string.IsNullOrEmpty(lt))
                {
                    if (_stylePaths.TryGetValue($"lt:{lt}", out var ltPath))
                    {
                        if (!attrs.ContainsKey("ifcx::connects::style"))
                            attrs["ifcx::connects::style"] = new JsonObject();
                        attrs["ifcx::connects::style"]!.AsObject()["ref"] = ltPath;
                    }
                    else
                    {
                        curveStyle["pattern"] = lt;
                    }
                }
            }
            if (curveStyle.Count > 0)
                attrs["ifcx::style::curveStyle"] = curveStyle;

            var node = new JsonObject { ["path"] = path, ["attributes"] = attrs };
            if (inherits != null)
                node["inherits"] = inherits;
            return node;
        }

        // ---- LWPOLYLINE bulge -> segments ---

        private static JsonArray LwpolyToSegments(JsonElement ent)
        {
            var segments = new JsonArray();
            if (!ent.TryGetProperty("vertices", out var vertsEl) || vertsEl.ValueKind != JsonValueKind.Array)
                return segments;

            var verts = new List<double[]>();
            foreach (var v in vertsEl.EnumerateArray())
            {
                var pt = new List<double>();
                foreach (var coord in v.EnumerateArray()) pt.Add(coord.GetDouble());
                while (pt.Count < 3) pt.Add(0.0);
                verts.Add(pt.Take(3).ToArray());
            }

            var bulges = new List<double>();
            if (ent.TryGetProperty("bulges", out var bulgesEl) && bulgesEl.ValueKind == JsonValueKind.Array)
                foreach (var b in bulgesEl.EnumerateArray()) bulges.Add(b.GetDouble());

            while (bulges.Count < verts.Count) bulges.Add(0.0);

            bool closed = ent.TryGetProperty("closed", out var cl) && cl.GetBoolean();
            int n = verts.Count;
            int count = closed ? n : n - 1;

            for (int i = 0; i < count; i++)
            {
                var p1 = verts[i];
                var p2 = verts[(i + 1) % n];
                double bulge = bulges[i];

                if (Math.Abs(bulge) < 1e-10)
                {
                    segments.Add(new JsonObject
                    {
                        ["type"] = "line",
                        ["points"] = new JsonArray(
                            new JsonArray(p1[0], p1[1], p1[2]),
                            new JsonArray(p2[0], p2[1], p2[2])),
                    });
                }
                else
                {
                    double dx = p2[0] - p1[0];
                    double dy = p2[1] - p1[1];
                    double chord = Math.Sqrt(dx * dx + dy * dy);
                    if (chord < 1e-12)
                    {
                        segments.Add(new JsonObject
                        {
                            ["type"] = "line",
                            ["points"] = new JsonArray(
                                new JsonArray(p1[0], p1[1], p1[2]),
                                new JsonArray(p2[0], p2[1], p2[2])),
                        });
                        continue;
                    }
                    double sagitta = Math.Abs(bulge) * chord / 2.0;
                    double radius = (chord * chord / 4.0 + sagitta * sagitta) / (2.0 * sagitta);
                    double mx = (p1[0] + p2[0]) / 2.0;
                    double my = (p1[1] + p2[1]) / 2.0;
                    double nx = -dy / chord;
                    double ny = dx / chord;
                    double d = radius - sagitta;
                    double sign = bulge > 0 ? 1.0 : -1.0;
                    double cx = mx + sign * d * nx;
                    double cy = my + sign * d * ny;
                    double startAngle = Math.Atan2(p1[1] - cy, p1[0] - cx);
                    double endAngle = Math.Atan2(p2[1] - cy, p2[0] - cx);

                    segments.Add(new JsonObject
                    {
                        ["type"] = "arc",
                        ["center"] = new JsonArray(cx, cy, 0.0),
                        ["radius"] = radius,
                        ["startAngle"] = startAngle,
                        ["endAngle"] = endAngle,
                    });
                }
            }

            return segments;
        }

        private static JsonArray Ensure3DArray(JsonElement el)
        {
            var arr = new JsonArray();
            if (el.ValueKind != JsonValueKind.Array) return arr;
            foreach (var item in el.EnumerateArray())
                arr.Add(Ensure3D(item));
            return arr;
        }
    }
}
