using Ifcx.Types;

namespace Ifcx.Converters.Dxf;

/// <summary>
/// Imports DXF files into IFCX documents.
/// </summary>
public static class DxfImporter
{
    public static IfcxDocument FromFile(string path)
    {
        var content = File.ReadAllText(path);
        return FromString(content);
    }

    public static IfcxDocument FromString(string dxf)
    {
        var parser = new DxfParser();
        var dxfFile = parser.Parse(dxf);
        return Convert(dxfFile);
    }

    // -----------------------------------------------------------------
    // Conversion
    // -----------------------------------------------------------------

    private static IfcxDocument Convert(DxfFile dxfFile)
    {
        var doc = new IfcxDocument
        {
            Header = ConvertHeader(dxfFile),
            Tables = ConvertTables(dxfFile),
            Blocks = ConvertBlocks(dxfFile),
            Entities = ConvertEntities(dxfFile),
            Objects = ConvertObjects(dxfFile),
        };
        return doc;
    }

    // -----------------------------------------------------------------
    // Header
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ConvertHeader(DxfFile dxf)
    {
        var header = new Dictionary<string, object?>();
        var raw = dxf.Header;

        header["version"] = raw.GetValueOrDefault("$ACADVER", "AC1032");

        var insunits = raw.GetValueOrDefault("$INSUNITS", 0);
        int insunitsInt = insunits is int i ? i : 0;
        var unitMap = new Dictionary<int, string>
        {
            [0] = "unitless", [1] = "inches", [2] = "feet", [3] = "miles",
            [4] = "millimeters", [5] = "centimeters", [6] = "meters", [7] = "kilometers",
        };
        var measurement = raw.GetValueOrDefault("$MEASUREMENT", 1);
        int measurementInt = measurement is int m ? m : 1;
        header["units"] = new Dictionary<string, object?>
        {
            ["linear"] = unitMap.GetValueOrDefault(insunitsInt, "unitless"),
            ["measurement"] = measurementInt == 1 ? "metric" : "imperial",
        };

        if (raw.TryGetValue("$CLAYER", out var clayer) && clayer is string cls)
            header["currentLayer"] = cls;

        if (raw.TryGetValue("$LTSCALE", out var ltscale) && ltscale is double lts)
            header["linetypeScale"] = lts;

        return header;
    }

