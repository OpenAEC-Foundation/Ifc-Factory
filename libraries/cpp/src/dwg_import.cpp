#include "ifcx/dwg_parser.h"
#include "ifcx/document.h"

#include <cmath>
#include <fstream>
#include <sstream>

namespace ifcx {

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

namespace dwg_import {

static nlohmann::json convert_header(const DwgFile& dwg) {
    nlohmann::json header = nlohmann::json::object();
    auto& hv = dwg.header_vars;

    header["version"] = hv.value("$ACADVER", dwg.version_code);

    int insunits = 0;
    if (hv.contains("$LUNITS") && hv["$LUNITS"].is_number()) {
        insunits = hv["$LUNITS"].get<int>();
    }
    static const std::map<int, std::string> unit_map = {
        {0, "unitless"}, {1, "scientific"}, {2, "decimal"},
        {3, "engineering"}, {4, "architectural"}, {5, "fractional"},
    };
    int measurement = 1;
    if (hv.contains("$MEASUREMENT") && hv["$MEASUREMENT"].is_number()) {
        measurement = hv["$MEASUREMENT"].get<int>();
    }
    auto uit = unit_map.find(insunits);
    header["units"] = nlohmann::json::object({
        {"linear", (uit != unit_map.end()) ? uit->second : "unitless"},
        {"measurement", (measurement == 1) ? "metric" : "imperial"},
    });

    if (hv.contains("$LTSCALE") && hv["$LTSCALE"].is_number()) {
        header["linetypeScale"] = hv["$LTSCALE"].get<double>();
    }

    return header;
}

static nlohmann::json convert_entity(const DwgObject& obj) {
    nlohmann::json result = obj.data;
    auto etype = result.value("type", "");

    // Normalize handle to string
    if (result.contains("handle") && result["handle"].is_number()) {
        std::ostringstream oss;
        oss << std::uppercase << std::hex << result["handle"].get<int>();
        result["handle"] = oss.str();
    }

    // Remove internal fields
    std::vector<std::string> to_remove;
    for (auto it = result.begin(); it != result.end(); ++it) {
        if (!it.key().empty() && it.key()[0] == '_') to_remove.push_back(it.key());
    }
    for (auto& key : to_remove) result.erase(key);

    // Color normalization
    if (result.contains("color") && result["color"].is_number_integer()) {
        int c = result["color"].get<int>();
        if (c == 0 || c == 256) result.erase("color");
    }

    // Thickness
    if (result.contains("thickness") && result["thickness"].is_number() &&
        result["thickness"].get<double>() == 0.0)
        result.erase("thickness");

    // Default extrusion
    if (result.contains("extrusion") && result["extrusion"].is_array() &&
        result["extrusion"].size() == 3) {
        auto& ext = result["extrusion"];
        if (ext[0].get<double>() == 0.0 && ext[1].get<double>() == 0.0 &&
            ext[2].get<double>() == 1.0)
            result.erase("extrusion");
    }

    // Remove internal/default fields
    result.erase("entity_mode");
    result.erase("linetype_scale");
    result.erase("invisible");
    if (result.contains("lineweight") && result["lineweight"].is_number_integer()) {
        int lw = result["lineweight"].get<int>();
        if (lw == 29 || lw < 0) result.erase("lineweight");
    }

    return result;
}

} // namespace dwg_import

// ---------------------------------------------------------------------------
// Public DWG import functions
// ---------------------------------------------------------------------------

IfcxDocument dwg_import_from_bytes(const uint8_t* data, size_t size) {
    DwgParser parser;
    auto dwg = parser.parse(data, size);

    IfcxDocument doc;
    auto header_json = dwg_import::convert_header(dwg);
    if (header_json.contains("version"))
        doc.header.version = header_json["version"].get<std::string>();
    if (header_json.contains("units") && header_json["units"].is_object()) {
        doc.header.units.linear = header_json["units"].value("linear", "unitless");
        doc.header.units.measurement = header_json["units"].value("measurement", "metric");
    }
    if (header_json.contains("linetypeScale"))
        doc.header.linetypeScale = header_json.value("linetypeScale", 1.0);

    // Tables: layers, styles, linetypes from parsed objects
    for (auto& obj : dwg.objects) {
        if (obj.type_name == "LAYER") {
            auto name = obj.data.value("name", "");
            if (name.empty()) continue;
            Layer layer;
            if (obj.data.contains("color") && obj.data["color"].is_number_integer())
                layer.color = obj.data["color"].get<int>();
            if (obj.data.contains("frozen")) layer.frozen = obj.data["frozen"].get<bool>();
            if (obj.data.contains("off")) layer.off = obj.data["off"].get<bool>();
            if (obj.data.contains("locked")) layer.locked = obj.data["locked"].get<bool>();
            doc.tables.layers[name] = layer;
        } else if (obj.type_name == "STYLE") {
            auto name = obj.data.value("name", "");
            if (name.empty()) continue;
            TextStyle ts;
            if (obj.data.contains("fontName")) ts.fontFamily = obj.data["fontName"].get<std::string>();
            if (obj.data.contains("fixedHeight") && obj.data["fixedHeight"].is_number())
                ts.height = obj.data["fixedHeight"].get<double>();
            if (obj.data.contains("widthFactor") && obj.data["widthFactor"].is_number())
                ts.widthFactor = obj.data["widthFactor"].get<double>();
            doc.tables.textStyles[name] = ts;
        } else if (obj.type_name == "LTYPE") {
            auto name = obj.data.value("name", "");
            if (name.empty() || name == "ByBlock" || name == "ByLayer" || name == "Continuous")
                continue;
            Linetype lt;
            if (obj.data.contains("description")) lt.description = obj.data["description"].get<std::string>();
            if (obj.data.contains("patternLength") && obj.data["patternLength"].is_number())
                lt.patternLength = obj.data["patternLength"].get<double>();
            doc.tables.linetypes[name] = lt;
        }
    }
    if (doc.tables.layers.find("0") == doc.tables.layers.end()) {
        doc.tables.layers["0"] = Layer{};
    }

    // Blocks
    for (auto& obj : dwg.objects) {
        if (obj.type_name == "BLOCK_HEADER") {
            auto name = obj.data.value("name", "");
            if (name.empty()) continue;
            if (name.find("*Model_Space") == 0 || name.find("*Paper_Space") == 0) continue;
            BlockDefinition block;
            block.name = name;
            doc.blocks[name] = std::move(block);
        }
    }

    // Entities
    for (auto& obj : dwg.objects) {
        if (!obj.is_entity) continue;
        auto converted = dwg_import::convert_entity(obj);
        if (converted.is_null()) continue;

        Entity entity;
        entity.type = converted.value("type", "");
        entity.handle = converted.value("handle", "");
        entity.layer = converted.value("layer", "0");
        entity.properties = converted;
        for (auto key : {"type", "handle", "layer"}) {
            entity.properties.erase(key);
        }
        doc.entities.push_back(std::move(entity));
    }

    // Objects (dictionaries)
    for (auto& obj : dwg.objects) {
        if (obj.type_name == "DICTIONARY") {
            nlohmann::json converted = nlohmann::json::object({
                {"objectType", "DICTIONARY"},
            });
            std::ostringstream oss;
            oss << std::uppercase << std::hex << obj.handle;
            converted["handle"] = oss.str();
            if (obj.data.contains("entries")) {
                nlohmann::json entries = nlohmann::json::object();
                for (auto& [k, v] : obj.data["entries"].items()) {
                    entries[k] = v.is_number() ?
                        nlohmann::json(std::to_string(v.get<int>())) : v;
                }
                converted["entries"] = entries;
            }
            doc.objects.push_back(converted);
        }
    }

    return doc;
}

IfcxDocument dwg_import_from_file(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open DWG file: " + path);
    }
    std::vector<uint8_t> data((std::istreambuf_iterator<char>(file)),
                               std::istreambuf_iterator<char>());
    return dwg_import_from_bytes(data.data(), data.size());
}

} // namespace ifcx
