#include "ifcx/dxf_parser.h"
#include "ifcx/document.h"

#define _USE_MATH_DEFINES
#include <cmath>
#include <fstream>
#include <sstream>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace ifcx {

// Forward declarations for internal use
namespace dxf_import {

static nlohmann::json convert_header(const DxfFile& dxf);
static nlohmann::json convert_tables(const DxfFile& dxf);
static nlohmann::json convert_blocks(const DxfFile& dxf);
static std::vector<nlohmann::json> convert_entities(const DxfFile& dxf);
static std::vector<nlohmann::json> convert_objects(const DxfFile& dxf);
static nlohmann::json convert_entity(const nlohmann::json& ent);

// ---------------------------------------------------------------------------
// Header conversion
// ---------------------------------------------------------------------------

static nlohmann::json convert_header(const DxfFile& dxf) {
    nlohmann::json header = nlohmann::json::object();
    auto& raw = dxf.header;

    header["version"] = raw.value("$ACADVER", "AC1032");

    // Units
    int insunits = 0;
    if (raw.contains("$INSUNITS") && raw["$INSUNITS"].is_number()) {
        insunits = raw["$INSUNITS"].get<int>();
    }
    static const std::map<int, std::string> unit_map = {
        {0, "unitless"}, {1, "inches"}, {2, "feet"}, {3, "miles"},
        {4, "millimeters"}, {5, "centimeters"}, {6, "meters"}, {7, "kilometers"},
    };
    int measurement = 1;
    if (raw.contains("$MEASUREMENT") && raw["$MEASUREMENT"].is_number()) {
        measurement = raw["$MEASUREMENT"].get<int>();
    }
    auto uit = unit_map.find(insunits);
    header["units"] = nlohmann::json::object({
        {"linear", (uit != unit_map.end()) ? uit->second : "unitless"},
        {"measurement", (measurement == 1) ? "metric" : "imperial"},
    });

    if (raw.contains("$CLAYER") && raw["$CLAYER"].is_string()) {
        header["currentLayer"] = raw["$CLAYER"].get<std::string>();
    }
    if (raw.contains("$LTSCALE") && raw["$LTSCALE"].is_number()) {
        header["linetypeScale"] = raw["$LTSCALE"].get<double>();
    }
    return header;
}

// ---------------------------------------------------------------------------
// Tables conversion
// ---------------------------------------------------------------------------

static nlohmann::json convert_tables(const DxfFile& dxf) {
    nlohmann::json tables = nlohmann::json::object({
        {"layers", nlohmann::json::object()},
        {"linetypes", nlohmann::json::object()},
        {"textStyles", nlohmann::json::object()},
        {"dimStyles", nlohmann::json::object()},
    });

    // Layers
    auto layer_it = dxf.tables.find("LAYER");
    if (layer_it != dxf.tables.end()) {
        for (auto& entry : layer_it->second) {
            auto name = entry.value("name", "");
            if (name.empty()) continue;
            nlohmann::json props = nlohmann::json::object();
            if (entry.contains("color")) props["color"] = entry["color"];
            if (entry.contains("linetype")) props["linetype"] = entry["linetype"];
            if (entry.contains("frozen")) props["frozen"] = entry["frozen"];
            if (entry.contains("locked")) props["locked"] = entry["locked"];
            if (entry.contains("off")) props["off"] = entry["off"];
            if (entry.contains("plot")) props["plot"] = entry["plot"];
            if (entry.contains("lineweight")) props["lineweight"] = entry["lineweight"];
            tables["layers"][name] = props;
        }
    }
    if (!tables["layers"].contains("0")) {
        tables["layers"]["0"] = nlohmann::json::object();
    }

    // Linetypes
    auto ltype_it = dxf.tables.find("LTYPE");
    if (ltype_it != dxf.tables.end()) {
        for (auto& entry : ltype_it->second) {
            auto name = entry.value("name", "");
            if (name.empty() || name == "ByBlock" || name == "ByLayer" || name == "Continuous")
                continue;
            nlohmann::json props = nlohmann::json::object();
            if (entry.contains("description")) props["description"] = entry["description"];
            if (entry.contains("pattern")) props["pattern"] = entry["pattern"];
            tables["linetypes"][name] = props;
        }
    }

    // Text styles
    auto style_it = dxf.tables.find("STYLE");
    if (style_it != dxf.tables.end()) {
        for (auto& entry : style_it->second) {
            auto name = entry.value("name", "");
            if (name.empty()) continue;
            nlohmann::json props = nlohmann::json::object();
            if (entry.contains("font")) props["fontFamily"] = entry["font"];
            if (entry.contains("height") && entry["height"].is_number() &&
                entry["height"].get<double>() != 0)
                props["height"] = entry["height"];
            if (entry.contains("widthFactor")) props["widthFactor"] = entry["widthFactor"];
            tables["textStyles"][name] = props;
        }
    }

    // Dim styles
    auto dim_it = dxf.tables.find("DIMSTYLE");
    if (dim_it != dxf.tables.end()) {
        for (auto& entry : dim_it->second) {
            auto name = entry.value("name", "");
            if (name.empty()) continue;
            nlohmann::json props = nlohmann::json::object();
            if (entry.contains("DIMTXT")) props["textHeight"] = entry["DIMTXT"];
            if (entry.contains("DIMASZ")) props["arrowSize"] = entry["DIMASZ"];
            if (entry.contains("DIMSCALE")) props["overallScale"] = entry["DIMSCALE"];
            if (entry.contains("DIMEXO")) props["extensionOffset"] = entry["DIMEXO"];
            if (entry.contains("DIMDLI")) props["dimensionLineIncrement"] = entry["DIMDLI"];
            if (entry.contains("DIMEXE")) props["extensionExtend"] = entry["DIMEXE"];
            if (entry.contains("DIMGAP")) props["textGap"] = entry["DIMGAP"];
            if (entry.contains("DIMTAD")) props["textAbove"] = entry["DIMTAD"];
            if (entry.contains("DIMDEC")) props["decimalPlaces"] = entry["DIMDEC"];
            tables["dimStyles"][name] = props;
        }
    }

    return tables;
}

// ---------------------------------------------------------------------------
// Entity conversion
// ---------------------------------------------------------------------------

static nlohmann::json convert_entity(const nlohmann::json& ent) {
    nlohmann::json result = ent;
    auto etype = result.value("type", "");

    // lineweight normalization
    if (result.contains("lineweight") && result["lineweight"].is_number()) {
        int lw = result["lineweight"].get<int>();
        if (lw >= 0) result["lineweight"] = lw / 100.0;
        else result.erase("lineweight");
    }

    // Color 256 = BYLAYER
    if (result.contains("color") && result["color"].is_number_integer() &&
        result["color"].get<int>() == 256)
        result.erase("color");

    // Linetype BYLAYER
    if (result.contains("linetype") && result["linetype"].is_string() &&
        result["linetype"].get<std::string>() == "BYLAYER")
        result.erase("linetype");

    if (etype == "ARC") {
        if (result.contains("startAngle"))
            result["startAngle"] = result["startAngle"].get<double>() * M_PI / 180.0;
        if (result.contains("endAngle"))
            result["endAngle"] = result["endAngle"].get<double>() * M_PI / 180.0;
    } else if (etype == "TEXT") {
        if (result.contains("rotation"))
            result["rotation"] = result["rotation"].get<double>() * M_PI / 180.0;
        if (result.contains("horizontalAlignment") &&
            result["horizontalAlignment"].is_number_integer()) {
            static const std::map<int, std::string> h_map = {
                {0, "left"}, {1, "center"}, {2, "right"},
                {3, "aligned"}, {4, "middle"}, {5, "fit"},
            };
            int ha = result["horizontalAlignment"].get<int>();
            auto it = h_map.find(ha);
            result["horizontalAlignment"] = (it != h_map.end()) ? it->second : "left";
        }
    } else if (etype == "MTEXT") {
        if (result.contains("attachment") && result["attachment"].is_number_integer()) {
            static const std::map<int, std::string> att_map = {
                {1, "top_left"}, {2, "top_center"}, {3, "top_right"},
                {4, "middle_left"}, {5, "middle_center"}, {6, "middle_right"},
                {7, "bottom_left"}, {8, "bottom_center"}, {9, "bottom_right"},
            };
            int att = result["attachment"].get<int>();
            auto it = att_map.find(att);
            result["attachment"] = (it != att_map.end()) ? it->second : "top_left";
        }
    } else if (etype == "INSERT") {
        if (result.contains("rotation"))
            result["rotation"] = result["rotation"].get<double>() * M_PI / 180.0;
    } else if (etype == "DIMENSION") {
        if (result.contains("dimType")) {
            result["type"] = result["dimType"];
        }
    } else if (etype == "LEADER") {
        if (!result.contains("hasArrowhead")) result["hasArrowhead"] = true;
        if (!result.contains("pathType")) result["pathType"] = "straight";
    }

    // Remove internal fields
    std::vector<std::string> to_remove;
    for (auto it = result.begin(); it != result.end(); ++it) {
        auto key = it.key();
        if (!key.empty() && key[0] == '_') to_remove.push_back(key);
    }
    for (auto& key : to_remove) result.erase(key);

    return result;
}

// ---------------------------------------------------------------------------
// Blocks conversion
// ---------------------------------------------------------------------------

static nlohmann::json convert_blocks(const DxfFile& dxf) {
    nlohmann::json blocks = nlohmann::json::object();
    for (auto& [name, block_data] : dxf.blocks) {
        if (name.find("*Model_Space") == 0 || name.find("*Paper_Space") == 0) continue;
        nlohmann::json blk = nlohmann::json::object();
        blk["name"] = name;
        blk["basePoint"] = block_data.value("basePoint", nlohmann::json::array({0, 0, 0}));
        auto entities = nlohmann::json::array();
        if (block_data.contains("entities") && block_data["entities"].is_array()) {
            for (auto& ent : block_data["entities"]) {
                auto converted = convert_entity(ent);
                if (!converted.is_null()) entities.push_back(converted);
            }
        }
        blk["entities"] = entities;
        blocks[name] = blk;
    }
    return blocks;
}

// ---------------------------------------------------------------------------
// Entities conversion
// ---------------------------------------------------------------------------

static std::vector<nlohmann::json> convert_entities(const DxfFile& dxf) {
    std::vector<nlohmann::json> entities;
    for (auto& ent : dxf.entities) {
        auto converted = convert_entity(ent);
        if (!converted.is_null()) entities.push_back(converted);
    }
    return entities;
}

// ---------------------------------------------------------------------------
// Objects conversion
// ---------------------------------------------------------------------------

static std::vector<nlohmann::json> convert_objects(const DxfFile& dxf) {
    std::vector<nlohmann::json> objects;
    for (auto& obj : dxf.objects) {
        auto obj_type = obj.value("type", "");
        if (obj_type == "LAYOUT") {
            auto name = obj.value("name", "");
            objects.push_back(nlohmann::json::object({
                {"objectType", "LAYOUT"},
                {"name", name},
                {"isModelSpace", name == "Model"},
            }));
        } else if (obj_type == "DICTIONARY") {
            nlohmann::json converted = nlohmann::json::object({
                {"objectType", "DICTIONARY"},
                {"handle", obj.value("handle", "")},
                {"name", obj.value("name", "")},
            });
            if (obj.contains("entries")) converted["entries"] = obj["entries"];
            if (obj.contains("entryHandles")) converted["entryHandles"] = obj["entryHandles"];
            objects.push_back(converted);
        }
    }
    return objects;
}

} // namespace dxf_import

