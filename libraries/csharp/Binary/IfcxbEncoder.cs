using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Ifcx.Types;

namespace Ifcx.Binary;

/// <summary>
/// Encodes an IfcxDocument to IFCXB binary format.
/// Uses System.Text.Json for serialization and BrotliStream for compression.
/// </summary>
public static class IfcxbEncoder
{
    private static readonly byte[] Magic = "IFCXB\x01"u8.ToArray(); // 5 bytes magic + 1 byte version

    /// <summary>Encode document to IFCXB bytes.</summary>
    public static byte[] Encode(IfcxDocument doc)
    {
        var json = doc.ToJson(indented: false);
        var jsonBytes = Encoding.UTF8.GetBytes(json);

        using var output = new MemoryStream();

        // Write magic header
        output.Write(Magic);

        // Write uncompressed size (4 bytes LE)
        var sizeBytes = BitConverter.GetBytes(jsonBytes.Length);
        output.Write(sizeBytes);

        // Compress with Brotli
        using (var brotli = new BrotliStream(output, CompressionLevel.Optimal, leaveOpen: true))
        {
            brotli.Write(jsonBytes);
        }

        return output.ToArray();
    }

    /// <summary>Encode and write to file.</summary>
    public static void EncodeToFile(IfcxDocument doc, string path)
    {
        var bytes = Encode(doc);
        File.WriteAllBytes(path, bytes);
    }
}
