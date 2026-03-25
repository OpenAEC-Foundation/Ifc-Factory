using System.Buffers.Binary;

namespace Ifcx.Converters.Dwg;

// -----------------------------------------------------------------
// Data model
// -----------------------------------------------------------------

public sealed class DwgClass
{
    public int ClassNumber { get; set; }
    public int ProxyFlags { get; set; }
    public string AppName { get; set; } = "";
    public string CppClassName { get; set; } = "";
    public string DxfName { get; set; } = "";
    public bool WasZombie { get; set; }
    public int ItemClassId { get; set; }
}

public sealed class DwgObject
{
    public int Handle { get; set; }
    public int TypeNum { get; set; }
    public string TypeName { get; set; } = "";
    public Dictionary<string, object?> Data { get; set; } = new();
    public bool IsEntity { get; set; }
}

public sealed class DwgFile
{
    public string Version { get; set; } = "";
    public string VersionCode { get; set; } = "";
    public int Codepage { get; set; }
    public Dictionary<string, object?> HeaderVars { get; set; } = new();
    public List<DwgClass> Classes { get; set; } = [];
    public List<DwgObject> Objects { get; set; } = [];
    public Dictionary<int, int> ObjectMap { get; set; } = new();
    public Dictionary<int, Dictionary<string, object?>> Layers { get; set; } = new();
    public Dictionary<int, Dictionary<string, object?>> Blocks { get; set; } = new();
}

// -----------------------------------------------------------------
// Constants
// -----------------------------------------------------------------

internal static class DwgConstants
{
    public static readonly Dictionary<string, string> VersionMap = new()
    {
        ["AC1012"] = "R13", ["AC1014"] = "R14", ["AC1015"] = "R2000",
        ["AC1018"] = "R2004", ["AC1021"] = "R2007", ["AC1024"] = "R2010",
        ["AC1027"] = "R2013", ["AC1032"] = "R2018",
    };

    public const int SectionHeader = 0, SectionClasses = 1, SectionObjectMap = 2;

    public static readonly Dictionary<int, string> ObjTypeNames = new()
    {
        [0x01] = "TEXT", [0x02] = "ATTRIB", [0x03] = "ATTDEF", [0x04] = "BLOCK",
        [0x05] = "ENDBLK", [0x06] = "SEQEND", [0x07] = "INSERT", [0x08] = "MINSERT",
        [0x0A] = "VERTEX_2D", [0x0B] = "VERTEX_3D", [0x0C] = "VERTEX_MESH",
        [0x0D] = "VERTEX_PFACE", [0x0E] = "VERTEX_PFACE_FACE",
        [0x0F] = "POLYLINE_2D", [0x10] = "POLYLINE_3D",
        [0x11] = "ARC", [0x12] = "CIRCLE", [0x13] = "LINE",
        [0x14] = "DIMENSION_ORDINATE", [0x15] = "DIMENSION_LINEAR",
        [0x16] = "DIMENSION_ALIGNED", [0x17] = "DIMENSION_ANG3PT",
        [0x18] = "DIMENSION_ANG2LN", [0x19] = "DIMENSION_RADIUS",
        [0x1A] = "DIMENSION_DIAMETER", [0x1B] = "POINT", [0x1C] = "3DFACE",
        [0x1D] = "POLYLINE_PFACE", [0x1E] = "POLYLINE_MESH",
        [0x1F] = "SOLID", [0x20] = "TRACE", [0x21] = "SHAPE", [0x22] = "VIEWPORT",
        [0x23] = "ELLIPSE", [0x24] = "SPLINE", [0x25] = "REGION",
        [0x26] = "3DSOLID", [0x27] = "BODY", [0x28] = "RAY", [0x29] = "XLINE",
        [0x2A] = "DICTIONARY", [0x2B] = "OLEFRAME", [0x2C] = "MTEXT",
        [0x2D] = "LEADER", [0x2E] = "TOLERANCE", [0x2F] = "MLINE",
        [0x30] = "BLOCK_CONTROL", [0x31] = "BLOCK_HEADER",
        [0x32] = "LAYER_CONTROL", [0x33] = "LAYER",
        [0x34] = "STYLE_CONTROL", [0x35] = "STYLE",
        [0x38] = "LTYPE_CONTROL", [0x39] = "LTYPE",
        [0x3C] = "VIEW_CONTROL", [0x3D] = "VIEW",
        [0x3E] = "UCS_CONTROL", [0x3F] = "UCS",
        [0x40] = "VPORT_CONTROL", [0x41] = "VPORT",
        [0x42] = "APPID_CONTROL", [0x43] = "APPID",
        [0x44] = "DIMSTYLE_CONTROL", [0x45] = "DIMSTYLE",
        [0x46] = "VP_ENT_HDR_CONTROL", [0x47] = "VP_ENT_HDR",
        [0x48] = "GROUP", [0x49] = "MLINESTYLE", [0x4A] = "OLE2FRAME",
        [0x4C] = "LONG_TRANSACTION", [0x4D] = "LWPOLYLINE", [0x4E] = "HATCH",
        [0x4F] = "XRECORD", [0x50] = "PLACEHOLDER", [0x51] = "VBA_PROJECT",
        [0x52] = "LAYOUT",
    };

