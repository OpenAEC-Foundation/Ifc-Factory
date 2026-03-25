namespace Ifcx.Converters.Dxf;

/// <summary>
/// A single DXF group code / value pair.
/// </summary>
public readonly record struct DxfToken(int Code, object Value)
{
    public string StringValue => Value is string s ? s : Value?.ToString() ?? "";
    public double DoubleValue => Value is double d ? d : Convert.ToDouble(Value);
    public int IntValue => Value is int i ? i : Convert.ToInt32(Value);
    public bool BoolValue => Value is bool b ? b : Convert.ToBoolean(Value);
}

/// <summary>
/// Pure C# DXF ASCII tokenizer. Yields (groupCode, typedValue) pairs.
/// No external dependencies.
/// </summary>
public static class DxfTokenizer
{
    /// <summary>
    /// Determines the expected value type for a DXF group code.
    /// Returns "str", "float", "int", or "bool".
    /// </summary>
    public static string ValueTypeForCode(int code) => code switch
    {
        >= 0 and <= 9 => "str",
        >= 10 and <= 39 => "float",
        >= 40 and <= 59 => "float",
        >= 60 and <= 79 => "int",
        >= 90 and <= 99 => "int",
        100 => "str",
        102 => "str",
        105 => "str",
        >= 110 and <= 149 => "float",
        >= 160 and <= 169 => "int",
        >= 170 and <= 179 => "int",
        >= 210 and <= 239 => "float",
        >= 270 and <= 289 => "int",
        >= 290 and <= 299 => "bool",
        >= 300 and <= 309 => "str",
        >= 310 and <= 319 => "str",
        >= 320 and <= 369 => "str",
        >= 370 and <= 379 => "int",
        >= 380 and <= 389 => "int",
        >= 390 and <= 399 => "str",
        >= 410 and <= 419 => "str",
        >= 420 and <= 429 => "int",
        >= 430 and <= 439 => "str",
        >= 440 and <= 449 => "int",
        999 => "str",
        >= 1000 and <= 1009 => "str",
        >= 1010 and <= 1059 => "float",
        >= 1060 and <= 1071 => "int",
        _ => "str",
    };

    /// <summary>
    /// Cast a raw string value to the appropriate type based on group code.
    /// </summary>
    public static object CastValue(int code, string raw)
    {
        var vtype = ValueTypeForCode(code);
        return vtype switch
        {
            "float" => double.TryParse(raw, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : 0.0,
            "int" => int.TryParse(raw, out var i) ? i : 0,
            "bool" => int.TryParse(raw, out var b) && b != 0,
            _ => raw,
        };
    }

    /// <summary>
    /// Tokenize DXF ASCII text content into group code / value pairs.
    /// Handles both CRLF and LF line endings.
    /// </summary>
    public static IEnumerable<DxfToken> Tokenize(string content)
    {
        // Normalize line endings
        var text = content.Replace("\r\n", "\n").Replace("\r", "\n");
        var lines = text.Split('\n');
        var idx = 0;
        var length = lines.Length;

        while (idx + 1 < length)
        {
            var codeStr = lines[idx].Trim();
            var valStr = lines[idx + 1].Trim();
            idx += 2;

            if (string.IsNullOrEmpty(codeStr))
                continue;

            if (!int.TryParse(codeStr, out var code))
                continue;

            yield return new DxfToken(code, CastValue(code, valStr));
        }
    }
}
