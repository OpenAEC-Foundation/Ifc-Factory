#include "ifcx/dxf_parser.h"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace ifcx {

// ---------------------------------------------------------------------------
// TokenStream
// ---------------------------------------------------------------------------

TokenStream::TokenStream(std::vector<DxfToken> tokens)
    : tokens_(std::move(tokens)) {}

const DxfToken* TokenStream::peek() const {
    if (!pushback_.empty()) return &pushback_.back();
    if (pos_ >= tokens_.size()) return nullptr;
    return &tokens_[pos_];
}

std::optional<DxfToken> TokenStream::next() {
    if (!pushback_.empty()) {
        auto tok = pushback_.back();
        pushback_.pop_back();
        return tok;
    }
    if (pos_ >= tokens_.size()) return std::nullopt;
    return tokens_[pos_++];
}

void TokenStream::push_back(DxfToken token) {
    pushback_.push_back(std::move(token));
}

bool TokenStream::done() const {
    return pushback_.empty() && pos_ >= tokens_.size();
}

// ---------------------------------------------------------------------------
// DxfParser -- main parse entry point
// ---------------------------------------------------------------------------

DxfFile DxfParser::parse(const std::string& content) {
    auto raw_tokens = DxfTokenizer::tokenize(content);
    TokenStream tokens(std::move(raw_tokens));
    DxfFile result;

    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;

        if (code == 0 && dxf_value_to_string(value) == "EOF") break;
        if (code == 0 && dxf_value_to_string(value) == "SECTION") {
            auto name_tok = tokens.next();
            if (!name_tok) break;
            auto section_name = dxf_value_to_string(name_tok->value);
            // uppercase
            std::transform(section_name.begin(), section_name.end(),
                           section_name.begin(), ::toupper);

            if (section_name == "HEADER") {
                result.header = parse_header(tokens);
            } else if (section_name == "TABLES") {
                result.tables = parse_tables(tokens);
            } else if (section_name == "BLOCKS") {
                result.blocks = parse_blocks(tokens);
            } else if (section_name == "ENTITIES") {
                result.entities = parse_entities(tokens);
            } else if (section_name == "OBJECTS") {
                result.objects = parse_objects(tokens);
            } else {
                skip_section(tokens);
            }
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// HEADER section
// ---------------------------------------------------------------------------

nlohmann::json DxfParser::parse_header(TokenStream& tokens) {
    nlohmann::json header = nlohmann::json::object();
    std::string current_var;
    std::vector<std::pair<int, DxfValue>> current_values;

    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;

        if (code == 0 && dxf_value_to_string(value) == "ENDSEC") break;

        if (code == 9) {
            if (!current_var.empty()) {
                header[current_var] = collapse_header_var(current_values);
            }
            current_var = dxf_value_to_string(value);
            current_values.clear();
        } else {
            current_values.emplace_back(code, value);
        }
    }

    if (!current_var.empty()) {
        header[current_var] = collapse_header_var(current_values);
    }
    return header;
}

nlohmann::json DxfParser::collapse_header_var(
    const std::vector<std::pair<int, DxfValue>>& pairs) {
    if (pairs.empty()) return nullptr;
    if (pairs.size() == 1) {
        auto& [c, v] = pairs[0];
        if (auto* s = std::get_if<std::string>(&v)) return *s;
        if (auto* i = std::get_if<int>(&v)) return *i;
        if (auto* d = std::get_if<double>(&v)) return *d;
        if (auto* b = std::get_if<bool>(&v)) return *b;
        return nullptr;
    }

    // Check for coordinate codes
    bool has_coords = false;
    for (auto& [c, v] : pairs) {
        if (c == 10 || c == 20 || c == 30) { has_coords = true; break; }
    }

    if (has_coords) {
        double x = 0, y = 0, z = 0;
        for (auto& [c, v] : pairs) {
            if (c == 10) x = dxf_value_to_double(v);
            else if (c == 20) y = dxf_value_to_double(v);
            else if (c == 30) z = dxf_value_to_double(v);
        }
        return nlohmann::json::array({x, y, z});
    }

    // Otherwise return object of code->value
    nlohmann::json obj = nlohmann::json::object();
    for (auto& [c, v] : pairs) {
        auto key = std::to_string(c);
        if (auto* s = std::get_if<std::string>(&v)) obj[key] = *s;
        else if (auto* i = std::get_if<int>(&v)) obj[key] = *i;
        else if (auto* d = std::get_if<double>(&v)) obj[key] = *d;
        else if (auto* b = std::get_if<bool>(&v)) obj[key] = *b;
    }
    return obj;
}

// ---------------------------------------------------------------------------
// TABLES section
// ---------------------------------------------------------------------------

std::map<std::string, std::vector<nlohmann::json>> DxfParser::parse_tables(
    TokenStream& tokens) {
    std::map<std::string, std::vector<nlohmann::json>> tables;

    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;
        if (code == 0 && dxf_value_to_string(value) == "ENDSEC") break;
        if (code == 0 && dxf_value_to_string(value) == "TABLE") {
            auto name_tok = tokens.next();
            if (!name_tok) break;
            auto table_name = dxf_value_to_string(name_tok->value);
            std::transform(table_name.begin(), table_name.end(),
                           table_name.begin(), ::toupper);
            tables[table_name] = parse_table_entries(tokens, table_name);
        }
    }
    return tables;
}

std::vector<nlohmann::json> DxfParser::parse_table_entries(
    TokenStream& tokens, const std::string& table_name) {
    std::vector<nlohmann::json> entries;

    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;
        if (code == 0 && dxf_value_to_string(value) == "ENDTAB") break;
        if (code == 0) {
            auto entry_type = dxf_value_to_string(value);
            auto entry = parse_table_entry(tokens, entry_type, table_name);
            entry["_entry_type"] = entry_type;
            entries.push_back(std::move(entry));
        }
    }
    return entries;
}