    public static readonly HashSet<int> EntityTypes =
    [
        ..Enumerable.Range(0x01, 0x29), 0x2C, 0x2D, 0x2E, 0x2F, 0x4D, 0x4E
    ];

    public static readonly HashSet<int> TableControlTypes =
        [0x30, 0x32, 0x34, 0x38, 0x3C, 0x3E, 0x40, 0x42, 0x44, 0x46];

    public static readonly HashSet<int> TableEntryTypes =
        [0x31, 0x33, 0x35, 0x39, 0x3D, 0x3F, 0x41, 0x43, 0x45, 0x47];

    public static readonly HashSet<int> NonEntityTypes =
        [0x2A, 0x48, 0x49, 0x4F, 0x50, 0x51, 0x52];

    public static readonly byte[] HeaderSentinelStart =
    [
        0xCF, 0x7B, 0x1F, 0x23, 0xFD, 0xDE, 0x38, 0xA9,
        0x5F, 0x7C, 0x68, 0xB8, 0x4E, 0x6D, 0x33, 0x5F
    ];

    public static readonly byte[] ClassesSentinelStart =
    [
        0x8D, 0xA1, 0xC4, 0xB8, 0xC4, 0xA9, 0xF8, 0xC5,
        0xC0, 0xDC, 0xF4, 0x5F, 0xE7, 0xCF, 0xB6, 0x8A
    ];
}

/// <summary>
/// R2000 (AC1015) DWG binary parser. Built from scratch with no external dependencies.
/// </summary>
public sealed class DwgParser
{
    private readonly Dictionary<int, DwgClass> _classMap = new();

    public DwgFile Parse(byte[] data)
    {
        if (data.Length < 25)
            throw new ArgumentException("Data too short to be a valid DWG file");

        var dwg = new DwgFile();
        dwg.VersionCode = System.Text.Encoding.ASCII.GetString(data, 0, 6);
        dwg.Version = DwgConstants.VersionMap.GetValueOrDefault(dwg.VersionCode, dwg.VersionCode);

        if (dwg.VersionCode == "AC1015")
            ParseR2000(data, dwg);
        else if (dwg.VersionCode == "AC1018")
            ParseR2004Stub(data, dwg);
        else
            ParseR2004Stub(data, dwg); // Graceful degradation

        return dwg;
    }

    // -----------------------------------------------------------------
    // R2000 parsing
    // -----------------------------------------------------------------

    private void ParseR2000(byte[] data, DwgFile dwg)
    {
        dwg.Codepage = BitConverter.ToUInt16(data, 19);
        var sections = ParseSectionLocatorsR2000(data);

        if (sections.TryGetValue(DwgConstants.SectionClasses, out var clsSec))
        {
            dwg.Classes = ParseClassesR2000(data, clsSec.Offset, clsSec.Size);
            foreach (var cls in dwg.Classes)
                _classMap[cls.ClassNumber] = cls;
        }

        if (sections.TryGetValue(DwgConstants.SectionHeader, out var hdrSec))
            dwg.HeaderVars = ParseHeaderVarsR2000(data, hdrSec.Offset, hdrSec.Size);

        if (sections.TryGetValue(DwgConstants.SectionObjectMap, out var omSec))
            dwg.ObjectMap = ParseObjectMapR2000(data, omSec.Offset, omSec.Size);

        if (dwg.ObjectMap.Count > 0)
            dwg.Objects = ParseObjectsR2000(data, dwg.ObjectMap, dwg.Classes);

        foreach (var obj in dwg.Objects)
        {
            if (obj.TypeName == "LAYER") dwg.Layers[obj.Handle] = obj.Data;
            else if (obj.TypeName == "BLOCK_HEADER") dwg.Blocks[obj.Handle] = obj.Data;
        }
    }

    private record struct SectionInfo(int Offset, int Size);

