using System.Text.Json;
using System.Text.Json.Serialization;

namespace Ifcx.Types;

/// <summary>
/// Main IFCX document class containing all sections of a CAD file.
/// </summary>
public class IfcxDocument
{
    [JsonPropertyName("header")]
    public Dictionary<string, object?> Header { get; set; } = new();

    [JsonPropertyName("tables")]
    public Dictionary<string, object?> Tables { get; set; } = new();

    [JsonPropertyName("blocks")]
    public Dictionary<string, object?> Blocks { get; set; } = new();

    [JsonPropertyName("entities")]
    public List<Dictionary<string, object?>> Entities { get; set; } = [];

    [JsonPropertyName("objects")]
    public List<Dictionary<string, object?>> Objects { get; set; } = [];

    // -----------------------------------------------------------------
    // Convenience methods
    // -----------------------------------------------------------------

    /// <summary>Add an entity dictionary to the entities list.</summary>
    public void AddEntity(Dictionary<string, object?> entity)
    {
        Entities.Add(entity);
    }

    /// <summary>Find all entities matching a given type string.</summary>
    public IEnumerable<Dictionary<string, object?>> FindByType(string type)
    {
        return Entities.Where(e =>
            e.TryGetValue("type", out var t) && t is string s && s == type);
    }

    /// <summary>Find all entities on a given layer.</summary>
    public IEnumerable<Dictionary<string, object?>> FindByLayer(string layer)
    {
        return Entities.Where(e =>
            e.TryGetValue("layer", out var l) && l is string s && s == layer);
    }

    /// <summary>Serialize this document to a JSON string.</summary>
    public string ToJson(bool indented = true)
    {
        var options = new JsonSerializerOptions
        {
            WriteIndented = indented,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };
        return JsonSerializer.Serialize(this, options);
    }

    /// <summary>Deserialize a document from a JSON string.</summary>
    public static IfcxDocument FromJson(string json)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };
        return JsonSerializer.Deserialize<IfcxDocument>(json, options) ?? new IfcxDocument();
    }
}
