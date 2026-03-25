using System.Buffers.Binary;
using System.Runtime.InteropServices;

namespace Ifcx.Converters.Dwg;

/// <summary>
/// Bit-level reader for DWG binary format. Reads individual bits and DWG-specific
/// compressed data types from a byte buffer. Built from scratch using only .NET stdlib.
/// </summary>
public sealed class DwgBitReader
{
    private readonly byte[] _data;
    public int BitPosition;

    public DwgBitReader(byte[] data, int byteOffset = 0)
    {
        _data = data;
        BitPosition = byteOffset * 8;
    }

    // -----------------------------------------------------------------
    // Low-level bit reading
    // -----------------------------------------------------------------

    public int ReadBit()
    {
        int byteIdx = BitPosition >> 3;
        int bitIdx = 7 - (BitPosition & 7);
        if (byteIdx >= _data.Length) throw new EndOfStreamException("DwgBitReader: read past end");
        int val = (_data[byteIdx] >> bitIdx) & 1;
        BitPosition++;
        return val;
    }

    public int ReadBits(int count)
    {
        int result = 0;
        for (int i = 0; i < count; i++)
            result = (result << 1) | ReadBit();
        return result;
    }

    // -----------------------------------------------------------------
    // Raw fixed-size types
    // -----------------------------------------------------------------

    public byte ReadByte() => (byte)ReadBits(8);

    public short ReadShort()
    {
        int lo = ReadBits(8);
        int hi = ReadBits(8);
        int val = lo | (hi << 8);
        if (val >= 0x8000) val -= 0x10000;
        return (short)val;
    }

    public ushort ReadRawShort()
    {
        int lo = ReadBits(8);
        int hi = ReadBits(8);
        return (ushort)(lo | (hi << 8));
    }

