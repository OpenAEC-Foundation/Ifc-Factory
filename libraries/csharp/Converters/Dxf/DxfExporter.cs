using Ifcx.Types;

namespace Ifcx.Converters.Dxf;

/// <summary>
/// Exports IFCX documents to DXF format (AC1032).
/// Built from scratch with no external dependencies.
/// </summary>
public static class DxfExporter
{
    public static void ToFile(IfcxDocument doc, string path, string version = "AC1032")
    {
        File.WriteAllText(path, ToString(doc, version));
    }

    public static string ToString(IfcxDocument doc, string version = "AC1032")
    {
        var w = new DxfWriter();
        WriteHeader(w, doc, version);
        WriteTables(w, doc);
        WriteBlocks(w, doc);
        WriteEntities(w, doc);
        WriteObjects(w, doc);
        w.Group(0, "EOF");
        return w.ToString();
    }

    // -----------------------------------------------------------------
    // HEADER
    // -----------------------------------------------------------------

    private static void WriteHeader(DxfWriter w, IfcxDocument doc, string version)
    {
        w.BeginSection("HEADER");

        w.Group(9, "$ACADVER");
        w.Group(1, version);

        w.Group(9, "$HANDSEED");
        w.Group(5, "FFFF");

        var units = doc.Header.GetValueOrDefault("units") as Dictionary<string, object?>;
        var unitsStr = units?.GetValueOrDefault("linear")?.ToString() ?? "millimeters";
        var unitMap = new Dictionary<string, int>
        {
            ["unitless"] = 0, ["inches"] = 1, ["feet"] = 2, ["miles"] = 3,
            ["millimeters"] = 4, ["centimeters"] = 5, ["meters"] = 6, ["kilometers"] = 7,
        };
        w.Group(9, "$INSUNITS");
        w.Group(70, unitMap.GetValueOrDefault(unitsStr, 4));

        var measurement = units?.GetValueOrDefault("measurement")?.ToString() ?? "metric";
        w.Group(9, "$MEASUREMENT");
        w.Group(70, measurement == "metric" ? 1 : 0);

        var clayer = doc.Header.GetValueOrDefault("currentLayer")?.ToString() ?? "0";
        w.Group(9, "$CLAYER");
        w.Group(8, clayer);

        var ltscale = doc.Header.GetValueOrDefault("linetypeScale");
        w.Group(9, "$LTSCALE");
        w.Group(40, ltscale is double lts ? lts : 1.0);

        w.EndSection();
    }

    // -----------------------------------------------------------------
    // TABLES
    // -----------------------------------------------------------------