nlohmann::json DxfParser::parse_table_entry(
    TokenStream& tokens, const std::string& entry_type,
    const std::string& table_name) {
    nlohmann::json entry = nlohmann::json::object();
    std::vector<double> pattern_elements;

    while (true) {
        auto p = tokens.peek();
        if (!p) break;
        if (p->code == 0) break;
        auto tok = tokens.next();
        auto [code, value] = *tok;

        if (table_name == "LAYER") {
            apply_layer_code(entry, code, value);
        } else if (table_name == "LTYPE") {
            apply_ltype_code(entry, code, value, pattern_elements);
        } else if (table_name == "STYLE") {
            apply_style_code(entry, code, value);
        } else if (table_name == "DIMSTYLE") {
            apply_dimstyle_code(entry, code, value);
        } else {
            apply_generic_table_code(entry, code, value);
        }
    }

    if (!pattern_elements.empty()) {
        entry["pattern"] = pattern_elements;
    }
    return entry;
}

// --- Layer ---
void DxfParser::apply_layer_code(nlohmann::json& e, int code, const DxfValue& value) {
    if (code == 2) e["name"] = dxf_value_to_string(value);
    else if (code == 5) e["handle"] = dxf_value_to_string(value);
    else if (code == 6) e["linetype"] = dxf_value_to_string(value);
    else if (code == 62) {
        int color = dxf_value_to_int(value);
        e["color"] = std::abs(color);
        if (color < 0) e["off"] = true;
    }
    else if (code == 70) {
        int flags = dxf_value_to_int(value);
        e["flags"] = flags;
        e["frozen"] = (flags & 1) != 0;
        e["locked"] = (flags & 4) != 0;
    }
    else if (code == 290) e["plot"] = dxf_value_to_int(value) != 0;
    else if (code == 370) e["lineweight"] = dxf_value_to_int(value);
    else if (code == 390) e["plotStyleHandle"] = dxf_value_to_string(value);
    else if (code == 420) e["trueColor"] = dxf_value_to_int(value);
    else if (code == 100) { /* subclass marker */ }
    else if (code == 330) e["ownerHandle"] = dxf_value_to_string(value);
}

// --- Linetype ---
void DxfParser::apply_ltype_code(nlohmann::json& e, int code, const DxfValue& value,
                                  std::vector<double>& elements) {
    if (code == 2) e["name"] = dxf_value_to_string(value);
    else if (code == 5) e["handle"] = dxf_value_to_string(value);
    else if (code == 3) e["description"] = dxf_value_to_string(value);
    else if (code == 73) e["elementCount"] = dxf_value_to_int(value);
    else if (code == 40) e["totalLength"] = dxf_value_to_double(value);
    else if (code == 49) elements.push_back(dxf_value_to_double(value));
    else if (code == 70) e["flags"] = dxf_value_to_int(value);
}

// --- Style ---
void DxfParser::apply_style_code(nlohmann::json& e, int code, const DxfValue& value) {
    if (code == 2) e["name"] = dxf_value_to_string(value);
    else if (code == 5) e["handle"] = dxf_value_to_string(value);
    else if (code == 3) e["font"] = dxf_value_to_string(value);
    else if (code == 4) e["bigFont"] = dxf_value_to_string(value);
    else if (code == 40) e["height"] = dxf_value_to_double(value);
    else if (code == 41) e["widthFactor"] = dxf_value_to_double(value);
    else if (code == 42) e["lastHeight"] = dxf_value_to_double(value);
    else if (code == 50) e["obliqueAngle"] = dxf_value_to_double(value);
    else if (code == 70) e["flags"] = dxf_value_to_int(value);
    else if (code == 71) e["textGenerationFlags"] = dxf_value_to_int(value);
    else if (code == 1071) e["fontFlags"] = dxf_value_to_int(value);
}

// --- Dimstyle ---
void DxfParser::apply_dimstyle_code(nlohmann::json& e, int code, const DxfValue& value) {
    if (code == 2) e["name"] = dxf_value_to_string(value);
    else if (code == 5) e["handle"] = dxf_value_to_string(value);
    else if (code == 3) e["DIMPOST"] = dxf_value_to_string(value);
    else if (code == 4) e["DIMAPOST"] = dxf_value_to_string(value);
    else if (code == 40) e["DIMSCALE"] = dxf_value_to_double(value);
    else if (code == 41) e["DIMASZ"] = dxf_value_to_double(value);
    else if (code == 42) e["DIMEXO"] = dxf_value_to_double(value);
    else if (code == 43) e["DIMDLI"] = dxf_value_to_double(value);
    else if (code == 44) e["DIMEXE"] = dxf_value_to_double(value);
    else if (code == 140) e["DIMTXT"] = dxf_value_to_double(value);
    else if (code == 141) e["DIMCEN"] = dxf_value_to_double(value);
    else if (code == 147) e["DIMGAP"] = dxf_value_to_double(value);
    else if (code == 77) e["DIMTAD"] = dxf_value_to_int(value);
    else if (code == 271) e["DIMDEC"] = dxf_value_to_int(value);
    else if (code == 340) e["DIMTXSTY"] = dxf_value_to_string(value);
    else if (code == 371) e["DIMLWD"] = dxf_value_to_int(value);
    else if (code == 372) e["DIMLWE"] = dxf_value_to_int(value);
    // Many more dimstyle codes are handled generically
    else if (code != 100) {
        e[std::to_string(code)] = dxf_value_to_double(value);
    }
}

// --- Generic table entry ---
void DxfParser::apply_generic_table_code(nlohmann::json& e, int code, const DxfValue& value) {
    if (code == 2) e["name"] = dxf_value_to_string(value);
    else if (code == 5) e["handle"] = dxf_value_to_string(value);
    else if (code == 70) e["flags"] = dxf_value_to_int(value);
    else if (code == 100) { /* subclass marker */ }
    else {
        auto key = std::to_string(code);
        if (auto* s = std::get_if<std::string>(&value)) e[key] = *s;
        else if (auto* i = std::get_if<int>(&value)) e[key] = *i;
        else if (auto* d = std::get_if<double>(&value)) e[key] = *d;
        else if (auto* b = std::get_if<bool>(&value)) e[key] = *b;
    }
}

