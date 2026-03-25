using System.Text.Json;
using System.Text.Json.Nodes;
using Ifcx.Types;

namespace Ifcx.Converters.V2;

/// <summary>
/// Converts a v2 IFC5-node-based JSON structure back to a v1 <see cref="IfcxDocument"/>.
/// </summary>
public static class V2Export
{
    // ---------------------------------------------------------------
    // ACI colour table (RGB -> nearest ACI)
    // ---------------------------------------------------------------

    private static readonly (int Aci, double R, double G, double B)[] AciTable =
    [
        (1, 1.0, 0.0, 0.0),
        (2, 1.0, 1.0, 0.0),
        (3, 0.0, 1.0, 0.0),
        (4, 0.0, 1.0, 1.0),
        (5, 0.0, 0.0, 1.0),
        (6, 1.0, 0.0, 1.0),
        (7, 1.0, 1.0, 1.0),
        (8, 0.5, 0.5, 0.5),
        (9, 0.75, 0.75, 0.75),
    ];

    private static readonly Dictionary<string, string> UnitMap = new()
    {
        ["mm"] = "millimeters",
        ["cm"] = "centimeters",
        ["m"] = "meters",
        ["km"] = "kilometers",
        ["in"] = "inches",
        ["ft"] = "feet",
        ["mi"] = "miles",
    };

    // ---------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------

    /// <summary>
    /// Convert a v2 <see cref="JsonElement"/> to a v1 <see cref="IfcxDocument"/>.
    /// </summary>
    public static IfcxDocument ToV1(JsonElement v2Data)
    {
        var v2 = JsonNode.Parse(v2Data.GetRawText())!.AsObject();
        return ConvertInternal(v2);
    }

    /// <summary>
    /// Convert a v2 <see cref="JsonObject"/> to a v1 <see cref="IfcxDocument"/>.
    /// </summary>
    public static IfcxDocument ToV1(JsonObject v2Data)
    {
        return ConvertInternal(v2Data);
    }

    /// <summary>
    /// Convert a v2 JSON string to a v1 <see cref="IfcxDocument"/>.
    /// </summary>
    public static IfcxDocument ToV1(string v2Json)
    {
        var v2 = JsonNode.Parse(v2Json)!.AsObject();
        return ConvertInternal(v2);
    }

    // ---------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------

    private static IfcxDocument ConvertInternal(JsonObject v2)
    {
        var ctx = new ExportContext(v2);
        ctx.Convert();
        return ctx.Doc;
    }

    private static int RgbToAci(JsonObject? rgb)
    {
        if (rgb == null) return 7;
        double r = rgb["r"]?.GetValue<double>() ?? 1;
        double g = rgb["g"]?.GetValue<double>() ?? 1;
        double b = rgb["b"]?.GetValue<double>() ?? 1;

        int bestAci = 7;
        double bestDist = double.MaxValue;
        foreach (var (aci, cr, cg, cb) in AciTable)
        {
            double d = (r - cr) * (r - cr) + (g - cg) * (g - cg) + (b - cb) * (b - cb);
            if (d < bestDist) { bestDist = d; bestAci = aci; }
        }
        return bestAci;
    }

    // ---------------------------------------------------------------
    // ExportContext
    // ---------------------------------------------------------------

    private sealed class ExportContext
    {
        private readonly JsonObject _v2;
        private readonly Dictionary<string, JsonObject> _nodesByPath = new();
        private readonly Dictionary<string, string> _layerNameByPath = new();
        private readonly Dictionary<string, JsonObject> _styles = new();
        private readonly Dictionary<string, JsonObject> _definitions = new();

        public IfcxDocument Doc { get; } = new();

        public ExportContext(JsonObject v2) => _v2 = v2;

