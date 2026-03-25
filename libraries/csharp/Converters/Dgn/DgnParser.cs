using System.Runtime.InteropServices;

namespace Ifcx.Converters.Dgn;

// -----------------------------------------------------------------
// Data structures
// -----------------------------------------------------------------

public sealed class DgnElement
{
    public int Type { get; set; }
    public string TypeName { get; set; } = "";
    public int Level { get; set; }
    public bool Deleted { get; set; }
    public bool Complex { get; set; }
    public int Offset { get; set; }
    public int Size { get; set; }
    public int GraphicGroup { get; set; }
    public int Properties { get; set; }
    public int Color { get; set; }
    public int Weight { get; set; }
    public int Style { get; set; }
    public Dictionary<string, object?> Data { get; set; } = new();
}

public sealed class DgnFile
{
    public string Version { get; set; } = "V7";
    public List<DgnElement> Elements { get; set; } = [];
    public bool Is3D { get; set; }
    public int UorPerSub { get; set; } = 1;
    public int SubPerMaster { get; set; } = 1;
    public string MasterUnitName { get; set; } = "";
    public string SubUnitName { get; set; } = "";
    public (double X, double Y, double Z) GlobalOrigin { get; set; }
    public List<(byte R, byte G, byte B)?> ColorTable { get; set; } = [];
}

/// <summary>
/// DGN V7 (ISFF) parser. Parses MicroStation DGN V7 binary files.
/// Implements middle-endian 32-bit integers, VAX D-Float to IEEE 754 conversion,
/// and element-type-specific decoding. Built from scratch, no external dependencies.
/// </summary>
public sealed class DgnParser
{
    private static readonly Dictionary<int, string> ElementTypes = new()
    {
        [1] = "CELL_LIBRARY", [2] = "CELL_HEADER", [3] = "LINE", [4] = "LINE_STRING",
        [5] = "GROUP_DATA", [6] = "SHAPE", [7] = "TEXT_NODE", [8] = "DIGITIZER_SETUP",
        [9] = "TCB", [10] = "LEVEL_SYMBOLOGY", [11] = "CURVE",
        [12] = "COMPLEX_CHAIN_HEADER", [14] = "COMPLEX_SHAPE_HEADER",
        [15] = "ELLIPSE", [16] = "ARC", [17] = "TEXT",
        [18] = "3DSURFACE_HEADER", [19] = "3DSOLID_HEADER",
        [21] = "BSPLINE_POLE", [22] = "POINT_STRING", [23] = "CONE",
        [24] = "BSPLINE_SURFACE_HEADER", [25] = "BSPLINE_SURFACE_BOUNDARY",
        [26] = "BSPLINE_KNOT", [27] = "BSPLINE_CURVE_HEADER",
        [28] = "BSPLINE_WEIGHT_FACTOR", [33] = "DIMENSION",
        [34] = "SHARED_CELL_DEFN", [35] = "SHARED_CELL", [37] = "TAG_VALUE",
        [66] = "APPLICATION",
    };

    private static readonly HashSet<int> NoDispHdr =
        [0, 1, 9, 10, 32, 44, 48, 49, 50, 51, 57, 60, 61, 62, 63];

    private int _dimension = 2;
    private double _scale = 1.0;
    private double _originX, _originY, _originZ;
    private bool _gotTcb;

    // -----------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------

    public DgnFile Parse(byte[] data)
    {
        var dgn = new DgnFile();
        if (data.Length < 4) return dgn;

        if (data[0] == 0xC8) { _dimension = 3; dgn.Is3D = true; }
        else { _dimension = 2; dgn.Is3D = false; }

        int offset = 0;
        while (offset < data.Length - 3)
        {
            if (data[offset] == 0xFF && data[offset + 1] == 0xFF) break;
            var elem = ReadElement(data, offset, dgn);
            if (elem is null) break;
            dgn.Elements.Add(elem);
            offset += elem.Size;
        }

        return dgn;
    }

    // -----------------------------------------------------------------
    // Low-level binary helpers
    // -----------------------------------------------------------------

    private static int ReadUint16LE(byte[] data, int offset) =>
        data[offset] + data[offset + 1] * 256;

    private static uint ReadInt32ME(byte[] data, int offset) =>
        (uint)(data[offset + 2] + data[offset + 3] * 256 +
               data[offset + 1] * 256 * 65536 + data[offset] * 65536);

