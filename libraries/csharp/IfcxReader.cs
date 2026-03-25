using System.Text.Json;
using Ifcx.Types;

namespace Ifcx;

/// <summary>
/// Reads .ifcx JSON files into IfcxDocument instances.
/// </summary>
public static class IfcxReader
{
    /// <summary>Read an IFCX document from a JSON file.</summary>
    public static IfcxDocument ReadFile(string path)
    {
        var json = File.ReadAllText(path);
        return Read(json);
    }

    /// <summary>Read an IFCX document from a JSON string.</summary>
    public static IfcxDocument Read(string json)
    {
        return IfcxDocument.FromJson(json);
    }

    /// <summary>Read an IFCX document from a stream.</summary>
    public static IfcxDocument Read(Stream stream)
    {
        using var reader = new StreamReader(stream);
        var json = reader.ReadToEnd();
        return IfcxDocument.FromJson(json);
    }

    /// <summary>Async read from file.</summary>
    public static async Task<IfcxDocument> ReadFileAsync(string path, CancellationToken ct = default)
    {
        var json = await File.ReadAllTextAsync(path, ct);
        return IfcxDocument.FromJson(json);
    }
}