    // -----------------------------------------------------------------
    // Tables
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ConvertTables(DxfFile dxf)
    {
        var layers = new Dictionary<string, object?>();
        var linetypes = new Dictionary<string, object?>();
        var textStyles = new Dictionary<string, object?>();
        var dimStyles = new Dictionary<string, object?>();

        if (dxf.Tables.TryGetValue("LAYER", out var layerEntries))
        {
            foreach (var entry in layerEntries)
            {
                var name = entry.GetValueOrDefault("name")?.ToString() ?? "";
                if (string.IsNullOrEmpty(name)) continue;
                var props = new Dictionary<string, object?>();
                CopyIfPresent(entry, props, "color");
                CopyIfPresent(entry, props, "linetype");
                CopyIfPresent(entry, props, "frozen");
                CopyIfPresent(entry, props, "locked");
                CopyIfPresent(entry, props, "off");
                CopyIfPresent(entry, props, "plot");
                CopyIfPresent(entry, props, "lineweight");
                layers[name] = props;
            }
        }

        if (!layers.ContainsKey("0"))
            layers["0"] = new Dictionary<string, object?>();

        if (dxf.Tables.TryGetValue("LTYPE", out var ltypeEntries))
        {
            foreach (var entry in ltypeEntries)
            {
                var name = entry.GetValueOrDefault("name")?.ToString() ?? "";
                if (string.IsNullOrEmpty(name) || name is "ByBlock" or "ByLayer" or "Continuous")
                    continue;
                var props = new Dictionary<string, object?>();
                CopyIfPresent(entry, props, "description");
                CopyIfPresent(entry, props, "pattern");
                linetypes[name] = props;
            }
        }

        if (dxf.Tables.TryGetValue("STYLE", out var styleEntries))
        {
            foreach (var entry in styleEntries)
            {
                var name = entry.GetValueOrDefault("name")?.ToString() ?? "";
                if (string.IsNullOrEmpty(name)) continue;
                var props = new Dictionary<string, object?>();
                if (entry.TryGetValue("font", out var f)) props["fontFamily"] = f;
                if (entry.TryGetValue("height", out var h) && h is double dh && dh != 0)
                    props["height"] = dh;
                CopyIfPresent(entry, props, "widthFactor");
                textStyles[name] = props;
            }
        }

        if (dxf.Tables.TryGetValue("DIMSTYLE", out var dsEntries))
        {
            foreach (var entry in dsEntries)
            {
                var name = entry.GetValueOrDefault("name")?.ToString() ?? "";
                if (string.IsNullOrEmpty(name)) continue;
                var props = new Dictionary<string, object?>();
                if (entry.TryGetValue("DIMTXT", out var v1)) props["textHeight"] = v1;
                if (entry.TryGetValue("DIMASZ", out var v2)) props["arrowSize"] = v2;
                if (entry.TryGetValue("DIMSCALE", out var v3)) props["overallScale"] = v3;
                if (entry.TryGetValue("DIMEXO", out var v4)) props["extensionOffset"] = v4;
                if (entry.TryGetValue("DIMDLI", out var v5)) props["dimensionLineIncrement"] = v5;
                if (entry.TryGetValue("DIMEXE", out var v6)) props["extensionExtend"] = v6;
                if (entry.TryGetValue("DIMGAP", out var v7)) props["textGap"] = v7;
                if (entry.TryGetValue("DIMTAD", out var v8)) props["textAbove"] = v8;
                if (entry.TryGetValue("DIMDEC", out var v9)) props["decimalPlaces"] = v9;
                dimStyles[name] = props;
            }
        }

        return new Dictionary<string, object?>
        {
            ["layers"] = layers,
            ["linetypes"] = linetypes,
            ["textStyles"] = textStyles,
            ["dimStyles"] = dimStyles,
        };
    }

    // -----------------------------------------------------------------
    // Blocks
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ConvertBlocks(DxfFile dxf)
    {
        var blocks = new Dictionary<string, object?>();
        foreach (var (name, blockData) in dxf.Blocks)
        {
            if (name.StartsWith("*Model_Space") || name.StartsWith("*Paper_Space"))
                continue;
            var blk = new Dictionary<string, object?>
            {
                ["name"] = name,
                ["basePoint"] = blockData.GetValueOrDefault("basePoint", new List<double> { 0, 0, 0 }),
            };
            var entities = new List<Dictionary<string, object?>>();
            if (blockData.TryGetValue("entities", out var ents) && ents is List<Dictionary<string, object?>> entList)
            {
                foreach (var ent in entList)
                {
                    var converted = ConvertEntity(ent);
                    if (converted is not null) entities.Add(converted);
                }
            }
            blk["entities"] = entities;
            blocks[name] = blk;
        }
        return blocks;
    }

    // -----------------------------------------------------------------
    // Entities
    // -----------------------------------------------------------------

    private static List<Dictionary<string, object?>> ConvertEntities(DxfFile dxf)
    {
        var entities = new List<Dictionary<string, object?>>();
        foreach (var ent in dxf.Entities)
        {
            var converted = ConvertEntity(ent);
            if (converted is not null) entities.Add(converted);
        }
        return entities;
    }