// ---------------------------------------------------------------------------
// BLOCKS section
// ---------------------------------------------------------------------------

std::map<std::string, nlohmann::json> DxfParser::parse_blocks(TokenStream& tokens) {
    std::map<std::string, nlohmann::json> blocks;
    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;
        if (code == 0 && dxf_value_to_string(value) == "ENDSEC") break;
        if (code == 0 && dxf_value_to_string(value) == "BLOCK") {
            auto block = parse_block(tokens);
            auto name = block.value("name", "");
            blocks[name] = std::move(block);
        }
    }
    return blocks;
}

nlohmann::json DxfParser::parse_block(TokenStream& tokens) {
    nlohmann::json block = nlohmann::json::object();
    double bx = 0, by = 0, bz = 0;

    // Read block header fields
    while (true) {
        auto p = tokens.peek();
        if (!p) break;
        if (p->code == 0) break;
        auto tok = tokens.next();
        auto [code, value] = *tok;

        if (code == 2) block["name"] = dxf_value_to_string(value);
        else if (code == 3) block["name2"] = dxf_value_to_string(value);
        else if (code == 5) block["handle"] = dxf_value_to_string(value);
        else if (code == 8) block["layer"] = dxf_value_to_string(value);
        else if (code == 10) bx = dxf_value_to_double(value);
        else if (code == 20) by = dxf_value_to_double(value);
        else if (code == 30) bz = dxf_value_to_double(value);
        else if (code == 70) block["flags"] = dxf_value_to_int(value);
    }

    block["basePoint"] = nlohmann::json::array({bx, by, bz});

    // Read entities inside block until ENDBLK
    auto entities = nlohmann::json::array();
    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;
        if (code == 0 && dxf_value_to_string(value) == "ENDBLK") {
            skip_to_next_entity(tokens);
            break;
        }
        if (code == 0) {
            auto entity = parse_entity(dxf_value_to_string(value), tokens);
            entities.push_back(std::move(entity));
        }
    }

    block["entities"] = std::move(entities);
    return block;
}

// ---------------------------------------------------------------------------
// ENTITIES section
// ---------------------------------------------------------------------------

std::vector<nlohmann::json> DxfParser::parse_entities(TokenStream& tokens) {
    std::vector<nlohmann::json> entities;
    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;
        if (code == 0 && dxf_value_to_string(value) == "ENDSEC") break;
        if (code == 0) {
            auto entity = parse_entity(dxf_value_to_string(value), tokens);
            entities.push_back(std::move(entity));
        }
    }
    return entities;
}

// ---------------------------------------------------------------------------
// OBJECTS section
// ---------------------------------------------------------------------------

std::vector<nlohmann::json> DxfParser::parse_objects(TokenStream& tokens) {
    std::vector<nlohmann::json> objects;
    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;
        if (code == 0 && dxf_value_to_string(value) == "ENDSEC") break;
        if (code == 0) {
            auto obj = parse_generic_object(dxf_value_to_string(value), tokens);
            objects.push_back(std::move(obj));
        }
    }
    return objects;
}

nlohmann::json DxfParser::parse_generic_object(const std::string& obj_type,
                                                TokenStream& tokens) {
    nlohmann::json obj = nlohmann::json::object();
    obj["type"] = obj_type;

    while (true) {
        auto p = tokens.peek();
        if (!p) break;
        if (p->code == 0) break;
        auto tok = tokens.next();
        auto [code, value] = *tok;

        if (code == 5) obj["handle"] = dxf_value_to_string(value);
        else if (code == 2) obj["name"] = dxf_value_to_string(value);
        else if (code == 330) obj["ownerHandle"] = dxf_value_to_string(value);
        else if (code == 100) {
            if (!obj.contains("subclasses")) obj["subclasses"] = nlohmann::json::array();
            obj["subclasses"].push_back(dxf_value_to_string(value));
        }
        else if (code == 3) {
            if (!obj.contains("entries")) obj["entries"] = nlohmann::json::array();
            obj["entries"].push_back(dxf_value_to_string(value));
        }
        else if (code == 350) {
            if (!obj.contains("entryHandles")) obj["entryHandles"] = nlohmann::json::array();
            obj["entryHandles"].push_back(dxf_value_to_string(value));
        }
        else {
            auto key = std::to_string(code);
            if (auto* s = std::get_if<std::string>(&value)) obj[key] = *s;
            else if (auto* i = std::get_if<int>(&value)) obj[key] = *i;
            else if (auto* d = std::get_if<double>(&value)) obj[key] = *d;
            else if (auto* b = std::get_if<bool>(&value)) obj[key] = *b;
        }
    }
    return obj;
}

// ---------------------------------------------------------------------------
// Entity parser dispatch
// ---------------------------------------------------------------------------