    private static Dictionary<int, SectionInfo> ParseSectionLocatorsR2000(byte[] data)
    {
        int numRecords = BitConverter.ToInt32(data, 21);
        var sections = new Dictionary<int, SectionInfo>();
        for (int i = 0; i < numRecords; i++)
        {
            int off = 25 + i * 9;
            if (off + 9 > data.Length) break;
            int recNum = data[off];
            uint seeker = BitConverter.ToUInt32(data, off + 1);
            uint size = BitConverter.ToUInt32(data, off + 5);
            if (seeker > 0 || recNum == 0)
                sections[recNum] = new SectionInfo((int)seeker, (int)size);
        }
        return sections;
    }

    // -----------------------------------------------------------------
    // Header variables (R2000)
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ParseHeaderVarsR2000(byte[] data, int offset, int size)
    {
        var header = new Dictionary<string, object?> { ["$ACADVER"] = "AC1015" };
        uint hdrDataSize = BitConverter.ToUInt32(data, offset + 16);
        var reader = new DwgBitReader(data, offset + 20);

        try
        {
            // Skip unknowns
            for (int i = 0; i < 4; i++) reader.ReadBD();
            for (int i = 0; i < 4; i++) reader.ReadT();
            reader.ReadBL(); reader.ReadBL();

            header["$DIMASO"] = reader.ReadBit();
            header["$DIMSHO"] = reader.ReadBit();
            header["$PLINEGEN"] = reader.ReadBit();
            header["$ORTHOMODE"] = reader.ReadBit();
            header["$REGENMODE"] = reader.ReadBit();
            header["$FILLMODE"] = reader.ReadBit();
            header["$QTEXTMODE"] = reader.ReadBit();
            header["$PSLTSCALE"] = reader.ReadBit();
            header["$LIMCHECK"] = reader.ReadBit();
            header["$USRTIMER"] = reader.ReadBit();
            header["$SKPOLY"] = reader.ReadBit();
            header["$ANGDIR"] = reader.ReadBit();
            header["$SPLFRAME"] = reader.ReadBit();
            header["$MIRRTEXT"] = reader.ReadBit();
            header["$WORLDVIEW"] = reader.ReadBit();
            header["$TILEMODE"] = reader.ReadBit();
            header["$PLIMCHECK"] = reader.ReadBit();
            header["$VISRETAIN"] = reader.ReadBit();
            header["$DISPSILH"] = reader.ReadBit();
            header["$PELLIPSE"] = reader.ReadBit();

            header["$PROXYGRAPHICS"] = reader.ReadBS();
            header["$TREEDEPTH"] = reader.ReadBS();
            header["$LUNITS"] = reader.ReadBS();
            header["$LUPREC"] = reader.ReadBS();
            header["$AUNITS"] = reader.ReadBS();
            header["$AUPREC"] = reader.ReadBS();
            header["$OSMODE"] = reader.ReadBS();
            header["$ATTMODE"] = reader.ReadBS();
            header["$COORDS"] = reader.ReadBS();
            header["$PDMODE"] = reader.ReadBS();
            header["$PICKSTYLE"] = reader.ReadBS();
            for (int i = 1; i <= 5; i++) header[$"$USERI{i}"] = reader.ReadBS();
            header["$SPLINESEGS"] = reader.ReadBS();
            header["$SURFU"] = reader.ReadBS();
            header["$SURFV"] = reader.ReadBS();
            header["$SURFTYPE"] = reader.ReadBS();
            header["$SURFTAB1"] = reader.ReadBS();
            header["$SURFTAB2"] = reader.ReadBS();
            header["$SPLINETYPE"] = reader.ReadBS();
            header["$SHADEDGE"] = reader.ReadBS();
            header["$SHADEDIF"] = reader.ReadBS();
            header["$UNITMODE"] = reader.ReadBS();
            header["$MAXACTVP"] = reader.ReadBS();
            header["$ISOLINES"] = reader.ReadBS();
            header["$CMLJUST"] = reader.ReadBS();
            header["$TEXTQLTY"] = reader.ReadBS();

            header["$LTSCALE"] = reader.ReadBD();
            header["$TEXTSIZE"] = reader.ReadBD();
            header["$TRACEWID"] = reader.ReadBD();
            header["$SKETCHINC"] = reader.ReadBD();
            header["$FILLETRAD"] = reader.ReadBD();
            header["$THICKNESS"] = reader.ReadBD();
            header["$ANGBASE"] = reader.ReadBD();
            header["$PDSIZE"] = reader.ReadBD();
            header["$PLINEWID"] = reader.ReadBD();
            for (int i = 1; i <= 5; i++) header[$"$USERR{i}"] = reader.ReadBD();
            header["$CMLSCALE"] = reader.ReadBD();
            header["$CEPSNTYPE"] = reader.ReadBS();
        }
        catch { /* Stop gracefully on parse errors */ }

        return header;
    }

