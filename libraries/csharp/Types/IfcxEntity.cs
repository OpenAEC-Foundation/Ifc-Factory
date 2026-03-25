using System.Text.Json;

namespace Ifcx.Types;

/// <summary>
/// Wrapper around a Dictionary&lt;string, JsonElement&gt; providing typed access
/// to common entity properties.
/// </summary>
public sealed class IfcxEntity
{
    private readonly Dictionary<string, JsonElement> _data;

    public IfcxEntity()
    {
        _data = new Dictionary<string, JsonElement>();
    }

    public IfcxEntity(Dictionary<string, JsonElement> data)
    {
        _data = data;
    }

    public IfcxEntity(Dictionary<string, object?> raw)
    {
        _data = new Dictionary<string, JsonElement>();
        foreach (var kvp in raw)
        {
            var json = JsonSerializer.Serialize(kvp.Value);
            _data[kvp.Key] = JsonDocument.Parse(json).RootElement.Clone();
        }
    }

    /// <summary>The entity type (e.g., LINE, CIRCLE, ARC).</summary>
    public string Type
    {
        get => GetString("type") ?? "";
        set => Set("type", value);
    }

    /// <summary>The entity handle.</summary>
    public string Handle
    {
        get => GetString("handle") ?? "";
        set => Set("handle", value);
    }

    /// <summary>The layer this entity belongs to.</summary>
    public string Layer
    {
        get => GetString("layer") ?? "0";
        set => Set("layer", value);
    }

    /// <summary>Access the underlying data dictionary.</summary>
    public Dictionary<string, JsonElement> Data => _data;

    public JsonElement this[string key]
    {
        get => _data[key];
        set => _data[key] = value;
    }

    public bool TryGetValue(string key, out JsonElement value) =>
        _data.TryGetValue(key, out value);

    public bool ContainsKey(string key) => _data.ContainsKey(key);

    // -----------------------------------------------------------------
    // Typed helpers
    // -----------------------------------------------------------------

    public string? GetString(string key)
    {
        if (_data.TryGetValue(key, out var el) && el.ValueKind == JsonValueKind.String)
            return el.GetString();
        return null;
    }

    public double? GetDouble(string key)
    {
        if (_data.TryGetValue(key, out var el) && el.ValueKind == JsonValueKind.Number)
            return el.GetDouble();
        return null;
    }

    public int? GetInt(string key)
    {
        if (_data.TryGetValue(key, out var el) && el.ValueKind == JsonValueKind.Number)
            return el.GetInt32();
        return null;
    }

    public bool? GetBool(string key)
    {
        if (_data.TryGetValue(key, out var el))
        {
            if (el.ValueKind == JsonValueKind.True) return true;
            if (el.ValueKind == JsonValueKind.False) return false;
        }
        return null;
    }

    public void Set<T>(string key, T value)
    {
        var json = JsonSerializer.Serialize(value);
        _data[key] = JsonDocument.Parse(json).RootElement.Clone();
    }

    /// <summary>Convert back to a plain dictionary.</summary>
    public Dictionary<string, object?> ToDictionary()
    {
        var result = new Dictionary<string, object?>();
        foreach (var kvp in _data)
        {
            result[kvp.Key] = JsonElementToObject(kvp.Value);
        }
        return result;
    }

    private static object? JsonElementToObject(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.String => el.GetString(),
        JsonValueKind.Number when el.TryGetInt64(out var l) => l,
        JsonValueKind.Number => el.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => null,
        JsonValueKind.Array => el.EnumerateArray().Select(JsonElementToObject).ToList(),
        JsonValueKind.Object => el.EnumerateObject()
            .ToDictionary(p => p.Name, p => JsonElementToObject(p.Value)),
        _ => null,
    };
}