nlohmann::json DxfParser::parse_entity(const std::string& entity_type,
                                        TokenStream& tokens) {
    nlohmann::json entity;

    if (entity_type == "LINE") entity = parse_line(entity_type, tokens);
    else if (entity_type == "POINT") entity = parse_point(entity_type, tokens);
    else if (entity_type == "CIRCLE") entity = parse_circle(entity_type, tokens);
    else if (entity_type == "ARC") entity = parse_arc(entity_type, tokens);
    else if (entity_type == "ELLIPSE") entity = parse_ellipse(entity_type, tokens);
    else if (entity_type == "SPLINE") entity = parse_spline(entity_type, tokens);
    else if (entity_type == "LWPOLYLINE") entity = parse_lwpolyline(entity_type, tokens);
    else if (entity_type == "POLYLINE") entity = parse_polyline(entity_type, tokens);
    else if (entity_type == "TEXT") entity = parse_text(entity_type, tokens);
    else if (entity_type == "MTEXT") entity = parse_mtext(entity_type, tokens);
    else if (entity_type == "DIMENSION") entity = parse_dimension(entity_type, tokens);
    else if (entity_type == "LEADER") entity = parse_leader(entity_type, tokens);
    else if (entity_type == "HATCH") entity = parse_hatch(entity_type, tokens);
    else if (entity_type == "INSERT") entity = parse_insert(entity_type, tokens);
    else if (entity_type == "ATTDEF") entity = parse_attdef(entity_type, tokens);
    else if (entity_type == "ATTRIB") entity = parse_attrib(entity_type, tokens);
    else if (entity_type == "SOLID" || entity_type == "TRACE")
        entity = parse_solid_trace(entity_type, tokens);
    else if (entity_type == "3DFACE") entity = parse_3dface(entity_type, tokens);
    else if (entity_type == "VIEWPORT") entity = parse_viewport(entity_type, tokens);
    else if (entity_type == "XLINE" || entity_type == "RAY")
        entity = parse_xline_ray(entity_type, tokens);
    else if (entity_type == "IMAGE") entity = parse_image(entity_type, tokens);
    else if (entity_type == "WIPEOUT") entity = parse_wipeout(entity_type, tokens);
    else if (entity_type == "3DSOLID" || entity_type == "BODY" ||
             entity_type == "REGION" || entity_type == "SURFACE")
        entity = parse_acis(entity_type, tokens);
    else if (entity_type == "MESH") entity = parse_mesh(entity_type, tokens);
    else entity = parse_generic_entity(entity_type, tokens);

    entity["type"] = entity_type;
    return entity;
}

// ---------------------------------------------------------------------------
// Common property application
// ---------------------------------------------------------------------------

bool DxfParser::apply_common(nlohmann::json& e, int code, const DxfValue& value) {
    if (code == 5) { e["handle"] = dxf_value_to_string(value); return true; }
    if (code == 8) { e["layer"] = dxf_value_to_string(value); return true; }
    if (code == 6) { e["linetype"] = dxf_value_to_string(value); return true; }
    if (code == 62) { e["color"] = dxf_value_to_int(value); return true; }
    if (code == 370) { e["lineweight"] = dxf_value_to_int(value); return true; }
    if (code == 420) { e["trueColor"] = dxf_value_to_int(value); return true; }
    if (code == 440) { e["transparency"] = dxf_value_to_int(value); return true; }
    if (code == 60) { e["visibility"] = dxf_value_to_int(value); return true; }
    if (code == 67) { e["paperSpace"] = dxf_value_to_int(value); return true; }
    if (code == 210) {
        if (!e.contains("extrusion")) e["extrusion"] = nlohmann::json::array({0.0, 0.0, 1.0});
        e["extrusion"][0] = dxf_value_to_double(value);
        return true;
    }
    if (code == 220) {
        if (!e.contains("extrusion")) e["extrusion"] = nlohmann::json::array({0.0, 0.0, 1.0});
        e["extrusion"][1] = dxf_value_to_double(value);
        return true;
    }
    if (code == 230) {
        if (!e.contains("extrusion")) e["extrusion"] = nlohmann::json::array({0.0, 0.0, 1.0});
        e["extrusion"][2] = dxf_value_to_double(value);
        return true;
    }
    if (code == 100) return true; // subclass marker
    if (code == 330) { e["ownerHandle"] = dxf_value_to_string(value); return true; }
    if (code == 102) return true; // control string
    return false;
}

// ---------------------------------------------------------------------------
// Code collection helper
// ---------------------------------------------------------------------------

std::vector<std::pair<int, DxfValue>> DxfParser::collect_codes(TokenStream& tokens) {
    std::vector<std::pair<int, DxfValue>> pairs;
    while (true) {
        auto p = tokens.peek();
        if (!p) break;
        if (p->code == 0) break;
        auto tok = tokens.next();
        pairs.emplace_back(tok->code, tok->value);
    }
    return pairs;
}

// ---------------------------------------------------------------------------
// Skip helpers
// ---------------------------------------------------------------------------

void DxfParser::skip_section(TokenStream& tokens) {
    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        if (tok->code == 0 && dxf_value_to_string(tok->value) == "ENDSEC") break;
    }
}

void DxfParser::skip_to_next_entity(TokenStream& tokens) {
    while (true) {
        auto p = tokens.peek();
        if (!p) break;
        if (p->code == 0) break;
        tokens.next();
    }
}

// ---------------------------------------------------------------------------
// Entity-specific parsers
// ---------------------------------------------------------------------------

nlohmann::json DxfParser::parse_line(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double sx = 0, sy = 0, sz = 0, ex = 0, ey = 0, ez = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) sx = dxf_value_to_double(value);
        else if (code == 20) sy = dxf_value_to_double(value);
        else if (code == 30) sz = dxf_value_to_double(value);
        else if (code == 11) ex = dxf_value_to_double(value);
        else if (code == 21) ey = dxf_value_to_double(value);
        else if (code == 31) ez = dxf_value_to_double(value);
    }
    e["start"] = nlohmann::json::array({sx, sy, sz});
    e["end"] = nlohmann::json::array({ex, ey, ez});
    return e;
}

nlohmann::json DxfParser::parse_point(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double px = 0, py = 0, pz = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) px = dxf_value_to_double(value);
        else if (code == 20) py = dxf_value_to_double(value);
        else if (code == 30) pz = dxf_value_to_double(value);
    }
    e["position"] = nlohmann::json::array({px, py, pz});
    return e;
}

nlohmann::json DxfParser::parse_circle(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double cx = 0, cy = 0, cz = 0, r = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) cx = dxf_value_to_double(value);
        else if (code == 20) cy = dxf_value_to_double(value);
        else if (code == 30) cz = dxf_value_to_double(value);
        else if (code == 40) r = dxf_value_to_double(value);
    }
    e["center"] = nlohmann::json::array({cx, cy, cz});
    e["radius"] = r;
    return e;
}

nlohmann::json DxfParser::parse_arc(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double cx = 0, cy = 0, cz = 0, r = 0, sa = 0, ea = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) cx = dxf_value_to_double(value);
        else if (code == 20) cy = dxf_value_to_double(value);
        else if (code == 30) cz = dxf_value_to_double(value);
        else if (code == 40) r = dxf_value_to_double(value);
        else if (code == 50) sa = dxf_value_to_double(value);
        else if (code == 51) ea = dxf_value_to_double(value);
    }
    e["center"] = nlohmann::json::array({cx, cy, cz});
    e["radius"] = r;
    e["startAngle"] = sa;
    e["endAngle"] = ea;
    return e;
}

