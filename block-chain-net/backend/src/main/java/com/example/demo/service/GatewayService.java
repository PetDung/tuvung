package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
@Slf4j
public class GatewayService {

    private final WebClient gatewayWebClient;

    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final int MAX_RETRIES = 3;
    private static final Duration RETRY_BACKOFF = Duration.ofSeconds(2);

    public static class GatewayException extends RuntimeException {
        public GatewayException(String message, Throwable cause) {
            super(message, cause);
        }
        public GatewayException(String message) {
            super(message);
        }
    }

    /**
     * Execute a Gateway call with retry logic.
     * Retries on network errors and 5xx server errors, but not 4xx client errors.
     */
    private <T> T executeWithRetry(String operationName, Supplier<T> operation) {
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return operation.get();
            } catch (WebClientResponseException e) {
                if (e.getStatusCode().is4xxClientError()) {
                    throw new GatewayException("Gateway returned " + e.getStatusCode() + " for " + operationName + ": " + e.getResponseBodyAsString(), e);
                }
                if (attempt < MAX_RETRIES) {
                    long waitMs = RETRY_BACKOFF.toMillis() * (long) Math.pow(2, attempt);
                    log.warn("Gateway {} failed (attempt {}/{}), retrying in {}ms: {}",
                            operationName, attempt + 1, MAX_RETRIES + 1, waitMs, e.getStatusCode());
                    sleep(waitMs);
                } else {
                    log.error("Gateway {} failed after {} retries: {}",
                            operationName, MAX_RETRIES, e.getResponseBodyAsString());
                    throw new GatewayException("Gateway returned " + e.getStatusCode() + " for " + operationName + " after retries", e);
                }
            } catch (Exception e) {
                if (attempt < MAX_RETRIES) {
                    long waitMs = RETRY_BACKOFF.toMillis() * (long) Math.pow(2, attempt);
                    log.warn("Gateway {} failed (attempt {}/{}), retrying in {}ms: {}",
                            operationName, attempt + 1, MAX_RETRIES + 1, waitMs, e.getMessage());
                    sleep(waitMs);
                } else {
                    log.error("Gateway {} failed after {} retries: {}",
                            operationName, MAX_RETRIES, e.getMessage());
                    throw new GatewayException("Failed to call Gateway for " + operationName + " after retries", e);
                }
            }
        }
        throw new GatewayException("Unexpected error in executeWithRetry for " + operationName);
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new GatewayException("Retry interrupted", ie);
        }
    }

    /**
     * Execute a POST call with retry
     */
    private Map<String, Object> postWithRetry(String operationName, String uri, Object body) {
        return executeWithRetry(operationName, () -> {
            Map<String, Object> response = gatewayWebClient.post()
                    .uri(uri)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();
            if (response == null) {
                throw new GatewayException("Gateway returned empty response for " + operationName);
            }
            return response;
        });
    }

    /**
     * Execute a PUT call with retry
     */
    private Map<String, Object> putWithRetry(String operationName, String uri, Object body) {
        return executeWithRetry(operationName, () -> {
            Map<String, Object> response = gatewayWebClient.put()
                    .uri(uri)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();
            if (response == null) {
                throw new GatewayException("Gateway returned empty response for " + operationName);
            }
            return response;
        });
    }

    /**
     * Execute a GET call with retry
     */
    @SuppressWarnings("unchecked")
    private <T> T getWithRetry(String operationName, String uri, Class<T> responseType) {
        return executeWithRetry(operationName, () -> {
            T response = gatewayWebClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(responseType)
                    .timeout(TIMEOUT)
                    .block();
            return response;
        });
    }

    public Map<String, Object> createProduct(String id, String refId, String farmerId, String farmerName, String qrCode) {
        log.info("Calling Gateway to create product: {}", id);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("id", id);
        requestBody.put("refID", refId);
        requestBody.put("farmerID", farmerId);
        requestBody.put("farmerName", farmerName);
        requestBody.put("qrCode", qrCode);

        return postWithRetry("createProduct:" + id, "/api/products", requestBody);
    }

    public Map<String, Object> approveProduct(String productId, String inspectorId, String inspectorName, String location) {
        log.info("Calling Gateway to approve product: {}", productId);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("inspectorID", inspectorId);
        requestBody.put("inspectorName", inspectorName);
        requestBody.put("location", location);

        return postWithRetry("approveProduct:" + productId, "/api/products/" + productId + "/approve", requestBody);
    }

    public Map<String, Object> shipProduct(String productId, String distributorId, String distributorName, String location) {
        log.info("Calling Gateway to ship product: {}", productId);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("distributorID", distributorId);
        requestBody.put("distributorName", distributorName);
        requestBody.put("location", location);

        return postWithRetry("shipProduct:" + productId, "/api/products/" + productId + "/ship", requestBody);
    }

    public Map<String, Object> receiveProduct(String productId, String retailerId, String retailerName, String location) {
        log.info("Calling Gateway to receive product: {}", productId);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("retailerID", retailerId);
        requestBody.put("retailerName", retailerName);
        requestBody.put("location", location);

        return postWithRetry("receiveProduct:" + productId, "/api/products/" + productId + "/receive", requestBody);
    }

    public Map<String, Object> updateProductStatus(String productId, String newStatus, String actorId, String actorName) {
        log.info("Calling Gateway to update product status: {} to {}", productId, newStatus);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("newStatus", newStatus);
        requestBody.put("updatedAt", java.time.Instant.now().toString());
        requestBody.put("actorID", actorId);
        requestBody.put("actorName", actorName);

        return putWithRetry("updateProductStatus:" + productId, "/api/products/" + productId + "/status", requestBody);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getProductHistory(String productId) {
        log.info("Calling Gateway to get product history: {}", productId);

        List<Map<String, Object>> response = getWithRetry(
                "getProductHistory:" + productId,
                "/api/products/" + productId + "/history",
                List.class
        );
        return response != null ? response : List.of();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getProductEvents(String productId) {
        log.info("Calling Gateway to get product events: {}", productId);

        List<Map<String, Object>> response = getWithRetry(
                "getProductEvents:" + productId,
                "/api/products/" + productId + "/events",
                List.class
        );
        return response != null ? response : List.of();
    }

    public Map<String, Object> getProduct(String productId) {
        log.info("Calling Gateway to get product: {}", productId);

        Map<String, Object> response = getWithRetry(
                "getProduct:" + productId,
                "/api/products/" + productId,
                Map.class
        );
        return response != null ? response : new HashMap<>();
    }

    public boolean checkHealth() {
        log.info("Checking Gateway health");

        try {
            Map<String, Object> response = gatewayWebClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return response != null;
        } catch (Exception e) {
            log.error("Gateway health check failed: {}", e.getMessage());
            return false;
        }
    }
}
