#include "ifcx/v2_converter.h"

#include <cmath>
#include <set>

namespace ifcx {

// ---------------------------------------------------------------------------
// rgb_to_aci
// ---------------------------------------------------------------------------

int V2Converter::rgb_to_aci(const nlohmann::json& rgb) {
    if (rgb.is_null() || !rgb.is_object()) return 7;
    double r = rgb.value("r", 1.0);
    double g = rgb.value("g", 1.0);
    double b = rgb.value("b", 1.0);

    struct Entry { int aci; double r, g, b; };
    static const Entry table[] = {
        {1, 1.0, 0.0, 0.0}, {2, 1.0, 1.0, 0.0}, {3, 0.0, 1.0, 0.0},
        {4, 0.0, 1.0, 1.0}, {5, 0.0, 0.0, 1.0}, {6, 1.0, 0.0, 1.0},
        {7, 1.0, 1.0, 1.0}, {8, 0.5, 0.5, 0.5}, {9, 0.75, 0.75, 0.75},
    };

    int best_aci = 7;
    double best_dist = 1e30;
    for (const auto& e : table) {
        double d = (r - e.r) * (r - e.r) + (g - e.g) * (g - e.g) + (b - e.b) * (b - e.b);
        if (d < best_dist) { best_dist = d; best_aci = e.aci; }
    }
    return best_aci;
}

// ---------------------------------------------------------------------------
// segments_to_lwpoly
// ---------------------------------------------------------------------------

std::pair<std::vector<nlohmann::json>, std::vector<double>>
V2Converter::segments_to_lwpoly(const nlohmann::json& segments) {
    std::vector<nlohmann::json> verts;
    std::vector<double> bulges;

    if (!segments.is_array()) return {verts, bulges};

    for (const auto& seg : segments) {
        std::string stype = seg.value("type", "line");

        if (stype == "line") {
            auto pts = seg.value("points", nlohmann::json::array());
            if (!pts.empty()) {
                if (verts.empty()) {
                    verts.push_back(pts[0]);
                    bulges.push_back(0.0);
                }
                if (pts.size() > 1) {
                    verts.push_back(pts[pts.size() - 1]);
                    bulges.back() = 0.0;
                    bulges.push_back(0.0);
                }
            }
        }
        else if (stype == "arc") {
            auto center = seg.value("center", nlohmann::json::array({0,0,0}));
            double radius = seg.value("radius", 0.0);
            double sa = seg.value("startAngle", 0.0);
            double ea = seg.value("endAngle", 0.0);

            double cx = center[0].get<double>();
            double cy = center[1].get<double>();

            nlohmann::json p1 = nlohmann::json::array({
                cx + radius * std::cos(sa),
                cy + radius * std::sin(sa),
                0.0,
            });
            nlohmann::json p2 = nlohmann::json::array({
                cx + radius * std::cos(ea),
                cy + radius * std::sin(ea),
                0.0,
            });

            double angle = ea - sa;
            if (angle < 0) angle += 2.0 * M_PI;
            double bulge = std::tan(angle / 4.0);

            if (verts.empty()) {
                verts.push_back(p1);
                bulges.push_back(bulge);
            } else {
                bulges.back() = bulge;
            }
            verts.push_back(p2);
            bulges.push_back(0.0);
        }
    }

    return {verts, bulges};
}

// ---------------------------------------------------------------------------
// node_to_entity
// ---------------------------------------------------------------------------

nlohmann::json V2Converter::node_to_entity(
    const nlohmann::json& node,
    const std::map<std::string, nlohmann::json>& nodes_by_path,
    const std::map<std::string, std::string>& layer_name_by_path)
{
    if (!node.contains("attributes")) return nullptr;
    const auto& attrs = node["attributes"];
    nlohmann::json result = nlohmann::json::object();

    // Layer
    if (attrs.contains("ifcx::connects::layer")) {
        std::string layer_ref = attrs["ifcx::connects::layer"].value("ref", "");
        auto it = layer_name_by_path.find(layer_ref);
        if (it != layer_name_by_path.end())
            result["layer"] = it->second;
    }

    // Curve style
    if (attrs.contains("ifcx::style::curveStyle")) {
        const auto& cs = attrs["ifcx::style::curveStyle"];
        if (cs.contains("colour"))
            result["color"] = rgb_to_aci(cs["colour"]);
        if (cs.contains("width"))
            result["lineweight"] = cs["width"];
        if (cs.contains("pattern") && cs["pattern"].is_string())
            result["linetype"] = cs["pattern"];
    }

    // Geometry
    if (attrs.contains("ifcx::geom::line")) {
        result["type"] = "LINE";
        auto pts = attrs["ifcx::geom::line"].value("points", nlohmann::json::array());
        if (pts.size() >= 2) {
            result["start"] = pts[0];
            result["end"] = pts[1];
        }
        return result;
    }

    if (attrs.contains("ifcx::geom::circle")) {
        result["type"] = "CIRCLE";
        const auto& g = attrs["ifcx::geom::circle"];
        result["center"] = g.value("center", nlohmann::json::array({0,0,0}));
        result["radius"] = g.value("radius", 0.0);
        return result;
    }

    if (attrs.contains("ifcx::geom::trimmedCurve")) {
        result["type"] = "ARC";
        const auto& g = attrs["ifcx::geom::trimmedCurve"];
        result["center"] = g.value("center", nlohmann::json::array({0,0,0}));
        result["radius"] = g.value("radius", 0.0);
        result["startAngle"] = g.value("startAngle", 0.0);
        result["endAngle"] = g.value("endAngle", 0.0);
        return result;
    }

    if (attrs.contains("ifcx::geom::ellipse")) {
        result["type"] = "ELLIPSE";
        const auto& g = attrs["ifcx::geom::ellipse"];
        result["center"] = g.value("center", nlohmann::json::array({0,0,0}));
        result["semiAxis1"] = g.value("semiAxis1", 0.0);
        result["semiAxis2"] = g.value("semiAxis2", 0.0);
        result["rotation"] = g.value("rotation", 0.0);
        return result;
    }

    if (attrs.contains("ifcx::geom::bspline")) {
        result["type"] = "SPLINE";
        const auto& g = attrs["ifcx::geom::bspline"];
        if (g.contains("degree")) result["degree"] = g["degree"];
        if (g.contains("controlPoints")) result["controlPoints"] = g["controlPoints"];
        if (g.contains("knots")) result["knots"] = g["knots"];
        if (g.contains("weights")) result["weights"] = g["weights"];
        return result;
    }

    if (attrs.contains("ifcx::geom::compositeCurve")) {
        result["type"] = "LWPOLYLINE";
        const auto& g = attrs["ifcx::geom::compositeCurve"];
        result["closed"] = g.value("closed", false);
        auto [verts, bulges_vec] = segments_to_lwpoly(g.value("segments", nlohmann::json::array()));
        result["vertices"] = verts;
        bool has_bulge = false;
        for (double b : bulges_vec) {
            if (b != 0) { has_bulge = true; break; }
        }
        if (has_bulge) result["bulges"] = bulges_vec;
        return result;
    }

    if (attrs.contains("ifcx::geom::polyline")) {
        result["type"] = "LWPOLYLINE";
        const auto& g = attrs["ifcx::geom::polyline"];
        result["closed"] = g.value("closed", false);
        result["vertices"] = g.value("points", nlohmann::json::array());
        return result;
    }

    if (attrs.contains("ifcx::geom::polygon")) {
        const auto& g = attrs["ifcx::geom::polygon"];
        auto pts = g.value("points", nlohmann::json::array());
        result["type"] = pts.size() <= 4 ? "SOLID" : "3DFACE";
        for (size_t i = 0; i < std::min(pts.size(), size_t(4)); i++)
            result["p" + std::to_string(i + 1)] = pts[i];
        return result;
    }

    if (attrs.contains("ifcx::geom::point")) {
        result["type"] = "POINT";
        result["position"] = attrs["ifcx::geom::point"].value("position",
            nlohmann::json::array({0,0,0}));
        return result;
    }

    if (attrs.contains("ifcx::geom::ray")) {
        result["type"] = "RAY";
        const auto& g = attrs["ifcx::geom::ray"];
        result["origin"] = g.value("origin", nlohmann::json::array({0,0,0}));
        result["direction"] = g.value("direction", nlohmann::json::array({1,0,0}));
        return result;
    }

    if (attrs.contains("ifcx::geom::constructionLine")) {
        result["type"] = "XLINE";
        const auto& g = attrs["ifcx::geom::constructionLine"];
        result["origin"] = g.value("origin", nlohmann::json::array({0,0,0}));
        result["direction"] = g.value("direction", nlohmann::json::array({1,0,0}));
        return result;
    }

    if (attrs.contains("ifcx::geom::solid")) {
        result["type"] = "3DSOLID";
        result["acisData"] = attrs["ifcx::geom::solid"].value("data", "");
        return result;
    }

    if (attrs.contains("ifcx::geom::mesh")) {
        result["type"] = "MESH";
        const auto& g = attrs["ifcx::geom::mesh"];
        if (g.contains("points")) result["vertices"] = g["points"];
        if (g.contains("faceVertexIndices")) result["faces"] = g["faceVertexIndices"];
        return result;
    }

    if (attrs.contains("ifcx::annotation::text")) {
        const auto& g = attrs["ifcx::annotation::text"];
        result["type"] = g.contains("width") ? "MTEXT" : "TEXT";
        result["text"] = g.value("value", "");
        if (g.contains("placement")) result["insertionPoint"] = g["placement"];
        if (g.contains("height")) result["height"] = g["height"];
        if (g.contains("width")) result["width"] = g["width"];
        if (g.contains("attachment")) result["attachment"] = g["attachment"];
        if (g.contains("alignment")) result["horizontalAlignment"] = g["alignment"];
        if (g.contains("style") && g["style"].is_object() && g["style"].contains("rotation"))
            result["rotation"] = g["style"]["rotation"];
        return result;
    }

    if (attrs.contains("ifcx::annotation::dimension")) {
        const auto& g = attrs["ifcx::annotation::dimension"];
        std::string subtype = g.value("subtype", "linear");
        static const std::map<std::string, std::string> type_map = {
            {"linear", "DIMENSION_LINEAR"}, {"aligned", "DIMENSION_ALIGNED"},
            {"angular", "DIMENSION_ANGULAR"}, {"diameter", "DIMENSION_DIAMETER"},
            {"radius", "DIMENSION_RADIUS"}, {"ordinate", "DIMENSION_ORDINATE"},
        };
        auto it = type_map.find(subtype);
        result["type"] = it != type_map.end() ? it->second : "DIMENSION_LINEAR";
        if (g.contains("measurePoints")) {
            auto pts = g["measurePoints"];
            if (pts.size() >= 1) result["defPoint1"] = pts[0];
            if (pts.size() >= 2) result["defPoint2"] = pts[1];
        }
        if (g.contains("dimensionLine")) result["dimLine"] = g["dimensionLine"];
        if (g.contains("text")) result["text"] = g["text"];
        if (g.contains("value")) result["measurement"] = g["value"];
        return result;
    }

    if (attrs.contains("ifcx::annotation::leader")) {
        result["type"] = "LEADER";
        const auto& g = attrs["ifcx::annotation::leader"];
        if (g.contains("path")) result["vertices"] = g["path"];
        result["hasArrowhead"] = g.value("arrowhead", true);
        return result;
    }

    if (attrs.contains("ifcx::hatch::solid") || attrs.contains("ifcx::hatch::pattern")) {
        result["type"] = "HATCH";
        if (attrs.contains("ifcx::hatch::solid")) {
            result["solid"] = true;
            const auto& s = attrs["ifcx::hatch::solid"];
            if (s.contains("colour"))
                result["color"] = rgb_to_aci(s["colour"]);
        } else {
            result["solid"] = false;
            const auto& p = attrs["ifcx::hatch::pattern"];
            if (p.contains("name")) result["patternName"] = p["name"];
            if (p.contains("angle")) result["patternAngle"] = p["angle"];
            if (p.contains("scale")) result["patternScale"] = p["scale"];
        }
        if (attrs.contains("ifcx::hatch::boundary"))
            result["boundary"] = attrs["ifcx::hatch::boundary"];
        return result;
    }

    if (attrs.contains("ifcx::sheet::viewport")) {
        result["type"] = "VIEWPORT";
        const auto& g = attrs["ifcx::sheet::viewport"];
        if (g.contains("center")) result["center"] = g["center"];
        if (g.contains("width")) result["width"] = g["width"];
        if (g.contains("height")) result["height"] = g["height"];
        if (g.contains("viewTarget")) result["viewTarget"] = g["viewTarget"];
        if (g.contains("viewScale")) result["viewScale"] = g["viewScale"];
        return result;
    }

    if (attrs.contains("ifcx::image::raster")) {
        result["type"] = "IMAGE";
        const auto& g = attrs["ifcx::image::raster"];
        if (g.contains("insertionPoint")) result["insertionPoint"] = g["insertionPoint"];
        // Media resolution would need the v2 top-level media dict
        return result;
    }

    if (attrs.contains("ifcx::image::wipeout")) {
        result["type"] = "WIPEOUT";
        result["boundary"] = attrs["ifcx::image::wipeout"].value("boundary", nlohmann::json::array());
        return result;
    }

    // INSERT via inherits
    if (node.contains("inherits") && node["inherits"].is_array() && !node["inherits"].empty()
        && attrs.contains("ifcx::xform::matrix"))
    {
        result["type"] = "INSERT";
        std::string def_path = node["inherits"][0].get<std::string>();
        auto dit = nodes_by_path.find(def_path);
        if (dit != nodes_by_path.end()) {
            auto comp = dit->second.value("attributes", nlohmann::json::object())
                .value("ifcx::component::definition", nlohmann::json::object());
            result["name"] = comp.value("name", def_path);
        } else {
            result["name"] = def_path;
        }

        const auto& matrix = attrs["ifcx::xform::matrix"];
        result["insertionPoint"] = nlohmann::json::array({
            matrix[3][0].get<double>(),
            matrix[3][1].get<double>(),
            matrix[3][2].get<double>(),
        });

        double m00 = matrix[0][0].get<double>();
        double m01 = matrix[0][1].get<double>();
        double m10 = matrix[1][0].get<double>();
        double m11 = matrix[1][1].get<double>();
        double m22 = matrix[2][2].get<double>();

        result["xScale"] = std::hypot(m00, m01);
        result["yScale"] = std::hypot(m10, m11);
        result["zScale"] = m22;
        result["rotation"] = std::atan2(m01, m00);
        return result;
    }

    if (attrs.contains("ifcx::unknown::entity")) {
        const auto& g = attrs["ifcx::unknown::entity"];
        result["type"] = g.value("originalType", "UNKNOWN");
        if (g.contains("data") && g["data"].is_object()) {
            for (auto it = g["data"].begin(); it != g["data"].end(); ++it)
                result[it.key()] = it.value();
        }
        return result;
    }

    return nullptr;
}

// ---------------------------------------------------------------------------
// to_v1
// ---------------------------------------------------------------------------

IfcxDocument V2Converter::to_v1(const nlohmann::json& v2) {
    IfcxDocument doc;

    // Index all nodes
    std::map<std::string, nlohmann::json> nodes_by_path;
    std::map<std::string, std::string> layer_name_by_path;
    std::map<std::string, nlohmann::json> styles;
    std::map<std::string, nlohmann::json> definitions;

    if (v2.contains("data") && v2["data"].is_array()) {
        for (const auto& node : v2["data"]) {
            std::string path = node.value("path", "");
            if (!path.empty())
                nodes_by_path[path] = node;
        }
    }

    // Header
    if (v2.contains("header")) {
        const auto& header = v2["header"];
        auto units = header.value("units", nlohmann::json::object());
        std::string length = units.value("length", "mm");
        static const std::map<std::string, std::string> unit_map = {
            {"mm", "millimeters"}, {"cm", "centimeters"}, {"m", "meters"},
            {"km", "kilometers"}, {"in", "inches"}, {"ft", "feet"}, {"mi", "miles"},
        };
        auto uit = unit_map.find(length);
        std::string linear = uit != unit_map.end() ? uit->second : "millimeters";
        doc.header.units.linear = linear;
        doc.header.units.measurement = "metric";
    }

    // First pass: layers, styles, definitions
    if (v2.contains("data") && v2["data"].is_array()) {
        for (const auto& node : v2["data"]) {
            if (!node.contains("attributes")) continue;
            const auto& attrs = node["attributes"];
            std::string path = node.value("path", "");

            if (attrs.contains("ifcx::layer::assignment")) {
                std::string name = attrs["ifcx::layer::assignment"].value("name", path);
                layer_name_by_path[path] = name;

                Layer layer;
                if (attrs.contains("ifcx::layer::style")) {
                    const auto& ls = attrs["ifcx::layer::style"];
                    if (ls.contains("colour"))
                        layer.color = rgb_to_aci(ls["colour"]);
                    if (ls.contains("lineWeight"))
                        layer.lineweight = static_cast<int>(ls["lineWeight"].get<double>() * 100);
                    if (ls.contains("frozen"))
                        layer.frozen = ls["frozen"].get<bool>();
                    if (ls.contains("locked"))
                        layer.locked = ls["locked"].get<bool>();
                    if (ls.contains("visible"))
                        layer.off = !ls["visible"].get<bool>();
                    if (ls.contains("plot"))
                        layer.plot = ls["plot"].get<bool>();
                }
                doc.tables.layers[name] = layer;
            }

            if (attrs.contains("ifcx::style::textStyle"))
                styles[path] = attrs["ifcx::style::textStyle"];
            if (attrs.contains("ifcx::style::curveStyle"))
                styles[path] = attrs["ifcx::style::curveStyle"];
            if (attrs.contains("ifcx::component::definition"))
                definitions[path] = node;
        }
    }

    // Convert text styles
    for (const auto& [path, style] : styles) {
        if (!style.contains("font")) continue;
        std::string name = path;
        auto pos = path.find('-');
        if (pos != std::string::npos) name = path.substr(pos + 1);

        TextStyle ts;
        if (style.contains("font")) ts.fontFamily = style["font"].get<std::string>();
        if (style.contains("size")) ts.height = style["size"].get<double>();
        if (style.contains("widthFactor")) ts.widthFactor = style["widthFactor"].get<double>();
        doc.tables.textStyles[name] = ts;
    }

    // Convert blocks
    for (const auto& [path, def_node] : definitions) {
        auto comp = def_node.value("attributes", nlohmann::json::object())
            .value("ifcx::component::definition", nlohmann::json::object());
        std::string name = comp.value("name", path);

        BlockDefinition block;
        block.name = name;
        if (comp.contains("basePoint")) {
            auto bp = ensure_3d(comp["basePoint"]);
            block.basePoint = {bp[0].get<double>(), bp[1].get<double>(), bp[2].get<double>()};
        }

        if (def_node.contains("children") && def_node["children"].is_object()) {
            for (auto& [key, child_path_val] : def_node["children"].items()) {
                std::string child_path = child_path_val.get<std::string>();
                auto cit = nodes_by_path.find(child_path);
                if (cit != nodes_by_path.end()) {
                    auto ent_json = node_to_entity(cit->second, nodes_by_path, layer_name_by_path);
                    if (!ent_json.is_null()) {
                        Entity entity;
                        entity.type = ent_json.value("type", "");
                        entity.properties = ent_json;
                        block.entities.push_back(entity);
                    }
                }
            }
        }
        doc.blocks[name] = block;
    }

    // Convert entities from views
    bool found_entities = false;
    if (v2.contains("data") && v2["data"].is_array()) {
        for (const auto& node : v2["data"]) {
            if (!node.contains("attributes")) continue;
            const auto& attrs = node["attributes"];
            if (!attrs.contains("ifcx::view::name")) continue;
            if (!node.contains("children") || !node["children"].is_object()) continue;

            for (auto& [key, child_path_val] : node["children"].items()) {
                std::string child_path = child_path_val.get<std::string>();
                auto cit = nodes_by_path.find(child_path);
                if (cit != nodes_by_path.end()) {
                    auto ent_json = node_to_entity(cit->second, nodes_by_path, layer_name_by_path);
                    if (!ent_json.is_null()) {
                        Entity entity;
                        entity.type = ent_json.value("type", "");
                        entity.layer = ent_json.value("layer", "0");
                        if (ent_json.contains("color") && ent_json["color"].is_number_integer())
                            entity.color = ent_json["color"].get<int>();
                        entity.properties = ent_json;
                        doc.entities.push_back(entity);
                        found_entities = true;
                    }
                }
            }
        }
    }

    // Fallback: scan all nodes
    if (!found_entities && v2.contains("data") && v2["data"].is_array()) {
        for (const auto& node : v2["data"]) {
            auto ent_json = node_to_entity(node, nodes_by_path, layer_name_by_path);
            if (!ent_json.is_null()) {
                Entity entity;
                entity.type = ent_json.value("type", "");
                entity.layer = ent_json.value("layer", "0");
                entity.properties = ent_json;
                doc.entities.push_back(entity);
            }
        }
    }

    return doc;
}

} // namespace ifcx