// ---------------------------------------------------------------------------
// Public DXF import functions (used by DxfImporter in converters.h)
// ---------------------------------------------------------------------------

IfcxDocument dxf_import_from_string(const std::string& dxf_content) {
    DxfParser parser;
    auto dxf_file = parser.parse(dxf_content);

    IfcxDocument doc;
    auto header_json = dxf_import::convert_header(dxf_file);
    if (header_json.contains("version"))
        doc.header.version = header_json["version"].get<std::string>();
    if (header_json.contains("currentLayer"))
        doc.header.currentLayer = header_json.value("currentLayer", "0");
    if (header_json.contains("linetypeScale"))
        doc.header.linetypeScale = header_json.value("linetypeScale", 1.0);
    if (header_json.contains("units") && header_json["units"].is_object()) {
        doc.header.units.linear = header_json["units"].value("linear", "millimeters");
        doc.header.units.measurement = header_json["units"].value("measurement", "metric");
    }

    // Convert tables
    auto tables_json = dxf_import::convert_tables(dxf_file);
    if (tables_json.contains("layers") && tables_json["layers"].is_object()) {
        for (auto& [name, props] : tables_json["layers"].items()) {
            Layer layer;
            if (props.contains("color") && props["color"].is_number_integer())
                layer.color = props["color"].get<int>();
            if (props.contains("linetype") && props["linetype"].is_string())
                layer.linetype = props["linetype"].get<std::string>();
            if (props.contains("frozen")) layer.frozen = props["frozen"].get<bool>();
            if (props.contains("locked")) layer.locked = props["locked"].get<bool>();
            if (props.contains("off")) layer.off = props["off"].get<bool>();
            if (props.contains("plot")) layer.plot = props["plot"].get<bool>();
            if (props.contains("lineweight") && props["lineweight"].is_number_integer())
                layer.lineweight = props["lineweight"].get<int>();
            doc.tables.layers[name] = layer;
        }
    }

    // Convert entities
    auto entities_json = dxf_import::convert_entities(dxf_file);
    for (auto& ej : entities_json) {
        Entity entity;
        entity.type = ej.value("type", "");
        entity.handle = ej.value("handle", "");
        entity.layer = ej.value("layer", "0");
        if (ej.contains("linetype")) entity.linetype = ej["linetype"].get<std::string>();
        if (ej.contains("color") && ej["color"].is_number_integer())
            entity.color = ej["color"].get<int>();
        if (ej.contains("lineweight") && ej["lineweight"].is_number())
            entity.lineweight = static_cast<int>(ej["lineweight"].get<double>());
        entity.properties = ej;
        // Remove common fields from properties (already in Entity struct)
        for (auto key : {"type", "handle", "layer", "linetype", "color", "lineweight"}) {
            entity.properties.erase(key);
        }
        doc.entities.push_back(std::move(entity));
    }

    // Convert blocks
    auto blocks_json = dxf_import::convert_blocks(dxf_file);
    for (auto& [name, blk] : blocks_json.items()) {
        BlockDefinition block;
        block.name = name;
        if (blk.contains("basePoint") && blk["basePoint"].is_array() &&
            blk["basePoint"].size() >= 3) {
            block.basePoint = {
                blk["basePoint"][0].get<double>(),
                blk["basePoint"][1].get<double>(),
                blk["basePoint"][2].get<double>(),
            };
        }
        if (blk.contains("entities") && blk["entities"].is_array()) {
            for (auto& ej : blk["entities"]) {
                Entity entity;
                entity.type = ej.value("type", "");
                entity.properties = ej;
                block.entities.push_back(std::move(entity));
            }
        }
        doc.blocks[name] = std::move(block);
    }

    // Objects
    auto objects_json = dxf_import::convert_objects(dxf_file);
    for (auto& oj : objects_json) {
        doc.objects.push_back(oj);
    }

    return doc;
}

IfcxDocument dxf_import_from_file(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open DXF file: " + path);
    }
    std::ostringstream ss;
    ss << file.rdbuf();
    return dxf_import_from_string(ss.str());
}

} // namespace ifcx
