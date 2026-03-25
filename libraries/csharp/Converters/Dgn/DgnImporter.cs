using Ifcx.Types;

namespace Ifcx.Converters.Dgn;

/// <summary>
/// Imports DGN V7 files into IFCX documents.
/// </summary>
public static class DgnImporter
{
    public static IfcxDocument FromFile(string path)
    {
        var data = File.ReadAllBytes(path);
        return FromBytes(data);
    }

    public static IfcxDocument FromBytes(byte[] data)
    {
        var parser = new DgnParser();
        var dgn = parser.Parse(data);
        return Convert(dgn);
    }

    // -----------------------------------------------------------------
    // Conversion
    // -----------------------------------------------------------------

    private static IfcxDocument Convert(DgnFile dgn)
    {
        return new IfcxDocument
        {
            Header = ConvertHeader(dgn),
            Tables = ConvertTables(dgn),
            Blocks = ConvertBlocks(dgn),
            Entities = ConvertEntities(dgn),
            Objects = [],
        };
    }

    private static Dictionary<string, object?> ConvertHeader(DgnFile dgn)
    {
        var header = new Dictionary<string, object?>
        {
            ["version"] = dgn.Version,
            ["is3d"] = dgn.Is3D,
        };
        if (!string.IsNullOrEmpty(dgn.MasterUnitName)) header["masterUnits"] = dgn.MasterUnitName;
        if (!string.IsNullOrEmpty(dgn.SubUnitName)) header["subUnits"] = dgn.SubUnitName;
        header["units"] = new Dictionary<string, object?>
        {
            ["uorPerSub"] = dgn.UorPerSub,
            ["subPerMaster"] = dgn.SubPerMaster,
        };
        var go = dgn.GlobalOrigin;
        if (go.X != 0 || go.Y != 0 || go.Z != 0)
            header["globalOrigin"] = new List<double> { go.X, go.Y, go.Z };
        return header;
    }

    private static Dictionary<string, object?> ConvertTables(DgnFile dgn)
    {
        var layers = new Dictionary<string, object?>();
        var levelsUsed = new HashSet<int>();

        foreach (var elem in dgn.Elements)
            if (!elem.Deleted && elem.Level > 0)
                levelsUsed.Add(elem.Level);

        foreach (var lvl in levelsUsed.Order())
            layers[lvl.ToString()] = new Dictionary<string, object?>();

        if (!layers.ContainsKey("0"))
            layers["0"] = new Dictionary<string, object?>();

        return new Dictionary<string, object?>
        {
            ["layers"] = layers,
            ["linetypes"] = new Dictionary<string, object?>(),
            ["textStyles"] = new Dictionary<string, object?>(),
            ["dimStyles"] = new Dictionary<string, object?>(),
        };
    }

    private static Dictionary<string, object?> ConvertBlocks(DgnFile dgn) => new();

    private static List<Dictionary<string, object?>> ConvertEntities(DgnFile dgn)
    {
        var entities = new List<Dictionary<string, object?>>();
        foreach (var elem in dgn.Elements)
        {
            if (elem.Deleted) continue;
            if (elem.Type is 0 or 9 or 10 or 8) continue;
            var converted = ConvertEntity(elem, dgn);
            if (converted is not null) entities.Add(converted);
        }
        return entities;
    }

