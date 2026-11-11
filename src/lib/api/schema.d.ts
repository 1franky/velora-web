// Generado por scripts/api-types.mjs desde velora-api@372cedf9b7870a568f8df5f0310688872fdb4baf. No editar a mano.

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
        /** Iniciar sesión con correo y contraseña */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Renovar tokens con un refresh token (rotación de un solo uso)
         * @description Cada refresh token solo puede usarse una vez. Reutilizar uno ya rotado revoca toda la sesión (detección de robo) y responde 401.
         */
        post: operations["refreshTokens"];
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
        /**
         * Cerrar la sesión asociada a un refresh token
         * @description Idempotente. Revoca la sesión completa; un token desconocido o ya revocado también responde 204.
         */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Perfil y preferencias del usuario autenticado */
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Actualizar preferencias */
        patch: operations["updatePreferences"];
        trace?: never;
    };
    "/bikes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar bicicletas */
        get: operations["listBikes"];
        put?: never;
        /** Registrar una bicicleta */
        post: operations["createBike"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bikes/{bikeId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bikeId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Borrar una bicicleta */
        delete: operations["deleteBike"];
        options?: never;
        head?: never;
        /**
         * Actualizar una bicicleta
         * @description Para retirar una bicicleta sin perder su historial, usar `active=false`.
         */
        patch: operations["updateBike"];
        trace?: never;
    };
    "/devices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar dispositivos de captura */
        get: operations["listDevices"];
        put?: never;
        /** Registrar un dispositivo de captura */
        post: operations["createDevice"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar actividades, de la más reciente a la más antigua */
        get: operations["listActivities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities/{activityId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        /** Detalle de una actividad */
        get: operations["getActivity"];
        put?: never;
        post?: never;
        /** Borrar una actividad, sus datos derivados y su archivo original */
        delete: operations["deleteActivity"];
        options?: never;
        head?: never;
        /**
         * Corregir título, tipo o bicicleta de una actividad
         * @description Solo se modifican los campos enviados; `bikeId: null` quita la bicicleta. Las métricas, el recorrido y el archivo original no se editan (para recalcularlos, usar el reproceso). La bicicleta debe ser del usuario.
         */
        patch: operations["updateActivity"];
        trace?: never;
    };
    "/activities/{activityId}/reprocess": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Recalcular una actividad desde su archivo original
         * @description Asíncrono e idempotente: no crea actividades ni modifica el original; conserva título, bicicleta, dispositivo y zona horaria de importación, y guarda las métricas anteriores para compararlas. Si ya hay un reproceso pendiente, devuelve ese trabajo.
         */
        post: operations["reprocessActivity"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities/{activityId}/streams": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        /** Series por muestra de una actividad */
        get: operations["getActivityStreams"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities/{activityId}/track": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        /**
         * Recorrido de la actividad como GeoJSON simplificado para un nivel de zoom
         * @description Un tramo por segmento (las pausas no se dibujan). La simplificación usa una tolerancia de aproximadamente un píxel en el zoom pedido; el track original no se modifica. Solo para el propietario. Con privacidad de inicio y fin activa se recorta antes de simplificar (ADR-016); si la rodada es más corta que lo que se oculta, responde 404 con un detalle que lo explica.
         */
        get: operations["getActivityTrack"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities/{activityId}/laps": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        /** Vueltas de una actividad */
        get: operations["getActivityLaps"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities/{activityId}/climbs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Subidas y distribución de pendientes de una actividad
         * @description Detectadas con la altitud remuestreada cada 20 m y suavizada en 100 m (`climbs/1`): una subida cuenta si sube al menos 25 m en al menos 300 m con pendiente media de 3 % o más; un descenso de menos del 10 % de lo subido (entre 10 y 30 m) no la corta. `available` es false sin altitud o sin distancia. Solo distancias y altitudes: no incluye posiciones.
         */
        get: operations["getActivityClimbs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities/{activityId}/possible-duplicates": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        /**
         * Actividades que parecen la misma rodada
         * @description Mismo criterio que la advertencia POSSIBLE_DUPLICATE al importar (ADR-009, nivel 3): inicio a menos de 2 minutos, duración y distancia parecidas y recorridos que se cruzan. Sirve para resolver duplicados después de importar (p. ej. la misma rodada en FIT, GPX y TCX). Solo informa; nunca descarta nada. Lista vacía si no hay.
         */
        get: operations["getPossibleDuplicates"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/activities/imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Importar actividad desde FIT, GPX o TCX
         * @description Guarda el archivo y crea un trabajo asíncrono. El formato se detecta por contenido, no por extensión. Los duplicados no se rechazan aquí: el trabajo termina en estado DUPLICATE con la actividad existente.
         */
        post: operations["importActivity"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/imports/{jobId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar estado de importación */
        get: operations["getImportJob"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/dashboard/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Resumen del dashboard para un periodo
         * @description Calculado al vuelo sobre la fecha deportiva local de cada actividad. Semanas de lunes a domingo (ISO-8601); meses y años de calendario. El periodo anterior tiene la misma duración y termina justo antes.
         */
        get: operations["getDashboardSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/geo/heatmap/{z}/{x}/{y}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Tesela vectorial del mapa de calor personal
         * @description Tesela Mapbox Vector Tile (XYZ, Web Mercator, extent 4096) con una capa `recorridos`: una línea por actividad con recorrido, sin propiedades. El cliente las dibuja translúcidas y la intensidad sale de cuántas se enciman. Los recorridos llegan recortados según la privacidad de inicio y fin del usuario (igual que en `/activities/{activityId}/track`) y simplificados a medio píxel de la tesela. Una tesela sin recorridos responde 204. Respuesta privada con ETag: con `If-None-Match` y sin cambios, 304.
         */
        get: operations["getHeatmapTile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/geo/exploration/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Resumen de exploración (celdas H3 y cuadrícula de 1 km)
         * @description Celdas visitadas en dos sistemas que no se comparan entre sí (ADR-018): H3 resolución 9 (área aproximada) y cuadrícula métrica de 1 km en EPSG:6372 (solo México; superficie constante). Se calculan en segundo plano tras importar o reprocesar, al cambiar la privacidad y al arrancar; `pendingActivities` dice cuántas faltan. Las celdas salen del recorrido ya recortado por la privacidad de inicio y fin.
         */
        get: operations["getExplorationSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/geo/exploration/cells": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Celdas visitadas dentro de un recuadro, para dibujarlas */
        get: operations["listExplorationCells"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/geo/exploration/largest-square": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Mayor cuadrado de celdas de 1 km visitadas
         * @description Cuadrícula de 1 km alineada al origen de EPSG:6372, conectividad por lados, una celda faltante rompe el cuadrado. `size` es el lado en celdas (0 si aún no hay celdas).
         */
        get: operations["getLargestSquare"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/geo/new-territory": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Tramos de una actividad recorridos por primera vez
         * @description Compara el recorrido de la actividad (recortado por la privacidad de inicio y fin) con las rodadas del mismo usuario que empezaron antes (ADR-019). Un punto es nuevo si ninguna pasa a menos de `toleranceMeters`; los tramos nuevos de menos de `minStretchMeters` se cuentan como conocidos (desplazamiento del GPS). `confidence` baja con GPS escaso o cuando lo nuevo corre pegado a caminos conocidos (paralelos o GPS desviado).
         */
        get: operations["getNewTerritory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/analytics/timeseries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Tendencias por semana, mes o año
         * @description Totales por periodo de fecha deportiva local (semanas de lunes a domingo), con ceros en los periodos sin rodadas (ADR-020). Cuenta una sola rodada de cada grupo de posibles duplicados sin resolver (`duplicatesExcluded` dice cuántas se omitieron) y, salvo `includeIndoor=true`, solo rodadas de exterior. Sin `from`: 12 semanas, 12 meses o desde el año de la primera rodada; sin `to`: hoy.
         */
        get: operations["getTimeseries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/analytics/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Récords personales con reglas explícitas
         * @description Mayor distancia, desnivel y tiempo en movimiento, y velocidad media más alta (solo rodadas de al menos `minSpeedDistanceMeters` y `minSpeedMovingSeconds`), más el día local con más kilómetros (ADR-020). Una sola rodada de cada grupo de posibles duplicados; solo exterior salvo `includeIndoor=true`. En empate gana la primera en lograrlo. `source` dice si el valor vino del dispositivo o lo calculó Velora. La velocidad máxima no es récord: un pico del GPS la falsea.
         */
        get: operations["getRecords"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/analytics/eddington": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Número de Eddington, de toda la historia y del año en curso
         * @description Mayor E tal que hay al menos E días locales con al menos E km (§6, ADR-020), sumando las rodadas de cada día. Una sola rodada de cada grupo de posibles duplicados; solo exterior salvo `includeIndoor=true`. `missingForNext` son los días de E + 1 km o más que faltan para subir a E + 1.
         */
        get: operations["getEddington"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/analytics/heart-rate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Tiempo en zonas cardiacas
         * @description Tiempo en cada zona por porcentaje de la FC máxima del usuario (`hr-zones/1`, ADR-020): Z1 50–60 %, Z2 60–70 %, Z3 70–80 %, Z4 80–90 %, Z5 90 % o más; `belowZonesSeconds` es el tiempo por debajo del 50 %. Cada muestra vale hasta la siguiente, como máximo 10 s (las pausas no cuentan). Sin FC máxima configurada, `zones` viene vacío. Una sola rodada por grupo de duplicados; solo exterior salvo `includeIndoor=true`. Sin `from`: 12 semanas. Indicador de entrenamiento, no diagnóstico médico.
         */
        get: operations["getHeartRateZones"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/analytics/training-load": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Carga de entrenamiento semanal estimada
         * @description **Estimación** con el TRIMP de Edwards (`edwards-trimp/1`, ADR-020): minutos en cada zona cardiaca por el número de la zona (Z1 × 1 … Z5 × 5), sumados por semana local (lunes a domingo), las últimas `weeks` semanas hasta la actual. Solo cuenta rodadas con FC y requiere la FC máxima del usuario; sin ella `load` es 0 y `maxHeartRateBpm` null. Mismas reglas de duplicados y rodillo que el resto. Indicador de entrenamiento: no evalúa riesgo de lesión ni da recomendaciones médicas (§12).
         */
        get: operations["getTrainingLoad"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description Problem Details (RFC 9457). Textos en es-MX. */
        Problem: {
            type?: string;
            title: string;
            status: number;
            detail?: string;
            instance?: string;
            /** @description Identificador para correlacionar errores 500 con los logs. */
            errorId?: string;
        };
        LoginRequest: {
            /** Format: email */
            email: string;
            password: string;
        };
        RefreshRequest: {
            refreshToken: string;
        };
        TokenResponse: {
            /** @enum {string} */
            tokenType: "Bearer";
            accessToken: string;
            /** @description Segundos */
            accessTokenExpiresIn: number;
            refreshToken: string;
            /** @description Segundos */
            refreshTokenExpiresIn: number;
        };
        Me: {
            /** Format: uuid */
            id: string;
            /** Format: email */
            email: string;
            preferences: components["schemas"]["Preferences"];
        };
        Preferences: {
            /** @enum {string} */
            locale: "es-MX";
            /** @description Identificador IANA, p. ej. America/Mexico_City. */
            timeZone: string;
            /** @enum {string} */
            distanceUnit: "km";
            /** @enum {string} */
            elevationUnit: "m";
            trackPrivacyMeters: components["schemas"]["TrackPrivacyMeters"];
            /** @description FC máxima que indicó el usuario para las zonas cardiacas (ADR-020); null si no la indicó. */
            maxHeartRateBpm: number | null;
        };
        /**
         * @description Metros que se ocultan al inicio y al final de cada recorrido (ADR-016), medidos sobre el camino con una variación estable de ±30 % por actividad; 0 la desactiva (por defecto). Se aplica en el servidor a los recorridos, a las posiciones de las series y a los derivados geoespaciales.
         * @enum {integer}
         */
        TrackPrivacyMeters: 0 | 200 | 300 | 500 | 1000;
        /** @description Solo se modifican los campos enviados. */
        PreferencesUpdate: {
            timeZone?: string;
            /** @enum {string} */
            distanceUnit?: "km";
            /** @enum {string} */
            elevationUnit?: "m";
            trackPrivacyMeters?: components["schemas"]["TrackPrivacyMeters"];
            /** @description Entre 100 y 230 ppm; 0 la borra. */
            maxHeartRateBpm?: number & (0 | unknown);
        };
        /** @enum {string} */
        BikeType: "MTB" | "ROAD" | "GRAVEL" | "OTHER";
        Bike: {
            /** Format: uuid */
            id: string;
            name: string;
            bikeType: components["schemas"]["BikeType"];
            brand: string | null;
            model: string | null;
            weightKg: number | null;
            active: boolean;
            /** Format: date-time */
            createdAt: string;
        };
        BikeCreate: {
            name: string;
            bikeType: components["schemas"]["BikeType"];
            brand?: string | null;
            model?: string | null;
            weightKg?: number | null;
        };
        /** @description Solo se modifican los campos enviados; `null` borra un campo opcional. */
        BikeUpdate: {
            name?: string;
            bikeType?: components["schemas"]["BikeType"];
            brand?: string | null;
            model?: string | null;
            weightKg?: number | null;
            active?: boolean;
        };
        Device: {
            /** Format: uuid */
            id: string;
            displayName: string;
            manufacturer: string | null;
            model: string | null;
            /** Format: date-time */
            createdAt: string;
        };
        DeviceCreate: {
            displayName: string;
            manufacturer?: string | null;
            model?: string | null;
        };
        PeriodTotals: {
            /**
             * Format: date
             * @description Primera fecha local incluida; null en "all".
             */
            from: string | null;
            /**
             * Format: date
             * @description Última fecha local incluida; null en "all".
             */
            to: string | null;
            activityCount: number;
            distanceMeters: number;
            movingTimeSeconds: number;
            elevationGainMeters: number;
        };
        MonthlyTotals: {
            month: string;
            activityCount: number;
            distanceMeters: number;
            movingTimeSeconds: number;
            elevationGainMeters: number;
        };
        DashboardSummary: {
            /** @enum {string} */
            period: "week" | "month" | "year" | "all";
            timeZone: string;
            current: components["schemas"]["PeriodTotals"];
            /** @description Periodo anterior de igual duración; null en "all". */
            previous: components["schemas"]["PeriodTotals"] | null;
            /** @description Los 12 meses que terminan en el mes de referencia, del más antiguo al más reciente, con ceros. */
            monthlyTrend: components["schemas"]["MonthlyTotals"][];
            /** @description Actividad más reciente del usuario, o null si no hay ninguna. */
            latestActivity: components["schemas"]["ActivitySummary"] | null;
        };
        /** @enum {string} */
        ActivitySubType: "MOUNTAIN_BIKE" | "ROAD" | "GRAVEL" | "INDOOR" | "OTHER";
        /** @enum {string} */
        MetricSource: "DEVICE_REPORTED" | "DERIVED";
        ActivitySummary: {
            /** Format: uuid */
            id: string;
            title: string;
            /** Format: date-time */
            startedAt: string;
            /**
             * Format: date
             * @description Fecha deportiva local según la zona horaria del usuario al importar.
             */
            localStartDate: string;
            subType: components["schemas"]["ActivitySubType"];
            /** @description Null si no hay datos (p. ej. rodillo sin sensor de velocidad). */
            distanceMeters: number | null;
            movingTimeSeconds: number;
            elapsedTimeSeconds: number;
            elevationGainMeters: number | null;
            averageSpeedMps: number | null;
            /** Format: uuid */
            bikeId: string | null;
        };
        /** @description Todos los campos de ActivitySummary más los de detalle. */
        ActivityDetail: {
            /** Format: uuid */
            id: string;
            title: string;
            /** Format: date-time */
            startedAt: string;
            /** Format: date */
            localStartDate: string;
            subType: components["schemas"]["ActivitySubType"];
            distanceMeters: number | null;
            movingTimeSeconds: number;
            elapsedTimeSeconds: number;
            elevationGainMeters: number | null;
            averageSpeedMps: number | null;
            /** Format: uuid */
            bikeId: string | null;
            timeZone: string;
            /** @enum {string} */
            sourceType: "FIT" | "GPX" | "TCX";
            /** Format: uuid */
            deviceId: string | null;
            elevationLossMeters: number | null;
            maxSpeedMps: number | null;
            averageHeartRateBpm: number | null;
            maxHeartRateBpm: number | null;
            averagePowerWatts: number | null;
            maxPowerWatts: number | null;
            averageCadenceRpm: number | null;
            /** @description Origen de cada métrica presente, por nombre de campo. */
            metricsProvenance: {
                [key: string]: components["schemas"]["MetricSource"];
            };
            hasTrack: boolean;
            streamTypes: components["schemas"]["StreamType"][];
            lapCount: number;
            originalFile: {
                /** @enum {string} */
                format: "FIT" | "GPX" | "TCX";
                sizeBytes: number;
                /** Format: date-time */
                importedAt: string;
            };
        };
        /** @description Solo se modifican los campos enviados. */
        ActivityUpdate: {
            title?: string;
            subType?: components["schemas"]["ActivitySubType"];
            /**
             * Format: uuid
             * @description Bicicleta del usuario; null la quita.
             */
            bikeId?: string | null;
        };
        /** @enum {string} */
        StreamType: "TIME" | "LATITUDE" | "LONGITUDE" | "ALTITUDE" | "DISTANCE" | "SPEED" | "HEART_RATE" | "CADENCE" | "POWER" | "TEMPERATURE";
        ActivityStreams: {
            sampleCount: number;
            /** @description Una serie por tipo, todas de longitud sampleCount; null donde no hay dato. TIME en milisegundos desde startedAt; unidades SI (m, m/s, °C) y grados WGS84. Con privacidad de inicio y fin activa, LATITUDE y LONGITUDE son null en los tramos ocultos (ADR-016). */
            streams: {
                [key: string]: (number | null)[];
            };
        };
        /** @description GeoJSON Feature (RFC 7946) con coordenadas [longitud, latitud] en WGS84. */
        ActivityTrack: {
            /** @enum {string} */
            type: "Feature";
            /** @description [oeste, sur, este, norte] */
            bbox: number[];
            geometry: {
                /** @enum {string} */
                type: "MultiLineString";
                coordinates: number[][][];
            };
            properties: {
                /** Format: uuid */
                activityId: string;
                /** @description Puntos del track original. */
                pointCount: number;
                returnedPointCount: number;
                zoom: number;
                /** @description El inicio y el fin están ocultos por la privacidad (ADR-016); el recuadro corresponde a lo visible. Las distancias ocultas no se informan. */
                trimmed: boolean;
            };
        };
        ActivityLap: {
            lapNumber: number;
            /** Format: date-time */
            startedAt: string | null;
            elapsedTimeSeconds: number | null;
            timerTimeSeconds: number | null;
            distanceMeters: number | null;
            averageSpeedMps: number | null;
            maxSpeedMps: number | null;
            averageHeartRateBpm: number | null;
            maxHeartRateBpm: number | null;
            averageCadenceRpm: number | null;
            averagePowerWatts: number | null;
            maxPowerWatts: number | null;
        };
        ImportAccepted: {
            /** Format: uuid */
            jobId: string;
            /** @enum {string} */
            status: "QUEUED";
            statusUrl: string;
        };
        ImportJob: {
            /** Format: uuid */
            jobId: string;
            /** @enum {string} */
            kind: "IMPORT" | "REPROCESS";
            /** @enum {string} */
            status: "QUEUED" | "PROCESSING" | "COMPLETED" | "DUPLICATE" | "REJECTED" | "FAILED";
            /**
             * Format: uuid
             * @description Actividad creada (COMPLETED) o la ya existente (DUPLICATE).
             */
            activityId?: string | null;
            /** @description Motivo de REJECTED (EMPTY_FILE, UNSUPPORTED_FORMAT, MALFORMED_FILE, FORBIDDEN_XML_CONSTRUCT, TOO_MANY_POINTS, INVALID_DATA) o, en FAILED, INTERNAL_ERROR o ACTIVITY_NOT_FOUND (reproceso de una actividad borrada). */
            errorCode?: string | null;
            /** @description Explicación en es-MX; nunca incluye contenido del archivo. */
            errorDetail?: string | null;
            /** @description Correcciones aplicadas al importar. */
            warnings: {
                /** @enum {string} */
                code: "INVALID_COORDINATES" | "GPS_JUMPS" | "ALTITUDE_JUMPS" | "LONG_PAUSES" | "NEGATIVE_VALUES" | "NON_MONOTONIC_TIME" | "POSSIBLE_DUPLICATE";
                affectedCount: number;
            }[];
            /** @description Actividades parecidas (heurística o clave de origen débil); no se descartó nada. */
            possibleDuplicateActivityIds: string[];
        };
        ExplorationSummary: {
            /** @example exploration-cells/1 */
            algorithmVersion: string;
            processedActivities: number;
            /** @description Actividades con recorrido cuyas celdas aún se están calculando. */
            pendingActivities: number;
            h3: {
                resolution: number;
                cellCount: number;
                /** @description Celdas × área promedio de un hexágono de esta resolución. */
                approxAreaKm2: number;
            };
            metricGrid: {
                cellSizeMeters: number;
                cellCount: number;
                areaKm2: number;
            };
        };
        ExplorationCells: {
            /** @constant */
            type: "FeatureCollection";
            /** @enum {string} */
            grid: "H3" | "MX1KM";
            truncated: boolean;
            features: {
                /** @constant */
                type: "Feature";
                geometry: {
                    /** @constant */
                    type: "Polygon";
                    coordinates: number[][][];
                };
                properties: {
                    activityCount: number;
                };
            }[];
        };
        LargestSquare: {
            /** @example largest-square/1 */
            algorithmVersion: string;
            cellSizeMeters: number;
            /** @description Lado del cuadrado en celdas. */
            size: number;
            sideKm: number;
            /** @description oeste,sur,este,norte del cuadrado en grados; null si no hay celdas. */
            bbox: number[] | null;
        };
        NewTerritory: {
            /** Format: uuid */
            activityId: string;
            /** @example new-territory/1 */
            algorithmVersion: string;
            toleranceMeters: number;
            minStretchMeters: number;
            /** @description Rodadas con recorrido que empezaron antes que esta. */
            comparedActivities: number;
            /** @description Sin rodadas anteriores: todo es nuevo. */
            firstActivity: boolean;
            /** @description Se analizó el recorrido recortado por la privacidad. */
            trimmed: boolean;
            analyzedDistanceMeters: number;
            newDistanceMeters: number;
            newFraction: number;
            /** @enum {string} */
            confidence: "HIGH" | "MEDIUM" | "LOW";
            /** @description Tramos nuevos (MultiLineString GeoJSON, WGS 84) o null si no hay. */
            geometry: null | {
                /** @constant */
                type: "MultiLineString";
                coordinates: number[][][];
            };
        };
        TimeseriesTotals: {
            activityCount: number;
            distanceMeters: number;
            movingTimeSeconds: number;
            elevationGainMeters: number;
        };
        Timeseries: {
            /** @enum {string} */
            granularity: "week" | "month" | "year";
            /** Format: date */
            from: string;
            /** Format: date */
            to: string;
            includeIndoor: boolean;
            /** @description Posibles duplicados sin resolver del rango que no se sumaron. */
            duplicatesExcluded: number;
            /** @description Origen de la distancia de las rodadas sumadas (del dispositivo o calculada por Velora). */
            distanceSources: {
                deviceReported: number;
                derived: number;
            };
            totals: components["schemas"]["TimeseriesTotals"];
            buckets: components["schemas"]["TimeseriesBucket"][];
        };
        TimeseriesBucket: {
            /**
             * Format: date
             * @description Primer día del periodo (lunes en semanas).
             */
            start: string;
            /**
             * Format: date
             * @description Último día del periodo.
             */
            end: string;
            activityCount: number;
            distanceMeters: number;
            movingTimeSeconds: number;
            elevationGainMeters: number;
        };
        Records: {
            /** @example records/1 */
            algorithmVersion: string;
            includeIndoor: boolean;
            minSpeedDistanceMeters: number;
            minSpeedMovingSeconds: number;
            records: {
                /** @enum {string} */
                kind: "longest_distance" | "most_elevation" | "longest_moving_time" | "fastest_average_speed";
                /** @description Metros, metros, segundos o m/s según `kind`. */
                value: number;
                /** Format: uuid */
                activityId: string;
                title: string;
                /** Format: date */
                localStartDate: string;
                source: components["schemas"]["MetricSource"] | null;
            }[];
            biggestDay: null | {
                /** Format: date */
                date: string;
                distanceMeters: number;
                activityCount: number;
            };
        };
        EddingtonValue: {
            number: number;
            /** @description Días que ya tienen E + 1 km o más. */
            daysForNext: number;
            missingForNext: number;
        };
        Eddington: {
            /** @example eddington/1 */
            algorithmVersion: string;
            includeIndoor: boolean;
            /** @description Año en curso en la zona horaria del usuario. */
            year: number;
            daysWithRides: number;
            overall: components["schemas"]["EddingtonValue"];
            thisYear: components["schemas"]["EddingtonValue"];
        };
        ActivityClimbs: {
            /** Format: uuid */
            activityId: string;
            /** @example climbs/1 */
            algorithmVersion: string;
            available: boolean;
            climbs: {
                startDistanceMeters: number;
                endDistanceMeters: number;
                lengthMeters: number;
                startAltitudeMeters: number;
                endAltitudeMeters: number;
                elevationGainMeters: number;
                averageGradePercent: number;
                /** @description Pendiente máxima sostenida en 100 m. */
                maxGradePercent: number;
            }[];
            /** @description Metros por rango de pendiente; `fromPercent`/`toPercent` nulos en los extremos abiertos. */
            gradeDistribution: {
                fromPercent: number | null;
                toPercent: number | null;
                distanceMeters: number;
            }[];
        };
        HeartRateZones: {
            /** @example hr-zones/1 */
            algorithmVersion: string;
            /** Format: date */
            from: string;
            /** Format: date */
            to: string;
            includeIndoor: boolean;
            maxHeartRateBpm: number | null;
            activitiesWithHeartRate: number;
            activitiesWithoutHeartRate: number;
            belowZonesSeconds: number;
            zones: {
                zone: number;
                fromBpm: number;
                /** @description Incluido; null en la zona 5. */
                toBpm: number | null;
                seconds: number;
            }[];
        };
        TrainingLoad: {
            /** @example edwards-trimp/1 */
            method: string;
            /** @constant */
            estimated: true;
            maxHeartRateBpm: number | null;
            includeIndoor: boolean;
            weeks: {
                /** Format: date */
                start: string;
                /** Format: date */
                end: string;
                /** @description Puntos TRIMP (estimación). */
                load: number;
                activitiesWithHeartRate: number;
                activitiesWithoutHeartRate: number;
            }[];
        };
    };
    responses: {
        /** @description Solicitud inválida */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description No autenticado, credenciales inválidas o token expirado/revocado */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Recurso inexistente o de otro usuario */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Demasiados intentos; reintentar después de `Retry-After` segundos */
        TooManyRequests: {
            headers: {
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description Sesión iniciada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    refreshTokens: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description Tokens renovados */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description Sesión cerrada */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Perfil */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    updatePreferences: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreferencesUpdate"];
            };
        };
        responses: {
            /** @description Preferencias actualizadas */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Preferences"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    listBikes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Bicicletas del usuario, activas e inactivas */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["Bike"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    createBike: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BikeCreate"];
            };
        };
        responses: {
            /** @description Bicicleta creada */
            201: {
                headers: {
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Bike"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    deleteBike: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bikeId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Bicicleta borrada */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    updateBike: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bikeId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BikeUpdate"];
            };
        };
        responses: {
            /** @description Bicicleta actualizada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Bike"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    listDevices: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Dispositivos del usuario */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["Device"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    createDevice: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeviceCreate"];
            };
        };
        responses: {
            /** @description Dispositivo creado */
            201: {
                headers: {
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Device"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    listActivities: {
        parameters: {
            query?: {
                /** @description Fecha deportiva local inicial (incluida). */
                from?: string;
                /** @description Fecha deportiva local final (incluida). */
                to?: string;
                bikeId?: string;
                subType?: components["schemas"]["ActivitySubType"];
                minDistanceM?: number;
                maxDistanceM?: number;
                /** @description Valor opaco de nextCursor de la página anterior. */
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Página de actividades */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["ActivitySummary"][];
                        nextCursor: string | null;
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getActivity: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Actividad */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivityDetail"];
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    deleteActivity: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Actividad borrada */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    updateActivity: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActivityUpdate"];
            };
        };
        responses: {
            /** @description Actividad actualizada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivityDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    reprocessActivity: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Reproceso en cola */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportAccepted"];
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    getActivityStreams: {
        parameters: {
            query?: {
                /** @description Tipos separados por coma; por defecto, todos los disponibles. */
                types?: string;
            };
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Streams */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivityStreams"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    getActivityTrack: {
        parameters: {
            query?: {
                zoom?: number;
            };
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Recorrido */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/geo+json": components["schemas"]["ActivityTrack"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    getActivityLaps: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Vueltas */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["ActivityLap"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    getActivityClimbs: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Subidas */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivityClimbs"];
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    getPossibleDuplicates: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                activityId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Posibles duplicados, del más antiguo al más reciente */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["ActivitySummary"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    importActivity: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file: string;
                    /** Format: uuid */
                    bikeId?: string;
                    /** Format: uuid */
                    deviceId?: string;
                    activityTitle?: string;
                };
            };
        };
        responses: {
            /** @description Importación aceptada */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportAccepted"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
            /** @description Archivo demasiado grande */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getImportJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                jobId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Estado del job */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportJob"];
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    getDashboardSummary: {
        parameters: {
            query?: {
                period?: "week" | "month" | "year" | "all";
                /** @description Fecha local de referencia dentro del periodo; por defecto, hoy en la zona horaria del usuario. */
                date?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Resumen */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardSummary"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getHeatmapTile: {
        parameters: {
            query?: {
                /** @description Fecha deportiva local inicial (incluida). */
                from?: string;
                /** @description Fecha deportiva local final (incluida). */
                to?: string;
                bikeId?: string;
                subType?: components["schemas"]["ActivitySubType"];
            };
            header?: never;
            path: {
                /** @description Zoom; más allá de 16 el cliente amplía la tesela del 16. */
                z: number;
                /** @description Columna, de 0 a 2^z - 1. */
                x: number;
                /** @description Fila, de 0 a 2^z - 1 (origen arriba a la izquierda). */
                y: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Tesela con al menos un recorrido */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/vnd.mapbox-vector-tile": string;
                };
            };
            /** @description No hay recorridos en esta tesela */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description La tesela no cambió desde el ETag enviado en `If-None-Match` */
            304: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getExplorationSummary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Resumen */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExplorationSummary"];
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    listExplorationCells: {
        parameters: {
            query: {
                grid?: "H3" | "MX1KM";
                /** @description oeste,sur,este,norte en grados (WGS 84). */
                bbox: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Hasta 5 000 celdas, primero las más recorridas; `truncated` indica que hay más y conviene acercarse. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/geo+json": components["schemas"]["ExplorationCells"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getLargestSquare: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Mayor cuadrado */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LargestSquare"];
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    getNewTerritory: {
        parameters: {
            query: {
                activityId: string;
                toleranceMeters?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Caminos nuevos */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NewTerritory"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    getTimeseries: {
        parameters: {
            query?: {
                granularity?: "week" | "month" | "year";
                from?: string;
                to?: string;
                includeIndoor?: boolean;
                subType?: components["schemas"]["ActivitySubType"];
                bikeId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Serie */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Timeseries"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getRecords: {
        parameters: {
            query?: {
                includeIndoor?: boolean;
                subType?: components["schemas"]["ActivitySubType"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Récords (vacío si no hay rodadas) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Records"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getEddington: {
        parameters: {
            query?: {
                includeIndoor?: boolean;
                subType?: components["schemas"]["ActivitySubType"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Eddington */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Eddington"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getHeartRateZones: {
        parameters: {
            query?: {
                from?: string;
                to?: string;
                includeIndoor?: boolean;
                subType?: components["schemas"]["ActivitySubType"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Zonas */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HeartRateZones"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getTrainingLoad: {
        parameters: {
            query?: {
                weeks?: number;
                includeIndoor?: boolean;
                subType?: components["schemas"]["ActivitySubType"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Carga por semana */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingLoad"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
}
