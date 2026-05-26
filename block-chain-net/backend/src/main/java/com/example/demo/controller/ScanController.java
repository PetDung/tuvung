package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.scan.*;
import com.example.demo.service.ScanService;
import com.example.demo.service.SignatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
@Slf4j
public class ScanController {

    private final ScanService scanService;
    private final SignatureService signatureService;

    @PutMapping("/shipping")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<ScanResponse>> scanShipping(
            @Valid @RequestBody ScanShippingRequest request) {
        log.info("Scan shipping request - product: {}", request.getProductId());
        ScanResponse response = scanService.processShipping(request);
        return ResponseEntity.ok(ApiResponse.success("Shipping scan successful", response));
    }

    @PutMapping("/delivered")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<ScanResponse>> scanDelivered(
            @Valid @RequestBody ScanDeliveredRequest request) {
        log.info("Scan delivered request - product: {}", request.getProductId());
        ScanResponse response = scanService.processDelivered(request);
        return ResponseEntity.ok(ApiResponse.success("Delivery scan successful", response));
    }

    @PutMapping("/sold")
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<ApiResponse<ScanResponse>> scanSold(
            @Valid @RequestBody ScanSoldRequest request) {
        log.info("Scan sold request - product: {}", request.getProductId());
        ScanResponse response = scanService.processSold(request);
        return ResponseEntity.ok(ApiResponse.success("Sale scan successful", response));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifySignature(
            @RequestParam String signature,
            @RequestParam String productId) {
        log.info("Verify signature request for product: {}", productId);

        boolean isValid = signatureService.verifySignature(signature);

        Map<String, Object> result = Map.of(
                "valid", isValid,
                "signature", signature,
                "productId", productId
        );

        if (isValid) {
            return ResponseEntity.ok(ApiResponse.success("Signature is valid", result));
        } else {
            return ResponseEntity.ok(ApiResponse.error("Signature is invalid or already used"));
        }
    }
}
