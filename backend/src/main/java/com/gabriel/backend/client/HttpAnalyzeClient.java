package com.gabriel.backend.client;

import com.gabriel.backend.client.dto.AnalyzeRequest;
import com.gabriel.backend.client.dto.AnalyzeResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;

/**
 * Calls Gabriel's real AI service at {ai-service.base-url}/analyze. Wired in
 * once ai-service.mock-enabled=false (env AI_SERVICE_MOCK=false) and
 * ai-service.base-url (env AI_SERVICE_URL) points at the live service - no
 * other code changes needed.
 */
@Component
@ConditionalOnProperty(name = "ai-service.mock-enabled", havingValue = "false")
public class HttpAnalyzeClient implements AnalyzeClient {

    private final RestClient restClient;

    public HttpAnalyzeClient(RestClient.Builder restClientBuilder,
                              @Value("${ai-service.base-url}") String baseUrl) {
        // Force HTTP/1.1: the JDK HttpClient's default HTTP/2 preference sends a
        // cleartext (h2c) Upgrade probe first and withholds the request body until
        // the upgrade completes. ai-service (uvicorn/ASGI) doesn't understand h2c
        // upgrade, so it silently receives an empty body and 422s on every call.
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    @Override
    public AnalyzeResponse analyze(AnalyzeRequest request) {
        return restClient.post()
                .uri("/analyze")
                .body(request)
                .retrieve()
                .body(AnalyzeResponse.class);
    }
}