    private static int ReadInt32MESigned(byte[] data, int offset)
    {
        uint v = ReadInt32ME(data, offset);
        return v >= 0x80000000 ? (int)(v - 0x100000000L) : (int)v;
    }

    /// <summary>Convert 8-byte VAX D-Float to IEEE 754 double.</summary>
    private static double VaxToIeee(byte[] data, int offset)
    {
        if (offset + 8 > data.Length) return 0.0;

        var src = data.AsSpan(offset, 8);
        Span<byte> dest = stackalloc byte[8];
        dest[2] = src[0]; dest[3] = src[1]; dest[0] = src[2]; dest[1] = src[3];
        dest[6] = src[4]; dest[7] = src[5]; dest[4] = src[6]; dest[5] = src[7];

        uint dtHi = BitConverter.ToUInt32(dest[..4]);
        uint dtLo = BitConverter.ToUInt32(dest[4..8]);

        uint sign = dtHi & 0x80000000;
        uint exponent = (dtHi >> 23) & 0xFF;
        if (exponent != 0) exponent = exponent - 129 + 1023;

        uint rndbits = dtLo & 0x00000007;
        dtLo >>= 3;
        dtLo = (dtLo & 0x1FFFFFFF) | ((dtHi << 29) & 0xFFFFFFFF);
        if (rndbits != 0) dtLo |= 0x00000001;

        dtHi >>= 3;
        dtHi &= 0x000FFFFF;
        dtHi |= ((exponent << 20) & 0xFFFFFFFF) | sign;

        Span<byte> ieee = stackalloc byte[8];
        BitConverter.TryWriteBytes(ieee, dtLo);
        BitConverter.TryWriteBytes(ieee[4..], dtHi);
        return BitConverter.ToDouble(ieee);
    }

    // -----------------------------------------------------------------
    // Element reading
    // -----------------------------------------------------------------

    private DgnElement? ReadElement(byte[] data, int offset, DgnFile dgn)
    {
        if (offset + 4 > data.Length) return null;

        int b0 = data[offset], b1 = data[offset + 1];
        int level = b0 & 0x3F;
        bool complexFlag = (b0 & 0x80) != 0;
        int etype = b1 & 0x7F;
        bool deleted = (b1 & 0x80) != 0;

        int nWords = ReadUint16LE(data, offset + 2);
        int elemSize = nWords * 2 + 4;
        if (elemSize < 4 || offset + elemSize > data.Length) return null;

        string typeName = ElementTypes.GetValueOrDefault(etype, $"UNKNOWN_{etype}");

        var elem = new DgnElement
        {
            Type = etype, TypeName = typeName, Level = level,
            Deleted = deleted, Complex = complexFlag,
            Offset = offset, Size = elemSize,
        };

        // Display header
        if (!NoDispHdr.Contains(etype) && elemSize >= 36)
        {
            elem.GraphicGroup = ReadUint16LE(data, offset + 28);
            elem.Properties = ReadUint16LE(data, offset + 32);
            elem.Style = data[offset + 34] & 0x07;
            elem.Weight = (data[offset + 34] & 0xF8) >> 3;
            elem.Color = data[offset + 35];
        }

        var raw = data[offset..(offset + elemSize)];
        try
        {
            switch (etype)
            {
                case 9: ParseTcb(raw, dgn); break;
                case 5 when level == 1: ParseColorTable(raw, dgn); break;
                case 3: elem.Data = ParseLine(raw); break;
                case 4 or 6 or 11 or 21: elem.Data = ParseMultipoint(raw, etype); break;
                case 15: elem.Data = ParseEllipse(raw); break;
                case 16: elem.Data = ParseArc(raw); break;
                case 17: elem.Data = ParseText(raw); break;
                case 7: elem.Data = ParseTextNode(raw); break;
                case 2: elem.Data = ParseCellHeader(raw); break;
                case 12 or 14 or 18 or 19: elem.Data = ParseComplexHeader(raw); break;
                case 37: elem.Data = ParseTagValue(raw); break;
            }
        }
        catch { /* Skip parse failures */ }

        return elem;
    }

    // -----------------------------------------------------------------
    // TCB (type 9)
    // -----------------------------------------------------------------