    // -----------------------------------------------------------------
    // Classes (R2000)
    // -----------------------------------------------------------------

    private static List<DwgClass> ParseClassesR2000(byte[] data, int offset, int size)
    {
        var classes = new List<DwgClass>();
        uint clsDataSize = BitConverter.ToUInt32(data, offset + 16);
        var reader = new DwgBitReader(data, offset + 20);
        int endByte = offset + 20 + (int)clsDataSize;

        while (reader.TellByte() < endByte)
        {
            try
            {
                var cls = new DwgClass
                {
                    ClassNumber = reader.ReadBS(),
                    ProxyFlags = reader.ReadBS(),
                    AppName = reader.ReadT(),
                    CppClassName = reader.ReadT(),
                    DxfName = reader.ReadT(),
                    WasZombie = reader.ReadBit() != 0,
                    ItemClassId = reader.ReadBS(),
                };
                classes.Add(cls);
            }
            catch { break; }
        }

        return classes;
    }

    // -----------------------------------------------------------------
    // Object map (R2000)
    // -----------------------------------------------------------------

    private static Dictionary<int, int> ParseObjectMapR2000(byte[] data, int offset, int size)
    {
        var objectMap = new Dictionary<int, int>();
        int pos = offset, end = offset + size;
        int lastHandle = 0, lastLoc = 0;

        while (pos < end)
        {
            if (pos + 2 > data.Length) break;
            int sectionSize = (data[pos] << 8) | data[pos + 1]; // Big-endian
            if (sectionSize <= 2) break;

            int bodyStart = pos + 2;
            int bodyEnd = bodyStart + sectionSize - 2;
            int rpos = bodyStart;

            while (rpos < bodyEnd)
            {
                try
                {
                    var (handleDelta, newPos1) = DwgBitReader.ReadModularChar(data, rpos);
                    var (locDelta, newPos2) = DwgBitReader.ReadModularChar(data, newPos1);
                    rpos = newPos2;
                    lastHandle += handleDelta;
                    lastLoc += locDelta;
                    if (lastHandle > 0)
                        objectMap[lastHandle] = lastLoc;
                }
                catch { break; }
            }

            pos += 2 + sectionSize;
        }

        return objectMap;
    }

    // -----------------------------------------------------------------
    // Objects parsing (R2000)
    // -----------------------------------------------------------------

    private List<DwgObject> ParseObjectsR2000(byte[] data, Dictionary<int, int> objectMap, List<DwgClass> classes)
    {
        var objects = new List<DwgObject>();
        foreach (var (handle, fileOffset) in objectMap.OrderBy(kv => kv.Key))
        {
            try
            {
                var obj = ParseSingleObjectR2000(data, handle, fileOffset);
                if (obj is not null) objects.Add(obj);
            }
            catch { /* Skip failed objects */ }
        }
        return objects;
    }

    private DwgObject? ParseSingleObjectR2000(byte[] data, int handle, int fileOffset)
    {
        if (fileOffset >= data.Length || fileOffset < 0) return null;

        var (objSize, bitStart) = DwgBitReader.ReadModularShort(data, fileOffset);
        if (objSize <= 0) return null;

        var reader = new DwgBitReader(data, bitStart);
        int typeNum = reader.ReadBS();

        string typeName = DwgConstants.ObjTypeNames.GetValueOrDefault(typeNum, "");
        if (string.IsNullOrEmpty(typeName) && typeNum >= 500)
        {
            if (_classMap.TryGetValue(typeNum, out var cls))
                typeName = !string.IsNullOrEmpty(cls.DxfName) ? cls.DxfName : cls.CppClassName;
        }
        if (string.IsNullOrEmpty(typeName)) typeName = $"UNKNOWN_{typeNum}";

        bool isEntity = DwgConstants.EntityTypes.Contains(typeNum)
            && !DwgConstants.TableControlTypes.Contains(typeNum)
            && !DwgConstants.TableEntryTypes.Contains(typeNum)
            && !DwgConstants.NonEntityTypes.Contains(typeNum);

        if (typeNum >= 500 && !isEntity && _classMap.TryGetValue(typeNum, out var c) && c.ItemClassId == 0x1F2)
            isEntity = true;

        var obj = new DwgObject { Handle = handle, TypeNum = typeNum, TypeName = typeName, IsEntity = isEntity };

        try { reader.ReadRawLong(); } catch { obj.Data = new() { ["type"] = typeName, ["handle"] = handle }; return obj; }
        try { reader.ReadH(); } catch { }
        try { SkipEed(reader); } catch { }

        try
        {
            obj.Data = isEntity
                ? ParseEntityData(reader, typeNum, typeName, objSize)
                : ParseTableObject(reader, typeNum, typeName, objSize);
        }
        catch
        {
            obj.Data ??= new();
        }

        obj.Data["type"] = typeName;
        obj.Data["handle"] = handle;
        return obj;
    }