    private static void WriteTables(DxfWriter w, IfcxDocument doc)
    {
        var tables = doc.Tables;
        var layers = GetDictOrDefault(tables, "layers") ?? new Dictionary<string, object?> { ["0"] = new Dictionary<string, object?>() };
        var linetypes = GetDictOrDefault(tables, "linetypes") ?? new Dictionary<string, object?>();
        var styles = GetDictOrDefault(tables, "textStyles") ?? new Dictionary<string, object?>();
        var dimstyles = GetDictOrDefault(tables, "dimStyles") ?? new Dictionary<string, object?>();

        w.BeginSection("TABLES");

        // VPORT
        w.BeginTable("VPORT", w.NextHandle(), 1);
        w.Group(0, "VPORT");
        w.Handle(w.NextHandle());
        w.Group(100, "AcDbSymbolTableRecord");
        w.Group(100, "AcDbViewportTableRecord");
        w.Group(2, "*Active");
        w.Group(70, 0);
        w.Point(0, 0, 0);
        w.Point(1, 1, 0, 11);
        w.Point(0, 0, 0, 12);
        w.Point(0, 0, 0, 13);
        w.Point(1, 1, 0, 14);
        w.Point(1, 1, 0, 15);
        w.Point(0, 0, 1, 16);
        w.Point(0, 0, 0, 17);
        w.Group(42, 50.0);
        w.Group(43, 0.0);
        w.Group(44, 0.0);
        w.Group(45, 1.0);
        w.Group(50, 0.0);
        w.Group(51, 0.0);
        w.EndTable();

        // LTYPE
        var builtinLt = 3 + linetypes.Count;
        w.BeginTable("LTYPE", w.NextHandle(), builtinLt);
        foreach (var ltName in new[] { "ByBlock", "ByLayer", "Continuous" })
        {
            w.Group(0, "LTYPE");
            w.Handle(w.NextHandle());
            w.Group(100, "AcDbSymbolTableRecord");
            w.Group(100, "AcDbLinetypeTableRecord");
            w.Group(2, ltName);
            w.Group(70, 0);
            w.Group(3, "");
            w.Group(72, 65);
            w.Group(73, 0);
            w.Group(40, 0.0);
        }
        foreach (var (ltName, ltPropsObj) in linetypes)
        {
            var ltProps = ltPropsObj as Dictionary<string, object?> ?? new();
            w.Group(0, "LTYPE");
            w.Handle(w.NextHandle());
            w.Group(100, "AcDbSymbolTableRecord");
            w.Group(100, "AcDbLinetypeTableRecord");
            w.Group(2, ltName);
            w.Group(70, 0);
            w.Group(3, ltProps.GetValueOrDefault("description")?.ToString() ?? "");
            w.Group(72, 65);
            var pattern = ltProps.GetValueOrDefault("pattern") as List<double> ?? [];
            w.Group(73, pattern.Count);
            w.Group(40, pattern.Sum(v => Math.Abs(v)));
            foreach (var elem in pattern)
            {
                w.Group(49, elem);
                w.Group(74, 0);
            }
        }
        w.EndTable();

        // LAYER
        w.BeginTable("LAYER", w.NextHandle(), layers.Count);
        foreach (var (layerName, layerPropsObj) in layers)
        {
            var lp = layerPropsObj as Dictionary<string, object?> ?? new();
            w.Group(0, "LAYER");
            w.Handle(w.NextHandle());
            w.Group(100, "AcDbSymbolTableRecord");
            w.Group(100, "AcDbLayerTableRecord");
            w.Group(2, layerName);
            int flags = 0;
            if (lp.GetValueOrDefault("frozen") is true) flags |= 1;
            if (lp.GetValueOrDefault("locked") is true) flags |= 4;
            w.Group(70, flags);
            var color = lp.GetValueOrDefault("color") is int ci ? ci : 7;
            if (lp.GetValueOrDefault("off") is true) color = -Math.Abs(color);
            w.Group(62, color);
            w.Group(6, lp.GetValueOrDefault("linetype")?.ToString() ?? "Continuous");
            if (lp.ContainsKey("plot"))
                w.Group(290, lp["plot"] is true ? 1 : 0);
            w.Group(370, lp.GetValueOrDefault("lineweight") is int lwi ? lwi : -3);
        }
        w.EndTable();

        // STYLE
        var styleCount = Math.Max(1, styles.Count);
        w.BeginTable("STYLE", w.NextHandle(), styleCount);
        if (styles.Count == 0)
        {
            w.Group(0, "STYLE");
            w.Handle(w.NextHandle());
            w.Group(100, "AcDbSymbolTableRecord");
            w.Group(100, "AcDbTextStyleTableRecord");
            w.Group(2, "Standard");
            w.Group(70, 0);
            w.Group(40, 0.0);
            w.Group(41, 1.0);
            w.Group(50, 0.0);
            w.Group(71, 0);
            w.Group(42, 2.5);
            w.Group(3, "txt");
            w.Group(4, "");
        }
        else
        {
            foreach (var (styleName, stylePropsObj) in styles)
            {
                var sp = stylePropsObj as Dictionary<string, object?> ?? new();
                w.Group(0, "STYLE");
                w.Handle(w.NextHandle());
                w.Group(100, "AcDbSymbolTableRecord");
                w.Group(100, "AcDbTextStyleTableRecord");
                w.Group(2, styleName);
                w.Group(70, 0);
                w.Group(40, sp.GetValueOrDefault("height") is double h ? h : 0.0);
                w.Group(41, sp.GetValueOrDefault("widthFactor") is double wf ? wf : 1.0);
                w.Group(50, 0.0);
                w.Group(71, 0);
                var ht = sp.GetValueOrDefault("height") is double ht2 && ht2 > 0 ? ht2 : 2.5;
                w.Group(42, ht);
                w.Group(3, sp.GetValueOrDefault("fontFamily")?.ToString() ?? "txt");
                w.Group(4, "");
            }
        }
        w.EndTable();

        // VIEW
        w.BeginTable("VIEW", w.NextHandle(), 0);
        w.EndTable();

        // UCS
        w.BeginTable("UCS", w.NextHandle(), 0);
        w.EndTable();

        // APPID
        w.BeginTable("APPID", w.NextHandle(), 1);
        w.Group(0, "APPID");
        w.Handle(w.NextHandle());
        w.Group(100, "AcDbSymbolTableRecord");
        w.Group(100, "AcDbRegAppTableRecord");
        w.Group(2, "ACAD");
        w.Group(70, 0);
        w.EndTable();

        // DIMSTYLE
        var dsCount = Math.Max(1, dimstyles.Count);
        w.BeginTable("DIMSTYLE", w.NextHandle(), dsCount);
        if (dimstyles.Count == 0)
        {
            w.Group(0, "DIMSTYLE");
            w.Handle(w.NextHandle());
            w.Group(100, "AcDbSymbolTableRecord");
            w.Group(100, "AcDbDimStyleTableRecord");
            w.Group(2, "Standard");
            w.Group(70, 0);
            w.Group(40, 1.0);
            w.Group(41, 2.5);
            w.Group(42, 0.625);
            w.Group(43, 3.75);
            w.Group(44, 1.25);
            w.Group(140, 2.5);
            w.Group(141, 2.5);
            w.Group(147, 0.625);
            w.Group(77, 1);
            w.Group(271, 2);
        }
        else
        {
            foreach (var (dsName, dsPropsObj) in dimstyles)
            {
                var dp = dsPropsObj as Dictionary<string, object?> ?? new();
                w.Group(0, "DIMSTYLE");
                w.Handle(w.NextHandle());
                w.Group(100, "AcDbSymbolTableRecord");
                w.Group(100, "AcDbDimStyleTableRecord");
                w.Group(2, dsName);
                w.Group(70, 0);
                w.Group(40, dp.GetValueOrDefault("overallScale") is double os ? os : 1.0);
                w.Group(41, dp.GetValueOrDefault("arrowSize") is double az ? az : 2.5);
                w.Group(140, dp.GetValueOrDefault("textHeight") is double th ? th : 2.5);
            }
        }
        w.EndTable();

        // BLOCK_RECORD
        var blockNames = doc.Blocks.Keys.ToList();
        var brCount = 2 + blockNames.Count;
        w.BeginTable("BLOCK_RECORD", w.NextHandle(), brCount);
        foreach (var brName in new[] { "*Model_Space", "*Paper_Space" }.Concat(blockNames))
        {
            w.Group(0, "BLOCK_RECORD");
            w.Handle(w.NextHandle());
            w.Group(100, "AcDbSymbolTableRecord");
            w.Group(100, "AcDbBlockTableRecord");
            w.Group(2, brName);
        }
        w.EndTable();

        w.EndSection();
    }