nlohmann::json DxfParser::parse_ellipse(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double cx = 0, cy = 0, cz = 0;
    double mx = 0, my = 0, mz = 0;
    double ratio = 1.0, sp = 0.0, ep = 6.283185307179586;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) cx = dxf_value_to_double(value);
        else if (code == 20) cy = dxf_value_to_double(value);
        else if (code == 30) cz = dxf_value_to_double(value);
        else if (code == 11) mx = dxf_value_to_double(value);
        else if (code == 21) my = dxf_value_to_double(value);
        else if (code == 31) mz = dxf_value_to_double(value);
        else if (code == 40) ratio = dxf_value_to_double(value);
        else if (code == 41) sp = dxf_value_to_double(value);
        else if (code == 42) ep = dxf_value_to_double(value);
    }
    e["center"] = nlohmann::json::array({cx, cy, cz});
    e["majorAxisEndpoint"] = nlohmann::json::array({mx, my, mz});
    e["minorAxisRatio"] = ratio;
    e["startParam"] = sp;
    e["endParam"] = ep;
    return e;
}

nlohmann::json DxfParser::parse_spline(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    int degree = 3, flags = 0;
    std::vector<double> knots;
    std::vector<std::array<double, 3>> ctrl_pts, fit_pts;
    std::vector<double> weights;
    double cx = 0, cy = 0, cz = 0, fx = 0, fy = 0, fz = 0;
    bool in_ctrl = false, in_fit = false;

    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 70) flags = dxf_value_to_int(value);
        else if (code == 71) degree = dxf_value_to_int(value);
        else if (code == 72) { /* num knots */ }
        else if (code == 73) { /* ctrl count */ }
        else if (code == 74) { /* fit count */ }
        else if (code == 40) knots.push_back(dxf_value_to_double(value));
        else if (code == 41) weights.push_back(dxf_value_to_double(value));
        else if (code == 10) {
            if (in_ctrl) ctrl_pts.push_back({cx, cy, cz});
            cx = dxf_value_to_double(value); cy = cz = 0;
            in_ctrl = true; in_fit = false;
        }
        else if (code == 20) { if (in_ctrl) cy = dxf_value_to_double(value); else if (in_fit) fy = dxf_value_to_double(value); }
        else if (code == 30) { if (in_ctrl) cz = dxf_value_to_double(value); else if (in_fit) fz = dxf_value_to_double(value); }
        else if (code == 11) {
            if (in_fit) fit_pts.push_back({fx, fy, fz});
            fx = dxf_value_to_double(value); fy = fz = 0;
            in_fit = true; in_ctrl = false;
        }
        else if (code == 21) { if (in_fit) fy = dxf_value_to_double(value); }
        else if (code == 31) { if (in_fit) fz = dxf_value_to_double(value); }
    }
    if (in_ctrl) ctrl_pts.push_back({cx, cy, cz});
    if (in_fit) fit_pts.push_back({fx, fy, fz});

    e["degree"] = degree;
    e["closed"] = (flags & 1) != 0;
    if (!knots.empty()) e["knots"] = knots;
    if (!ctrl_pts.empty()) {
        auto arr = nlohmann::json::array();
        for (auto& p : ctrl_pts) arr.push_back(nlohmann::json::array({p[0], p[1], p[2]}));
        e["controlPoints"] = arr;
    }
    if (!fit_pts.empty()) {
        auto arr = nlohmann::json::array();
        for (auto& p : fit_pts) arr.push_back(nlohmann::json::array({p[0], p[1], p[2]}));
        e["fitPoints"] = arr;
    }
    if (!weights.empty()) {
        bool has_non_unit = false;
        for (auto w : weights) if (w != 1.0) { has_non_unit = true; break; }
        if (has_non_unit) {
            e["weights"] = weights;
            e["rational"] = true;
        }
    }
    return e;
}

nlohmann::json DxfParser::parse_lwpolyline(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    auto vertices = nlohmann::json::array();
    nlohmann::json current_v;
    double elevation = 0;

    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 90) { /* vertex count */ }
        else if (code == 70) {
            int flags = dxf_value_to_int(value);
            e["closed"] = (flags & 1) != 0;
        }
        else if (code == 38) elevation = dxf_value_to_double(value);
        else if (code == 10) {
            if (!current_v.is_null()) vertices.push_back(current_v);
            current_v = nlohmann::json::object();
            current_v["x"] = dxf_value_to_double(value);
            current_v["y"] = 0.0;
        }
        else if (code == 20) { if (!current_v.is_null()) current_v["y"] = dxf_value_to_double(value); }
        else if (code == 40) {
            if (!current_v.is_null()) {
                double sw = dxf_value_to_double(value);
                if (sw != 0) current_v["startWidth"] = sw;
            }
        }
        else if (code == 41) {
            if (!current_v.is_null()) {
                double ew = dxf_value_to_double(value);
                if (ew != 0) current_v["endWidth"] = ew;
            }
        }
        else if (code == 42) {
            if (!current_v.is_null()) {
                double b = dxf_value_to_double(value);
                if (b != 0) current_v["bulge"] = b;
            }
        }
    }
    if (!current_v.is_null()) vertices.push_back(current_v);
    e["vertices"] = vertices;
    if (elevation != 0.0) e["elevation"] = elevation;
    return e;
}

