#ifndef IFCX_TYPES_H
#define IFCX_TYPES_H

#include <array>
#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <variant>
#include <vector>

#include <nlohmann/json.hpp>

namespace ifcx {

// === Primitives ===

using Point2D = std::array<double, 2>;
using Point3D = std::array<double, 3>;
using Handle = std::string;
using EntityRef = std::string;

// === Color ===

struct Rgb {
    double r = 0.0;
    double g = 0.0;
    double b = 0.0;
    double a = 1.0;
};

inline void to_json(nlohmann::json& j, const Rgb& c) {
    j = nlohmann::json{{"r", c.r}, {"g", c.g}, {"b", c.b}};
    if (c.a != 1.0) {
        j["a"] = c.a;
    }
}

inline void from_json(const nlohmann::json& j, Rgb& c) {
    j.at("r").get_to(c.r);
    j.at("g").get_to(c.g);
    j.at("b").get_to(c.b);
    if (j.contains("a")) {
        j.at("a").get_to(c.a);
    } else {
        c.a = 1.0;
    }
}

using Color = std::variant<Rgb, int, std::string>;

inline void to_json(nlohmann::json& j, const Color& c) {
    std::visit([&j](auto&& val) {
        using T = std::decay_t<decltype(val)>;
        if constexpr (std::is_same_v<T, Rgb>) {
            to_json(j, val);
        } else {
            j = val;
        }
    }, c);
}

inline void from_json(const nlohmann::json& j, Color& c) {
    if (j.is_object()) {
        Rgb rgb;
        from_json(j, rgb);
        c = rgb;
    } else if (j.is_number_integer()) {
        c = j.get<int>();
    } else if (j.is_string()) {
        c = j.get<std::string>();
    }
}

// === Units ===

struct Units {
    std::string linear = "millimeters";
    std::string linearFormat = "decimal";
    int linearPrecision = 4;
    std::string angular = "decimal_degrees";
    int angularPrecision = 0;
    double angularBase = 0.0;
    std::string angularDirection = "ccw";
    std::string measurement = "metric";
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Units,
    linear, linearFormat, linearPrecision,
    angular, angularPrecision, angularBase,
    angularDirection, measurement)

// === Extents ===

struct Extents {
    Point3D min = {0.0, 0.0, 0.0};
    Point3D max = {0.0, 0.0, 0.0};
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Extents, min, max)

// === Limits ===

struct Limits {
    Point2D min = {0.0, 0.0};
    Point2D max = {0.0, 0.0};
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Limits, min, max)

// === UCS ===

struct Ucs {
    Point3D origin = {0.0, 0.0, 0.0};
    Point3D xAxis = {1.0, 0.0, 0.0};
    Point3D yAxis = {0.0, 1.0, 0.0};
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Ucs, origin, xAxis, yAxis)

// === Header ===

struct Header {
    std::string version;
    std::string codePage;
    std::string createDate;
    std::string updateDate;
    double totalEditTime = 0.0;
    std::string author;
    std::string organization;
    std::string application;
    Units units;
    Extents extents;
    Limits limits;
    std::string currentLayer = "0";
    std::string currentLinetype = "ByLayer";
    Color currentColor = std::string("ByLayer");
    std::string currentTextStyle = "Standard";
    std::string currentDimStyle = "Standard";
    double linetypeScale = 1.0;
    double elevation = 0.0;
    double thickness = 0.0;
    bool fillMode = true;
    bool orthoMode = false;
    int pointDisplayMode = 0;
    double pointDisplaySize = 0.0;
    Ucs ucs;
    Handle handleSeed;
    nlohmann::json variables = nlohmann::json::object();
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Header,
    version, codePage, createDate, updateDate,
    totalEditTime, author, organization, application,
    units, extents, limits,
    currentLayer, currentLinetype, currentColor,
    currentTextStyle, currentDimStyle,
    linetypeScale, elevation, thickness,
    fillMode, orthoMode, pointDisplayMode, pointDisplaySize,
    ucs, handleSeed, variables)

// === Layer ===

struct Layer {
    Color color = 7;
    std::string linetype = "Continuous";
    int lineweight = -1;
    bool frozen = false;
    bool locked = false;
    bool off = false;
    bool plot = true;
    std::string description;
    double transparency = 0.0;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Layer,
    color, linetype, lineweight,
    frozen, locked, off, plot,
    description, transparency)

// === Linetype ===

struct LinetypeElement {
    std::string type;
    std::string style;
    nlohmann::json value;
    double scale = 1.0;
    double rotation = 0.0;
    Point2D offset = {0.0, 0.0};
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(LinetypeElement,
    type, style, value, scale, rotation, offset)

struct Linetype {
    std::string description;
    double patternLength = 0.0;
    std::vector<double> pattern;
    std::vector<LinetypeElement> complexElements;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Linetype,
    description, patternLength, pattern, complexElements)

// === TextStyle ===

struct TextStyle {
    std::string fontFamily;
    std::string bigFont;
    double height = 0.0;
    double widthFactor = 1.0;
    double oblique = 0.0;
    bool isVertical = false;
    bool isBackward = false;
    bool isUpsideDown = false;
    bool isTrueType = false;
    bool bold = false;
    bool italic = false;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(TextStyle,
    fontFamily, bigFont, height, widthFactor, oblique,
    isVertical, isBackward, isUpsideDown, isTrueType,
    bold, italic)

// === DimTolerance ===

struct DimTolerance {
    bool enabled = false;
    std::string method = "none";
    double upper = 0.0;
    double lower = 0.0;
    int precision = 4;
    std::string verticalPosition = "middle";
    double scaleFactor = 1.0;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(DimTolerance,
    enabled, method, upper, lower, precision,
    verticalPosition, scaleFactor)

// === DimAlternate ===

struct DimAlternate {
    bool enabled = false;
    double scaleFactor = 25.4;
    int precision = 2;
    std::string unit;
    std::string prefix;
    std::string suffix;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(DimAlternate,
    enabled, scaleFactor, precision, unit, prefix, suffix)

// === DimStyle ===

struct DimStyle {
    double overallScale = 1.0;
    double linearScale = 1.0;
    double arrowSize = 2.5;
    std::string arrowBlock;
    std::string arrowBlock1;
    std::string arrowBlock2;
    std::string leaderArrowBlock;
    double textHeight = 2.5;
    std::string textStyle = "Standard";
    Color textColor = std::string("ByBlock");
    bool textInsideAlign = true;
    bool textOutsideAlign = true;
    bool textAboveDimLine = false;
    double textGap = 0.625;
    Color dimLineColor = std::string("ByBlock");
    int dimLineWeight = -1;
    double dimLineExtension = 0.0;
    double dimLineIncrement = 3.75;
    bool suppressDimLine1 = false;
    bool suppressDimLine2 = false;
    Color extLineColor = std::string("ByBlock");
    int extLineWeight = -1;
    double extLineOffset = 0.625;
    double extLineExtension = 1.25;
    bool suppressExtLine1 = false;
    bool suppressExtLine2 = false;
    double centerMarkSize = 2.5;
    std::string linearUnit = "decimal";
    int linearPrecision = 4;
    std::string decimalSeparator = ".";
    std::string prefix;
    std::string suffix;
    DimTolerance tolerance;
    DimAlternate alternate;
    std::string fit;
    std::string textJustification;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(DimStyle,
    overallScale, linearScale, arrowSize,
    arrowBlock, arrowBlock1, arrowBlock2, leaderArrowBlock,
    textHeight, textStyle, textColor,
    textInsideAlign, textOutsideAlign, textAboveDimLine, textGap,
    dimLineColor, dimLineWeight, dimLineExtension, dimLineIncrement,
    suppressDimLine1, suppressDimLine2,
    extLineColor, extLineWeight, extLineOffset, extLineExtension,
    suppressExtLine1, suppressExtLine2,
    centerMarkSize, linearUnit, linearPrecision, decimalSeparator,
    prefix, suffix, tolerance, alternate, fit, textJustification)

// === Named View ===

struct NamedView {
    Point2D center = {0.0, 0.0};
    double height = 0.0;
    double width = 0.0;
    Point3D direction = {0.0, 0.0, 1.0};
    Point3D target = {0.0, 0.0, 0.0};
    double lensLength = 50.0;
    double twist = 0.0;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(NamedView,
    center, height, width, direction, target, lensLength, twist)

// === ViewportConfig ===

struct ViewportConfig {
    Point2D lowerLeft = {0.0, 0.0};
    Point2D upperRight = {1.0, 1.0};
    Point2D center = {0.5, 0.5};
    double height = 1.0;
    double aspectRatio = 1.0;
    Point3D direction = {0.0, 0.0, 1.0};
    Point3D target = {0.0, 0.0, 0.0};
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(ViewportConfig,
    lowerLeft, upperRight, center, height, aspectRatio,
    direction, target)

// === Tables ===

struct Tables {
    std::map<std::string, Layer> layers;
    std::map<std::string, Linetype> linetypes;
    std::map<std::string, TextStyle> textStyles;
    std::map<std::string, DimStyle> dimStyles;
    std::map<std::string, NamedView> views;
    std::map<std::string, Ucs> ucss;
    std::map<std::string, ViewportConfig> viewports;
    std::vector<std::string> appIds;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Tables,
    layers, linetypes, textStyles, dimStyles,
    views, ucss, viewports, appIds)

// === Entity ===

struct Entity {
    std::string type;
    Handle handle;
    std::string layer = "0";
    std::string linetype;
    double linetypeScale = 1.0;
    Color color = std::string("ByLayer");
    int lineweight = -1;
    double transparency = 0.0;
    bool visible = true;
    std::string space = "model";
    EntityRef layoutRef;
    EntityRef ownerRef;
    Point3D extrusion = {0.0, 0.0, 1.0};
    double thickness = 0.0;
    nlohmann::json properties = nlohmann::json::object();
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(Entity,
    type, handle, layer, linetype, linetypeScale,
    color, lineweight, transparency, visible, space,
    layoutRef, ownerRef, extrusion, thickness, properties)

// === BlockDefinition ===

struct BlockDefinition {
    std::string name;
    Point3D basePoint = {0.0, 0.0, 0.0};
    std::string description;
    std::vector<Entity> entities;
    bool isAnonymous = false;
    bool isXRef = false;
    std::string xRefPath;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(BlockDefinition,
    name, basePoint, description, entities,
    isAnonymous, isXRef, xRefPath)

// === Drawing Objects ===

using DrawingObject = nlohmann::json;

// === IfcxFile ===

struct IfcxFile {
    std::string ifcx = "1.0";
    Header header;
    Tables tables;
    std::map<std::string, BlockDefinition> blocks;
    std::vector<Entity> entities;
    std::vector<DrawingObject> objects;
    nlohmann::json extensions = nlohmann::json::object();
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(IfcxFile,
    ifcx, header, tables, blocks, entities, objects, extensions)

} // namespace ifcx

#endif // IFCX_TYPES_H