    // -----------------------------------------------------------------
    // BLOCKS
    // -----------------------------------------------------------------

    private static void WriteBlocks(DxfWriter w, IfcxDocument doc)
    {
        w.BeginSection("BLOCKS");

        WriteBlockWrapper(w, "*Model_Space", "0", []);
        WriteBlockWrapper(w, "*Paper_Space", "0", []);

        foreach (var (blockName, blockDataObj) in doc.Blocks)
        {
            var blockData = blockDataObj as Dictionary<string, object?> ?? new();
            var layer = blockData.GetValueOrDefault("layer")?.ToString() ?? "0";
            var bp = GetDoubleList(blockData, "basePoint", [0, 0, 0]);
            var entities = blockData.GetValueOrDefault("entities") as List<Dictionary<string, object?>> ?? [];
            WriteBlockWrapper(w, blockName, layer, entities, bp);
        }

        w.EndSection();
    }

    private static void WriteBlockWrapper(DxfWriter w, string name, string layer,
        List<Dictionary<string, object?>> entities, List<double>? basePoint = null)
    {
        var bp = basePoint ?? [0, 0, 0];
        w.Group(0, "BLOCK");
        w.Handle(w.NextHandle());
        w.Group(100, "AcDbEntity");
        w.Group(8, layer);
        w.Group(100, "AcDbBlockBegin");
        w.Group(2, name);
        w.Group(70, 0);
        w.Point(bp[0], bp[1], bp.Count > 2 ? bp[2] : 0);
        w.Group(3, name);
        w.Group(1, "");

        foreach (var ent in entities)
            WriteEntity(w, ent);

        w.Group(0, "ENDBLK");
        w.Handle(w.NextHandle());
        w.Group(100, "AcDbEntity");
        w.Group(8, layer);
        w.Group(100, "AcDbBlockEnd");
    }