    private static void SkipEed(DwgBitReader reader)
    {
        while (true)
        {
            int eedSize = reader.ReadBS();
            if (eedSize == 0) break;
            reader.ReadH();
            for (int i = 0; i < eedSize; i++) reader.ReadByte();
        }
    }

    // -----------------------------------------------------------------
    // Entity common data
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ParseEntityCommon(DwgBitReader reader)
    {
        var result = new Dictionary<string, object?>();

        int previewExists = reader.ReadBit();
        if (previewExists != 0)
        {
            uint previewSize = reader.ReadRawLong();
            if (previewSize > 0 && previewSize < 5_000_000)
                for (uint i = 0; i < previewSize; i++) reader.ReadByte();
        }

        result["entity_mode"] = reader.ReadBB();
        result["_num_reactors"] = reader.ReadBL();
        reader.ReadBit(); // nolinks
        result["color"] = reader.ReadCMC();
        result["linetype_scale"] = reader.ReadBD();
        reader.ReadBB(); // ltype_flags
        reader.ReadBB(); // plotstyle_flags
        result["invisible"] = reader.ReadBS() != 0;
        result["lineweight"] = (int)reader.ReadByte();

        return result;
    }

    // -----------------------------------------------------------------
    // Entity dispatch
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseEntityData(DwgBitReader reader, int typeNum, string typeName, int objSize)
    {
        Dictionary<string, object?> common;
        try { common = ParseEntityCommon(reader); } catch { common = new(); }

        Dictionary<string, object?> specific;
        try
        {
            specific = typeNum switch
            {
                0x13 => ParseLine(reader),
                0x12 => ParseCircle(reader),
                0x11 => ParseArc(reader),
                0x1B => ParsePoint(reader),
                0x4D => ParseLwPolyline(reader),
                0x01 => ParseText(reader),
                0x2C => ParseMText(reader),
                0x07 => ParseInsert(reader),
                0x23 => ParseEllipse(reader),
                0x24 => ParseSpline(reader),
                0x1F => ParseSolid(reader),
                0x28 => ParseRay(reader),
                0x29 => ParseXLine(reader),
                _ => new(),
            };
        }
        catch { specific = new(); }

        foreach (var (k, v) in specific) common[k] = v;
        return common;
    }

    // -----------------------------------------------------------------
    // Entity parsers
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ParseLine(DwgBitReader reader)
    {
        int zIsZero = reader.ReadBit();
        double sx = reader.ReadDouble(), ex = reader.ReadDD(sx);
        double sy = reader.ReadDouble(), ey = reader.ReadDD(sy);
        double sz = 0, ez = 0;
        if (zIsZero == 0) { sz = reader.ReadDouble(); ez = reader.ReadDD(sz); }
        double thickness = reader.ReadBT();
        var ext = reader.ReadBE();
        return new()
        {
            ["type"] = "LINE",
            ["start"] = new List<double> { sx, sy, sz },
            ["end"] = new List<double> { ex, ey, ez },
            ["thickness"] = thickness,
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
        };
    }

    private static Dictionary<string, object?> ParseCircle(DwgBitReader reader)
    {
        var center = reader.Read3BD();
        double radius = reader.ReadBD(), thickness = reader.ReadBT();
        var ext = reader.ReadBE();
        return new()
        {
            ["type"] = "CIRCLE",
            ["center"] = new List<double> { center.X, center.Y, center.Z },
            ["radius"] = radius, ["thickness"] = thickness,
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
        };
    }

    private static Dictionary<string, object?> ParseArc(DwgBitReader reader)
    {
        var center = reader.Read3BD();
        double radius = reader.ReadBD(), thickness = reader.ReadBT();
        var ext = reader.ReadBE();
        double sa = reader.ReadBD(), ea = reader.ReadBD();
        return new()
        {
            ["type"] = "ARC",
            ["center"] = new List<double> { center.X, center.Y, center.Z },
            ["radius"] = radius, ["thickness"] = thickness,
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
            ["startAngle"] = sa, ["endAngle"] = ea,
        };
    }

