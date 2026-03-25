using System.Globalization;
using System.Text;

namespace Ifcx.Converters.Dxf;

/// <summary>
/// Low-level DXF ASCII writer. Emits group-code/value pairs, sections, tables,
/// entities, and 3D points in valid DXF format.
/// Built from scratch with no external dependencies.
/// </summary>
public sealed class DxfWriter
{
    private readonly StringBuilder _sb = new();
    private int _handleCounter = 1;

    // -----------------------------------------------------------------
    // Primitive writers
    // -----------------------------------------------------------------

    /// <summary>Write a single group-code / value pair.</summary>
    public void Group(int code, object value)
    {
        _sb.Append(code.ToString().PadLeft(3));
        _sb.Append('\n');
        _sb.Append(value switch
        {
            double d => d.ToString("G12", CultureInfo.InvariantCulture),
            float f => f.ToString("G12", CultureInfo.InvariantCulture),
            bool b => b ? "1" : "0",
            int i => i.ToString(),
            _ => value?.ToString() ?? "",
        });
        _sb.Append('\n');
    }

    /// <summary>Write a 3D point using consecutive group codes.</summary>
    public void Point(double x, double y, double z = 0.0, int codeBase = 10)
    {
        Group(codeBase, x);
        Group(codeBase + 10, y);
        Group(codeBase + 20, z);
    }

    /// <summary>Write a handle (group code 5).</summary>
    public void Handle(string h) => Group(5, h);

    /// <summary>Allocate and return the next handle as a hex string.</summary>
    public string NextHandle()
    {
        var h = _handleCounter.ToString("X");
        _handleCounter++;
        return h;
    }

    /// <summary>Write the entity-type marker (group code 0).</summary>
    public void Entity(string entityType) => Group(0, entityType);

    // -----------------------------------------------------------------
    // Structural helpers
    // -----------------------------------------------------------------

    /// <summary>Begin a SECTION.</summary>
    public void BeginSection(string name)
    {
        Group(0, "SECTION");
        Group(2, name);
    }

    /// <summary>End a SECTION.</summary>
    public void EndSection() => Group(0, "ENDSEC");

    /// <summary>Begin a TABLE.</summary>
    public void BeginTable(string name, string handle, int entries = 0)
    {
        Group(0, "TABLE");
        Group(2, name);
        Handle(handle);
        Group(100, "AcDbSymbolTable");
        Group(70, entries);
    }

    /// <summary>End a TABLE.</summary>
    public void EndTable() => Group(0, "ENDTAB");

    // -----------------------------------------------------------------
    // Output
    // -----------------------------------------------------------------

    /// <summary>Return the complete DXF content as a string (LF line endings).</summary>
    public override string ToString() => _sb.ToString();
}
