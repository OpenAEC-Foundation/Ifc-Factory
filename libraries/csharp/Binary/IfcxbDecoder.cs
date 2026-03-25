using System.IO.Compression;
using System.Text;
using Ifcx.Types;

namespace Ifcx.Binary;

/// <summary>
/// Decodes IFCXB binary format back to an IfcxDocument.
/// Uses BrotliStream for decompression and System.Text.Json for deserialization.
/// </summary>
public static class IfcxbDecoder
{
    private static readonly byte[] Magic = "IFCXB\x01"u8.ToArray();

    /// <summary>Decode IFCXB bytes to document.</summary>
    public static IfcxDocument Decode(byte[] data)
    {
        if (data.Length < 10)
            throw new InvalidDataException("Data too short for IFCXB format");

        // Verify magic
        for (int i = 0; i < Magic.Length; i++)
        {
            if (data[i] != Magic[i])
                throw new InvalidDataException("Invalid IFCXB magic header");
        }

        // Read uncompressed size
        int uncompressedSize = BitConverter.ToInt32(data, Magic.Length);

        // Decompress
        using var input = new MemoryStream(data, Magic.Length + 4, data.Length - Magic.Length - 4);
        using var brotli = new BrotliStream(input, CompressionMode.Decompress);
        using var output = new MemoryStream(uncompressedSize);

        brotli.CopyTo(output);
        var json = Encoding.UTF8.GetString(output.ToArray());

        return IfcxDocument.FromJson(json);
    }

    /// <summary>Decode from file.</summary>
    public static IfcxDocument DecodeFromFile(string path)
    {
        var data = File.ReadAllBytes(path);
        return Decode(data);
    }
}