    public int ReadLong()
    {
        int b0 = ReadBits(8), b1 = ReadBits(8), b2 = ReadBits(8), b3 = ReadBits(8);
        uint val = (uint)(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24));
        return (int)val;
    }

    public uint ReadRawLong()
    {
        int b0 = ReadBits(8), b1 = ReadBits(8), b2 = ReadBits(8), b3 = ReadBits(8);
        return (uint)(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24));
    }

    public double ReadDouble()
    {
        Span<byte> raw = stackalloc byte[8];
        for (int i = 0; i < 8; i++) raw[i] = ReadByte();
        return BitConverter.ToDouble(raw);
    }

    // -----------------------------------------------------------------
    // DWG compressed types
    // -----------------------------------------------------------------

    public int ReadBB() => ReadBits(2);

    /// <summary>Bit Short: 2-bit prefix + variable payload.</summary>
    public int ReadBS()
    {
        int prefix = ReadBits(2);
        return prefix switch
        {
            0 => ReadShort(),
            1 => ReadByte(),
            2 => 0,
            _ => 256,
        };
    }

    /// <summary>Bit Long: 2-bit prefix + variable payload.</summary>
    public int ReadBL()
    {
        int prefix = ReadBits(2);
        return prefix switch
        {
            0 => ReadLong(),
            1 => ReadByte(),
            2 => 0,
            _ => ReadLong(),
        };
    }

    /// <summary>Bit Double: 2-bit prefix + variable payload.</summary>
    public double ReadBD()
    {
        int prefix = ReadBits(2);
        return prefix switch
        {
            0 => ReadDouble(),
            1 => 1.0,
            _ => 0.0,
        };
    }

    /// <summary>Default Double: 2-bit prefix relative to a default value.</summary>
    public double ReadDD(double defaultVal)
    {
        int prefix = ReadBits(2);
        if (prefix == 0) return defaultVal;
        if (prefix == 3) return ReadDouble();

        Span<byte> raw = stackalloc byte[8];
        BitConverter.TryWriteBytes(raw, defaultVal);

        if (prefix == 1)
        {
            raw[0] = ReadByte(); raw[1] = ReadByte();
            raw[2] = ReadByte(); raw[3] = ReadByte();
        }
        else // prefix == 2
        {
            raw[4] = ReadByte(); raw[5] = ReadByte();
            raw[0] = ReadByte(); raw[1] = ReadByte();
            raw[2] = ReadByte(); raw[3] = ReadByte();
        }
        return BitConverter.ToDouble(raw);
    }

    /// <summary>Bit Thickness: leading bit 1 = 0.0, else read BD.</summary>
    public double ReadBT() => ReadBit() != 0 ? 0.0 : ReadBD();

    /// <summary>Bit Extrusion: leading bit 1 = (0,0,1), else 3xBD.</summary>
    public (double X, double Y, double Z) ReadBE()
    {
        if (ReadBit() != 0) return (0.0, 0.0, 1.0);
        double x = ReadBD(), y = ReadBD(), z = ReadBD();
        if (x == 0.0 && y == 0.0) z = z <= 0.0 ? -1.0 : 1.0;
        return (x, y, z);
    }

    // -----------------------------------------------------------------
    // Handle references
    // -----------------------------------------------------------------

    /// <summary>Read handle reference: 4-bit code | 4-bit counter + handle bytes.</summary>
    public (int Code, int Handle) ReadH()
    {
        int code = ReadBits(4);
        int counter = ReadBits(4);
        int handle = 0;
        for (int i = 0; i < counter; i++)
            handle = (handle << 8) | ReadByte();
        return (code, handle);
    }

    // -----------------------------------------------------------------
    // Text strings
    // -----------------------------------------------------------------

    /// <summary>Read text string. R2000: BS length + bytes.</summary>
    public string ReadT(bool isUnicode = false)
    {
        int length = ReadBS();
        if (length <= 0) return "";

        if (isUnicode)
        {
            var raw = new byte[length * 2];
            for (int i = 0; i < raw.Length; i++) raw[i] = ReadByte();
            return System.Text.Encoding.Unicode.GetString(raw).TrimEnd('\0');
        }
        else
        {
            var raw = new byte[length];
            for (int i = 0; i < length; i++) raw[i] = ReadByte();
            return System.Text.Encoding.Latin1.GetString(raw).TrimEnd('\0');
        }
    }

    // -----------------------------------------------------------------
    // Point helpers
    // -----------------------------------------------------------------

    public (double X, double Y) Read2RD() => (ReadDouble(), ReadDouble());
    public (double X, double Y, double Z) Read3RD() => (ReadDouble(), ReadDouble(), ReadDouble());
    public (double X, double Y) Read2BD() => (ReadBD(), ReadBD());
    public (double X, double Y, double Z) Read3BD() => (ReadBD(), ReadBD(), ReadBD());

    // -----------------------------------------------------------------
    // Color
    // -----------------------------------------------------------------

    public int ReadCMC() => ReadBS();

    // -----------------------------------------------------------------
    // Modular char / modular short
    // -----------------------------------------------------------------

    /// <summary>Read modular char (MC) from raw bytes. Returns (value, newPos).</summary>
    public static (int Value, int NewPos) ReadModularChar(byte[] data, int pos)
    {
        int result = 0, shift = 0;
        bool negative = false;
        while (true)
        {
            if (pos >= data.Length) throw new EndOfStreamException("modular_char: unexpected end");
            byte b = data[pos++];
            bool cont = (b & 0x80) != 0;
            result |= (b & 0x7F) << shift;
            shift += 7;
            if (!cont)
            {
                if ((b & 0x40) != 0)
                {
                    negative = true;
                    result &= ~(0x40 << (shift - 7));
                }
                break;
            }
        }
        return (negative ? -result : result, pos);
    }

    /// <summary>Read modular short (MS) from raw bytes. Returns (value, newPos).</summary>
    public static (int Value, int NewPos) ReadModularShort(byte[] data, int pos)
    {
        int result = 0, shift = 0;
        while (true)
        {
            if (pos + 1 >= data.Length) throw new EndOfStreamException("modular_short: unexpected end");
            byte lo = data[pos], hi = data[pos + 1];
            pos += 2;
            int word = lo | ((hi & 0x7F) << 8);
            result |= word << shift;
            shift += 15;
            if ((hi & 0x80) == 0) break;
        }
        return (result, pos);
    }

    // -----------------------------------------------------------------
    // Positioning
    // -----------------------------------------------------------------

    public void SeekByte(int offset) => BitPosition = offset * 8;
    public void SeekBit(int bitOffset) => BitPosition = bitOffset;
    public int TellByte() => BitPosition >> 3;
    public int TellBit() => BitPosition;

    public void AlignByte()
    {
        int rem = BitPosition & 7;
        if (rem != 0) BitPosition += 8 - rem;
    }

    public int RemainingBytes() => Math.Max(0, _data.Length - TellByte());

    public byte[] ReadRawBytes(int count)
    {
        var result = new byte[count];
        for (int i = 0; i < count; i++) result[i] = ReadByte();
        return result;
    }
}
