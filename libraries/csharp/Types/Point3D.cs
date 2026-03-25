namespace Ifcx.Types;

/// <summary>
/// Immutable 3D point.
/// </summary>
public readonly record struct Point3D(double X, double Y, double Z)
{
    public static readonly Point3D Zero = new(0, 0, 0);
    public static readonly Point3D UnitZ = new(0, 0, 1);

    public double DistanceTo(Point3D other)
    {
        var dx = X - other.X;
        var dy = Y - other.Y;
        var dz = Z - other.Z;
        return Math.Sqrt(dx * dx + dy * dy + dz * dz);
    }

    public double Length => Math.Sqrt(X * X + Y * Y + Z * Z);

    public Point2D To2D() => new(X, Y);

    public double[] ToArray() => [X, Y, Z];

    public override string ToString() => $"({X:G12}, {Y:G12}, {Z:G12})";
}