    private static Dictionary<string, object?>? ConvertEntity(Dictionary<string, object?> ent)
    {
        var result = new Dictionary<string, object?>(ent);
        var etype = result.GetValueOrDefault("type")?.ToString() ?? "";

        // Lineweight normalization
        if (result.TryGetValue("lineweight", out var lw) && lw is int lwi && lwi >= 0)
            result["lineweight"] = lwi / 100.0;
        else
            result.Remove("lineweight");

        // Color 256 = BYLAYER
        if (result.TryGetValue("color", out var c) && c is int ci && ci == 256)
            result.Remove("color");

        // Linetype BYLAYER
        if (result.TryGetValue("linetype", out var lt) && lt is string lts && lts == "BYLAYER")
            result.Remove("linetype");

        // Entity-specific normalization
        if (etype == "ARC")
        {
            if (result.TryGetValue("startAngle", out var sa) && sa is double sad)
                result["startAngle"] = sad * Math.PI / 180.0;
            if (result.TryGetValue("endAngle", out var ea) && ea is double ead)
                result["endAngle"] = ead * Math.PI / 180.0;
        }
        else if (etype == "TEXT")
        {
            if (result.TryGetValue("rotation", out var r) && r is double rd)
                result["rotation"] = rd * Math.PI / 180.0;
            if (result.TryGetValue("horizontalAlignment", out var ha) && ha is int hai)
            {
                var hMap = new Dictionary<int, string>
                    { [0] = "left", [1] = "center", [2] = "right", [3] = "aligned", [4] = "middle", [5] = "fit" };
                result["horizontalAlignment"] = hMap.GetValueOrDefault(hai, "left");
            }
        }
        else if (etype == "MTEXT")
        {
            if (result.TryGetValue("attachment", out var att) && att is int atti)
            {
                var attMap = new Dictionary<int, string>
                {
                    [1] = "top_left", [2] = "top_center", [3] = "top_right",
                    [4] = "middle_left", [5] = "middle_center", [6] = "middle_right",
                    [7] = "bottom_left", [8] = "bottom_center", [9] = "bottom_right",
                };
                result["attachment"] = attMap.GetValueOrDefault(atti, "top_left");
            }
        }
        else if (etype == "INSERT")
        {
            if (result.TryGetValue("rotation", out var r) && r is double rd)
                result["rotation"] = rd * Math.PI / 180.0;
        }
        else if (etype == "DIMENSION")
        {
            if (result.TryGetValue("dimType", out var dt))
            {
                result["type"] = dt;
                result.Remove("dimType");
            }
        }
        else if (etype == "LEADER")
        {
            result.TryAdd("hasArrowhead", true);
            result.TryAdd("pathType", "straight");
        }

        // Remove internal fields
        foreach (var key in result.Keys.Where(k => k.StartsWith("_")).ToList())
            result.Remove(key);

        return result;
    }

    // -----------------------------------------------------------------
    // Objects
    // -----------------------------------------------------------------

    private static List<Dictionary<string, object?>> ConvertObjects(DxfFile dxf)
    {
        var objects = new List<Dictionary<string, object?>>();
        foreach (var obj in dxf.Objects)
        {
            var objType = obj.GetValueOrDefault("type")?.ToString() ?? "";
            if (objType == "LAYOUT")
            {
                objects.Add(new Dictionary<string, object?>
                {
                    ["objectType"] = "LAYOUT",
                    ["name"] = obj.GetValueOrDefault("name", ""),
                    ["isModelSpace"] = obj.GetValueOrDefault("name")?.ToString() == "Model",
                });
            }
            else if (objType == "DICTIONARY")
            {
                var converted = new Dictionary<string, object?>
                {
                    ["objectType"] = "DICTIONARY",
                    ["handle"] = obj.GetValueOrDefault("handle", ""),
                    ["name"] = obj.GetValueOrDefault("name", ""),
                };
                CopyIfPresent(obj, converted, "entries");
                CopyIfPresent(obj, converted, "entryHandles");
                objects.Add(converted);
            }
        }
        return objects;
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private static void CopyIfPresent(Dictionary<string, object?> src, Dictionary<string, object?> dst, string key)
    {
        if (src.TryGetValue(key, out var v))
            dst[key] = v;
    }
}
