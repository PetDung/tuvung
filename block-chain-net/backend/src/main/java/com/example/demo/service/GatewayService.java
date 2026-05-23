package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GatewayService {

    private final WebClient gatewayWebClient;

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    public static class GatewayException extends RuntimeException {
        public GatewayException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public Map<String, Object> createProduct(String id, String refId, String farmerId, String farmerName, String qrCode) {
        log.info("Calling Gateway to create product: {}", id);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("id", id);
        requestBody.put("refID", refId);
        requestBody.put("farmerID", farmerId);
        requestBody.put("farmerName", farmerName);
        requestBody.put("qrCode", qrCode);

        try {
            Map<String, Object> response = gatewayWebClient.post()
                    .uri("/api/products")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new GatewayException("Gateway returned empty response for createProduct: " + id, null);
            }
            return response;
        } catch (WebClientResponseException e) {
            log.error("Gateway error on createProduct {}: {} - {}", id, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway createProduct: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway createProduct: " + id, e);
        }
    }

    public Map<String, Object> approveProduct(String productId, String inspectorId, String inspectorName, String location) {
        log.info("Calling Gateway to approve product: {}", productId);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("inspectorId", inspectorId);
        requestBody.put("inspectorName", inspectorName);
        requestBody.put("location", location);

        try {
            Map<String, Object> response = gatewayWebClient.post()
                    .uri("/api/products/{id}/approve", productId)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new GatewayException("Gateway returned empty response for approveProduct: " + productId, null);
            }
            return response;
        } catch (WebClientResponseException e) {
            log.error("Gateway error on approveProduct {}: {} - {}", productId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway approveProduct: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway approveProduct: " + productId, e);
        }
    }

    public Map<String, Object> shipProduct(String productId, String distributorId, String distributorName, String location) {
        log.info("Calling Gateway to ship product: {}", productId);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("distributorId", distributorId);
        requestBody.put("distributorName", distributorName);
        requestBody.put("location", location);

        try {
            Map<String, Object> response = gatewayWebClient.post()
                    .uri("/api/products/{id}/ship", productId)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new GatewayException("Gateway returned empty response for shipProduct: " + productId, null);
            }
            return response;
        } catch (WebClientResponseException e) {
            log.error("Gateway error on shipProduct {}: {} - {}", productId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway shipProduct: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway shipProduct: " + productId, e);
        }
    }

    public Map<String, Object> receiveProduct(String productId, String retailerId, String retailerName, String location) {
        log.info("Calling Gateway to receive product: {}", productId);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("retailerId", retailerId);
        requestBody.put("retailerName", retailerName);
        requestBody.put("location", location);

        try {
            Map<String, Object> response = gatewayWebClient.post()
                    .uri("/api/products/{id}/receive", productId)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new GatewayException("Gateway returned empty response for receiveProduct: " + productId, null);
            }
            return response;
        } catch (WebClientResponseException e) {
            log.error("Gateway error on receiveProduct {}: {} - {}", productId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway receiveProduct: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway receiveProduct: " + productId, e);
        }
    }

    public Map<String, Object> updateProductStatus(String productId, String newStatus, String actorId, String actorName) {
        log.info("Calling Gateway to update product status: {} to {}", productId, newStatus);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("status", newStatus);
        requestBody.put("actorId", actorId);
        requestBody.put("actorName", actorName);

        try {
            Map<String, Object> response = gatewayWebClient.put()
                    .uri("/api/products/{id}/status", productId)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new GatewayException("Gateway returned empty response for updateProductStatus: " + productId, null);
            }
            return response;
        } catch (WebClientResponseException e) {
            log.error("Gateway error on updateProductStatus {}: {} - {}", productId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway updateProductStatus: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway updateProductStatus: " + productId, e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getProductHistory(String productId) {
        log.info("Calling Gateway to get product history: {}", productId);

        try {
            List<Map<String, Object>> response = gatewayWebClient.get()
                    .uri("/api/products/{id}/history", productId)
                    .retrieve()
                    .bodyToMono(List.class)
                    .timeout(TIMEOUT)
                    .block();

            return response != null ? response : List.of();
        } catch (WebClientResponseException e) {
            log.error("Gateway error on getProductHistory {}: {} - {}", productId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway getProductHistory: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway getProductHistory: " + productId, e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getProductEvents(String productId) {
        log.info("Calling Gateway to get product events: {}", productId);

        try {
            List<Map<String, Object>> response = gatewayWebClient.get()
                    .uri("/api/products/{id}/events", productId)
                    .retrieve()
                    .bodyToMono(List.class)
                    .timeout(TIMEOUT)
                    .block();

            return response != null ? response : List.of();
        } catch (WebClientResponseException e) {
            log.error("Gateway error on getProductEvents {}: {} - {}", productId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway getProductEvents: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway getProductEvents: " + productId, e);
        }
    }

    public Map<String, Object> getProduct(String productId) {
        log.info("Calling Gateway to get product: {}", productId);

        try {
            Map<String, Object> response = gatewayWebClient.get()
                    .uri("/api/products/{id}", productId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(TIMEOUT)
                    .block();

            return response != null ? response : new HashMap<>();
        } catch (WebClientResponseException e) {
            log.error("Gateway error on getProduct {}: {} - {}", productId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new GatewayException("Gateway returned error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Failed to call Gateway getProduct: {}", e.getMessage());
            throw new GatewayException("Failed to call Gateway getProduct: " + productId, e);
        }
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