    // -----------------------------------------------------------------
    // ENTITIES
    // -----------------------------------------------------------------

    private static void WriteEntities(DxfWriter w, IfcxDocument doc)
    {
        w.BeginSection("ENTITIES");
        foreach (var ent in doc.Entities)
            WriteEntity(w, ent);
        w.EndSection();
    }

    private static void WriteEntity(DxfWriter w, Dictionary<string, object?> ent)
    {
        var etype = ent.GetValueOrDefault("type")?.ToString() ?? "";
        switch (etype)
        {
            case "LINE": WriteLine(w, ent); break;
            case "POINT": WritePointEntity(w, ent); break;
            case "CIRCLE": WriteCircle(w, ent); break;
            case "ARC": WriteArc(w, ent); break;
            case "ELLIPSE": WriteEllipse(w, ent); break;
            case "SPLINE": WriteSpline(w, ent); break;
            case "LWPOLYLINE": WriteLwPolyline(w, ent); break;
            case "TEXT": WriteText(w, ent); break;
            case "MTEXT": WriteMtext(w, ent); break;
            case "DIMENSION_LINEAR" or "DIMENSION_ALIGNED" or "DIMENSION_ANGULAR"
                or "DIMENSION_ANGULAR3P" or "DIMENSION_DIAMETER" or "DIMENSION_RADIUS"
                or "DIMENSION_ORDINATE" or "DIMENSION":
                WriteDimension(w, ent); break;
            case "LEADER": WriteLeader(w, ent); break;
            case "HATCH": WriteHatch(w, ent); break;
            case "INSERT": WriteInsert(w, ent); break;
            case "SOLID" or "TRACE": WriteSolidTrace(w, ent); break;
            case "3DFACE": Write3DFace(w, ent); break;
            case "VIEWPORT": WriteViewport(w, ent); break;
            case "XLINE" or "RAY": WriteXlineRay(w, ent); break;
        }
    }

    private static void WriteCommon(DxfWriter w, Dictionary<string, object?> ent, string subclass)
    {
        var h = ent.GetValueOrDefault("handle")?.ToString() ?? w.NextHandle();
        w.Handle(h);
        w.Group(100, "AcDbEntity");
        if (ent.GetValueOrDefault("paperSpace") is int ps && ps != 0)
            w.Group(67, 1);
        w.Group(8, ent.GetValueOrDefault("layer")?.ToString() ?? "0");
        if (ent.TryGetValue("linetype", out var lt)) w.Group(6, lt!);
        if (ent.TryGetValue("color", out var c)) w.Group(62, c!);
        if (ent.TryGetValue("lineweight", out var lw)) w.Group(370, lw!);
        if (ent.TryGetValue("trueColor", out var tc)) w.Group(420, tc!);
        w.Group(100, subclass);
    }

    private static void WriteLine(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("LINE");
        WriteCommon(w, ent, "AcDbLine");
        var s = GetDoubleList(ent, "start", [0, 0, 0]);
        var e = GetDoubleList(ent, "end", [0, 0, 0]);
        w.Point(s[0], s[1], s.Count > 2 ? s[2] : 0);
        w.Point(e[0], e[1], e.Count > 2 ? e[2] : 0, 11);
    }

    private static void WritePointEntity(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("POINT");
        WriteCommon(w, ent, "AcDbPoint");
        var p = GetDoubleList(ent, "position", [0, 0, 0]);
        w.Point(p[0], p[1], p.Count > 2 ? p[2] : 0);
    }

    private static void WriteCircle(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("CIRCLE");
        WriteCommon(w, ent, "AcDbCircle");
        var c = GetDoubleList(ent, "center", [0, 0, 0]);
        w.Point(c[0], c[1], c.Count > 2 ? c[2] : 0);
        w.Group(40, GetDouble(ent, "radius"));
    }

