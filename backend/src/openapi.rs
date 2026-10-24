use crate::models::*;
use serde_json::{Value, json};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(components(schemas(Session,Namespace,Destination,WebhookEvent,Header,Delivery,Attempt,EventDetail,Token,CreatedToken,Period,Queue,Summary,SeriesPoint,Timeseries,DestinationStats,LoginInput,NamespaceInput,DestinationInput,TokenInput,ReplayInput,ReplayResult,ApiProblem,Problem,Page<Namespace>,Page<Destination>,Page<WebhookEvent>,Page<Attempt>,Page<Token>,Page<Delivery>,Page<DestinationStats>)))]
struct ApiDoc;

/// Utoipa is the schema source; operation metadata is shared with the REST dispatcher.
pub fn document() -> Value {
    let mut doc = serde_json::to_value(ApiDoc::openapi()).unwrap();
    doc["info"] = json!({"title":"Webhook Forwarder","version":env!("CARGO_PKG_VERSION"),"description":"API administrativa de instância única. Cookies exigem X-CSRF-Token em mutações; Bearer não exige CSRF. max_retries=N significa N+1 tentativas; null ilimitado. Sem exactly-once. Estatísticas [from,to), fronteiras de minuto UTC; fila atual ignora período; received ignora filtro de destino. Coleções usam cursor opaco, ordenação estável e limit 1–100 (25 default)."});
    doc["servers"] = json!([{"url":"/api/v1"}]);
    doc["components"]["securitySchemes"] = json!({"bearer":{"type":"http","scheme":"bearer"},"session":{"type":"apiKey","in":"cookie","name":"wf_session"}});
    doc["security"] = json!([{"bearer":[]},{"session":[]}]);
    let routes = [
        ("/auth/login", "post", "Session", Some("LoginInput"), false),
        ("/auth/me", "get", "Session", None, false),
        ("/auth/logout", "post", "", None, false),
        ("/tokens", "get", "Page_Token", None, true),
        ("/tokens", "post", "CreatedToken", Some("TokenInput"), false),
        ("/tokens/{id}", "delete", "", None, false),
        ("/namespaces", "get", "Page_Namespace", None, true),
        (
            "/namespaces",
            "post",
            "Namespace",
            Some("NamespaceInput"),
            false,
        ),
        ("/namespaces/{id}", "get", "Namespace", None, false),
        (
            "/namespaces/{id}",
            "patch",
            "Namespace",
            Some("NamespacePatch"),
            false,
        ),
        ("/destinations", "get", "Page_Destination", None, true),
        (
            "/namespaces/{id}/destinations",
            "get",
            "Page_Destination",
            None,
            true,
        ),
        (
            "/namespaces/{id}/destinations",
            "post",
            "Destination",
            Some("DestinationInput"),
            false,
        ),
        ("/destinations/{id}", "get", "Destination", None, false),
        (
            "/destinations/{id}",
            "patch",
            "Destination",
            Some("DestinationPatch"),
            false,
        ),
        ("/events", "get", "Page_WebhookEvent", None, true),
        ("/events/{id}", "get", "EventDetail", None, false),
        ("/events/{id}/payload", "get", "binary", None, false),
        (
            "/events/{id}/replays",
            "post",
            "ReplayResult",
            Some("ReplayInput"),
            false,
        ),
        ("/deliveries", "get", "Page_Delivery", None, true),
        (
            "/deliveries/{id}/attempts",
            "get",
            "Page_Attempt",
            None,
            true,
        ),
        ("/stats/summary", "get", "Summary", None, false),
        ("/stats/timeseries", "get", "Timeseries", None, false),
        (
            "/stats/destinations",
            "get",
            "Page_DestinationStats",
            None,
            true,
        ),
        ("/openapi.json", "get", "object", None, false),
    ];
    doc["components"]["schemas"]["NamespacePatch"] = json!({"type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":120},"ingress_secret":{"type":["string","null"],"minLength":16,"maxLength":256,"description":"Omitir conserva, null remove, string rotaciona."},"status":{"type":"string","enum":["archived"]}}});
    let mut patch = doc["components"]["schemas"]["DestinationInput"].clone();
    patch.as_object_mut().unwrap().remove("required");
    patch["properties"]["status"] = json!({"type":"string","enum":["active","paused","archived"]});
    doc["components"]["schemas"]["DestinationPatch"] = patch;
    doc["paths"] = json!({});
    doc["components"]["schemas"]["Problem"]["properties"]["request_id"] =
        json!({"type":"string","description":"Identificador de diagnóstico opcional."});
    // Serialized response DTOs always include nullable fields, as consumed by the panel.
    for name in [
        "Namespace",
        "Destination",
        "WebhookEvent",
        "Delivery",
        "Attempt",
        "Token",
        "Period",
        "Queue",
        "Summary",
        "SeriesPoint",
        "Timeseries",
        "DestinationStats",
        "Session",
        "EventDetail",
        "CreatedToken",
        "ReplayResult",
    ] {
        let keys: Vec<String> = doc["components"]["schemas"][name]["properties"]
            .as_object()
            .unwrap()
            .keys()
            .cloned()
            .collect();
        doc["components"]["schemas"][name]["required"] = json!(keys);
    }
    for (name, field, values) in [
        ("Namespace", "status", vec!["active", "archived"]),
        (
            "Destination",
            "status",
            vec!["active", "paused", "archived"],
        ),
        (
            "DestinationStats",
            "status",
            vec!["active", "paused", "archived"],
        ),
        (
            "Delivery",
            "state",
            vec![
                "pending",
                "in_flight",
                "retry_scheduled",
                "succeeded",
                "failed",
                "cancelled",
            ],
        ),
        (
            "Attempt",
            "outcome",
            vec!["succeeded", "failed", "interrupted", "in_flight"],
        ),
        ("Period", "granularity", vec!["minute", "hour", "day"]),
    ] {
        doc["components"]["schemas"][name]["properties"][field]["enum"] = json!(values);
    }
    for (name, field, min, max) in [
        ("NamespaceInput", "name", 1, 120),
        ("NamespaceInput", "slug", 1, 64),
        ("DestinationInput", "name", 1, 120),
        ("DestinationInput", "url", 1, 4096),
        ("TokenInput", "name", 1, 120),
    ] {
        doc["components"]["schemas"][name]["properties"][field]["minLength"] = json!(min);
        doc["components"]["schemas"][name]["properties"][field]["maxLength"] = json!(max);
    }
    for name in [
        "Namespace",
        "Destination",
        "WebhookEvent",
        "Delivery",
        "Attempt",
        "Token",
        "DestinationStats",
    ] {
        doc["components"]["schemas"][format!("Page_{name}")] = json!({"type":"object","required":["items","next_cursor"],"properties":{"items":{"type":"array","items":{"$ref":format!("#/components/schemas/{name}")}},"next_cursor":{"type":["string","null"]}}});
    }
    for name in ["max_retries", "retry_interval_seconds", "timeout_seconds"] {
        doc["components"]["schemas"]["DestinationPatch"]["properties"][name]
            .as_object_mut()
            .unwrap()
            .remove("default");
    }
    for (path, method, schema, input, paged) in routes {
        let mut parameters = Vec::new();
        if path.contains("{id}") {
            parameters
                .push(json!({"name":"id","in":"path","required":true,"schema":{"type":"string"}}));
        }
        if paged {
            parameters.push(json!({"name":"limit","in":"query","schema":{"type":"integer","minimum":1,"maximum":100,"default":25}}));
            parameters.push(json!({"name":"cursor","in":"query","schema":{"type":"string"}}));
        }
        if method == "get" && (path == "/events" || path.starts_with("/stats/")) {
            for name in ["from", "to", "namespace_id", "destination_id"] {
                parameters.push(json!({"name":name,"in":"query","schema":{"type":"string"},"description":"Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias."}));
            }
        }
        if method == "get" {
            let filters: &[&str] = match path {
                "/namespaces" => &["status"],
                "/destinations" => &["status", "namespace_id"],
                "/deliveries" => &["state", "destination_id"],
                "/events" => &["state"],
                _ => &[],
            };
            for name in filters {
                parameters.push(json!({"name":name,"in":"query","schema":{"type":"string"}}));
            }
        }
        if path.ends_with("/payload") {
            parameters.push(json!({"name":"preview_bytes","in":"query","schema":{"type":"integer","minimum":1,"maximum":65536}}));
        }
        if path.ends_with("/replays") {
            parameters.push(json!({"name":"Idempotency-Key","in":"header","required":true,"schema":{"type":"string","minLength":1,"maxLength":200},"description":"Mesma chave/pedido retorna mesmos IDs; pedido diferente retorna 409."}));
        }
        if method != "get" && path != "/auth/login" {
            parameters.push(json!({"name":"X-CSRF-Token","in":"header","schema":{"type":"string"},"description":"Obrigatório apenas com cookie; obtido em login/me."}));
        }
        let status = if schema.is_empty() {
            "204"
        } else if method == "post" && path != "/auth/login" {
            "201"
        } else {
            "200"
        };
        let response_schema = if schema == "binary" {
            json!({"type":"string","format":"binary"})
        } else if schema == "object" {
            json!({"type":"object"})
        } else {
            json!({"$ref":format!("#/components/schemas/{schema}")})
        };
        let content = if schema.is_empty() {
            json!({})
        } else {
            json!({if schema=="binary"{"application/octet-stream"}else{"application/json"}:{"schema":response_schema}})
        };
        let mut responses = json!({status:{"description":"Sucesso","content":content}});
        for code in [
            "401", "403", "404", "409", "410", "413", "422", "429", "503",
        ] {
            responses[code] = json!({"description":"Erro estruturado","content":{"application/json":{"schema":{"$ref":"#/components/schemas/ApiProblem"}}}});
        }
        let mut operation = json!({"operationId":format!("{}_{}",method,path.replace(['/', '{','}'],"_")),"parameters":parameters,"responses":responses});
        if let Some(input) = input {
            operation["requestBody"] = json!({"required":true,"content":{"application/json":{"schema":{"$ref":format!("#/components/schemas/{input}")}}}});
        }
        if path == "/auth/login" {
            operation["security"] = json!([]);
        }
        if doc["paths"].get(path).is_none() {
            doc["paths"][path] = json!({});
        }
        doc["paths"][path][method] = operation;
    }
    doc
}
