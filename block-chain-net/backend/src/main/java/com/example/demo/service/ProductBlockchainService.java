package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Service chuyên trách các tương tác với blockchain thông qua Gateway.
 * Được tách riêng khỏi ProductService để phân tách rõ layer:
 *   ProductService (business logic) → ProductBlockchainService (blockchain sync)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductBlockchainService {

    private final GatewayService gatewayService;

    /**
     * Sync product creation to blockchain.
     * @return txId from blockchain, or null if failed
     */
    public String syncCreateProduct(String id, String refId, String farmerId, String farmerName, String qrCode) {
        log.info("Blockchain: creating product {}", id);
        Map<String, Object> response = gatewayService.createProduct(id, refId, farmerId, farmerName, qrCode);
        return extractTxId(response);
    }

    /**
     * Sync product approval to blockchain.
     * @return txId from blockchain, or null if failed
     */
    public String syncApproveProduct(String productId, String inspectorId, String inspectorName, String location) {
        log.info("Blockchain: approving product {}", productId);
        Map<String, Object> response = gatewayService.approveProduct(productId, inspectorId, inspectorName, location);
        return extractTxId(response);
    }

    /**
     * Get product history from blockchain.
     */
    public List<Map<String, Object>> getHistory(String productId) {
        log.info("Blockchain: fetching history for product {}", productId);
        return gatewayService.getProductHistory(productId);
    }

    /**
     * Get product events from blockchain.
     */
    public List<Map<String, Object>> getEvents(String productId) {
        log.info("Blockchain: fetching events for product {}", productId);
        return gatewayService.getProductEvents(productId);
    }

    /**
     * Extract transaction ID from gateway response.
     */
    private String extractTxId(Map<String, Object> response) {
        if (response != null && response.containsKey("txId")) {
            Object txId = response.get("txId");
            return txId != null ? txId.toString() : null;
        }
        return null;
    }
}