    private void ParseTcb(byte[] raw, DgnFile dgn)
    {
        if (raw.Length < 1264 || _gotTcb) return;

        if ((raw[1214] & 0x40) != 0) { _dimension = 3; dgn.Is3D = true; }
        else { _dimension = 2; dgn.Is3D = false; }

        int subPerMaster = (int)ReadInt32ME(raw, 1112);
        int uorPerSub = (int)ReadInt32ME(raw, 1116);
        dgn.SubPerMaster = subPerMaster != 0 ? subPerMaster : 1;
        dgn.UorPerSub = uorPerSub != 0 ? uorPerSub : 1;

        dgn.MasterUnitName = $"{(char)raw[1120]}{(char)raw[1121]}".TrimEnd('\0').Trim();
        dgn.SubUnitName = $"{(char)raw[1122]}{(char)raw[1123]}".TrimEnd('\0').Trim();

        _scale = (uorPerSub != 0 && subPerMaster != 0) ? 1.0 / (uorPerSub * subPerMaster) : 1.0;

        double ox = VaxToIeee(raw, 1240), oy = VaxToIeee(raw, 1248), oz = VaxToIeee(raw, 1256);
        if (uorPerSub != 0 && subPerMaster != 0)
        {
            double s = uorPerSub * subPerMaster;
            ox /= s; oy /= s; oz /= s;
        }

        _originX = ox; _originY = oy; _originZ = oz;
        _gotTcb = true;
        dgn.GlobalOrigin = (ox, oy, oz);
    }

    // -----------------------------------------------------------------
    // Color table
    // -----------------------------------------------------------------

    private static void ParseColorTable(byte[] raw, DgnFile dgn)
    {
        if (raw.Length < 806) return;
        var colors = new (byte R, byte G, byte B)?[256];
        colors[255] = (raw[38], raw[39], raw[40]);
        for (int i = 0; i < 255; i++)
        {
            int b = 41 + i * 3;
            colors[i] = (raw[b], raw[b + 1], raw[b + 2]);
        }
        dgn.ColorTable = [.. colors];
    }

    // -----------------------------------------------------------------
    // Coordinate helpers
    // -----------------------------------------------------------------

    private (double X, double Y, double Z) TransformPoint(double x, double y, double z = 0) =>
        (x * _scale - _originX, y * _scale - _originY, z * _scale - _originZ);

    private (double X, double Y, double Z) ReadPointInt(byte[] raw, int offset)
    {
        int x = ReadInt32MESigned(raw, offset);
        int y = ReadInt32MESigned(raw, offset + 4);
        int z = _dimension == 3 ? ReadInt32MESigned(raw, offset + 8) : 0;
        return TransformPoint(x, y, z);
    }

    // -----------------------------------------------------------------
    // LINE (type 3)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseLine(byte[] raw)
    {
        int pntSize = _dimension * 4;
        var p0 = ReadPointInt(raw, 36);
        var p1 = ReadPointInt(raw, 36 + pntSize);
        return new() { ["vertices"] = new List<List<double>> { [p0.X, p0.Y, p0.Z], [p1.X, p1.Y, p1.Z] } };
    }

    // -----------------------------------------------------------------
    // Multipoint (types 4, 6, 11, 21)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseMultipoint(byte[] raw, int etype)
    {
        int pntSize = _dimension * 4;
        int count = ReadUint16LE(raw, 36);
        int maxCount = (raw.Length - 38) / pntSize;
        if (count > maxCount) count = maxCount;

        var vertices = new List<List<double>>();
        for (int i = 0; i < count; i++)
        {
            var pt = ReadPointInt(raw, 38 + i * pntSize);
            vertices.Add([pt.X, pt.Y, pt.Z]);
        }

        var result = new Dictionary<string, object?> { ["vertices"] = vertices };
        if (etype == 6) result["closed"] = true;
        return result;
    }

    // -----------------------------------------------------------------
    // ELLIPSE (type 15)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseEllipse(byte[] raw)
    {
        double primary = VaxToIeee(raw, 36) * _scale;
        double secondary = VaxToIeee(raw, 44) * _scale;
        double rotation;
        (double X, double Y, double Z) origin;

        if (_dimension == 2)
        {
            rotation = ReadInt32MESigned(raw, 52) / 360000.0;
            double ox = VaxToIeee(raw, 56), oy = VaxToIeee(raw, 64);
            origin = TransformPoint(ox, oy);
        }
        else
        {
            double ox = VaxToIeee(raw, 68), oy = VaxToIeee(raw, 76), oz = VaxToIeee(raw, 84);
            origin = TransformPoint(ox, oy, oz);
            rotation = 0;
        }

        return new()
        {
            ["primary_axis"] = primary, ["secondary_axis"] = secondary,
            ["rotation"] = rotation,
            ["origin"] = new List<double> { origin.X, origin.Y, origin.Z },
            ["start_angle"] = 0.0, ["sweep_angle"] = 360.0,
        };
    }