    private static Dictionary<string, object?> ParsePoint(DwgBitReader reader)
    {
        double x = reader.ReadBD(), y = reader.ReadBD(), z = reader.ReadBD();
        double thickness = reader.ReadBT();
        var ext = reader.ReadBE();
        double xAng = reader.ReadBD();
        return new()
        {
            ["type"] = "POINT",
            ["position"] = new List<double> { x, y, z },
            ["thickness"] = thickness,
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
            ["xAxisAngle"] = xAng,
        };
    }

    private static Dictionary<string, object?> ParseEllipse(DwgBitReader reader)
    {
        var center = reader.Read3BD();
        var smAxis = reader.Read3BD();
        var ext = reader.Read3BD();
        double axisRatio = reader.ReadBD(), sa = reader.ReadBD(), ea = reader.ReadBD();
        return new()
        {
            ["type"] = "ELLIPSE",
            ["center"] = new List<double> { center.X, center.Y, center.Z },
            ["majorAxis"] = new List<double> { smAxis.X, smAxis.Y, smAxis.Z },
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
            ["axisRatio"] = axisRatio, ["startAngle"] = sa, ["endAngle"] = ea,
        };
    }

    private static Dictionary<string, object?> ParseText(DwgBitReader reader)
    {
        int dataflags = reader.ReadByte();
        double elevation = (dataflags & 0x01) == 0 ? reader.ReadDouble() : 0;
        var insertion = reader.Read2RD();
        (double ax, double ay) alignment = (0, 0);
        if ((dataflags & 0x02) == 0) alignment = (reader.ReadDD(insertion.X), reader.ReadDD(insertion.Y));
        var ext = reader.ReadBE();
        double thickness = reader.ReadBT();
        double oblique = (dataflags & 0x04) == 0 ? reader.ReadDouble() : 0;
        double rotation = (dataflags & 0x08) == 0 ? reader.ReadDouble() : 0;
        double height = reader.ReadDouble();
        double widthFactor = (dataflags & 0x10) == 0 ? reader.ReadDouble() : 1.0;
        string text = reader.ReadT();
        int generation = (dataflags & 0x20) == 0 ? reader.ReadBS() : 0;
        int halign = (dataflags & 0x40) == 0 ? reader.ReadBS() : 0;
        int valign = (dataflags & 0x80) == 0 ? reader.ReadBS() : 0;

        return new()
        {
            ["type"] = "TEXT", ["elevation"] = elevation,
            ["insertion"] = new List<double> { insertion.X, insertion.Y },
            ["alignment"] = new List<double> { alignment.ax, alignment.ay },
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
            ["thickness"] = thickness, ["oblique"] = oblique, ["rotation"] = rotation,
            ["height"] = height, ["widthFactor"] = widthFactor, ["text"] = text,
            ["generation"] = generation, ["horizontalAlignment"] = halign, ["verticalAlignment"] = valign,
        };
    }

    private static Dictionary<string, object?> ParseMText(DwgBitReader reader)
    {
        var ins = reader.Read3BD();
        var ext = reader.Read3BD();
        var xAxisDir = reader.Read3BD();
        double rectWidth = reader.ReadBD(), textHeight = reader.ReadBD();
        int attachment = reader.ReadBS(), flowDir = reader.ReadBS();
        reader.ReadBD(); reader.ReadBD(); // extents
        string text = reader.ReadT();
        int lineSpacingStyle = reader.ReadBS();
        double lineSpacingFactor = reader.ReadBD();
        reader.ReadBit(); // unknown

        return new()
        {
            ["type"] = "MTEXT",
            ["insertion"] = new List<double> { ins.X, ins.Y, ins.Z },
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
            ["xAxisDirection"] = new List<double> { xAxisDir.X, xAxisDir.Y, xAxisDir.Z },
            ["rectWidth"] = rectWidth, ["textHeight"] = textHeight,
            ["attachment"] = attachment, ["flowDirection"] = flowDir,
            ["text"] = text, ["lineSpacingStyle"] = lineSpacingStyle,
            ["lineSpacingFactor"] = lineSpacingFactor,
        };
    }

    private static Dictionary<string, object?> ParseInsert(DwgBitReader reader)
    {
        var ins = reader.Read3BD();
        int scaleFlag = reader.ReadBB();
        double sx = 1, sy = 1, sz = 1;
        switch (scaleFlag)
        {
            case 3: break;
            case 1: sy = reader.ReadDD(1.0); sz = reader.ReadDD(1.0); break;
            case 2: sx = reader.ReadDouble(); sy = sx; sz = sx; break;
            default: sx = reader.ReadDouble(); sy = reader.ReadDD(sx); sz = reader.ReadDD(sx); break;
        }
        double rotation = reader.ReadBD();
        var ext = reader.Read3BD();
        int hasAttribs = reader.ReadBit();

        return new()
        {
            ["type"] = "INSERT",
            ["insertion"] = new List<double> { ins.X, ins.Y, ins.Z },
            ["scale"] = new List<double> { sx, sy, sz },
            ["rotation"] = rotation,
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
            ["hasAttribs"] = hasAttribs != 0,
        };
    }