    private static void WriteArc(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("ARC");
        WriteCommon(w, ent, "AcDbCircle");
        var c = GetDoubleList(ent, "center", [0, 0, 0]);
        w.Point(c[0], c[1], c.Count > 2 ? c[2] : 0);
        w.Group(40, GetDouble(ent, "radius"));
        w.Group(100, "AcDbArc");
        w.Group(50, GetDouble(ent, "startAngle"));
        w.Group(51, GetDouble(ent, "endAngle", 360.0));
    }

    private static void WriteEllipse(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("ELLIPSE");
        WriteCommon(w, ent, "AcDbEllipse");
        var c = GetDoubleList(ent, "center", [0, 0, 0]);
        w.Point(c[0], c[1], c.Count > 2 ? c[2] : 0);
        var ma = GetDoubleList(ent, "majorAxisEndpoint", [1, 0, 0]);
        w.Point(ma[0], ma[1], ma.Count > 2 ? ma[2] : 0, 11);
        w.Group(40, GetDouble(ent, "minorAxisRatio", 0.5));
        w.Group(41, GetDouble(ent, "startParam"));
        w.Group(42, GetDouble(ent, "endParam", 2 * Math.PI));
    }

    private static void WriteSpline(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("SPLINE");
        WriteCommon(w, ent, "AcDbSpline");
        int flags = 0;
        if (ent.GetValueOrDefault("closed") is true) flags |= 1;
        if (ent.GetValueOrDefault("rational") is true) flags |= 4;
        w.Group(70, flags);
        w.Group(71, ent.GetValueOrDefault("degree") is int d ? d : 3);
        var knots = GetDoubleListDirect(ent, "knots");
        var ctrlPts = GetListOfDoubleLists(ent, "controlPoints");
        var fitPts = GetListOfDoubleLists(ent, "fitPoints");
        w.Group(72, knots.Count);
        w.Group(73, ctrlPts.Count);
        w.Group(74, fitPts.Count);
        foreach (var k in knots) w.Group(40, k);
        foreach (var cp in ctrlPts)
            w.Point(cp[0], cp[1], cp.Count > 2 ? cp[2] : 0);
        foreach (var fp in fitPts)
            w.Point(fp[0], fp[1], fp.Count > 2 ? fp[2] : 0, 11);
    }

    private static void WriteLwPolyline(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("LWPOLYLINE");
        WriteCommon(w, ent, "AcDbPolyline");
        var verts = ent.GetValueOrDefault("vertices") as IList<object?> ?? [];
        w.Group(90, verts.Count);
        int flags = 0;
        if (ent.GetValueOrDefault("closed") is true) flags |= 1;
        w.Group(70, flags);
        if (ent.TryGetValue("elevation", out var elv))
            w.Group(38, Convert.ToDouble(elv));
        foreach (var vObj in verts)
        {
            var v = vObj as Dictionary<string, object?>;
            if (v is null) continue;
            w.Group(10, GetDouble(v, "x"));
            w.Group(20, GetDouble(v, "y"));
            if (v.TryGetValue("startWidth", out var sw)) w.Group(40, sw!);
            if (v.TryGetValue("endWidth", out var ew)) w.Group(41, ew!);
            if (v.TryGetValue("bulge", out var b)) w.Group(42, b!);
        }
    }

    private static void WriteText(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("TEXT");
        WriteCommon(w, ent, "AcDbText");
        var ip = GetDoubleList(ent, "insertionPoint", [0, 0, 0]);
        w.Point(ip[0], ip[1], ip.Count > 2 ? ip[2] : 0);
        w.Group(40, GetDouble(ent, "height", 2.5));
        w.Group(1, ent.GetValueOrDefault("text")?.ToString() ?? "");
        if (ent.TryGetValue("rotation", out var r)) w.Group(50, r!);
        if (ent.TryGetValue("style", out var s)) w.Group(7, s!);
        if (ent.TryGetValue("horizontalAlignment", out var ha))
        {
            var hv = ha;
            if (ha is string hs)
            {
                var hMap = new Dictionary<string, int>
                    { ["left"] = 0, ["center"] = 1, ["right"] = 2, ["aligned"] = 3, ["middle"] = 4, ["fit"] = 5 };
                hv = hMap.GetValueOrDefault(hs, 0);
            }
            w.Group(72, hv!);
        }
        if (ent.TryGetValue("alignmentPoint", out var ap))
        {
            var apl = ap as List<double> ?? [0, 0, 0];
            w.Point(apl[0], apl[1], apl.Count > 2 ? apl[2] : 0, 11);
        }
        w.Group(100, "AcDbText");
        if (ent.TryGetValue("verticalAlignment", out var va)) w.Group(73, va!);
    }