    // -----------------------------------------------------------------
    // ARC (type 16)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseArc(byte[] raw)
    {
        double startAng = ReadInt32MESigned(raw, 36) / 360000.0;

        bool sweepNeg = (raw[41] & 0x80) != 0;
        var rawMut = (byte[])raw.Clone();
        rawMut[41] = (byte)(raw[41] & 0x7F);
        int sweepVal = ReadInt32MESigned(rawMut, 40);
        if (sweepNeg) sweepVal = -sweepVal;
        double sweepAng = sweepVal == 0 ? 360.0 : sweepVal / 360000.0;

        double primary = VaxToIeee(raw, 44) * _scale;
        double secondary = VaxToIeee(raw, 52) * _scale;
        double rotation;
        (double X, double Y, double Z) origin;

        if (_dimension == 2)
        {
            rotation = ReadInt32MESigned(raw, 60) / 360000.0;
            double ox = VaxToIeee(raw, 64), oy = VaxToIeee(raw, 72);
            origin = TransformPoint(ox, oy);
        }
        else
        {
            double ox = VaxToIeee(raw, 76), oy = VaxToIeee(raw, 84), oz = VaxToIeee(raw, 92);
            origin = TransformPoint(ox, oy, oz);
            rotation = 0;
        }

        return new()
        {
            ["primary_axis"] = primary, ["secondary_axis"] = secondary,
            ["rotation"] = rotation,
            ["origin"] = new List<double> { origin.X, origin.Y, origin.Z },
            ["start_angle"] = startAng, ["sweep_angle"] = sweepAng,
        };
    }

    // -----------------------------------------------------------------
    // TEXT (type 17)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseText(byte[] raw)
    {
        int fontId = raw[36], justification = raw[37];
        double lengthMult = ReadInt32MESigned(raw, 38) * _scale * 6.0 / 1000.0;
        double heightMult = ReadInt32MESigned(raw, 42) * _scale * 6.0 / 1000.0;

        double rotation;
        (double X, double Y, double Z) origin;
        int textOff, numChars;

        if (_dimension == 2)
        {
            rotation = ReadInt32MESigned(raw, 46) / 360000.0;
            int ox = ReadInt32MESigned(raw, 50), oy = ReadInt32MESigned(raw, 54);
            origin = TransformPoint(ox, oy);
            numChars = raw.Length > 58 ? raw[58] : 0;
            textOff = 60;
        }
        else
        {
            rotation = 0;
            int ox = ReadInt32MESigned(raw, 62), oy = ReadInt32MESigned(raw, 66), oz = ReadInt32MESigned(raw, 70);
            origin = TransformPoint(ox, oy, oz);
            numChars = raw.Length > 74 ? raw[74] : 0;
            textOff = 76;
        }

        string text = "";
        if (textOff + numChars <= raw.Length)
        {
            var textBytes = raw[textOff..(textOff + numChars)];
            text = System.Text.Encoding.ASCII.GetString(textBytes).TrimEnd('\0');
        }

        return new()
        {
            ["text"] = text, ["font_id"] = fontId, ["justification"] = justification,
            ["height"] = heightMult, ["width"] = lengthMult, ["rotation"] = rotation,
            ["origin"] = new List<double> { origin.X, origin.Y, origin.Z },
        };
    }

    // -----------------------------------------------------------------
    // TEXT_NODE (type 7)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseTextNode(byte[] raw)
    {
        int totlength = ReadUint16LE(raw, 36);
        int numelems = ReadUint16LE(raw, 38);
        int fontId = raw[44];
        double lengthMult = ReadInt32MESigned(raw, 50) * _scale * 6.0 / 1000.0;
        double heightMult = ReadInt32MESigned(raw, 54) * _scale * 6.0 / 1000.0;

        double rotation;
        (double X, double Y, double Z) origin;

        if (_dimension == 2)
        {
            rotation = ReadInt32MESigned(raw, 58) / 360000.0;
            int ox = ReadInt32MESigned(raw, 62), oy = ReadInt32MESigned(raw, 66);
            origin = TransformPoint(ox, oy);
        }
        else
        {
            int ox = ReadInt32MESigned(raw, 74), oy = ReadInt32MESigned(raw, 78), oz = ReadInt32MESigned(raw, 82);
            origin = TransformPoint(ox, oy, oz);
            rotation = 0;
        }

        return new()
        {
            ["totlength"] = totlength, ["numelems"] = numelems,
            ["font_id"] = fontId, ["height"] = heightMult, ["width"] = lengthMult,
            ["rotation"] = rotation,
            ["origin"] = new List<double> { origin.X, origin.Y, origin.Z },
        };
    }

