using System.Text;
using Ifcx.Types;

namespace Ifcx;

/// <summary>
/// Writes IfcxDocument instances to .ifcx JSON files.
/// </summary>
public static class IfcxWriter
{
    /// <summary>Write an IFCX document to a JSON file.</summary>
    public static void WriteFile(IfcxDocument doc, string path, bool indented = true)
    {
        var json = Write(doc, indented);
        File.WriteAllText(path, json, Encoding.UTF8);
    }

    /// <summary>Serialize an IFCX document to a JSON string.</summary>
    public static string Write(IfcxDocument doc, bool indented = true)
    {
        return doc.ToJson(indented);
    }

    /// <summary>Write an IFCX document to a stream.</summary>
    public static void Write(IfcxDocument doc, Stream stream, bool indented = true)
    {
        var json = doc.ToJson(indented);
        var bytes = Encoding.UTF8.GetBytes(json);
        stream.Write(bytes);
    }

    /// <summary>Async write to file.</summary>
    public static async Task WriteFileAsync(IfcxDocument doc, string path, bool indented = true,
        CancellationToken ct = default)
    {
        var json = doc.ToJson(indented);
        await File.WriteAllTextAsync(path, json, Encoding.UTF8, ct);
    }
}
