#include "ifcx/dxf_writer.h"
#include "ifcx/document.h"

#include <cmath>
#include <fstream>
#include <map>

namespace ifcx {

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

namespace dxf_export {

static void write_common(DxfWriter& w, const Entity& ent, const std::string& subclass) {
    auto h = ent.handle.empty() ? w.next_handle() : ent.handle;
    w.handle(h);
    w.group(100, std::string("AcDbEntity"));
    if (ent.space == "paper") w.group(67, 1);
    w.group(8, ent.layer);
    if (!ent.linetype.empty()) w.group(6, ent.linetype);
    if (auto* ci = std::get_if<int>(&ent.color)) {
        w.group(62, *ci);
    }
    if (ent.lineweight >= 0) w.group(370, ent.lineweight);
    w.group(100, subclass);
}

static void write_entity(DxfWriter& w, const Entity& ent) {
    auto& p = ent.properties;
    auto type = ent.type;

    auto get_arr = [&](const std::string& key, int idx, double def = 0.0) -> double {
        if (p.contains(key) && p[key].is_array() && static_cast<int>(p[key].size()) > idx)
            return p[key][idx].get<double>();
        return def;
    };

    if (type == "LINE") {
        w.entity("LINE");
        write_common(w, ent, "AcDbLine");
        w.point(get_arr("start", 0), get_arr("start", 1), get_arr("start", 2));
        w.point(get_arr("end", 0), get_arr("end", 1), get_arr("end", 2), 11);
    }
    else if (type == "POINT") {
        w.entity("POINT");
        write_common(w, ent, "AcDbPoint");
        w.point(get_arr("position", 0), get_arr("position", 1), get_arr("position", 2));
    }
    else if (type == "CIRCLE") {
        w.entity("CIRCLE");
        write_common(w, ent, "AcDbCircle");
        w.point(get_arr("center", 0), get_arr("center", 1), get_arr("center", 2));
        w.group(40, p.value("radius", 0.0));
    }
    else if (type == "ARC") {
        w.entity("ARC");
        write_common(w, ent, "AcDbCircle");
        w.point(get_arr("center", 0), get_arr("center", 1), get_arr("center", 2));
        w.group(40, p.value("radius", 0.0));
        w.group(100, std::string("AcDbArc"));
        w.group(50, p.value("startAngle", 0.0));
        w.group(51, p.value("endAngle", 360.0));
    }
    else if (type == "ELLIPSE") {
        w.entity("ELLIPSE");
        write_common(w, ent, "AcDbEllipse");
        w.point(get_arr("center", 0), get_arr("center", 1), get_arr("center", 2));
        w.point(get_arr("majorAxisEndpoint", 0, 1.0),
                get_arr("majorAxisEndpoint", 1),
                get_arr("majorAxisEndpoint", 2), 11);
        w.group(40, p.value("minorAxisRatio", 0.5));
        w.group(41, p.value("startParam", 0.0));
        w.group(42, p.value("endParam", 6.283185307179586));
    }
    else if (type == "LWPOLYLINE") {
        w.entity("LWPOLYLINE");
        write_common(w, ent, "AcDbPolyline");
        auto verts = p.value("vertices", nlohmann::json::array());
        w.group(90, static_cast<int>(verts.size()));
        int flags = 0;
        if (p.value("closed", false)) flags |= 1;
        w.group(70, flags);
        if (p.contains("elevation")) w.group(38, p["elevation"].get<double>());
        for (auto& v : verts) {
            w.group(10, v.value("x", 0.0));
            w.group(20, v.value("y", 0.0));
            if (v.contains("startWidth")) w.group(40, v["startWidth"].get<double>());
            if (v.contains("endWidth")) w.group(41, v["endWidth"].get<double>());
            if (v.contains("bulge")) w.group(42, v["bulge"].get<double>());
        }
    }
    else if (type == "TEXT") {
        w.entity("TEXT");
        write_common(w, ent, "AcDbText");
        w.point(get_arr("insertionPoint", 0), get_arr("insertionPoint", 1),
                get_arr("insertionPoint", 2));
        w.group(40, p.value("height", 2.5));
        w.group(1, p.value("text", ""));
        if (p.contains("rotation")) w.group(50, p["rotation"].get<double>());
        if (p.contains("style")) w.group(7, p["style"].get<std::string>());
        if (p.contains("widthFactor")) w.group(41, p["widthFactor"].get<double>());
        if (p.contains("horizontalAlignment")) {
            auto h_val = p["horizontalAlignment"];
            if (h_val.is_string()) {
                static const std::map<std::string, int> h_map = {
                    {"left", 0}, {"center", 1}, {"right", 2},
                    {"aligned", 3}, {"middle", 4}, {"fit", 5},
                };
                auto it = h_map.find(h_val.get<std::string>());
                w.group(72, (it != h_map.end()) ? it->second : 0);
            } else {
                w.group(72, h_val.get<int>());
            }
        }
        if (p.contains("alignmentPoint")) {
            w.point(get_arr("alignmentPoint", 0), get_arr("alignmentPoint", 1),
                    get_arr("alignmentPoint", 2), 11);
        }
        w.group(100, std::string("AcDbText"));
        if (p.contains("verticalAlignment"))
            w.group(73, p["verticalAlignment"].get<int>());
    }
    else if (type == "MTEXT") {
        w.entity("MTEXT");
        write_common(w, ent, "AcDbMText");
        w.point(get_arr("insertionPoint", 0), get_arr("insertionPoint", 1),
                get_arr("insertionPoint", 2));
        w.group(40, p.value("height", 2.5));
        if (p.contains("width")) w.group(41, p["width"].get<double>());
        if (p.contains("attachment")) {
            auto att = p["attachment"];
            if (att.is_string()) {
                static const std::map<std::string, int> att_map = {
                    {"top_left", 1}, {"top_center", 2}, {"top_right", 3},
                    {"middle_left", 4}, {"middle_center", 5}, {"middle_right", 6},
                    {"bottom_left", 7}, {"bottom_center", 8}, {"bottom_right", 9},
                };
                auto it = att_map.find(att.get<std::string>());
                w.group(71, (it != att_map.end()) ? it->second : 1);
            } else {
                w.group(71, att.get<int>());
            }
        }
        w.group(1, p.value("text", ""));
        if (p.contains("style")) w.group(7, p["style"].get<std::string>());
    }
    else if (type == "INSERT") {
        w.entity("INSERT");
        write_common(w, ent, "AcDbBlockReference");
        if (p.contains("name")) w.group(2, p["name"].get<std::string>());
        w.point(get_arr("insertionPoint", 0), get_arr("insertionPoint", 1),
                get_arr("insertionPoint", 2));
        if (p.contains("xScale")) w.group(41, p["xScale"].get<double>());
        if (p.contains("yScale")) w.group(42, p["yScale"].get<double>());
        if (p.contains("zScale")) w.group(43, p["zScale"].get<double>());
        if (p.contains("rotation")) w.group(50, p["rotation"].get<double>());
    }
    else if (type == "SPLINE") {
        w.entity("SPLINE");
        write_common(w, ent, "AcDbSpline");
        int flags = 0;
        if (p.value("closed", false)) flags |= 1;
        if (p.value("rational", false)) flags |= 4;
        w.group(70, flags);
        w.group(71, p.value("degree", 3));
        auto knots = p.value("knots", nlohmann::json::array());
        auto ctrl_pts = p.value("controlPoints", nlohmann::json::array());
        auto fit_pts = p.value("fitPoints", nlohmann::json::array());
        w.group(72, static_cast<int>(knots.size()));
        w.group(73, static_cast<int>(ctrl_pts.size()));
        w.group(74, static_cast<int>(fit_pts.size()));
        for (auto& k : knots) w.group(40, k.get<double>());
        auto weights = p.value("weights", nlohmann::json::array());
        for (size_t i = 0; i < ctrl_pts.size(); ++i) {
            auto& cp = ctrl_pts[i];
            double x = cp.size() > 0 ? cp[0].get<double>() : 0;
            double y = cp.size() > 1 ? cp[1].get<double>() : 0;
            double z = cp.size() > 2 ? cp[2].get<double>() : 0;
            w.point(x, y, z);
            if (i < weights.size()) w.group(41, weights[i].get<double>());
        }
        for (auto& fp : fit_pts) {
            double x = fp.size() > 0 ? fp[0].get<double>() : 0;
            double y = fp.size() > 1 ? fp[1].get<double>() : 0;
            double z = fp.size() > 2 ? fp[2].get<double>() : 0;
            w.point(x, y, z, 11);
        }
    }
    else if (type == "DIMENSION" || type == "DIMENSION_LINEAR" || type == "DIMENSION_ALIGNED" ||
             type == "DIMENSION_ANGULAR" || type == "DIMENSION_ANGULAR3P" ||
             type == "DIMENSION_DIAMETER" || type == "DIMENSION_RADIUS" ||
             type == "DIMENSION_ORDINATE") {
        w.entity("DIMENSION");
        write_common(w, ent, "AcDbDimension");
        if (p.contains("blockName")) w.group(2, p["blockName"].get<std::string>());
        w.point(get_arr("dimLinePoint", 0), get_arr("dimLinePoint", 1),
                get_arr("dimLinePoint", 2));
        w.point(get_arr("textPosition", 0), get_arr("textPosition", 1),
                get_arr("textPosition", 2), 11);
        if (p.contains("dimTypeRaw")) w.group(70, p["dimTypeRaw"].get<int>());
        if (p.contains("dimStyle")) w.group(3, p["dimStyle"].get<std::string>());
        if (p.contains("overrideText")) w.group(1, p["overrideText"].get<std::string>());
        w.point(get_arr("defPoint1", 0), get_arr("defPoint1", 1),
                get_arr("defPoint1", 2), 13);
        w.point(get_arr("defPoint2", 0), get_arr("defPoint2", 1),
                get_arr("defPoint2", 2), 14);
    }
    else if (type == "LEADER") {
        w.entity("LEADER");
        write_common(w, ent, "AcDbLeader");
        if (p.contains("dimStyle")) w.group(3, p["dimStyle"].get<std::string>());
        if (p.contains("hasArrowhead")) w.group(71, p["hasArrowhead"].get<bool>() ? 1 : 0);
        if (p.contains("pathType")) {
            w.group(72, (p["pathType"].get<std::string>() == "spline") ? 1 : 0);
        }
        auto verts = p.value("vertices", nlohmann::json::array());
        w.group(76, static_cast<int>(verts.size()));
        for (auto& v : verts) {
            double x = v.size() > 0 ? v[0].get<double>() : 0;
            double y = v.size() > 1 ? v[1].get<double>() : 0;
            double z = v.size() > 2 ? v[2].get<double>() : 0;
            w.point(x, y, z);
        }
    }
    else if (type == "HATCH") {
        w.entity("HATCH");
        write_common(w, ent, "AcDbHatch");
        w.point(0.0, 0.0, 0.0);
        w.point(0.0, 0.0, 1.0, 210);
        w.group(2, p.value("patternName", "SOLID"));
        w.group(70, p.value("solid", false) ? 1 : 0);
    }
    else if (type == "SOLID" || type == "TRACE") {
        w.entity(type);
        write_common(w, ent, (type == "SOLID") ? "AcDbTrace" : "AcDbTrace");
        auto corners = p.value("corners", nlohmann::json::array());
        for (int i = 0; i < 4 && i < static_cast<int>(corners.size()); ++i) {
            auto& c = corners[i];
            double x = c.size() > 0 ? c[0].get<double>() : 0;
            double y = c.size() > 1 ? c[1].get<double>() : 0;
            double z = c.size() > 2 ? c[2].get<double>() : 0;
            w.point(x, y, z, 10 + i);
        }
    }
    else if (type == "3DFACE") {
        w.entity("3DFACE");
        write_common(w, ent, "AcDbFace");
        auto corners = p.value("corners", nlohmann::json::array());
        for (int i = 0; i < 4 && i < static_cast<int>(corners.size()); ++i) {
            auto& c = corners[i];
            double x = c.size() > 0 ? c[0].get<double>() : 0;
            double y = c.size() > 1 ? c[1].get<double>() : 0;
            double z = c.size() > 2 ? c[2].get<double>() : 0;
            w.point(x, y, z, 10 + i);
        }
        if (p.contains("edgeFlags")) w.group(70, p["edgeFlags"].get<int>());
    }
    else if (type == "XLINE" || type == "RAY") {
        w.entity(type);
        write_common(w, ent, (type == "XLINE") ? "AcDbXline" : "AcDbRay");
        w.point(get_arr("basePoint", 0), get_arr("basePoint", 1), get_arr("basePoint", 2));
        w.point(get_arr("direction", 0), get_arr("direction", 1), get_arr("direction", 2), 11);
    }
    // Skip unsupported entity types silently
}

static void write_header(DxfWriter& w, const IfcxDocument& doc, const std::string& version) {
    w.begin_section("HEADER");

    w.group(9, std::string("$ACADVER"));
    w.group(1, version);

    w.group(9, std::string("$HANDSEED"));
    w.group(5, std::string("FFFF"));

    // Units
    static const std::map<std::string, int> unit_map = {
        {"unitless", 0}, {"inches", 1}, {"feet", 2}, {"miles", 3},
        {"millimeters", 4}, {"centimeters", 5}, {"meters", 6}, {"kilometers", 7},
    };
    auto uit = unit_map.find(doc.header.units.linear);
    w.group(9, std::string("$INSUNITS"));
    w.group(70, (uit != unit_map.end()) ? uit->second : 4);

    w.group(9, std::string("$MEASUREMENT"));
    w.group(70, (doc.header.units.measurement == "metric") ? 1 : 0);

    w.group(9, std::string("$CLAYER"));
    w.group(8, doc.header.currentLayer);

    w.group(9, std::string("$LTSCALE"));
    w.group(40, doc.header.linetypeScale);

    w.end_section();
}

static void write_tables(DxfWriter& w, const IfcxDocument& doc) {
    w.begin_section("TABLES");

    // VPORT
    w.begin_table("VPORT", w.next_handle(), 1);
    w.group(0, std::string("VPORT"));
    w.handle(w.next_handle());
    w.group(100, std::string("AcDbSymbolTableRecord"));
    w.group(100, std::string("AcDbViewportTableRecord"));
    w.group(2, std::string("*Active"));
    w.group(70, 0);
    w.point(0.0, 0.0, 0.0);
    w.point(1.0, 1.0, 0.0, 11);
    w.point(0.0, 0.0, 0.0, 12);
    w.point(0.0, 0.0, 1.0, 16);
    w.point(0.0, 0.0, 0.0, 17);
    w.group(42, 50.0);
    w.group(45, 1.0);
    w.end_table();

    // LTYPE -- built-in + user
    int lt_count = 3 + static_cast<int>(doc.tables.linetypes.size());
    w.begin_table("LTYPE", w.next_handle(), lt_count);
    for (auto& lt_name : {"ByBlock", "ByLayer", "Continuous"}) {
        w.group(0, std::string("LTYPE"));
        w.handle(w.next_handle());
        w.group(100, std::string("AcDbSymbolTableRecord"));
        w.group(100, std::string("AcDbLinetypeTableRecord"));
        w.group(2, std::string(lt_name));
        w.group(70, 0);
        w.group(3, std::string(""));
        w.group(72, 65);
        w.group(73, 0);
        w.group(40, 0.0);
    }
    for (auto& [lt_name, lt_props] : doc.tables.linetypes) {
        w.group(0, std::string("LTYPE"));
        w.handle(w.next_handle());
        w.group(100, std::string("AcDbSymbolTableRecord"));
        w.group(100, std::string("AcDbLinetypeTableRecord"));
        w.group(2, lt_name);
        w.group(70, 0);
        w.group(3, lt_props.description);
        w.group(72, 65);
        w.group(73, static_cast<int>(lt_props.pattern.size()));
        w.group(40, lt_props.patternLength);
        for (auto elem : lt_props.pattern) {
            w.group(49, elem);
            w.group(74, 0);
        }
    }
    w.end_table();

    // LAYER
    auto& layers = doc.tables.layers;
    w.begin_table("LAYER", w.next_handle(), static_cast<int>(layers.size()));
    for (auto& [layer_name, layer_props] : layers) {
        w.group(0, std::string("LAYER"));
        w.handle(w.next_handle());
        w.group(100, std::string("AcDbSymbolTableRecord"));
        w.group(100, std::string("AcDbLayerTableRecord"));
        w.group(2, layer_name);
        int flags = 0;
        if (layer_props.frozen) flags |= 1;
        if (layer_props.locked) flags |= 4;
        w.group(70, flags);
        int color = 7;
        if (auto* ci = std::get_if<int>(&layer_props.color)) color = *ci;
        if (layer_props.off) color = -std::abs(color);
        w.group(62, color);
        w.group(6, layer_props.linetype);
        w.group(370, layer_props.lineweight >= 0 ? layer_props.lineweight : -3);
    }
    w.end_table();

    // STYLE
    auto& styles = doc.tables.textStyles;
    int style_count = std::max(1, static_cast<int>(styles.size()));
    w.begin_table("STYLE", w.next_handle(), style_count);
    if (styles.empty()) {
        w.group(0, std::string("STYLE"));
        w.handle(w.next_handle());
        w.group(100, std::string("AcDbSymbolTableRecord"));
        w.group(100, std::string("AcDbTextStyleTableRecord"));
        w.group(2, std::string("Standard"));
        w.group(70, 0);
        w.group(40, 0.0);
        w.group(41, 1.0);
        w.group(50, 0.0);
        w.group(71, 0);
        w.group(42, 2.5);
        w.group(3, std::string("txt"));
        w.group(4, std::string(""));
    } else {
        for (auto& [sname, sprops] : styles) {
            w.group(0, std::string("STYLE"));
            w.handle(w.next_handle());
            w.group(100, std::string("AcDbSymbolTableRecord"));
            w.group(100, std::string("AcDbTextStyleTableRecord"));
            w.group(2, sname);
            w.group(70, 0);
            w.group(40, sprops.height);
            w.group(41, sprops.widthFactor);
            w.group(50, 0.0);
            w.group(71, 0);
            w.group(42, sprops.height > 0 ? sprops.height : 2.5);
            w.group(3, sprops.fontFamily.empty() ? "txt" : sprops.fontFamily);
            w.group(4, std::string(""));
        }
    }
    w.end_table();

    // VIEW, UCS
    w.begin_table("VIEW", w.next_handle(), 0);
    w.end_table();
    w.begin_table("UCS", w.next_handle(), 0);
    w.end_table();

    // APPID
    w.begin_table("APPID", w.next_handle(), 1);
    w.group(0, std::string("APPID"));
    w.handle(w.next_handle());
    w.group(100, std::string("AcDbSymbolTableRecord"));
    w.group(100, std::string("AcDbRegAppTableRecord"));
    w.group(2, std::string("ACAD"));
    w.group(70, 0);
    w.end_table();

    // DIMSTYLE
    auto& dimstyles = doc.tables.dimStyles;
    int ds_count = std::max(1, static_cast<int>(dimstyles.size()));
    w.begin_table("DIMSTYLE", w.next_handle(), ds_count);
    if (dimstyles.empty()) {
        w.group(0, std::string("DIMSTYLE"));
        w.handle(w.next_handle());
        w.group(100, std::string("AcDbSymbolTableRecord"));
        w.group(100, std::string("AcDbDimStyleTableRecord"));
        w.group(2, std::string("Standard"));
        w.group(70, 0);
        w.group(40, 1.0);
        w.group(41, 2.5);
        w.group(140, 2.5);
    } else {
        for (auto& [ds_name, ds_props] : dimstyles) {
            w.group(0, std::string("DIMSTYLE"));
            w.handle(w.next_handle());
            w.group(100, std::string("AcDbSymbolTableRecord"));
            w.group(100, std::string("AcDbDimStyleTableRecord"));
            w.group(2, ds_name);
            w.group(70, 0);
            w.group(40, ds_props.overallScale);
            w.group(41, ds_props.arrowSize);
            w.group(140, ds_props.textHeight);
        }
    }
    w.end_table();

    // BLOCK_RECORD
    int br_count = 2 + static_cast<int>(doc.blocks.size());
    w.begin_table("BLOCK_RECORD", w.next_handle(), br_count);
    for (auto& br_name : {"*Model_Space", "*Paper_Space"}) {
        w.group(0, std::string("BLOCK_RECORD"));
        w.handle(w.next_handle());
        w.group(100, std::string("AcDbSymbolTableRecord"));
        w.group(100, std::string("AcDbBlockTableRecord"));
        w.group(2, std::string(br_name));
    }
    for (auto& [bname, bdef] : doc.blocks) {
        w.group(0, std::string("BLOCK_RECORD"));
        w.handle(w.next_handle());
        w.group(100, std::string("AcDbSymbolTableRecord"));
        w.group(100, std::string("AcDbBlockTableRecord"));
        w.group(2, bname);
    }
    w.end_table();

    w.end_section();
}

static void write_block_wrapper(DxfWriter& w, const std::string& name,
                                 const std::string& layer,
                                 const std::vector<Entity>& entities,
                                 const Point3D& base_point = {0, 0, 0}) {
    w.group(0, std::string("BLOCK"));
    w.handle(w.next_handle());
    w.group(100, std::string("AcDbEntity"));
    w.group(8, layer);
    w.group(100, std::string("AcDbBlockBegin"));
    w.group(2, name);
    w.group(70, 0);
    w.point(base_point[0], base_point[1], base_point[2]);
    w.group(3, name);
    w.group(1, std::string(""));

    for (auto& ent : entities) {
        write_entity(w, ent);
    }

    w.group(0, std::string("ENDBLK"));
    w.handle(w.next_handle());
    w.group(100, std::string("AcDbEntity"));
    w.group(8, layer);
    w.group(100, std::string("AcDbBlockEnd"));
}

static void write_blocks(DxfWriter& w, const IfcxDocument& doc) {
    w.begin_section("BLOCKS");
    write_block_wrapper(w, "*Model_Space", "0", {});
    write_block_wrapper(w, "*Paper_Space", "0", {});
    for (auto& [block_name, block_data] : doc.blocks) {
        write_block_wrapper(w, block_name, "0", block_data.entities, block_data.basePoint);
    }
    w.end_section();
}

static void write_entities(DxfWriter& w, const IfcxDocument& doc) {
    w.begin_section("ENTITIES");
    for (auto& ent : doc.entities) {
        write_entity(w, ent);
    }
    w.end_section();
}

static void write_objects(DxfWriter& w, const IfcxDocument& doc) {
    w.begin_section("OBJECTS");
    // Root dictionary
    w.group(0, std::string("DICTIONARY"));
    w.handle(w.next_handle());
    w.group(100, std::string("AcDbDictionary"));
    w.end_section();
}

} // namespace dxf_export

// ---------------------------------------------------------------------------
// Public DXF export functions
// ---------------------------------------------------------------------------

std::string dxf_export_to_string(const IfcxDocument& doc, const std::string& version) {
    DxfWriter w;
    dxf_export::write_header(w, doc, version);
    dxf_export::write_tables(w, doc);
    dxf_export::write_blocks(w, doc);
    dxf_export::write_entities(w, doc);
    dxf_export::write_objects(w, doc);
    w.group(0, std::string("EOF"));
    return w.to_string();
}

void dxf_export_to_file(const IfcxDocument& doc, const std::string& path,
                         const std::string& version) {
    auto content = dxf_export_to_string(doc, version);
    std::ofstream file(path, std::ios::binary);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open DXF file for writing: " + path);
    }
    file << content;
}

} // namespace ifcx