    private static Dictionary<string, object?> ParseLwPolyline(DwgBitReader reader)
    {
        int flag = reader.ReadBS();
        double constWidth = (flag & 4) != 0 ? reader.ReadBD() : 0;
        double elevation = (flag & 8) != 0 ? reader.ReadBD() : 0;
        double thickness = (flag & 2) != 0 ? reader.ReadBD() : 0;
        var normal = (flag & 1) != 0 ? reader.Read3BD() : (0.0, 0.0, 1.0);

        int numPoints = reader.ReadBL();
        int numBulges = (flag & 16) != 0 ? reader.ReadBL() : 0;
        int numWidths = (flag & 32) != 0 ? reader.ReadBL() : 0;

        var points = new List<List<double>>();
        if (numPoints > 0 && numPoints < 100000)
        {
            var pt = reader.Read2RD();
            points.Add([pt.X, pt.Y]);
            for (int i = 1; i < numPoints; i++)
            {
                double px = reader.ReadDD(points[i - 1][0]);
                double py = reader.ReadDD(points[i - 1][1]);
                points.Add([px, py]);
            }
        }

        var bulges = new List<double>();
        for (int i = 0; i < numBulges; i++) bulges.Add(reader.ReadBD());

        var widths = new List<List<double>>();
        for (int i = 0; i < numWidths; i++)
            widths.Add([reader.ReadBD(), reader.ReadBD()]);

        return new()
        {
            ["type"] = "LWPOLYLINE", ["flag"] = flag,
            ["constWidth"] = constWidth, ["elevation"] = elevation,
            ["thickness"] = thickness,
            ["normal"] = new List<double> { normal.X, normal.Y, normal.Z },
            ["points"] = points, ["bulges"] = bulges, ["widths"] = widths,
            ["closed"] = (flag & 512) != 0,
        };
    }

    private static Dictionary<string, object?> ParseSpline(DwgBitReader reader)
    {
        int scenario = reader.ReadBL();
        var result = new Dictionary<string, object?> { ["type"] = "SPLINE", ["scenario"] = scenario };

        if (scenario == 2)
        {
            int degree = reader.ReadBL();
            int numKnots = reader.ReadBL(), numCtrl = reader.ReadBL();
            int weighted = reader.ReadBit();
            var knots = new List<double>();
            for (int i = 0; i < numKnots; i++) knots.Add(reader.ReadBD());
            var ctrlPts = new List<Dictionary<string, object?>>();
            for (int i = 0; i < numCtrl; i++)
            {
                var pt = reader.Read3BD();
                double w = weighted != 0 ? reader.ReadBD() : 1.0;
                ctrlPts.Add(new() { ["point"] = new List<double> { pt.X, pt.Y, pt.Z }, ["weight"] = w });
            }
            result["degree"] = degree;
            result["knots"] = knots;
            result["controlPoints"] = ctrlPts;
        }
        else if (scenario == 1)
        {
            int degree = reader.ReadBL();
            reader.ReadBD(); // knot param
            int numFit = reader.ReadBL();
            var fitPts = new List<List<double>>();
            for (int i = 0; i < numFit; i++)
            {
                var pt = reader.Read3BD();
                fitPts.Add([pt.X, pt.Y, pt.Z]);
            }
            result["degree"] = degree;
            result["fitPoints"] = fitPts;
        }

        return result;
    }

    private static Dictionary<string, object?> ParseSolid(DwgBitReader reader)
    {
        double thickness = reader.ReadBT(), elevation = reader.ReadBD();
        var c1 = reader.Read2RD(); var c2 = reader.Read2RD();
        var c3 = reader.Read2RD(); var c4 = reader.Read2RD();
        var ext = reader.ReadBE();
        return new()
        {
            ["type"] = "SOLID", ["thickness"] = thickness, ["elevation"] = elevation,
            ["corners"] = new List<List<double>> { [c1.X, c1.Y], [c2.X, c2.Y], [c3.X, c3.Y], [c4.X, c4.Y] },
            ["extrusion"] = new List<double> { ext.X, ext.Y, ext.Z },
        };
    }