nlohmann::json DxfParser::parse_polyline(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    int flags = 0;

    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 70) flags = dxf_value_to_int(value);
    }

    bool is_3d = (flags & 8) || (flags & 16);
    e["closed"] = (flags & 1) != 0;
    e["flags"] = flags;

    auto vertices = nlohmann::json::array();
    while (true) {
        auto tok = tokens.next();
        if (!tok) break;
        auto [code, value] = *tok;
        if (code == 0 && dxf_value_to_string(value) == "SEQEND") {
            skip_to_next_entity(tokens);
            break;
        }
        if (code == 0 && dxf_value_to_string(value) == "VERTEX") {
            auto vtx = parse_vertex(tokens);
            vertices.push_back(vtx);
        }
    }

    if (is_3d) {
        e["type"] = "POLYLINE3D";
        auto verts = nlohmann::json::array();
        for (auto& v : vertices) {
            verts.push_back(nlohmann::json::array({
                v.value("x", 0.0), v.value("y", 0.0), v.value("z", 0.0)
            }));
        }
        e["vertices"] = verts;
    } else {
        e["type"] = "POLYLINE2D";
        auto verts = nlohmann::json::array();
        for (auto& v : vertices) {
            nlohmann::json vd = nlohmann::json::object();
            vd["position"] = nlohmann::json::array({
                v.value("x", 0.0), v.value("y", 0.0), v.value("z", 0.0)
            });
            if (v.contains("bulge") && v["bulge"].get<double>() != 0) {
                vd["bulge"] = v["bulge"];
            }
            verts.push_back(vd);
        }
        e["vertices"] = verts;
    }
    return e;
}

nlohmann::json DxfParser::parse_vertex(TokenStream& tokens) {
    nlohmann::json v = nlohmann::json::object();
    v["x"] = 0.0; v["y"] = 0.0; v["z"] = 0.0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (code == 10) v["x"] = dxf_value_to_double(value);
        else if (code == 20) v["y"] = dxf_value_to_double(value);
        else if (code == 30) v["z"] = dxf_value_to_double(value);
        else if (code == 42) v["bulge"] = dxf_value_to_double(value);
        else if (code == 70) v["flags"] = dxf_value_to_int(value);
        else if (code == 40) v["startWidth"] = dxf_value_to_double(value);
        else if (code == 41) v["endWidth"] = dxf_value_to_double(value);
    }
    return v;
}

nlohmann::json DxfParser::parse_text(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double ix = 0, iy = 0, iz = 0, ax = 0, ay = 0, az = 0;
    bool has_align = false;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 1) e["text"] = dxf_value_to_string(value);
        else if (code == 10) ix = dxf_value_to_double(value);
        else if (code == 20) iy = dxf_value_to_double(value);
        else if (code == 30) iz = dxf_value_to_double(value);
        else if (code == 11) { ax = dxf_value_to_double(value); has_align = true; }
        else if (code == 21) ay = dxf_value_to_double(value);
        else if (code == 31) az = dxf_value_to_double(value);
        else if (code == 40) e["height"] = dxf_value_to_double(value);
        else if (code == 50) e["rotation"] = dxf_value_to_double(value);
        else if (code == 7) e["style"] = dxf_value_to_string(value);
        else if (code == 72) e["horizontalAlignment"] = dxf_value_to_int(value);
        else if (code == 73) e["verticalAlignment"] = dxf_value_to_int(value);
        else if (code == 71) e["textGenerationFlags"] = dxf_value_to_int(value);
        else if (code == 41) e["widthFactor"] = dxf_value_to_double(value);
        else if (code == 51) e["obliqueAngle"] = dxf_value_to_double(value);
    }
    e["insertionPoint"] = nlohmann::json::array({ix, iy, iz});
    if (has_align) e["alignmentPoint"] = nlohmann::json::array({ax, ay, az});
    return e;
}

nlohmann::json DxfParser::parse_mtext(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double ix = 0, iy = 0, iz = 0;
    std::string text;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 1 || code == 3) text += dxf_value_to_string(value);
        else if (code == 10) ix = dxf_value_to_double(value);
        else if (code == 20) iy = dxf_value_to_double(value);
        else if (code == 30) iz = dxf_value_to_double(value);
        else if (code == 40) e["height"] = dxf_value_to_double(value);
        else if (code == 41) e["width"] = dxf_value_to_double(value);
        else if (code == 50) e["rotation"] = dxf_value_to_double(value);
        else if (code == 7) e["style"] = dxf_value_to_string(value);
        else if (code == 71) e["attachment"] = dxf_value_to_int(value);
        else if (code == 72) e["drawingDirection"] = dxf_value_to_int(value);
        else if (code == 44) e["lineSpacingFactor"] = dxf_value_to_double(value);
        else if (code == 73) e["lineSpacingStyle"] = dxf_value_to_int(value);
    }
    e["insertionPoint"] = nlohmann::json::array({ix, iy, iz});
    e["text"] = text;
    return e;
}

