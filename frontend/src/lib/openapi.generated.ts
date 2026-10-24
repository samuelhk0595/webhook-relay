export interface paths {
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post__auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post__auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__auth_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__deliveries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/deliveries/{id}/attempts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__deliveries__id__attempts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/destinations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__destinations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/destinations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__destinations__id_"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch__destinations__id_"];
        trace?: never;
    };
    "/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__events"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/events/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__events__id_"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/events/{id}/payload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__events__id__payload"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/events/{id}/replays": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["post__events__id__replays"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/namespaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__namespaces"];
        put?: never;
        post: operations["post__namespaces"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/namespaces/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__namespaces__id_"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch__namespaces__id_"];
        trace?: never;
    };
    "/namespaces/{id}/destinations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__namespaces__id__destinations"];
        put?: never;
        post: operations["post__namespaces__id__destinations"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/openapi.json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__openapi.json"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/destinations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__stats_destinations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__stats_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/timeseries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__stats_timeseries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get__tokens"];
        put?: never;
        post: operations["post__tokens"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tokens/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["delete__tokens__id_"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ApiProblem: {
            error: components["schemas"]["Problem"];
        };
        Attempt: {
            /** Format: int64 */
            duration_ms: number | null;
            error_category: string | null;
            error_message: string | null;
            finished_at: string | null;
            id: string;
            /** Format: int64 */
            number: number;
            /** @enum {string} */
            outcome: "succeeded" | "failed" | "interrupted" | "in_flight";
            response_excerpt: string | null;
            started_at: string;
            /** Format: int64 */
            status_code: number | null;
            url: string;
        };
        CreatedToken: {
            secret: string;
            token: components["schemas"]["Token"];
        };
        Delivery: {
            /** Format: int64 */
            attempts_started: number;
            completed_at: string | null;
            /** Format: int64 */
            cycle: number;
            destination_id: string;
            destination_name: string;
            event_id: string;
            id: string;
            last_error: string | null;
            /** Format: int64 */
            max_retries: number | null;
            next_attempt_at: string | null;
            replay_of: string | null;
            /** Format: int64 */
            retry_interval_seconds: number;
            /** @enum {string} */
            state: "pending" | "in_flight" | "retry_scheduled" | "succeeded" | "failed" | "cancelled";
            /** Format: int64 */
            timeout_seconds: number;
        };
        Destination: {
            created_at: string;
            id: string;
            /** Format: int64 */
            max_retries: number | null;
            name: string;
            namespace_id: string;
            /** Format: int64 */
            retry_interval_seconds: number;
            /** @enum {string} */
            status: "active" | "paused" | "archived";
            /** Format: int64 */
            timeout_seconds: number;
            url: string;
        };
        DestinationInput: {
            /**
             * Format: int64
             * @default 288
             */
            max_retries: number | null;
            name: string;
            /**
             * Format: int64
             * @default 300
             */
            retry_interval_seconds: number;
            /**
             * Format: int64
             * @default 15
             */
            timeout_seconds: number;
            url: string;
        };
        DestinationPatch: {
            /** Format: int64 */
            max_retries?: number | null;
            name?: string;
            /** Format: int64 */
            retry_interval_seconds?: number;
            /** @enum {string} */
            status?: "active" | "paused" | "archived";
            /** Format: int64 */
            timeout_seconds?: number;
            url?: string;
        };
        DestinationStats: {
            /** Format: int64 */
            delivered: number;
            destination_id: string;
            destination_name: string;
            /** Format: int64 */
            in_flight: number;
            last_error: string | null;
            last_error_at: string | null;
            namespace_name: string;
            /** Format: int64 */
            pending: number;
            /** Format: int64 */
            permanent_failed: number;
            /** Format: int64 */
            retry_scheduled: number;
            /** @enum {string} */
            status: "active" | "paused" | "archived";
        };
        EventDetail: {
            deliveries: components["schemas"]["Delivery"][];
            event: components["schemas"]["WebhookEvent"];
            headers: components["schemas"]["Header"][];
        };
        Header: {
            name: string;
            redacted: boolean;
            value: string;
        };
        LoginInput: {
            password: string;
            username: string;
        };
        Namespace: {
            created_at: string;
            /** Format: int64 */
            destination_count: number;
            has_ingress_secret: boolean;
            id: string;
            ingress_url: string;
            name: string;
            slug: string;
            /** @enum {string} */
            status: "active" | "archived";
        };
        NamespaceInput: {
            ingress_secret?: string | null;
            name: string;
            slug: string;
        };
        NamespacePatch: {
            /** @description Omitir conserva, null remove, string rotaciona. */
            ingress_secret?: string | null;
            name?: string;
            /** @enum {string} */
            status?: "archived";
        };
        Page_Attempt: {
            items: components["schemas"]["Attempt"][];
            next_cursor: string | null;
        };
        Page_Delivery: {
            items: components["schemas"]["Delivery"][];
            next_cursor: string | null;
        };
        Page_Destination: {
            items: components["schemas"]["Destination"][];
            next_cursor: string | null;
        };
        Page_DestinationStats: {
            items: components["schemas"]["DestinationStats"][];
            next_cursor: string | null;
        };
        Page_Namespace: {
            items: components["schemas"]["Namespace"][];
            next_cursor: string | null;
        };
        Page_Token: {
            items: components["schemas"]["Token"][];
            next_cursor: string | null;
        };
        Page_WebhookEvent: {
            items: components["schemas"]["WebhookEvent"][];
            next_cursor: string | null;
        };
        Period: {
            from: string;
            /** @enum {string} */
            granularity: "minute" | "hour" | "day";
            to: string;
        };
        Problem: {
            code: string;
            fields?: {
                [key: string]: string;
            } | null;
            message: string;
            /** @description Identificador de diagnóstico opcional. */
            request_id?: string;
        };
        Queue: {
            /** Format: int64 */
            in_flight: number;
            /** Format: int64 */
            oldest_pending_age_seconds: number | null;
            /** Format: int64 */
            paused: number;
            /** Format: int64 */
            pending: number;
            /** Format: int64 */
            retry_scheduled: number;
        };
        ReplayInput: {
            destination_ids: string[];
        };
        ReplayResult: {
            delivery_ids: string[];
        };
        SeriesPoint: {
            /** Format: int64 */
            delivered: number;
            /** Format: int64 */
            failed_attempts: number;
            /** Format: int64 */
            received: number;
            timestamp: string;
        };
        Session: {
            csrf_token: string;
            id: string;
            username: string;
        };
        Summary: {
            /** Format: int64 */
            delivered: number;
            /** Format: int64 */
            failed_attempts: number;
            /** Format: double */
            failure_rate: number | null;
            /** Format: int64 */
            finalized_attempts: number;
            period: components["schemas"]["Period"];
            /** Format: int64 */
            permanent_failed: number;
            queue: components["schemas"]["Queue"];
            /** Format: int64 */
            received: number;
        };
        Timeseries: {
            period: components["schemas"]["Period"];
            points: components["schemas"]["SeriesPoint"][];
        };
        Token: {
            created_at: string;
            expires_at: string | null;
            id: string;
            last_used_at: string | null;
            name: string;
            prefix: string;
            revoked_at: string | null;
        };
        TokenInput: {
            expires_at?: string | null;
            name: string;
        };
        WebhookEvent: {
            /** Format: int64 */
            body_size: number;
            content_type: string | null;
            /** Format: int64 */
            delivery_count: number;
            /** Format: int64 */
            failed_count: number;
            id: string;
            method: string;
            namespace_id: string;
            namespace_name: string;
            original_query: string;
            payload_available: boolean;
            /** Format: int64 */
            pending_count: number;
            received_at: string;
            /** Format: int64 */
            succeeded_count: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    post__auth_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginInput"];
            };
        };
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Session"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    post__auth_logout: {
        parameters: {
            query?: never;
            header?: {
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__auth_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Session"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__deliveries: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                state?: string;
                destination_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_Delivery"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__deliveries__id__attempts: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_Attempt"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__destinations: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                status?: string;
                namespace_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_Destination"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__destinations__id_: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Destination"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    patch__destinations__id_: {
        parameters: {
            query?: never;
            header?: {
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DestinationPatch"];
            };
        };
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Destination"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__events: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                from?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                to?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                namespace_id?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                destination_id?: string;
                state?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_WebhookEvent"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__events__id_: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventDetail"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__events__id__payload: {
        parameters: {
            query?: {
                preview_bytes?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": string;
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    post__events__id__replays: {
        parameters: {
            query?: never;
            header: {
                /** @description Mesma chave/pedido retorna mesmos IDs; pedido diferente retorna 409. */
                "Idempotency-Key": string;
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplayInput"];
            };
        };
        responses: {
            /** @description Sucesso */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReplayResult"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__namespaces: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_Namespace"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    post__namespaces: {
        parameters: {
            query?: never;
            header?: {
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NamespaceInput"];
            };
        };
        responses: {
            /** @description Sucesso */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Namespace"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__namespaces__id_: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Namespace"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    patch__namespaces__id_: {
        parameters: {
            query?: never;
            header?: {
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NamespacePatch"];
            };
        };
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Namespace"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__namespaces__id__destinations: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_Destination"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    post__namespaces__id__destinations: {
        parameters: {
            query?: never;
            header?: {
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DestinationInput"];
            };
        };
        responses: {
            /** @description Sucesso */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Destination"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    "get__openapi.json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__stats_destinations: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                from?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                to?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                namespace_id?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                destination_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_DestinationStats"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__stats_summary: {
        parameters: {
            query?: {
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                from?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                to?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                namespace_id?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                destination_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Summary"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__stats_timeseries: {
        parameters: {
            query?: {
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                from?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                to?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                namespace_id?: string;
                /** @description Datas RFC3339; estatísticas alinhadas ao minuto, intervalo máximo 366 dias. */
                destination_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Timeseries"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    get__tokens: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page_Token"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    post__tokens: {
        parameters: {
            query?: never;
            header?: {
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TokenInput"];
            };
        };
        responses: {
            /** @description Sucesso */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedToken"];
                };
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
    delete__tokens__id_: {
        parameters: {
            query?: never;
            header?: {
                /** @description Obrigatório apenas com cookie; obtido em login/me. */
                "X-CSRF-Token"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sucesso */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Erro estruturado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
            /** @description Erro estruturado */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiProblem"];
                };
            };
        };
    };
}
