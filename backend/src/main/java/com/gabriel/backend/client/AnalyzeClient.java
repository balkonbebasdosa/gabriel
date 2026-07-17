package com.gabriel.backend.client;

import com.gabriel.backend.client.dto.AnalyzeRequest;
import com.gabriel.backend.client.dto.AnalyzeResponse;

/**
 * Boundary to Gabriel's AI microservice. Exactly one implementation is active
 * at a time, selected purely by the ai-service.mock-enabled property (env
 * AI_SERVICE_MOCK): {@link MockAnalyzeClient} (default) or
 * {@link HttpAnalyzeClient}. Callers depend only on this interface.
 */
public interface AnalyzeClient {

    AnalyzeResponse analyze(AnalyzeRequest request);
}