nlohmann::json DxfParser::parse_dimension(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double dp_x = 0, dp_y = 0, dp_z = 0;
    double mp_x = 0, mp_y = 0, mp_z = 0;
    double d1_x = 0, d1_y = 0, d1_z = 0;
    double d2_x = 0, d2_y = 0, d2_z = 0;
    double d3_x = 0, d3_y = 0, d3_z = 0;
    double d4_x = 0, d4_y = 0, d4_z = 0;
    int dimtype = 0;

    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 2) e["blockName"] = dxf_value_to_string(value);
        else if (code == 3) e["dimStyle"] = dxf_value_to_string(value);
        else if (code == 1) e["overrideText"] = dxf_value_to_string(value);
        else if (code == 70) dimtype = dxf_value_to_int(value);
        else if (code == 53) e["rotationAngle"] = dxf_value_to_double(value);
        else if (code == 10) dp_x = dxf_value_to_double(value);
        else if (code == 20) dp_y = dxf_value_to_double(value);
        else if (code == 30) dp_z = dxf_value_to_double(value);
        else if (code == 11) mp_x = dxf_value_to_double(value);
        else if (code == 21) mp_y = dxf_value_to_double(value);
        else if (code == 31) mp_z = dxf_value_to_double(value);
        else if (code == 13) d1_x = dxf_value_to_double(value);
        else if (code == 23) d1_y = dxf_value_to_double(value);
        else if (code == 33) d1_z = dxf_value_to_double(value);
        else if (code == 14) d2_x = dxf_value_to_double(value);
        else if (code == 24) d2_y = dxf_value_to_double(value);
        else if (code == 34) d2_z = dxf_value_to_double(value);
        else if (code == 15) d3_x = dxf_value_to_double(value);
        else if (code == 25) d3_y = dxf_value_to_double(value);
        else if (code == 35) d3_z = dxf_value_to_double(value);
        else if (code == 16) d4_x = dxf_value_to_double(value);
        else if (code == 26) d4_y = dxf_value_to_double(value);
        else if (code == 36) d4_z = dxf_value_to_double(value);
    }

    int subtype = dimtype & 0x0F;
    static const std::map<int, std::string> type_map = {
        {0, "DIMENSION_LINEAR"}, {1, "DIMENSION_ALIGNED"}, {2, "DIMENSION_ANGULAR"},
        {3, "DIMENSION_DIAMETER"}, {4, "DIMENSION_RADIUS"}, {5, "DIMENSION_ANGULAR3P"},
        {6, "DIMENSION_ORDINATE"},
    };
    auto it = type_map.find(subtype);
    e["dimType"] = (it != type_map.end()) ? it->second : "DIMENSION_LINEAR";
    e["dimTypeRaw"] = dimtype;
    e["dimLinePoint"] = nlohmann::json::array({dp_x, dp_y, dp_z});
    e["textPosition"] = nlohmann::json::array({mp_x, mp_y, mp_z});
    e["defPoint1"] = nlohmann::json::array({d1_x, d1_y, d1_z});
    e["defPoint2"] = nlohmann::json::array({d2_x, d2_y, d2_z});
    if (subtype == 2 || subtype == 5) {
        e["defPoint3"] = nlohmann::json::array({d3_x, d3_y, d3_z});
        e["defPoint4"] = nlohmann::json::array({d4_x, d4_y, d4_z});
    }
    return e;
}

nlohmann::json DxfParser::parse_leader(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    auto vertices = nlohmann::json::array();
    double vx = 0, vy = 0, vz = 0;
    bool have_vertex = false;

    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 71) e["hasArrowhead"] = dxf_value_to_int(value) != 0;
        else if (code == 72) e["pathType"] = (dxf_value_to_int(value) == 1) ? "spline" : "straight";
        else if (code == 73) e["creationFlag"] = dxf_value_to_int(value);
        else if (code == 74) e["hooklineDirection"] = dxf_value_to_int(value);
        else if (code == 75) e["hasHookline"] = dxf_value_to_int(value) != 0;
        else if (code == 40) e["textHeight"] = dxf_value_to_double(value);
        else if (code == 41) e["textWidth"] = dxf_value_to_double(value);
        else if (code == 10) {
            if (have_vertex) vertices.push_back(nlohmann::json::array({vx, vy, vz}));
            vx = dxf_value_to_double(value); vy = vz = 0; have_vertex = true;
        }
        else if (code == 20) vy = dxf_value_to_double(value);
        else if (code == 30) vz = dxf_value_to_double(value);
    }
    if (have_vertex) vertices.push_back(nlohmann::json::array({vx, vy, vz}));
    e["vertices"] = vertices;
    return e;
}

nlohmann::json DxfParser::parse_hatch(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 2) e["patternName"] = dxf_value_to_string(value);
        else if (code == 70) e["solid"] = dxf_value_to_int(value) == 1;
        else if (code == 71) e["associative"] = dxf_value_to_int(value) == 1;
        else if (code == 75) e["hatchStyle"] = dxf_value_to_int(value);
        else if (code == 76) e["patternType"] = dxf_value_to_int(value);
        else if (code == 52) e["patternAngle"] = dxf_value_to_double(value);
        else if (code == 41) e["patternScale"] = dxf_value_to_double(value);
    }
    return e;
}

nlohmann::json DxfParser::parse_insert(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double ix = 0, iy = 0, iz = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 2) e["name"] = dxf_value_to_string(value);
        else if (code == 10) ix = dxf_value_to_double(value);
        else if (code == 20) iy = dxf_value_to_double(value);
        else if (code == 30) iz = dxf_value_to_double(value);
        else if (code == 41) e["xScale"] = dxf_value_to_double(value);
        else if (code == 42) e["yScale"] = dxf_value_to_double(value);
        else if (code == 43) e["zScale"] = dxf_value_to_double(value);
        else if (code == 50) e["rotation"] = dxf_value_to_double(value);
        else if (code == 44) e["columnSpacing"] = dxf_value_to_double(value);
        else if (code == 45) e["rowSpacing"] = dxf_value_to_double(value);
        else if (code == 70) e["columnCount"] = dxf_value_to_int(value);
        else if (code == 71) e["rowCount"] = dxf_value_to_int(value);
        else if (code == 66) e["hasAttributes"] = dxf_value_to_int(value) != 0;
    }
    e["insertionPoint"] = nlohmann::json::array({ix, iy, iz});
    return e;
}

nlohmann::json DxfParser::parse_attdef(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double ix = 0, iy = 0, iz = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 1) e["defaultValue"] = dxf_value_to_string(value);
        else if (code == 2) e["tag"] = dxf_value_to_string(value);
        else if (code == 3) e["prompt"] = dxf_value_to_string(value);
        else if (code == 10) ix = dxf_value_to_double(value);
        else if (code == 20) iy = dxf_value_to_double(value);
        else if (code == 30) iz = dxf_value_to_double(value);
        else if (code == 40) e["height"] = dxf_value_to_double(value);
        else if (code == 50) e["rotation"] = dxf_value_to_double(value);
        else if (code == 70) e["flags"] = dxf_value_to_int(value);
    }
    e["insertionPoint"] = nlohmann::json::array({ix, iy, iz});
    return e;
}

