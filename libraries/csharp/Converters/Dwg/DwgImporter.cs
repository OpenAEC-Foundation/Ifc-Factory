using Ifcx.Types;

namespace Ifcx.Converters.Dwg;

/// <summary>
/// Imports DWG binary files into IFCX documents.
/// </summary>
public static class DwgImporter
{
    public static IfcxDocument FromFile(string path)
    {
        var data = File.ReadAllBytes(path);
        return FromBytes(data);
    }

    public static IfcxDocument FromBytes(byte[] data)
    {
        var parser = new DwgParser();
        var dwg = parser.Parse(data);
        return Convert(dwg);
    }

    // -----------------------------------------------------------------
    // Conversion
    // -----------------------------------------------------------------

    private static IfcxDocument Convert(DwgFile dwg)
    {
        return new IfcxDocument
        {
            Header = ConvertHeader(dwg),
            Tables = ConvertTables(dwg),
            Blocks = ConvertBlocks(dwg),
            Entities = ConvertEntities(dwg),
            Objects = ConvertObjects(dwg),
        };
    }

    private static Dictionary<string, object?> ConvertHeader(DwgFile dwg)
    {
        var hv = dwg.HeaderVars;
        var header = new Dictionary<string, object?>
        {
            ["version"] = hv.GetValueOrDefault("$ACADVER", dwg.VersionCode),
        };

        var insunits = hv.GetValueOrDefault("$LUNITS");
        int insunitsInt = insunits is int i ? i : 0;
        var unitMap = new Dictionary<int, string>
        {
            [0] = "unitless", [1] = "scientific", [2] = "decimal",
            [3] = "engineering", [4] = "architectural", [5] = "fractional",
        };
        int measurementInt = hv.GetValueOrDefault("$MEASUREMENT") is int m ? m : 1;
        header["units"] = new Dictionary<string, object?>
        {
            ["linear"] = unitMap.GetValueOrDefault(insunitsInt, "unitless"),
            ["measurement"] = measurementInt == 1 ? "metric" : "imperial",
        };

        if (hv.GetValueOrDefault("$LTSCALE") is double lts)
            header["linetypeScale"] = lts;

        return header;
    }

    private static Dictionary<string, object?> ConvertTables(DwgFile dwg)
    {
        var layers = new Dictionary<string, object?>();
        var linetypes = new Dictionary<string, object?>();
        var textStyles = new Dictionary<string, object?>();
        var dimStyles = new Dictionary<string, object?>();

        foreach (var obj in dwg.Objects)
        {
            if (obj.TypeName == "LAYER")
            {
                var name = obj.Data.GetValueOrDefault("name")?.ToString() ?? "";
                if (string.IsNullOrEmpty(name)) continue;
                var props = new Dictionary<string, object?>();
                CopyIfPresent(obj.Data, props, "color");
                CopyIfPresent(obj.Data, props, "frozen");
                CopyIfPresent(obj.Data, props, "off");
                CopyIfPresent(obj.Data, props, "locked");
                layers[name] = props;
            }
            else if (obj.TypeName == "STYLE")
            {
                var name = obj.Data.GetValueOrDefault("name")?.ToString() ?? "";
                if (string.IsNullOrEmpty(name)) continue;
                var props = new Dictionary<string, object?>();
                if (obj.Data.TryGetValue("fontName", out var fn)) props["fontFamily"] = fn;
                if (obj.Data.TryGetValue("fixedHeight", out var fh) && fh is double dhv && dhv != 0)
                    props["height"] = dhv;
                CopyIfPresent(obj.Data, props, "widthFactor");
                textStyles[name] = props;
            }
            else if (obj.TypeName == "LTYPE")
            {
                var name = obj.Data.GetValueOrDefault("name")?.ToString() ?? "";
                if (string.IsNullOrEmpty(name) || name is "ByBlock" or "ByLayer" or "Continuous")
                    continue;
                var props = new Dictionary<string, object?>();
                CopyIfPresent(obj.Data, props, "description");
                CopyIfPresent(obj.Data, props, "patternLength");
                linetypes[name] = props;
            }
        }

        if (!layers.ContainsKey("0")) layers["0"] = new Dictionary<string, object?>();

        return new Dictionary<string, object?>
        {
            ["layers"] = layers, ["linetypes"] = linetypes,
            ["textStyles"] = textStyles, ["dimStyles"] = dimStyles,
        };
    }

    private static Dictionary<string, object?> ConvertBlocks(DwgFile dwg)
    {
        var blocks = new Dictionary<string, object?>();
        foreach (var obj in dwg.Objects)
        {
            if (obj.TypeName != "BLOCK_HEADER") continue;
            var name = obj.Data.GetValueOrDefault("name")?.ToString() ?? "";
            if (string.IsNullOrEmpty(name) || name.StartsWith("*Model_Space") || name.StartsWith("*Paper_Space"))
                continue;
            blocks[name] = new Dictionary<string, object?>
            {
                ["name"] = name,
                ["basePoint"] = new List<double> { 0, 0, 0 },
                ["entities"] = new List<Dictionary<string, object?>>(),
            };
        }
        return blocks;
    }

    private static List<Dictionary<string, object?>> ConvertEntities(DwgFile dwg)
    {
        var entities = new List<Dictionary<string, object?>>();
        foreach (var obj in dwg.Objects)
        {
            if (!obj.IsEntity) continue;
            var converted = ConvertEntity(obj);
            if (converted is not null) entities.Add(converted);
        }
        return entities;
    }

    private static Dictionary<string, object?>? ConvertEntity(DwgObject obj)
    {
        var result = new Dictionary<string, object?>(obj.Data);

        if (result.TryGetValue("handle", out var h) && h is int hi)
            result["handle"] = hi.ToString("X");

        // Remove internal fields
        foreach (var key in result.Keys.Where(k => k.StartsWith("_")).ToList())
            result.Remove(key);

        // Color normalization
        if (result.GetValueOrDefault("color") is int c && (c == 0 || c == 256))
            result.Remove("color");

        // Thickness zero
        if (result.GetValueOrDefault("thickness") is double t && t == 0.0)
            result.Remove("thickness");

        // Default extrusion
        if (result.GetValueOrDefault("extrusion") is List<double> ext
            && ext.Count == 3 && ext[0] == 0.0 && ext[1] == 0.0 && ext[2] == 1.0)
            result.Remove("extrusion");

        result.Remove("entity_mode");
        result.Remove("linetype_scale");
        result.Remove("invisible");

        if (result.GetValueOrDefault("lineweight") is int lw && (lw == 29 || lw < 0))
            result.Remove("lineweight");

        return result;
    }

    private static List<Dictionary<string, object?>> ConvertObjects(DwgFile dwg)
    {
        var objects = new List<Dictionary<string, object?>>();
        foreach (var obj in dwg.Objects)
        {
            if (obj.TypeName != "DICTIONARY") continue;
            var converted = new Dictionary<string, object?>
            {
                ["objectType"] = "DICTIONARY",
                ["handle"] = obj.Handle.ToString("X"),
            };
            if (obj.Data.TryGetValue("entries", out var entries) && entries is Dictionary<string, object?> dict)
            {
                converted["entries"] = dict.ToDictionary(
                    kv => kv.Key,
                    kv => (object?)(kv.Value is int iv ? iv.ToString("X") : kv.Value?.ToString() ?? ""));
            }
            objects.Add(converted);
        }
        return objects;
    }

    private static void CopyIfPresent(Dictionary<string, object?> src, Dictionary<string, object?> dst, string key)
    {
        if (src.TryGetValue(key, out var v)) dst[key] = v;
    }
}