    private static void WriteMtext(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("MTEXT");
        WriteCommon(w, ent, "AcDbMText");
        var ip = GetDoubleList(ent, "insertionPoint", [0, 0, 0]);
        w.Point(ip[0], ip[1], ip.Count > 2 ? ip[2] : 0);
        w.Group(40, GetDouble(ent, "height", 2.5));
        if (ent.TryGetValue("width", out var width)) w.Group(41, width!);

        var attachment = ent.GetValueOrDefault("attachment");
        int attInt = 1;
        if (attachment is string attStr)
        {
            var attMap = new Dictionary<string, int>
            {
                ["top_left"] = 1, ["top_center"] = 2, ["top_right"] = 3,
                ["middle_left"] = 4, ["middle_center"] = 5, ["middle_right"] = 6,
                ["bottom_left"] = 7, ["bottom_center"] = 8, ["bottom_right"] = 9,
            };
            attInt = attMap.GetValueOrDefault(attStr, 1);
        }
        else if (attachment is int ai) attInt = ai;
        w.Group(71, attInt);

        var text = ent.GetValueOrDefault("text")?.ToString() ?? "";
        while (text.Length > 250)
        {
            w.Group(3, text[..250]);
            text = text[250..];
        }
        w.Group(1, text);

        if (ent.TryGetValue("rotation", out var rot)) w.Group(50, rot!);
        if (ent.TryGetValue("style", out var st)) w.Group(7, st!);
    }

    private static void WriteDimension(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("DIMENSION");
        WriteCommon(w, ent, "AcDbDimension");

        if (ent.TryGetValue("blockName", out var bn)) w.Group(2, bn!);
        var dp = GetDoubleList(ent, "dimLinePoint", GetDoubleList(ent, "center", [0, 0, 0]));
        w.Point(dp[0], dp[1], dp.Count > 2 ? dp[2] : 0);
        var mp = GetDoubleList(ent, "textPosition", [0, 0, 0]);
        w.Point(mp[0], mp[1], mp.Count > 2 ? mp[2] : 0, 11);

        var etype = ent.GetValueOrDefault("type")?.ToString() ?? "DIMENSION_LINEAR";
        var typeMap = new Dictionary<string, int>
        {
            ["DIMENSION_LINEAR"] = 0, ["DIMENSION_ALIGNED"] = 1, ["DIMENSION_ANGULAR"] = 2,
            ["DIMENSION_DIAMETER"] = 3, ["DIMENSION_RADIUS"] = 4,
            ["DIMENSION_ANGULAR3P"] = 5, ["DIMENSION_ORDINATE"] = 6,
        };
        var dimtype = ent.GetValueOrDefault("dimTypeRaw") is int dtr ? dtr : typeMap.GetValueOrDefault(etype, 0);
        w.Group(70, dimtype);

        if (ent.TryGetValue("overrideText", out var ot)) w.Group(1, ot!);
        if (ent.TryGetValue("dimStyle", out var ds)) w.Group(3, ds!);

        var subtype = dimtype & 0x0F;
        if (subtype is 0 or 1)
        {
            w.Group(100, "AcDbAlignedDimension");
            var d1 = GetDoubleList(ent, "defPoint1", [0, 0, 0]);
            w.Point(d1[0], d1[1], d1.Count > 2 ? d1[2] : 0, 13);
            var d2 = GetDoubleList(ent, "defPoint2", [0, 0, 0]);
            w.Point(d2[0], d2[1], d2.Count > 2 ? d2[2] : 0, 14);
            if (subtype == 0) w.Group(100, "AcDbRotatedDimension");
        }
        else if (subtype is 2 or 5)
        {
            w.Group(100, "AcDb3PointAngularDimension");
            var d1 = GetDoubleList(ent, "defPoint1", [0, 0, 0]);
            w.Point(d1[0], d1[1], d1.Count > 2 ? d1[2] : 0, 13);
            var d2 = GetDoubleList(ent, "defPoint2", [0, 0, 0]);
            w.Point(d2[0], d2[1], d2.Count > 2 ? d2[2] : 0, 14);
            var d3 = GetDoubleList(ent, "defPoint3", [0, 0, 0]);
            w.Point(d3[0], d3[1], d3.Count > 2 ? d3[2] : 0, 15);
        }
        else if (subtype is 3 or 4)
        {
            w.Group(100, "AcDbRadialDimension");
            var d1 = GetDoubleList(ent, "defPoint1", GetDoubleList(ent, "chordPoint", [0, 0, 0]));
            w.Point(d1[0], d1[1], d1.Count > 2 ? d1[2] : 0, 15);
            w.Group(40, GetDouble(ent, "leaderLength"));
        }
        else if (subtype == 6)
        {
            w.Group(100, "AcDbOrdinateDimension");
            var d1 = GetDoubleList(ent, "defPoint1", [0, 0, 0]);
            w.Point(d1[0], d1[1], d1.Count > 2 ? d1[2] : 0, 13);
            var d2 = GetDoubleList(ent, "defPoint2", [0, 0, 0]);
            w.Point(d2[0], d2[1], d2.Count > 2 ? d2[2] : 0, 14);
        }
    }