nlohmann::json DxfParser::parse_attrib(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double ix = 0, iy = 0, iz = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 1) e["value"] = dxf_value_to_string(value);
        else if (code == 2) e["tag"] = dxf_value_to_string(value);
        else if (code == 10) ix = dxf_value_to_double(value);
        else if (code == 20) iy = dxf_value_to_double(value);
        else if (code == 30) iz = dxf_value_to_double(value);
        else if (code == 40) e["height"] = dxf_value_to_double(value);
        else if (code == 50) e["rotation"] = dxf_value_to_double(value);
        else if (code == 70) e["flags"] = dxf_value_to_int(value);
    }
    e["insertionPoint"] = nlohmann::json::array({ix, iy, iz});
    return e;
}

nlohmann::json DxfParser::parse_solid_trace(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    std::array<std::array<double, 3>, 4> pts = {};
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) pts[0][0] = dxf_value_to_double(value);
        else if (code == 20) pts[0][1] = dxf_value_to_double(value);
        else if (code == 30) pts[0][2] = dxf_value_to_double(value);
        else if (code == 11) pts[1][0] = dxf_value_to_double(value);
        else if (code == 21) pts[1][1] = dxf_value_to_double(value);
        else if (code == 31) pts[1][2] = dxf_value_to_double(value);
        else if (code == 12) pts[2][0] = dxf_value_to_double(value);
        else if (code == 22) pts[2][1] = dxf_value_to_double(value);
        else if (code == 32) pts[2][2] = dxf_value_to_double(value);
        else if (code == 13) pts[3][0] = dxf_value_to_double(value);
        else if (code == 23) pts[3][1] = dxf_value_to_double(value);
        else if (code == 33) pts[3][2] = dxf_value_to_double(value);
    }
    auto arr = nlohmann::json::array();
    for (auto& p : pts) arr.push_back(nlohmann::json::array({p[0], p[1], p[2]}));
    e["corners"] = arr;
    return e;
}

nlohmann::json DxfParser::parse_3dface(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    std::array<std::array<double, 3>, 4> pts = {};
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) pts[0][0] = dxf_value_to_double(value);
        else if (code == 20) pts[0][1] = dxf_value_to_double(value);
        else if (code == 30) pts[0][2] = dxf_value_to_double(value);
        else if (code == 11) pts[1][0] = dxf_value_to_double(value);
        else if (code == 21) pts[1][1] = dxf_value_to_double(value);
        else if (code == 31) pts[1][2] = dxf_value_to_double(value);
        else if (code == 12) pts[2][0] = dxf_value_to_double(value);
        else if (code == 22) pts[2][1] = dxf_value_to_double(value);
        else if (code == 32) pts[2][2] = dxf_value_to_double(value);
        else if (code == 13) pts[3][0] = dxf_value_to_double(value);
        else if (code == 23) pts[3][1] = dxf_value_to_double(value);
        else if (code == 33) pts[3][2] = dxf_value_to_double(value);
        else if (code == 70) e["edgeFlags"] = dxf_value_to_int(value);
    }
    auto arr = nlohmann::json::array();
    for (auto& p : pts) arr.push_back(nlohmann::json::array({p[0], p[1], p[2]}));
    e["corners"] = arr;
    return e;
}

nlohmann::json DxfParser::parse_viewport(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) e["centerX"] = dxf_value_to_double(value);
        else if (code == 20) e["centerY"] = dxf_value_to_double(value);
        else if (code == 30) e["centerZ"] = dxf_value_to_double(value);
        else if (code == 40) e["width"] = dxf_value_to_double(value);
        else if (code == 41) e["height"] = dxf_value_to_double(value);
        else if (code == 69) e["viewportId"] = dxf_value_to_int(value);
    }
    return e;
}

nlohmann::json DxfParser::parse_xline_ray(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    double px = 0, py = 0, pz = 0, dx = 0, dy = 0, dz = 0;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 10) px = dxf_value_to_double(value);
        else if (code == 20) py = dxf_value_to_double(value);
        else if (code == 30) pz = dxf_value_to_double(value);
        else if (code == 11) dx = dxf_value_to_double(value);
        else if (code == 21) dy = dxf_value_to_double(value);
        else if (code == 31) dz = dxf_value_to_double(value);
    }
    e["basePoint"] = nlohmann::json::array({px, py, pz});
    e["direction"] = nlohmann::json::array({dx, dy, dz});
    return e;
}

nlohmann::json DxfParser::parse_image(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 340) e["imageDefHandle"] = dxf_value_to_string(value);
        else if (code == 10) e["insertionX"] = dxf_value_to_double(value);
        else if (code == 20) e["insertionY"] = dxf_value_to_double(value);
        else if (code == 30) e["insertionZ"] = dxf_value_to_double(value);
    }
    return e;
}

nlohmann::json DxfParser::parse_wipeout(const std::string& etype, TokenStream& tokens) {
    return parse_image(etype, tokens);
}

nlohmann::json DxfParser::parse_acis(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    std::string acis_data;
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 1 || code == 3) acis_data += dxf_value_to_string(value);
    }
    if (!acis_data.empty()) e["acisData"] = acis_data;
    return e;
}

nlohmann::json DxfParser::parse_mesh(const std::string& etype, TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        if (code == 91) e["version"] = dxf_value_to_int(value);
        else if (code == 92) e["vertexCount"] = dxf_value_to_int(value);
        else if (code == 93) e["faceCount"] = dxf_value_to_int(value);
    }
    return e;
}

nlohmann::json DxfParser::parse_generic_entity(const std::string& etype,
                                                 TokenStream& tokens) {
    nlohmann::json e = nlohmann::json::object();
    for (auto& [code, value] : collect_codes(tokens)) {
        if (apply_common(e, code, value)) continue;
        auto key = std::to_string(code);
        if (auto* s = std::get_if<std::string>(&value)) e[key] = *s;
        else if (auto* i = std::get_if<int>(&value)) e[key] = *i;
        else if (auto* d = std::get_if<double>(&value)) e[key] = *d;
        else if (auto* b = std::get_if<bool>(&value)) e[key] = *b;
    }
    return e;
}

nlohmann::json DxfParser::parse_table_entity(const std::string& etype,
                                               TokenStream& tokens) {
    return parse_generic_entity(etype, tokens);
}

} // namespace ifcx
