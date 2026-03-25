#include "ifcx/dgn_parser.h"
#include "ifcx/document.h"

#define _USE_MATH_DEFINES
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif
#include <fstream>
#include <set>
#include <sstream>

namespace ifcx {

namespace dgn_import {

static nlohmann::json convert_entity(const DgnElement& elem, const DgnFile& dgn) {
    nlohmann::json result = nlohmann::json::object();
    result["layer"] = std::to_string(elem.level);

    // Common symbology
    if (elem.color) {
        result["color"] = elem.color;
        if (!dgn.color_table.empty() && elem.color >= 0 &&
            elem.color < static_cast<int>(dgn.color_table.size())) {
            auto [r, g, b] = dgn.color_table[elem.color];
            result["colorRGB"] = nlohmann::json::array({r, g, b});
        }
    }
    if (elem.weight) result["lineweight"] = elem.weight;
    if (elem.style) result["linetype"] = elem.style;

    int etype = elem.type;
    auto& data = elem.data;

    auto get_origin = [&]() -> nlohmann::json {
        if (data.contains("origin")) return data["origin"];
        return nlohmann::json::array({0, 0, 0});
    };

    if (etype == 3) { // LINE
        result["type"] = "LINE";
        auto verts = data.value("vertices", nlohmann::json::array());
        if (verts.size() >= 2) {
            result["start"] = verts[0];
            result["end"] = verts[1];
        } else return nlohmann::json();
    }
    else if (etype == 4) { // LINE_STRING
        result["type"] = "LWPOLYLINE";
        result["closed"] = false;
        result["vertices"] = data.value("vertices", nlohmann::json::array());
        if (result["vertices"].empty()) return nlohmann::json();
    }
    else if (etype == 6) { // SHAPE
        result["type"] = "LWPOLYLINE";
        result["closed"] = true;
        result["vertices"] = data.value("vertices", nlohmann::json::array());
        if (result["vertices"].empty()) return nlohmann::json();
    }
    else if (etype == 11) { // CURVE
        result["type"] = "SPLINE";
        result["vertices"] = data.value("vertices", nlohmann::json::array());
        if (result["vertices"].empty()) return nlohmann::json();
    }
    else if (etype == 15) { // ELLIPSE
        result["type"] = "ELLIPSE";
        result["center"] = get_origin();
        result["majorAxis"] = data.value("primary_axis", 0);
        result["minorAxis"] = data.value("secondary_axis", 0);
        result["rotation"] = data.value("rotation", 0.0) * M_PI / 180.0;
    }
    else if (etype == 16) { // ARC
        double start = data.value("start_angle", 0.0);
        double sweep = data.value("sweep_angle", 360.0);
        if (std::abs(sweep) >= 360.0) {
            result["type"] = "ELLIPSE";
        } else {
            result["type"] = "ARC";
            result["startAngle"] = start * M_PI / 180.0;
            result["endAngle"] = (start + sweep) * M_PI / 180.0;
        }
        result["center"] = get_origin();
        result["majorAxis"] = data.value("primary_axis", 0);
        result["minorAxis"] = data.value("secondary_axis", 0);
        result["rotation"] = data.value("rotation", 0.0) * M_PI / 180.0;
    }
    else if (etype == 17) { // TEXT
        result["type"] = "TEXT";
        result["text"] = data.value("text", "");
        result["insertionPoint"] = get_origin();
        result["height"] = data.value("height", 0);
        result["rotation"] = data.value("rotation", 0.0) * M_PI / 180.0;
        result["fontIndex"] = data.value("font_id", 0);
    }
    else if (etype == 7) { // TEXT_NODE
        result["type"] = "TEXT_NODE";
        result["origin"] = get_origin();
        result["height"] = data.value("height", 0);
        result["rotation"] = data.value("rotation", 0.0) * M_PI / 180.0;
        result["numelems"] = data.value("numelems", 0);
    }
    else if (etype == 2) { // CELL_HEADER -> INSERT
        result["type"] = "INSERT";
        result["name"] = data.value("name", "");
        result["insertionPoint"] = get_origin();
        result["xScale"] = data.value("xscale", 1.0);
        result["yScale"] = data.value("yscale", 1.0);
        result["rotation"] = data.value("rotation", 0.0) * M_PI / 180.0;
    }
    else if (etype == 12 || etype == 14) {
        result["type"] = (etype == 12) ? "COMPLEX_CHAIN" : "COMPLEX_SHAPE";
        result["numelems"] = data.value("numelems", 0);
        result["totlength"] = data.value("totlength", 0);
    }
    else if (etype == 18 || etype == 19) {
        result["type"] = (etype == 18) ? "3DSURFACE" : "3DSOLID";
        result["numelems"] = data.value("numelems", 0);
    }
    else if (etype == 5) {
        result["type"] = "GROUP_DATA";
    }
    else if (etype == 37) {
        result["type"] = "TAG_VALUE";
        result["tagSet"] = data.value("tag_set", 0);
        result["tagIndex"] = data.value("tag_index", 0);
        if (data.contains("value")) result["value"] = data["value"];
    }
    else if (etype == 21) {
        result["type"] = "BSPLINE_POLE";
        result["vertices"] = data.value("vertices", nlohmann::json::array());
    }
    else if (etype == 27) result["type"] = "BSPLINE_CURVE";
    else if (etype == 1) result["type"] = "CELL_LIBRARY";
    else if (etype == 34) result["type"] = "SHARED_CELL_DEFN";
    else if (etype == 35) result["type"] = "SHARED_CELL";
    else {
        result["type"] = elem.type_name;
        result["rawType"] = elem.type;
    }

    return result;
}

} // namespace dgn_import

// ---------------------------------------------------------------------------
// Public DGN import functions
// ---------------------------------------------------------------------------

IfcxDocument dgn_import_from_bytes(const uint8_t* data, size_t size) {
    DgnParser parser;
    auto dgn = parser.parse(data, size);

    IfcxDocument doc;

    // Header
    doc.header.version = dgn.version;
    if (!dgn.master_unit_name.empty()) {
        doc.header.variables["masterUnits"] = dgn.master_unit_name;
    }
    if (!dgn.sub_unit_name.empty()) {
        doc.header.variables["subUnits"] = dgn.sub_unit_name;
    }
    doc.header.variables["is3d"] = dgn.is_3d;

    // Tables (levels -> layers)
    std::set<int> levels_used;
    for (auto& elem : dgn.elements) {
        if (!elem.deleted && elem.level > 0) levels_used.insert(elem.level);
    }
    for (int lvl : levels_used) {
        doc.tables.layers[std::to_string(lvl)] = Layer{};
    }
    if (doc.tables.layers.find("0") == doc.tables.layers.end()) {
        doc.tables.layers["0"] = Layer{};
    }

    // Entities
    static const std::set<int> skip_types = {0, 9, 10, 8};
    for (auto& elem : dgn.elements) {
        if (elem.deleted) continue;
        if (skip_types.count(elem.type)) continue;

        auto converted = dgn_import::convert_entity(elem, dgn);
        if (converted.is_null() || !converted.contains("type")) continue;

        Entity entity;
        entity.type = converted.value("type", "");
        entity.layer = converted.value("layer", "0");
        if (converted.contains("color") && converted["color"].is_number_integer()) {
            entity.color = converted["color"].get<int>();
        }
        if (converted.contains("lineweight") && converted["lineweight"].is_number_integer()) {
            entity.lineweight = converted["lineweight"].get<int>();
        }
        entity.properties = converted;
        for (auto key : {"type", "layer", "color", "lineweight"}) {
            entity.properties.erase(key);
        }
        doc.entities.push_back(std::move(entity));
    }

    return doc;
}

IfcxDocument dgn_import_from_file(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open DGN file: " + path);
    }
    std::vector<uint8_t> data((std::istreambuf_iterator<char>(file)),
                               std::istreambuf_iterator<char>());
    return dgn_import_from_bytes(data.data(), data.size());
}

} // namespace ifcx