    private static void WriteLeader(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("LEADER");
        WriteCommon(w, ent, "AcDbLeader");
        if (ent.TryGetValue("dimStyle", out var ds)) w.Group(3, ds!);
        w.Group(71, ent.GetValueOrDefault("hasArrowhead") is true ? 1 : 0);
        var path = ent.GetValueOrDefault("pathType")?.ToString() ?? "straight";
        w.Group(72, path == "spline" ? 1 : 0);
        var verts = GetListOfDoubleLists(ent, "vertices");
        w.Group(76, verts.Count);
        foreach (var v in verts)
            w.Point(v[0], v[1], v.Count > 2 ? v[2] : 0);
    }

    private static void WriteHatch(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("HATCH");
        WriteCommon(w, ent, "AcDbHatch");
        w.Point(0, 0, 0);
        w.Group(210, 0.0); w.Group(220, 0.0); w.Group(230, 1.0);
        w.Group(2, ent.GetValueOrDefault("patternName")?.ToString() ?? "SOLID");
        w.Group(70, ent.GetValueOrDefault("solid") is true ? 1 : 0);
        w.Group(71, ent.GetValueOrDefault("associative") is true ? 1 : 0);
        w.Group(91, 0); // boundaries count (simplified)
        w.Group(75, ent.GetValueOrDefault("hatchStyle") is int hs ? hs : 0);
        w.Group(76, ent.GetValueOrDefault("patternType") is int pt ? pt : 1);
        w.Group(98, 0);
    }

    private static void WriteInsert(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("INSERT");
        WriteCommon(w, ent, "AcDbBlockReference");
        w.Group(2, ent.GetValueOrDefault("blockName")?.ToString() ?? "");
        var ip = GetDoubleList(ent, "insertionPoint", [0, 0, 0]);
        w.Point(ip[0], ip[1], ip.Count > 2 ? ip[2] : 0);
        if (ent.TryGetValue("scaleX", out var sx)) w.Group(41, sx!);
        if (ent.TryGetValue("scaleY", out var sy)) w.Group(42, sy!);
        if (ent.TryGetValue("scaleZ", out var sz)) w.Group(43, sz!);
        if (ent.TryGetValue("rotation", out var r)) w.Group(50, r!);
    }

    private static void WriteSolidTrace(DxfWriter w, Dictionary<string, object?> ent)
    {
        var etype = ent.GetValueOrDefault("type")?.ToString() ?? "SOLID";
        w.Entity(etype);
        WriteCommon(w, ent, "AcDbTrace");
        for (int i = 0; i < 4; i++)
        {
            var pt = GetDoubleList(ent, $"point{i + 1}", [0, 0, 0]);
            w.Point(pt[0], pt[1], pt.Count > 2 ? pt[2] : 0, 10 + i);
        }
    }