    private static Dictionary<string, object?>? ConvertEntity(DgnElement elem, DgnFile dgn)
    {
        var result = new Dictionary<string, object?> { ["layer"] = elem.Level.ToString() };

        if (elem.Color != 0)
        {
            result["color"] = elem.Color;
            if (dgn.ColorTable.Count > elem.Color && dgn.ColorTable[elem.Color] is var ct && ct.HasValue)
                result["colorRGB"] = new List<int> { ct.Value.R, ct.Value.G, ct.Value.B };
        }
        if (elem.Weight != 0) result["lineweight"] = elem.Weight;
        if (elem.Style != 0) result["linetype"] = elem.Style;

        var data = elem.Data;

        switch (elem.Type)
        {
            case 3: // LINE
                result["type"] = "LINE";
                if (data.TryGetValue("vertices", out var verts) && verts is List<List<double>> vertList && vertList.Count >= 2)
                {
                    result["start"] = vertList[0];
                    result["end"] = vertList[1];
                }
                else return null;
                break;

            case 4: // LINE_STRING
                result["type"] = "LWPOLYLINE";
                result["closed"] = false;
                result["vertices"] = data.GetValueOrDefault("vertices") ?? new List<List<double>>();
                break;

            case 6: // SHAPE
                result["type"] = "LWPOLYLINE";
                result["closed"] = true;
                result["vertices"] = data.GetValueOrDefault("vertices") ?? new List<List<double>>();
                break;

            case 11: // CURVE
                result["type"] = "SPLINE";
                result["vertices"] = data.GetValueOrDefault("vertices") ?? new List<List<double>>();
                break;

            case 15: // ELLIPSE
                result["type"] = "ELLIPSE";
                result["center"] = data.GetValueOrDefault("origin") ?? new List<double> { 0, 0, 0 };
                result["majorAxis"] = data.GetValueOrDefault("primary_axis", 0.0);
                result["minorAxis"] = data.GetValueOrDefault("secondary_axis", 0.0);
                result["rotation"] = ToRadians(data.GetValueOrDefault("rotation"));
                break;

            case 16: // ARC
                double start = ToDouble(data.GetValueOrDefault("start_angle"));
                double sweep = ToDouble(data.GetValueOrDefault("sweep_angle", 360.0));
                result["type"] = Math.Abs(sweep) >= 360.0 ? "ELLIPSE" : "ARC";
                if (Math.Abs(sweep) < 360.0)
                {
                    result["startAngle"] = start * Math.PI / 180.0;
                    result["endAngle"] = (start + sweep) * Math.PI / 180.0;
                }
                result["center"] = data.GetValueOrDefault("origin") ?? new List<double> { 0, 0, 0 };
                result["majorAxis"] = data.GetValueOrDefault("primary_axis", 0.0);
                result["minorAxis"] = data.GetValueOrDefault("secondary_axis", 0.0);
                result["rotation"] = ToRadians(data.GetValueOrDefault("rotation"));
                break;

            case 17: // TEXT
                result["type"] = "TEXT";
                result["text"] = data.GetValueOrDefault("text", "");
                result["insertionPoint"] = data.GetValueOrDefault("origin") ?? new List<double> { 0, 0, 0 };
                result["height"] = data.GetValueOrDefault("height", 0.0);
                result["rotation"] = ToRadians(data.GetValueOrDefault("rotation"));
                result["fontIndex"] = data.GetValueOrDefault("font_id", 0);
                break;

            case 7: // TEXT_NODE
                result["type"] = "TEXT_NODE";
                result["origin"] = data.GetValueOrDefault("origin") ?? new List<double> { 0, 0, 0 };
                result["height"] = data.GetValueOrDefault("height", 0.0);
                result["rotation"] = ToRadians(data.GetValueOrDefault("rotation"));
                result["numelems"] = data.GetValueOrDefault("numelems", 0);
                break;

            case 2: // CELL_HEADER -> INSERT
                result["type"] = "INSERT";
                result["name"] = data.GetValueOrDefault("name", "");
                result["insertionPoint"] = data.GetValueOrDefault("origin") ?? new List<double> { 0, 0, 0 };
                result["xScale"] = data.GetValueOrDefault("xscale", 1.0);
                result["yScale"] = data.GetValueOrDefault("yscale", 1.0);
                result["rotation"] = ToRadians(data.GetValueOrDefault("rotation"));
                break;

            case 12 or 14:
                result["type"] = elem.Type == 12 ? "COMPLEX_CHAIN" : "COMPLEX_SHAPE";
                result["numelems"] = data.GetValueOrDefault("numelems", 0);
                result["totlength"] = data.GetValueOrDefault("totlength", 0);
                break;

            case 18 or 19:
                result["type"] = elem.Type == 18 ? "3DSURFACE" : "3DSOLID";
                result["numelems"] = data.GetValueOrDefault("numelems", 0);
                break;

            case 37: // TAG_VALUE
                result["type"] = "TAG_VALUE";
                result["tagSet"] = data.GetValueOrDefault("tag_set", 0);
                result["tagIndex"] = data.GetValueOrDefault("tag_index", 0);
                if (data.TryGetValue("value", out var tv)) result["value"] = tv;
                break;

            default:
                result["type"] = elem.TypeName;
                result["rawType"] = elem.Type;
                break;
        }

        return result;
    }

    private static double ToRadians(object? val)
    {
        double deg = ToDouble(val);
        return deg * Math.PI / 180.0;
    }

    private static double ToDouble(object? val) => val switch
    {
        double d => d,
        int i => i,
        float f => f,
        _ => 0.0,
    };
}