    // -----------------------------------------------------------------
    // CELL_HEADER (type 2)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseCellHeader(byte[] raw)
    {
        int totlength = ReadUint16LE(raw, 36);
        string name = "";
        try
        {
            int w1 = ReadUint16LE(raw, 38), w2 = ReadUint16LE(raw, 40);
            name = (Rad50ToAscii(w1) + Rad50ToAscii(w2)).TrimEnd();
        }
        catch { }

        (double X, double Y, double Z) origin;
        double xscale = 1, yscale = 1, rotation = 0;

        if (_dimension == 2)
        {
            int a = ReadInt32MESigned(raw, 68), c = ReadInt32MESigned(raw, 76);
            int b = ReadInt32MESigned(raw, 72), d = ReadInt32MESigned(raw, 80);
            int ox = ReadInt32MESigned(raw, 84), oy = ReadInt32MESigned(raw, 88);
            origin = TransformPoint(ox, oy);

            long a2 = (long)a * a, c2 = (long)c * c;
            xscale = (a2 + c2) > 0 ? Math.Sqrt(a2 + c2) / 214748.0 : 1.0;
            yscale = Math.Sqrt((long)b * b + (long)d * d) / 214748.0;

            if (a2 + c2 <= 0) rotation = 0;
            else
            {
                rotation = Math.Acos(Math.Clamp(a / Math.Sqrt(a2 + c2), -1.0, 1.0));
                rotation = b <= 0 ? rotation * 180.0 / Math.PI : 360.0 - rotation * 180.0 / Math.PI;
            }
        }
        else
        {
            int ox = ReadInt32MESigned(raw, 112), oy = ReadInt32MESigned(raw, 116), oz = ReadInt32MESigned(raw, 120);
            origin = TransformPoint(ox, oy, oz);
        }

        return new()
        {
            ["name"] = name, ["totlength"] = totlength,
            ["origin"] = new List<double> { origin.X, origin.Y, origin.Z },
            ["xscale"] = xscale, ["yscale"] = yscale, ["rotation"] = rotation,
        };
    }

    // -----------------------------------------------------------------
    // Complex headers (types 12, 14, 18, 19)
    // -----------------------------------------------------------------

    private static Dictionary<string, object?> ParseComplexHeader(byte[] raw)
    {
        int totlength = ReadUint16LE(raw, 36);
        int numelems = ReadUint16LE(raw, 38);
        return new() { ["totlength"] = totlength, ["numelems"] = numelems };
    }

    // -----------------------------------------------------------------
    // TAG_VALUE (type 37)
    // -----------------------------------------------------------------

    private Dictionary<string, object?> ParseTagValue(byte[] raw)
    {
        if (raw.Length < 156) return new();
        int tagType = ReadUint16LE(raw, 74);
        uint tagSet = BitConverter.ToUInt32(raw, 68);
        int tagIndex = ReadUint16LE(raw, 72);
        int tagLength = ReadUint16LE(raw, 150);

        var result = new Dictionary<string, object?>
        {
            ["tag_type"] = tagType, ["tag_set"] = (int)tagSet,
            ["tag_index"] = tagIndex, ["tag_length"] = tagLength,
        };

        if (tagType == 1 && raw.Length > 154)
        {
            int end = Array.IndexOf(raw, (byte)0, 154);
            if (end < 0) end = raw.Length;
            result["value"] = System.Text.Encoding.ASCII.GetString(raw, 154, end - 154);
        }
        else if (tagType == 3 && raw.Length >= 158)
            result["value"] = BitConverter.ToInt32(raw, 154);
        else if (tagType == 4 && raw.Length >= 162)
            result["value"] = VaxToIeee(raw, 154);

        return result;
    }

    // -----------------------------------------------------------------
    // Radix-50 decoding
    // -----------------------------------------------------------------

    private static string Rad50ToAscii(int value)
    {
        const string r50 = " ABCDEFGHIJKLMNOPQRSTUVWXYZ$.%0123456789";
        char[] chars = new char[3];
        for (int i = 2; i >= 0; i--)
        {
            int idx = value % 40;
            chars[i] = idx < r50.Length ? r50[idx] : ' ';
            value /= 40;
        }
        return new string(chars);
    }
}
