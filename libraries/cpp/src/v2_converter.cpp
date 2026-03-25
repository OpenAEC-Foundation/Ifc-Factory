#include "ifcx/v2_converter.h"

#include <cmath>
#include <chrono>
#include <random>
#include <sstream>
#include <iomanip>

namespace ifcx {

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

static const nlohmann::json V2_IMPORTS = nlohmann::json::array({
    {{"uri", "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx"}},
    {{"uri", "https://ifcx.dev/@openusd.org/usd@v1.ifcx"}},
    {{"uri", "https://ifcx.openaec.org/schemas/geom@v1.ifcx"}},
    {{"uri", "https://ifcx.openaec.org/schemas/annotation@v1.ifcx"}},
    {{"uri", "https://ifcx.openaec.org/schemas/sheet@v1.ifcx"}},
});

static const std::map<std::string, std::string> UNIT_TO_MM = {
    {"millimeters", "mm"}, {"centimeters", "cm"}, {"meters", "m"},
    {"kilometers", "km"}, {"inches", "in"}, {"feet", "ft"},
    {"miles", "mi"}, {"unitless", "mm"}, {"scientific", "mm"},
    {"decimal", "mm"}, {"engineering", "in"}, {"architectural", "in"},
    {"fractional", "in"},
};

struct AciEntry {
    int aci;
    double r, g, b;
};

static const AciEntry ACI_TABLE[] = {
    {1, 1.0, 0.0, 0.0}, {2, 1.0, 1.0, 0.0}, {3, 0.0, 1.0, 0.0},
    {4, 0.0, 1.0, 1.0}, {5, 0.0, 0.0, 1.0}, {6, 1.0, 0.0, 1.0},
    {7, 1.0, 1.0, 1.0}, {8, 0.5, 0.5, 0.5}, {9, 0.75, 0.75, 0.75},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

std::string V2Converter::uid() {
    static std::mt19937 rng(std::random_device{}());
    std::uniform_int_distribution<uint64_t> dist;
    uint64_t val = dist(rng);
    std::ostringstream oss;
    oss << std::hex << std::setfill('0') << std::setw(12) << (val & 0xFFFFFFFFFFFFULL);
    return oss.str();
}

nlohmann::json V2Converter::ensure_3d(const nlohmann::json& pt) {
    if (!pt.is_array()) return nlohmann::json::array({0.0, 0.0, 0.0});
    nlohmann::json result = pt;
    while (result.size() < 3) result.push_back(0.0);
    return nlohmann::json::array({result[0].get<double>(), result[1].get<double>(), result[2].get<double>()});
}

nlohmann::json V2Converter::ensure_3d_array(const nlohmann::json& arr) {
    nlohmann::json result = nlohmann::json::array();
    if (!arr.is_array()) return result;
    for (const auto& item : arr)
        result.push_back(ensure_3d(item));
    return result;
}

nlohmann::json V2Converter::build_insert_matrix(
    const nlohmann::json& insert_pt,
    double x_scale, double y_scale, double z_scale,
    double rotation)
{
    double c = std::cos(rotation);
    double s = std::sin(rotation);
    auto pt = ensure_3d(insert_pt);
    double tx = pt[0].get<double>();
    double ty = pt[1].get<double>();
    double tz = pt[2].get<double>();
    return nlohmann::json::array({
        nlohmann::json::array({x_scale * c, x_scale * s, 0.0, 0.0}),
        nlohmann::json::array({-y_scale * s, y_scale * c, 0.0, 0.0}),
        nlohmann::json::array({0.0, 0.0, z_scale, 0.0}),
        nlohmann::json::array({tx, ty, tz, 1.0}),
    });
}

nlohmann::json V2Converter::aci_to_rgb(const nlohmann::json& aci) {
    if (!aci.is_number_integer()) return nullptr;
    int val = aci.get<int>();
    if (val < 1) return nullptr;

    for (const auto& entry : ACI_TABLE) {
        if (entry.aci == val)
            return {{"r", entry.r}, {"g", entry.g}, {"b", entry.b}};
    }
    if (val >= 1 && val <= 255) {
        double v = std::round(val / 255.0 * 1000.0) / 1000.0;
        return {{"r", v}, {"g", v}, {"b", v}};
    }
    return nullptr;
}

// ---------------------------------------------------------------------------
// LWPOLYLINE bulge -> segments
// ---------------------------------------------------------------------------

nlohmann::json V2Converter::lwpoly_to_segments(const nlohmann::json& ent) {
    auto segments = nlohmann::json::array();
    if (!ent.contains("vertices") || !ent["vertices"].is_array()) return segments;

    std::vector<std::array<double, 3>> verts;
    for (const auto& v : ent["vertices"]) {
        auto pt = ensure_3d(v);
        verts.push_back({pt[0].get<double>(), pt[1].get<double>(), pt[2].get<double>()});
    }

    std::vector<double> bulges;
    if (ent.contains("bulges") && ent["bulges"].is_array()) {
        for (const auto& b : ent["bulges"])
            bulges.push_back(b.get<double>());
    }
    while (bulges.size() < verts.size()) bulges.push_back(0.0);

    bool closed = ent.contains("closed") && ent["closed"].get<bool>();
    int n = static_cast<int>(verts.size());
    int count = closed ? n : n - 1;

    for (int i = 0; i < count; i++) {
        const auto& p1 = verts[i];
        const auto& p2 = verts[(i + 1) % n];
        double bulge = bulges[i];

        if (std::abs(bulge) < 1e-10) {
            segments.push_back({
                {"type", "line"},
                {"points", nlohmann::json::array({
                    nlohmann::json::array({p1[0], p1[1], p1[2]}),
                    nlohmann::json::array({p2[0], p2[1], p2[2]}),
                })},
            });
        } else {
            double dx = p2[0] - p1[0];
            double dy = p2[1] - p1[1];
            double chord = std::hypot(dx, dy);
            if (chord < 1e-12) {
                segments.push_back({
                    {"type", "line"},
                    {"points", nlohmann::json::array({
                        nlohmann::json::array({p1[0], p1[1], p1[2]}),
                        nlohmann::json::array({p2[0], p2[1], p2[2]}),
                    })},
                });
                continue;
            }
            double sagitta = std::abs(bulge) * chord / 2.0;
            double radius = (chord * chord / 4.0 + sagitta * sagitta) / (2.0 * sagitta);
            double mx = (p1[0] + p2[0]) / 2.0;
            double my = (p1[1] + p2[1]) / 2.0;
            double nx = -dy / chord;
            double ny = dx / chord;
            double d = radius - sagitta;
            double sign = bulge > 0 ? 1.0 : -1.0;
            double cx = mx + sign * d * nx;
            double cy = my + sign * d * ny;
            double start_angle = std::atan2(p1[1] - cy, p1[0] - cx);
            double end_angle = std::atan2(p2[1] - cy, p2[0] - cx);

            segments.push_back({
                {"type", "arc"},
                {"center", nlohmann::json::array({cx, cy, 0.0})},
                {"radius", radius},
                {"startAngle", start_angle},
                {"endAngle", end_angle},
            });
        }
    }
    return segments;
}

// ---------------------------------------------------------------------------
// Entity -> v2 Node
// ---------------------------------------------------------------------------

nlohmann::json V2Converter::entity_to_node(
    const nlohmann::json& ent,
    const std::string& path,
    const std::map<std::string, std::string>& layer_paths,
    const std::map<std::string, std::string>& style_paths,
    const std::map<std::string, std::string>& block_paths)
{
    std::string etype = ent.value("type", "");
    nlohmann::json attrs = {{"ifcx::purpose", "drawing"}};
    nlohmann::json inherits_val = nullptr;

    // -- geometry mapping --
    if (etype == "LINE") {
        auto start = ensure_3d(ent.value("start", nlohmann::json::array({0,0,0})));
        auto end = ensure_3d(ent.value("end", nlohmann::json::array({0,0,0})));
        attrs["ifcx::geom::line"] = {{"points", nlohmann::json::array({start, end})}};
    }
    else if (etype == "CIRCLE") {
        attrs["ifcx::geom::circle"] = {
            {"center", ensure_3d(ent.value("center", nlohmann::json::array({0,0,0})))},
            {"radius", ent.value("radius", 0.0)},
        };
    }
    else if (etype == "ARC") {
        attrs["ifcx::geom::trimmedCurve"] = {
            {"center", ensure_3d(ent.value("center", nlohmann::json::array({0,0,0})))},
            {"radius", ent.value("radius", 0.0)},
            {"startAngle", ent.value("startAngle", 0.0)},
            {"endAngle", ent.value("endAngle", 0.0)},
        };
    }
    else if (etype == "ELLIPSE") {
        double semi1 = ent.contains("semiAxis1") ? ent["semiAxis1"].get<double>()
            : ent.value("majorAxis", 0.0);
        double semi2 = ent.contains("semiAxis2") ? ent["semiAxis2"].get<double>()
            : ent.value("minorAxis", 0.0);
        attrs["ifcx::geom::ellipse"] = {
            {"center", ensure_3d(ent.value("center", nlohmann::json::array({0,0,0})))},
            {"semiAxis1", semi1}, {"semiAxis2", semi2},
            {"rotation", ent.value("rotation", 0.0)},
        };
    }
    else if (etype == "SPLINE") {
        nlohmann::json bspline = nlohmann::json::object();
        if (ent.contains("degree")) bspline["degree"] = ent["degree"];
        if (ent.contains("controlPoints"))
            bspline["controlPoints"] = ensure_3d_array(ent["controlPoints"]);
        else if (ent.contains("vertices"))
            bspline["controlPoints"] = ensure_3d_array(ent["vertices"]);
        if (ent.contains("knots")) bspline["knots"] = ent["knots"];
        if (ent.contains("weights")) bspline["weights"] = ent["weights"];
        attrs["ifcx::geom::bspline"] = bspline;
    }
    else if (etype == "LWPOLYLINE") {
        bool closed = ent.value("closed", false);
        bool has_bulge = false;
        if (ent.contains("bulges") && ent["bulges"].is_array()) {
            for (const auto& b : ent["bulges"]) {
                if (b.get<double>() != 0) { has_bulge = true; break; }
            }
        }
        if (has_bulge) {
            attrs["ifcx::geom::compositeCurve"] = {
                {"segments", lwpoly_to_segments(ent)},
                {"closed", closed},
            };
        } else {
            auto pts = ent.contains("vertices") ? ensure_3d_array(ent["vertices"]) : nlohmann::json::array();
            attrs["ifcx::geom::polyline"] = {{"points", pts}, {"closed", closed}};
        }
    }
    else if (etype == "POLYLINE2D" || etype == "POLYLINE3D") {
        auto pts = ent.contains("vertices") ? ensure_3d_array(ent["vertices"]) : nlohmann::json::array();
        attrs["ifcx::geom::polyline"] = {
            {"points", pts}, {"closed", ent.value("closed", false)},
        };
    }
    else if (etype == "TEXT") {
        nlohmann::json text_val = {{"value", ent.value("text", "")}};
        if (ent.contains("insertionPoint"))
            text_val["placement"] = ensure_3d(ent["insertionPoint"]);
        if (ent.contains("height")) text_val["height"] = ent["height"];
        if (ent.contains("rotation"))
            text_val["style"] = {{"rotation", ent["rotation"]}};
        if (ent.contains("horizontalAlignment"))
            text_val["alignment"] = ent["horizontalAlignment"];
        if (ent.contains("style")) {
            std::string ts = ent["style"].get<std::string>();
            auto it = style_paths.find("text:" + ts);
            if (it != style_paths.end())
                attrs["ifcx::connects::style"] = {{"ref", it->second}};
        }
        attrs["ifcx::annotation::text"] = text_val;
    }
    else if (etype == "MTEXT") {
        nlohmann::json text_val = {{"value", ent.value("text", "")}};
        if (ent.contains("insertionPoint"))
            text_val["placement"] = ensure_3d(ent["insertionPoint"]);
        if (ent.contains("height")) text_val["height"] = ent["height"];
        if (ent.contains("width")) text_val["width"] = ent["width"];
        if (ent.contains("attachment")) text_val["attachment"] = ent["attachment"];
        if (ent.contains("style")) {
            std::string ts = ent["style"].get<std::string>();
            auto it = style_paths.find("text:" + ts);
            if (it != style_paths.end())
                attrs["ifcx::connects::style"] = {{"ref", it->second}};
        }
        attrs["ifcx::annotation::text"] = text_val;
    }
    else if (etype.rfind("DIMENSION", 0) == 0) {
        static const std::map<std::string, std::string> subtype_map = {
            {"DIMENSION_LINEAR", "linear"}, {"DIMENSION_ALIGNED", "aligned"},
            {"DIMENSION_ANGULAR", "angular"}, {"DIMENSION_ANGULAR3P", "angular"},
            {"DIMENSION_DIAMETER", "diameter"}, {"DIMENSION_RADIUS", "radius"},
            {"DIMENSION_ORDINATE", "ordinate"}, {"DIMENSION", "linear"},
        };
        nlohmann::json dim_val = nlohmann::json::object();
        auto sit = subtype_map.find(etype);
        dim_val["subtype"] = sit != subtype_map.end() ? sit->second : "linear";

        nlohmann::json measure_pts = nlohmann::json::array();
        if (ent.contains("defPoint1")) measure_pts.push_back(ensure_3d(ent["defPoint1"]));
        if (ent.contains("defPoint2")) measure_pts.push_back(ensure_3d(ent["defPoint2"]));
        if (!measure_pts.empty()) dim_val["measurePoints"] = measure_pts;
        if (ent.contains("dimLine")) dim_val["dimensionLine"] = ensure_3d(ent["dimLine"]);
        if (ent.contains("text")) dim_val["text"] = ent["text"];
        if (ent.contains("measurement")) dim_val["value"] = ent["measurement"];

        if (ent.contains("dimStyle")) {
            std::string ds = ent["dimStyle"].get<std::string>();
            auto it = style_paths.find("dim:" + ds);
            if (it != style_paths.end())
                attrs["ifcx::connects::style"] = {{"ref", it->second}};
        }
        attrs["ifcx::annotation::dimension"] = dim_val;
    }
    else if (etype == "LEADER") {
        nlohmann::json leader_val = nlohmann::json::object();
        if (ent.contains("vertices"))
            leader_val["path"] = ensure_3d_array(ent["vertices"]);
        leader_val["arrowhead"] = ent.value("hasArrowhead", true);
        attrs["ifcx::annotation::leader"] = leader_val;
    }
    else if (etype == "HATCH") {
        bool solid = ent.value("solid", false);
        std::string pat_type = ent.value("patternType", "");
        if (solid || pat_type == "SOLID") {
            nlohmann::json fill = nlohmann::json::object();
            if (ent.contains("color")) {
                auto colour = aci_to_rgb(ent["color"]);
                if (!colour.is_null()) fill["colour"] = colour;
            }
            attrs["ifcx::hatch::solid"] = fill;
        } else {
            nlohmann::json pattern = nlohmann::json::object();
            if (ent.contains("patternName")) pattern["name"] = ent["patternName"];
            if (ent.contains("patternAngle")) pattern["angle"] = ent["patternAngle"];
            if (ent.contains("patternScale")) pattern["scale"] = ent["patternScale"];
            attrs["ifcx::hatch::pattern"] = pattern;
        }
        if (ent.contains("boundary"))
            attrs["ifcx::hatch::boundary"] = ent["boundary"];
    }
    else if (etype == "INSERT") {
        std::string block_name = ent.contains("name") ? ent["name"].get<std::string>()
            : ent.value("blockName", "");
        auto bit = block_paths.find(block_name);
        if (!block_name.empty() && bit != block_paths.end())
            inherits_val = nlohmann::json::array({bit->second});

        auto insert_pt = ensure_3d(ent.value("insertionPoint", nlohmann::json::array({0,0,0})));
        double x_s = ent.contains("xScale") ? ent["xScale"].get<double>()
            : ent.value("scaleX", 1.0);
        double y_s = ent.contains("yScale") ? ent["yScale"].get<double>()
            : ent.value("scaleY", 1.0);
        double z_s = ent.contains("zScale") ? ent["zScale"].get<double>()
            : ent.value("scaleZ", 1.0);
        double rot = ent.value("rotation", 0.0);
        attrs["ifcx::xform::matrix"] = build_insert_matrix(insert_pt, x_s, y_s, z_s, rot);
    }
    else if (etype == "SOLID" || etype == "TRACE" || etype == "3DFACE") {
        nlohmann::json points = nlohmann::json::array();
        for (const auto& key : {"p1", "p2", "p3", "p4"}) {
            if (ent.contains(key)) points.push_back(ensure_3d(ent[key]));
        }
        if (points.empty() && ent.contains("vertices"))
            points = ensure_3d_array(ent["vertices"]);
        attrs["ifcx::geom::polygon"] = {{"points", points}};
    }
    else if (etype == "VIEWPORT") {
        nlohmann::json vp = nlohmann::json::object();
        if (ent.contains("center")) {
            auto c3 = ensure_3d(ent["center"]);
            vp["center"] = nlohmann::json::array({c3[0], c3[1]});
        }
        if (ent.contains("width")) vp["width"] = ent["width"];
        if (ent.contains("height")) vp["height"] = ent["height"];
        if (ent.contains("viewTarget")) vp["viewTarget"] = ensure_3d(ent["viewTarget"]);
        if (ent.contains("viewScale")) vp["viewScale"] = ent["viewScale"];
        else if (ent.contains("customScale")) vp["viewScale"] = ent["customScale"];
        attrs["ifcx::sheet::viewport"] = vp;
    }
    else if (etype == "POINT") {
        auto pos = ent.contains("position") ? ensure_3d(ent["position"])
            : ent.contains("insertionPoint") ? ensure_3d(ent["insertionPoint"])
            : nlohmann::json::array({0.0, 0.0, 0.0});
        attrs["ifcx::geom::point"] = {{"position", pos}};
    }
    else if (etype == "RAY") {
        auto origin = ent.contains("origin") ? ensure_3d(ent["origin"])
            : ent.contains("start") ? ensure_3d(ent["start"])
            : nlohmann::json::array({0,0,0});
        auto dir = ent.contains("direction") ? ensure_3d(ent["direction"])
            : nlohmann::json::array({1,0,0});
        attrs["ifcx::geom::ray"] = {{"origin", origin}, {"direction", dir}};
    }
    else if (etype == "XLINE") {
        auto origin = ent.contains("origin") ? ensure_3d(ent["origin"])
            : ent.contains("start") ? ensure_3d(ent["start"])
            : nlohmann::json::array({0,0,0});
        auto dir = ent.contains("direction") ? ensure_3d(ent["direction"])
            : nlohmann::json::array({1,0,0});
        attrs["ifcx::geom::constructionLine"] = {{"origin", origin}, {"direction", dir}};
    }
    else if (etype == "3DSOLID" || etype == "BODY" || etype == "REGION") {
        std::string data = ent.contains("acisData") ? ent["acisData"].get<std::string>()
            : ent.value("data", "");
        attrs["ifcx::geom::solid"] = {{"data", data}};
    }
    else if (etype == "MESH") {
        nlohmann::json mesh_val = nlohmann::json::object();
        if (ent.contains("vertices"))
            mesh_val["points"] = ensure_3d_array(ent["vertices"]);
        if (ent.contains("faces"))
            mesh_val["faceVertexIndices"] = ent["faces"];
        attrs["ifcx::geom::mesh"] = mesh_val;
    }
    else if (etype == "IMAGE") {
        nlohmann::json img = nlohmann::json::object();
        if (ent.contains("insertionPoint"))
            img["insertionPoint"] = ensure_3d(ent["insertionPoint"]);
        if (ent.contains("imageSize"))
            img["imageSize"] = ent["imageSize"];
        if (ent.contains("imagePath")) {
            std::string media_id = uid();
            img["mediaId"] = media_id;
            // Note: media handling would need to be done by the caller
        }
        attrs["ifcx::image::raster"] = img;
    }
    else if (etype == "WIPEOUT") {
        nlohmann::json boundary = nlohmann::json::array();
        if (ent.contains("boundary"))
            boundary = ensure_3d_array(ent["boundary"]);
        else if (ent.contains("vertices"))
            boundary = ensure_3d_array(ent["vertices"]);
        attrs["ifcx::image::wipeout"] = {{"boundary", boundary}};
    }
    else if (etype == "TEXT_NODE") {
        nlohmann::json text_val = {{"value", ""}};
        if (ent.contains("origin"))
            text_val["placement"] = ensure_3d(ent["origin"]);
        if (ent.contains("height")) text_val["height"] = ent["height"];
        attrs["ifcx::annotation::text"] = text_val;
    }
    else if (etype == "COMPLEX_CHAIN" || etype == "COMPLEX_SHAPE") {
        attrs["ifcx::geom::compositeCurve"] = {
            {"segments", nlohmann::json::array()},
            {"closed", etype == "COMPLEX_SHAPE"},
        };
    }
    else if (etype == "3DSURFACE") {
        attrs["ifcx::geom::solid"] = {{"data", ""}};
    }
    else if (etype == "BSPLINE_CURVE") {
        attrs["ifcx::geom::bspline"] = nlohmann::json::object();
    }
    else if (etype == "BSPLINE_POLE") {
        auto verts = ent.contains("vertices") ? ensure_3d_array(ent["vertices"]) : nlohmann::json::array();
        attrs["ifcx::geom::bspline"] = {{"controlPoints", verts}};
    }
    else {
        // Unknown entity
        nlohmann::json data = nlohmann::json::object();
        static const std::set<std::string> skip = {
            "type", "handle", "layer", "color", "linetype", "lineweight", "style"
        };
        for (auto it = ent.begin(); it != ent.end(); ++it) {
            if (skip.find(it.key()) == skip.end())
                data[it.key()] = it.value();
        }
        attrs["ifcx::unknown::entity"] = {{"originalType", etype}, {"data", data}};
    }

    // -- connections --
    std::string layer_name = ent.value("layer", "0");
    auto lit = layer_paths.find(layer_name);
    if (lit != layer_paths.end())
        attrs["ifcx::connects::layer"] = {{"ref", lit->second}};

    nlohmann::json curve_style = nlohmann::json::object();
    if (ent.contains("color")) {
        auto colour = aci_to_rgb(ent["color"]);
        if (!colour.is_null()) curve_style["colour"] = colour;
    }
    if (ent.contains("lineweight"))
        curve_style["width"] = ent["lineweight"];
    if (ent.contains("linetype") && ent["linetype"].is_string()) {
        std::string lt = ent["linetype"].get<std::string>();
        if (!lt.empty()) {
            auto ltit = style_paths.find("lt:" + lt);
            if (ltit != style_paths.end()) {
                if (!attrs.contains("ifcx::connects::style"))
                    attrs["ifcx::connects::style"] = nlohmann::json::object();
                attrs["ifcx::connects::style"]["ref"] = ltit->second;
            } else {
                curve_style["pattern"] = lt;
            }
        }
    }
    if (!curve_style.empty())
        attrs["ifcx::style::curveStyle"] = curve_style;

    nlohmann::json node = {{"path", path}, {"attributes", attrs}};
    if (!inherits_val.is_null())
        node["inherits"] = inherits_val;
    return node;
}

// ---------------------------------------------------------------------------
// from_v1
// ---------------------------------------------------------------------------

nlohmann::json V2Converter::from_v1(const IfcxDocument& doc) {
    // Serialize document to JSON and work with it
    auto file = doc.to_json();
    nlohmann::json file_json;
    to_json(file_json, file);

    // Determine length unit
    std::string length_unit = "mm";
    if (file_json.contains("header") && file_json["header"].contains("units")) {
        std::string raw = file_json["header"]["units"].value("linear", "millimeters");
        auto it = UNIT_TO_MM.find(raw);
        if (it != UNIT_TO_MM.end()) length_unit = it->second;
    }

    // Generate timestamp
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    std::tm tm_buf{};
#ifdef _WIN32
    gmtime_s(&tm_buf, &time_t);
#else
    gmtime_r(&time_t, &tm_buf);
#endif
    std::ostringstream ts_oss;
    ts_oss << std::put_time(&tm_buf, "%Y-%m-%dT%H:%M:%SZ");

    nlohmann::json header = {
        {"ifcxVersion", "2.0"},
        {"id", uid() + uid() + uid()},
        {"timestamp", ts_oss.str()},
        {"units", {{"length", length_unit}, {"angle", "rad"}}},
    };

    nlohmann::json nodes = nlohmann::json::array();
    std::map<std::string, std::string> layer_paths;
    std::map<std::string, std::string> style_paths;
    std::map<std::string, std::string> block_paths;
    nlohmann::json media = nlohmann::json::object();

    // Project node
    nlohmann::json project_node = {
        {"path", "project"},
        {"children", {{"drawings", "drawings"}, {"definitions", "definitions"}, {"styles", "styles"}}},
        {"attributes", {{"ifcx::purpose", "drawing"}}},
    };
    nodes.push_back(project_node);

    nlohmann::json styles_node = {
        {"path", "styles"},
        {"children", nlohmann::json::object()},
        {"attributes", {{"ifcx::purpose", "drawing"}}},
    };
    nlohmann::json definitions_node = {
        {"path", "definitions"},
        {"children", nlohmann::json::object()},
        {"attributes", {{"ifcx::purpose", "definition"}}},
    };
    nlohmann::json drawings_node = {
        {"path", "drawings"},
        {"children", nlohmann::json::object()},
        {"attributes", {{"ifcx::purpose", "drawing"}}},
    };

    // Convert layers
    if (file_json.contains("tables") && file_json["tables"].contains("layers")) {
        for (auto& [name, props] : file_json["tables"]["layers"].items()) {
            std::string path = "layer-" + uid();
            layer_paths[name] = path;

            nlohmann::json attrs = {{"ifcx::purpose", "drawing"}};
            nlohmann::json style_val = nlohmann::json::object();

            if (props.contains("color")) {
                auto colour = aci_to_rgb(props["color"]);
                if (!colour.is_null()) style_val["colour"] = colour;
            }
            if (props.contains("lineweight") && props["lineweight"].is_number()) {
                double lw = props["lineweight"].get<double>();
                if (lw >= 0) style_val["lineWeight"] = lw > 10 ? lw / 100.0 : lw;
            }
            if (props.contains("frozen")) style_val["frozen"] = props["frozen"].get<bool>();
            if (props.contains("locked")) style_val["locked"] = props["locked"].get<bool>();
            if (props.contains("off")) style_val["visible"] = !props["off"].get<bool>();
            if (props.contains("plot")) style_val["plot"] = props["plot"].get<bool>();

            attrs["ifcx::layer::style"] = style_val;
            attrs["ifcx::layer::assignment"] = {{"name", name}};

            nodes.push_back({{"path", path}, {"attributes", attrs}});
            styles_node["children"]["layer-" + name] = path;
        }
    }

    // Convert text styles
    if (file_json.contains("tables") && file_json["tables"].contains("textStyles")) {
        for (auto& [name, props] : file_json["tables"]["textStyles"].items()) {
            std::string path = "textstyle-" + uid();
            style_paths["text:" + name] = path;

            nlohmann::json style_val = nlohmann::json::object();
            if (props.contains("fontFamily")) style_val["font"] = props["fontFamily"];
            if (props.contains("height")) style_val["size"] = props["height"];
            if (props.contains("widthFactor")) style_val["widthFactor"] = props["widthFactor"];

            nodes.push_back({
                {"path", path},
                {"attributes", {{"ifcx::purpose", "drawing"}, {"ifcx::style::textStyle", style_val}}},
            });
            styles_node["children"]["textstyle-" + name] = path;
        }
    }

    // Convert dim styles
    if (file_json.contains("tables") && file_json["tables"].contains("dimStyles")) {
        for (auto& [name, props] : file_json["tables"]["dimStyles"].items()) {
            std::string path = "dimstyle-" + uid();
            style_paths["dim:" + name] = path;
            nodes.push_back({
                {"path", path},
                {"attributes", {{"ifcx::purpose", "drawing"}, {"ifcx::style::dimensionStyle", props}}},
            });
            styles_node["children"]["dimstyle-" + name] = path;
        }
    }

    // Convert linetypes
    if (file_json.contains("tables") && file_json["tables"].contains("linetypes")) {
        for (auto& [name, props] : file_json["tables"]["linetypes"].items()) {
            std::string path = "linetype-" + uid();
            style_paths["lt:" + name] = path;

            nlohmann::json style_val = nlohmann::json::object();
            if (props.contains("description")) style_val["description"] = props["description"];
            if (props.contains("pattern")) style_val["dashPattern"] = props["pattern"];

            nodes.push_back({
                {"path", path},
                {"attributes", {{"ifcx::purpose", "drawing"}, {"ifcx::style::curveStyle", style_val}}},
            });
            styles_node["children"]["linetype-" + name] = path;
        }
    }

    // Convert blocks
    if (file_json.contains("blocks")) {
        for (auto& [name, block] : file_json["blocks"].items()) {
            std::string path = "def-" + uid();
            block_paths[name] = path;

            auto base_pt = block.contains("basePoint") ? ensure_3d(block["basePoint"])
                : nlohmann::json::array({0,0,0});
            nlohmann::json children = nlohmann::json::object();

            if (block.contains("entities") && block["entities"].is_array()) {
                for (const auto& ent : block["entities"]) {
                    std::string ent_path = "e-" + uid();
                    auto ent_node = entity_to_node(ent, ent_path, layer_paths, style_paths, block_paths);
                    nodes.push_back(ent_node);
                    std::string child_key = ent.value("handle", uid());
                    children[child_key] = ent_path;
                }
            }

            nodes.push_back({
                {"path", path},
                {"children", children},
                {"attributes", {
                    {"ifcx::purpose", "definition"},
                    {"ifcx::component::definition", {{"name", name}, {"basePoint", base_pt}}},
                }},
            });
            definitions_node["children"][name] = path;
        }
    }

    // Convert entities
    nlohmann::json view_node = {
        {"path", "view-main"},
        {"children", nlohmann::json::object()},
        {"attributes", {
            {"ifcx::purpose", "drawing"},
            {"ifcx::view::name", "Main"},
            {"ifcx::view::scale", 1},
        }},
    };

    if (file_json.contains("entities") && file_json["entities"].is_array()) {
        for (const auto& ent : file_json["entities"]) {
            std::string ent_path = "e-" + uid();
            auto ent_node = entity_to_node(ent, ent_path, layer_paths, style_paths, block_paths);
            nodes.push_back(ent_node);
            std::string child_key = ent.value("handle", ent_path);
            view_node["children"][child_key] = ent_path;
        }
    }

    drawings_node["children"]["main"] = "view-main";

    nodes.push_back(styles_node);
    nodes.push_back(definitions_node);
    nodes.push_back(drawings_node);
    nodes.push_back(view_node);

    return {
        {"header", header},
        {"imports", V2_IMPORTS},
        {"data", nodes},
        {"media", media},
    };
}

} // namespace ifcx
