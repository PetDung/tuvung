package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.service.GatewayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/gateway")
@RequiredArgsConstructor
@Slf4j
public class GatewayController {

    private final GatewayService gatewayService;

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        log.info("Gateway health check request received");

        boolean isHealthy = gatewayService.checkHealth();

        if (isHealthy) {
            return ResponseEntity.ok(ApiResponse.success("Gateway is healthy", Map.of("status", "UP")));
        } else {
            return ResponseEntity.ok(ApiResponse.error("Gateway is unhealthy"));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        log.info("Gateway status request received");

        boolean isHealthy = gatewayService.checkHealth();

        Map<String, Object> status = Map.of(
                "healthy", isHealthy,
                "gateway", "Hyperledger Fabric Gateway",
                "version", "1.0.0"
        );

        return ResponseEntity.ok(ApiResponse.success(status));
    }
}