    private static Dictionary<string, object?> ParseRay(DwgBitReader reader)
    {
        var p = reader.Read3BD(); var v = reader.Read3BD();
        return new() { ["type"] = "RAY", ["point"] = new List<double> { p.X, p.Y, p.Z }, ["vector"] = new List<double> { v.X, v.Y, v.Z } };
    }

    private static Dictionary<string, object?> ParseXLine(DwgBitReader reader)
    {
        var p = reader.Read3BD(); var v = reader.Read3BD();
        return new() { ["type"] = "XLINE", ["point"] = new List<double> { p.X, p.Y, p.Z }, ["vector"] = new List<double> { v.X, v.Y, v.Z } };
    }

    // -----------------------------------------------------------------
    // Table / non-entity objects
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseTableObject(DwgBitReader reader, int typeNum, string typeName, int objSize)
    {
        var result = new Dictionary<string, object?> { ["type"] = typeName };
        try
        {
            switch (typeNum)
            {
                case 0x33: Merge(result, ParseLayer(reader)); break;
                case 0x31: Merge(result, ParseBlockHeader(reader)); break;
                case 0x35: Merge(result, ParseStyle(reader)); break;
                case 0x39: Merge(result, ParseLType(reader)); break;
                case 0x2A: Merge(result, ParseDictionary(reader)); break;
                default:
                    if (DwgConstants.TableControlTypes.Contains(typeNum))
                        Merge(result, ParseControlObject(reader));
                    break;
            }
        }
        catch { }
        return result;
    }

    private static void Merge(Dictionary<string, object?> target, Dictionary<string, object?> source)
    {
        foreach (var (k, v) in source) target[k] = v;
    }

    private static Dictionary<string, object?> ParseControlObject(DwgBitReader reader)
    {
        reader.ReadBL(); int numEntries = reader.ReadBL();
        return new() { ["numEntries"] = numEntries };
    }

    private static Dictionary<string, object?> ParseLayer(DwgBitReader reader)
    {
        reader.ReadBL();
        string name = reader.ReadT();
        reader.ReadBit(); reader.ReadBS(); reader.ReadBit();
        int flags = reader.ReadBS();
        int color = reader.ReadCMC();
        return new()
        {
            ["name"] = name, ["flags"] = flags, ["color"] = color,
            ["frozen"] = (flags & 1) != 0, ["off"] = color < 0, ["locked"] = (flags & 4) != 0,
        };
    }

    private static Dictionary<string, object?> ParseBlockHeader(DwgBitReader reader)
    {
        reader.ReadBL();
        string name = reader.ReadT();
        reader.ReadBit(); reader.ReadBS(); reader.ReadBit();
        int anonymous = reader.ReadBit(), hasAttribs = reader.ReadBit(), isXref = reader.ReadBit();
        reader.ReadBit(); reader.ReadBit();
        return new()
        {
            ["name"] = name, ["anonymous"] = anonymous != 0,
            ["hasAttribs"] = hasAttribs != 0, ["isXref"] = isXref != 0,
        };
    }

    private static Dictionary<string, object?> ParseStyle(DwgBitReader reader)
    {
        reader.ReadBL();
        string name = reader.ReadT();
        reader.ReadBit(); reader.ReadBS(); reader.ReadBit();
        reader.ReadBit(); reader.ReadBit(); // vertical, shape
        double fixedHeight = reader.ReadBD(), widthFactor = reader.ReadBD(), oblique = reader.ReadBD();
        reader.ReadByte(); reader.ReadBD();
        string fontName = reader.ReadT(), bigfontName = reader.ReadT();
        return new()
        {
            ["name"] = name, ["fixedHeight"] = fixedHeight, ["widthFactor"] = widthFactor,
            ["oblique"] = oblique, ["fontName"] = fontName, ["bigfontName"] = bigfontName,
        };
    }

    private static Dictionary<string, object?> ParseLType(DwgBitReader reader)
    {
        reader.ReadBL();
        string name = reader.ReadT();
        reader.ReadBit(); reader.ReadBS(); reader.ReadBit();
        string description = reader.ReadT();
        double patternLength = reader.ReadBD();
        reader.ReadByte();
        int numDashes = reader.ReadByte();
        return new()
        {
            ["name"] = name, ["description"] = description,
            ["patternLength"] = patternLength, ["numDashes"] = numDashes,
        };
    }

    private static Dictionary<string, object?> ParseDictionary(DwgBitReader reader)
    {
        reader.ReadBL(); int numItems = reader.ReadBL();
        return new() { ["numItems"] = numItems };
    }

    // Stub for R2004+
    private static void ParseR2004Stub(byte[] data, DwgFile dwg)
    {
        dwg.HeaderVars["$ACADVER"] = dwg.VersionCode;
    }
}