    private static void Write3DFace(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("3DFACE");
        WriteCommon(w, ent, "AcDbFace");
        for (int i = 0; i < 4; i++)
        {
            var pt = GetDoubleList(ent, $"point{i + 1}", [0, 0, 0]);
            w.Point(pt[0], pt[1], pt.Count > 2 ? pt[2] : 0, 10 + i);
        }
        if (ent.TryGetValue("invisibleEdges", out var ie)) w.Group(70, ie!);
    }

    private static void WriteViewport(DxfWriter w, Dictionary<string, object?> ent)
    {
        w.Entity("VIEWPORT");
        WriteCommon(w, ent, "AcDbViewport");
        var c = GetDoubleList(ent, "center", [0, 0, 0]);
        w.Point(c[0], c[1], c.Count > 2 ? c[2] : 0);
        w.Group(40, GetDouble(ent, "width", 297.0));
        w.Group(41, GetDouble(ent, "height", 210.0));
    }

    private static void WriteXlineRay(DxfWriter w, Dictionary<string, object?> ent)
    {
        var etype = ent.GetValueOrDefault("type")?.ToString() ?? "XLINE";
        w.Entity(etype);
        WriteCommon(w, ent, etype == "XLINE" ? "AcDbXline" : "AcDbRay");
        var o = GetDoubleList(ent, "origin", [0, 0, 0]);
        w.Point(o[0], o[1], o.Count > 2 ? o[2] : 0);
        var d = GetDoubleList(ent, "direction", [1, 0, 0]);
        w.Point(d[0], d[1], d.Count > 2 ? d[2] : 0, 11);
    }

    // -----------------------------------------------------------------
    // OBJECTS
    // -----------------------------------------------------------------

    private static void WriteObjects(DxfWriter w, IfcxDocument doc)
    {
        w.BeginSection("OBJECTS");

        var rootHandle = w.NextHandle();
        w.Entity("DICTIONARY");
        w.Handle(rootHandle);
        w.Group(100, "AcDbDictionary");
        w.Group(281, 1);

        var groupDictHandle = w.NextHandle();
        w.Group(3, "ACAD_GROUP");
        w.Group(350, groupDictHandle);

        w.Entity("DICTIONARY");
        w.Handle(groupDictHandle);
        w.Group(100, "AcDbDictionary");
        w.Group(281, 1);

        w.EndSection();
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private static Dictionary<string, object?>? GetDictOrDefault(Dictionary<string, object?> dict, string key)
    {
        return dict.GetValueOrDefault(key) as Dictionary<string, object?>;
    }

    private static double GetDouble(Dictionary<string, object?> dict, string key, double def = 0.0)
    {
        if (dict.TryGetValue(key, out var v) && v is not null)
        {
            try { return Convert.ToDouble(v); }
            catch { return def; }
        }
        return def;
    }

    private static List<double> GetDoubleList(Dictionary<string, object?> dict, string key, List<double> def)
    {
        if (dict.TryGetValue(key, out var v))
        {
            if (v is List<double> ld) return ld;
            if (v is List<object?> lo)
                return lo.Select(o => o is not null ? Convert.ToDouble(o) : 0.0).ToList();
        }
        return def;
    }

    private static List<double> GetDoubleListDirect(Dictionary<string, object?> dict, string key)
    {
        if (dict.TryGetValue(key, out var v))
        {
            if (v is List<double> ld) return ld;
            if (v is List<object?> lo)
                return lo.Select(o => o is not null ? Convert.ToDouble(o) : 0.0).ToList();
        }
        return [];
    }

    private static List<List<double>> GetListOfDoubleLists(Dictionary<string, object?> dict, string key)
    {
        if (dict.TryGetValue(key, out var v))
        {
            if (v is List<List<double>> lld) return lld;
            if (v is List<object?> lo)
                return lo.Select(o =>
                {
                    if (o is List<double> ld) return ld;
                    if (o is List<object?> inner)
                        return inner.Select(x => x is not null ? Convert.ToDouble(x) : 0.0).ToList();
                    return new List<double> { 0, 0, 0 };
                }).ToList();
        }
        return [];
    }
}