        public void Convert()
        {
            // Index nodes
            var data = _v2["data"]?.AsArray();
            if (data != null)
            {
                foreach (var item in data)
                {
                    if (item is not JsonObject node) continue;
                    string path = node["path"]?.GetValue<string>() ?? "";
                    if (!string.IsNullOrEmpty(path))
                        _nodesByPath[path] = node;
                }
            }

            ConvertHeader();

            // First pass: layers, styles, definitions
            if (data != null)
            {
                foreach (var item in data)
                {
                    if (item is not JsonObject node) continue;
                    var attrs = node["attributes"]?.AsObject();
                    if (attrs == null) continue;
                    string path = node["path"]?.GetValue<string>() ?? "";

                    // Layers
                    if (attrs.ContainsKey("ifcx::layer::assignment"))
                    {
                        string name = attrs["ifcx::layer::assignment"]?["name"]?.GetValue<string>() ?? path;
                        _layerNameByPath[path] = name;

                        var layerProps = new Dictionary<string, object?>();
                        var ls = attrs["ifcx::layer::style"]?.AsObject();
                        if (ls != null)
                        {
                            if (ls.ContainsKey("colour"))
                                layerProps["color"] = RgbToAci(ls["colour"]?.AsObject());
                            if (ls.ContainsKey("lineWeight"))
                                layerProps["lineweight"] = (int)(ls["lineWeight"]!.GetValue<double>() * 100);
                            if (ls.ContainsKey("frozen"))
                                layerProps["frozen"] = ls["frozen"]!.GetValue<bool>();
                            if (ls.ContainsKey("locked"))
                                layerProps["locked"] = ls["locked"]!.GetValue<bool>();
                            if (ls.ContainsKey("visible"))
                                layerProps["off"] = !ls["visible"]!.GetValue<bool>();
                            if (ls.ContainsKey("plot"))
                                layerProps["plot"] = ls["plot"]!.GetValue<bool>();
                        }

                        var layersTable = GetOrCreateTable("layers");
                        layersTable[name] = JsonSerializer.SerializeToElement(layerProps);
                    }

                    // Text styles
                    if (attrs.ContainsKey("ifcx::style::textStyle"))
                        _styles[path] = attrs["ifcx::style::textStyle"]!.AsObject();

                    // Curve styles
                    if (attrs.ContainsKey("ifcx::style::curveStyle"))
                        _styles[path] = attrs["ifcx::style::curveStyle"]!.AsObject();

                    // Definitions
                    if (attrs.ContainsKey("ifcx::component::definition"))
                        _definitions[path] = node;
                }
            }

            // Convert text styles
            foreach (var (path, style) in _styles)
            {
                if (!style.ContainsKey("font")) continue;
                string name = path.Contains('-') ? path[(path.IndexOf('-') + 1)..] : path;
                var props = new Dictionary<string, object?>();
                if (style.ContainsKey("font"))
                    props["fontFamily"] = style["font"]!.GetValue<string>();
                if (style.ContainsKey("size"))
                    props["height"] = style["size"]!.GetValue<double>();
                if (style.ContainsKey("widthFactor"))
                    props["widthFactor"] = style["widthFactor"]!.GetValue<double>();

                var tsTable = GetOrCreateTable("textStyles");
                tsTable[name] = JsonSerializer.SerializeToElement(props);
            }

            // Convert blocks
            foreach (var (path, defNode) in _definitions)
            {
                var comp = defNode["attributes"]?["ifcx::component::definition"]?.AsObject();
                string name = comp?["name"]?.GetValue<string>() ?? path;
                var basePt = comp?["basePoint"]?.AsArray();
                var blockEntities = new List<Dictionary<string, object?>>();

                var children = defNode["children"]?.AsObject();
                if (children != null)
                {
                    foreach (var (_, childPathNode) in children)
                    {
                        string childPath = childPathNode?.GetValue<string>() ?? "";
                        if (_nodesByPath.TryGetValue(childPath, out var childNode))
                        {
                            var ent = NodeToEntity(childNode);
                            if (ent != null) blockEntities.Add(ent);
                        }
                    }
                }

                var block = new Dictionary<string, object?>
                {
                    ["basePoint"] = basePt != null ? JsonSerializer.SerializeToElement(basePt) : JsonSerializer.SerializeToElement(new[] { 0, 0, 0 }),
                    ["entities"] = JsonSerializer.SerializeToElement(blockEntities),
                };
                Doc.Blocks[name] = JsonSerializer.SerializeToElement(block);
            }

            // Convert entities from views
            bool foundEntities = false;
            if (data != null)
            {
                foreach (var item in data)
                {
                    if (item is not JsonObject node) continue;
                    var attrs = node["attributes"]?.AsObject();
                    if (attrs == null || !attrs.ContainsKey("ifcx::view::name")) continue;

                    var children = node["children"]?.AsObject();
                    if (children == null) continue;

                    foreach (var (_, childPathNode) in children)
                    {
                        string childPath = childPathNode?.GetValue<string>() ?? "";
                        if (_nodesByPath.TryGetValue(childPath, out var childNode))
                        {
                            var ent = NodeToEntity(childNode);
                            if (ent != null)
                            {
                                Doc.AddEntity(ent);
                                foundEntities = true;
                            }
                        }
                    }
                }
            }

            // Fallback: scan all nodes for geometry
            if (!foundEntities && data != null)
            {
                foreach (var item in data)
                {
                    if (item is not JsonObject node) continue;
                    var ent = NodeToEntity(node);
                    if (ent != null) Doc.AddEntity(ent);
                }
            }
        }

        private void ConvertHeader()
        {
            var header = _v2["header"]?.AsObject();
            if (header == null) return;

            var units = header["units"]?.AsObject();
            string length = units?["length"]?.GetValue<string>() ?? "mm";
            string linearUnit = UnitMap.GetValueOrDefault(length, "millimeters");

            Doc.Header["units"] = JsonSerializer.SerializeToElement(new Dictionary<string, string>
            {
                ["linear"] = linearUnit,
                ["measurement"] = "metric",
            });
        }

        private Dictionary<string, object?> GetOrCreateTable(string tableName)
        {
            // Since Tables is Dictionary<string, object?>, we need to manage sub-dicts carefully
            if (!Doc.Tables.TryGetValue(tableName, out var existing) || existing is not JsonElement)
            {
                var dict = new Dictionary<string, object?>();
                Doc.Tables[tableName] = dict;
                return dict;
            }
            // Already a Dictionary from a previous call
            if (existing is Dictionary<string, object?> d)
                return d;

            var newDict = new Dictionary<string, object?>();
            Doc.Tables[tableName] = newDict;
            return newDict;
        }

        private Dictionary<string, object?>? NodeToEntity(JsonObject node)
        {
            var attrs = node["attributes"]?.AsObject();
            if (attrs == null) return null;

            var result = new Dictionary<string, object?>();

            // Layer
            string layerRef = attrs["ifcx::connects::layer"]?["ref"]?.GetValue<string>() ?? "";
            if (!string.IsNullOrEmpty(layerRef) && _layerNameByPath.TryGetValue(layerRef, out var layerName))
                result["layer"] = layerName;

            // Curve style
            var cs = attrs["ifcx::style::curveStyle"]?.AsObject();
            if (cs != null)
            {
                if (cs.ContainsKey("colour"))
                    result["color"] = RgbToAci(cs["colour"]?.AsObject());
                if (cs.ContainsKey("width"))
                    result["lineweight"] = cs["width"]!.GetValue<double>();
                if (cs.ContainsKey("pattern") && cs["pattern"] is JsonNode pn && pn.GetValueKind() == JsonValueKind.String)
                    result["linetype"] = pn.GetValue<string>();
            }

            // Geometry attributes
            if (attrs.ContainsKey("ifcx::geom::line"))
            {
                result["type"] = "LINE";
                var pts = attrs["ifcx::geom::line"]!["points"]?.AsArray();
                if (pts != null && pts.Count >= 2)
                {
                    result["start"] = ToDoubleList(pts[0]);
                    result["end"] = ToDoubleList(pts[1]);
                }
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::circle"))
            {
                result["type"] = "CIRCLE";
                var g = attrs["ifcx::geom::circle"]!.AsObject();
                result["center"] = ToDoubleList(g["center"]);
                result["radius"] = g["radius"]?.GetValue<double>() ?? 0;
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::trimmedCurve"))
            {
                result["type"] = "ARC";
                var g = attrs["ifcx::geom::trimmedCurve"]!.AsObject();
                result["center"] = ToDoubleList(g["center"]);
                result["radius"] = g["radius"]?.GetValue<double>() ?? 0;
                result["startAngle"] = g["startAngle"]?.GetValue<double>() ?? 0;
                result["endAngle"] = g["endAngle"]?.GetValue<double>() ?? 0;
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::ellipse"))
            {
                result["type"] = "ELLIPSE";
                var g = attrs["ifcx::geom::ellipse"]!.AsObject();
                result["center"] = ToDoubleList(g["center"]);
                result["semiAxis1"] = g["semiAxis1"]?.GetValue<double>() ?? 0;
                result["semiAxis2"] = g["semiAxis2"]?.GetValue<double>() ?? 0;
                result["rotation"] = g["rotation"]?.GetValue<double>() ?? 0;
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::bspline"))
            {
                result["type"] = "SPLINE";
                var g = attrs["ifcx::geom::bspline"]!.AsObject();
                if (g.ContainsKey("degree")) result["degree"] = g["degree"]!.GetValue<int>();
                if (g.ContainsKey("controlPoints")) result["controlPoints"] = CloneNode(g["controlPoints"]);
                if (g.ContainsKey("knots")) result["knots"] = CloneNode(g["knots"]);
                if (g.ContainsKey("weights")) result["weights"] = CloneNode(g["weights"]);
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::compositeCurve"))
            {
                result["type"] = "LWPOLYLINE";
                var g = attrs["ifcx::geom::compositeCurve"]!.AsObject();
                result["closed"] = g["closed"]?.GetValue<bool>() ?? false;
                var (verts, bulges) = SegmentsToLwpoly(g["segments"]?.AsArray());
                result["vertices"] = verts;
                if (bulges.Any(b => b != 0)) result["bulges"] = bulges;
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::polyline"))
            {
                result["type"] = "LWPOLYLINE";
                var g = attrs["ifcx::geom::polyline"]!.AsObject();
                result["closed"] = g["closed"]?.GetValue<bool>() ?? false;
                result["vertices"] = CloneNode(g["points"]);
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::polygon"))
            {
                var g = attrs["ifcx::geom::polygon"]!.AsObject();
                var pts = g["points"]?.AsArray();
                result["type"] = (pts?.Count ?? 0) <= 4 ? "SOLID" : "3DFACE";
                if (pts != null)
                {
                    for (int i = 0; i < Math.Min(pts.Count, 4); i++)
                        result[$"p{i + 1}"] = ToDoubleList(pts[i]);
                }
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::point"))
            {
                result["type"] = "POINT";
                result["position"] = ToDoubleList(attrs["ifcx::geom::point"]!["position"]);
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::ray"))
            {
                result["type"] = "RAY";
                var g = attrs["ifcx::geom::ray"]!.AsObject();
                result["origin"] = ToDoubleList(g["origin"]);
                result["direction"] = ToDoubleList(g["direction"]);
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::constructionLine"))
            {
                result["type"] = "XLINE";
                var g = attrs["ifcx::geom::constructionLine"]!.AsObject();
                result["origin"] = ToDoubleList(g["origin"]);
                result["direction"] = ToDoubleList(g["direction"]);
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::solid"))
            {
                result["type"] = "3DSOLID";
                result["acisData"] = attrs["ifcx::geom::solid"]!["data"]?.GetValue<string>() ?? "";
                return result;
            }

            if (attrs.ContainsKey("ifcx::geom::mesh"))
            {
                result["type"] = "MESH";
                var g = attrs["ifcx::geom::mesh"]!.AsObject();
                if (g.ContainsKey("points")) result["vertices"] = CloneNode(g["points"]);
                if (g.ContainsKey("faceVertexIndices")) result["faces"] = CloneNode(g["faceVertexIndices"]);
                return result;
            }

            if (attrs.ContainsKey("ifcx::annotation::text"))
            {
                var g = attrs["ifcx::annotation::text"]!.AsObject();
                result["type"] = g.ContainsKey("width") ? "MTEXT" : "TEXT";
                result["text"] = g["value"]?.GetValue<string>() ?? "";
                if (g.ContainsKey("placement")) result["insertionPoint"] = ToDoubleList(g["placement"]);
                if (g.ContainsKey("height")) result["height"] = g["height"]!.GetValue<double>();
                if (g.ContainsKey("width")) result["width"] = g["width"]!.GetValue<double>();
                if (g.ContainsKey("attachment")) result["attachment"] = g["attachment"]!.GetValue<string>();
                if (g.ContainsKey("alignment")) result["horizontalAlignment"] = g["alignment"]!.GetValue<string>();
                if (g.ContainsKey("style") && g["style"] is JsonObject styleObj && styleObj.ContainsKey("rotation"))
                    result["rotation"] = styleObj["rotation"]!.GetValue<double>();
                return result;
            }

            if (attrs.ContainsKey("ifcx::annotation::dimension"))
            {
                var g = attrs["ifcx::annotation::dimension"]!.AsObject();
                string subtype = g["subtype"]?.GetValue<string>() ?? "linear";
                var typeMap = new Dictionary<string, string>
                {
                    ["linear"] = "DIMENSION_LINEAR",
                    ["aligned"] = "DIMENSION_ALIGNED",
                    ["angular"] = "DIMENSION_ANGULAR",
                    ["diameter"] = "DIMENSION_DIAMETER",
                    ["radius"] = "DIMENSION_RADIUS",
                    ["ordinate"] = "DIMENSION_ORDINATE",
                };
                result["type"] = typeMap.GetValueOrDefault(subtype, "DIMENSION_LINEAR");
                var pts = g["measurePoints"]?.AsArray();
                if (pts != null)
                {
                    if (pts.Count >= 1) result["defPoint1"] = ToDoubleList(pts[0]);
                    if (pts.Count >= 2) result["defPoint2"] = ToDoubleList(pts[1]);
                }
                if (g.ContainsKey("dimensionLine")) result["dimLine"] = ToDoubleList(g["dimensionLine"]);
                if (g.ContainsKey("text")) result["text"] = g["text"]!.GetValue<string>();
                if (g.ContainsKey("value")) result["measurement"] = g["value"]!.GetValue<double>();
                return result;
            }

            if (attrs.ContainsKey("ifcx::annotation::leader"))
            {
                result["type"] = "LEADER";
                var g = attrs["ifcx::annotation::leader"]!.AsObject();
                if (g.ContainsKey("path")) result["vertices"] = CloneNode(g["path"]);
                result["hasArrowhead"] = g["arrowhead"]?.GetValue<bool>() ?? true;
                return result;
            }

            if (attrs.ContainsKey("ifcx::hatch::solid") || attrs.ContainsKey("ifcx::hatch::pattern"))
            {
                result["type"] = "HATCH";
                if (attrs.ContainsKey("ifcx::hatch::solid"))
                {
                    result["solid"] = true;
                    var s = attrs["ifcx::hatch::solid"]!.AsObject();
                    if (s.ContainsKey("colour"))
                        result["color"] = RgbToAci(s["colour"]?.AsObject());
                }
                else
                {
                    result["solid"] = false;
                    var p = attrs["ifcx::hatch::pattern"]!.AsObject();
                    if (p.ContainsKey("name")) result["patternName"] = p["name"]!.GetValue<string>();
                    if (p.ContainsKey("angle")) result["patternAngle"] = p["angle"]!.GetValue<double>();
                    if (p.ContainsKey("scale")) result["patternScale"] = p["scale"]!.GetValue<double>();
                }
                if (attrs.ContainsKey("ifcx::hatch::boundary"))
                    result["boundary"] = CloneNode(attrs["ifcx::hatch::boundary"]);
                return result;
            }

            if (attrs.ContainsKey("ifcx::sheet::viewport"))
            {
                result["type"] = "VIEWPORT";
                var g = attrs["ifcx::sheet::viewport"]!.AsObject();
                if (g.ContainsKey("center")) result["center"] = ToDoubleList(g["center"]);
                if (g.ContainsKey("width")) result["width"] = g["width"]!.GetValue<double>();
                if (g.ContainsKey("height")) result["height"] = g["height"]!.GetValue<double>();
                if (g.ContainsKey("viewTarget")) result["viewTarget"] = ToDoubleList(g["viewTarget"]);
                if (g.ContainsKey("viewScale")) result["viewScale"] = g["viewScale"]!.GetValue<double>();
                return result;
            }

            if (attrs.ContainsKey("ifcx::image::raster"))
            {
                result["type"] = "IMAGE";
                var g = attrs["ifcx::image::raster"]!.AsObject();
                if (g.ContainsKey("insertionPoint")) result["insertionPoint"] = ToDoubleList(g["insertionPoint"]);
                string mid = g["mediaId"]?.GetValue<string>() ?? "";
                var media = _v2["media"]?.AsObject();
                if (!string.IsNullOrEmpty(mid) && media != null && media.ContainsKey(mid))
                    result["imagePath"] = media[mid]!["path"]?.GetValue<string>() ?? "";
                return result;
            }

            if (attrs.ContainsKey("ifcx::image::wipeout"))
            {
                result["type"] = "WIPEOUT";
                result["boundary"] = CloneNode(attrs["ifcx::image::wipeout"]!["boundary"]);
                return result;
            }

            // INSERT via inherits
            var inherits = node["inherits"]?.AsArray();
            if (inherits != null && inherits.Count > 0 && attrs.ContainsKey("ifcx::xform::matrix"))
            {
                result["type"] = "INSERT";
                string defPath = inherits[0]!.GetValue<string>();
                if (_nodesByPath.TryGetValue(defPath, out var defNode))
                {
                    var comp = defNode["attributes"]?["ifcx::component::definition"]?.AsObject();
                    result["name"] = comp?["name"]?.GetValue<string>() ?? defPath;
                }
                else
                {
                    result["name"] = defPath;
                }

                var matrix = attrs["ifcx::xform::matrix"]!.AsArray();
                var row3 = matrix[3]!.AsArray();
                result["insertionPoint"] = new List<double>
                {
                    row3[0]!.GetValue<double>(),
                    row3[1]!.GetValue<double>(),
                    row3[2]!.GetValue<double>(),
                };

                var r0 = matrix[0]!.AsArray();
                var r1 = matrix[1]!.AsArray();
                double m00 = r0[0]!.GetValue<double>();
                double m01 = r0[1]!.GetValue<double>();
                double m10 = r1[0]!.GetValue<double>();
                double m11 = r1[1]!.GetValue<double>();
                double m22 = matrix[2]!.AsArray()[2]!.GetValue<double>();

                double sx = Math.Sqrt(m00 * m00 + m01 * m01);
                double sy = Math.Sqrt(m10 * m10 + m11 * m11);
                double rotation = Math.Atan2(m01, m00);

                result["xScale"] = sx;
                result["yScale"] = sy;
                result["zScale"] = m22;
                result["rotation"] = rotation;
                return result;
            }

            if (attrs.ContainsKey("ifcx::unknown::entity"))
            {
                var g = attrs["ifcx::unknown::entity"]!.AsObject();
                result["type"] = g["originalType"]?.GetValue<string>() ?? "UNKNOWN";
                var data = g["data"]?.AsObject();
                if (data != null)
                {
                    foreach (var (key, val) in data)
                        result[key] = CloneNode(val);
                }
                return result;
            }

            return null;
        }

        // ---- Segments -> LWPOLY ---

        private static (List<List<double>> Verts, List<double> Bulges) SegmentsToLwpoly(JsonArray? segments)
        {
            var verts = new List<List<double>>();
            var bulges = new List<double>();

            if (segments == null) return (verts, bulges);

            foreach (var seg in segments)
            {
                if (seg is not JsonObject segObj) continue;
                string stype = segObj["type"]?.GetValue<string>() ?? "line";

                if (stype == "line")
                {
                    var pts = segObj["points"]?.AsArray();
                    if (pts != null && pts.Count > 0)
                    {
                        if (verts.Count == 0)
                        {
                            verts.Add(ToDoubleListRaw(pts[0]));
                            bulges.Add(0.0);
                        }
                        if (pts.Count > 1)
                        {
                            verts.Add(ToDoubleListRaw(pts[pts.Count - 1]));
                            bulges[^1] = 0.0;
                            bulges.Add(0.0);
                        }
                    }
                }
                else if (stype == "arc")
                {
                    var center = ToDoubleListRaw(segObj["center"]);
                    double radius = segObj["radius"]?.GetValue<double>() ?? 0;
                    double sa = segObj["startAngle"]?.GetValue<double>() ?? 0;
                    double ea = segObj["endAngle"]?.GetValue<double>() ?? 0;

                    var p1 = new List<double>
                    {
                        center[0] + radius * Math.Cos(sa),
                        center[1] + radius * Math.Sin(sa),
                        0.0,
                    };
                    var p2 = new List<double>
                    {
                        center[0] + radius * Math.Cos(ea),
                        center[1] + radius * Math.Sin(ea),
                        0.0,
                    };

                    double angle = ea - sa;
                    if (angle < 0) angle += 2 * Math.PI;
                    double bulge = Math.Tan(angle / 4.0);

                    if (verts.Count == 0)
                    {
                        verts.Add(p1);
                        bulges.Add(bulge);
                    }
                    else
                    {
                        bulges[^1] = bulge;
                    }
                    verts.Add(p2);
                    bulges.Add(0.0);
                }
            }

            return (verts, bulges);
        }

        private static List<double> ToDoubleListRaw(JsonNode? node)
        {
            if (node is not JsonArray arr) return [0, 0, 0];
            var list = new List<double>();
            foreach (var item in arr)
                list.Add(item?.GetValue<double>() ?? 0);
            return list;
        }

        private static object? ToDoubleList(JsonNode? node)
        {
            return ToDoubleListRaw(node);
        }

        private static object? CloneNode(JsonNode? node)
        {
            if (node == null) return null;
            return JsonSerializer.Deserialize<object>(node.ToJsonString());
        }
    }
}
