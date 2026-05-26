package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.product.*;
import com.example.demo.entity.ProductStatus;
import com.example.demo.security.SecurityUtils;
import com.example.demo.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private final ProductService productService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(@Valid @RequestBody CreateProductRequest request) {
        log.info("Create product request received");
        ProductResponse product = productService.createProduct(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created successfully", product));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('INSPECTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Get all products request received - page: {}, size: {}", page, size);
        Map<String, Object> result = productService.getAllProducts(page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProduct(@PathVariable UUID id) {
        log.info("Get product request received: {}", id);
        ProductResponse product = productService.getProduct(id);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    @GetMapping("/{id}/full")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductWithHistory(@PathVariable UUID id) {
        log.info("Get product with history request received: {}", id);
        ProductResponse product = productService.getProductWithHistory(id);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('INSPECTOR')")
    public ResponseEntity<ApiResponse<ProductResponse>> approveProduct(
            @PathVariable UUID id,
            @Valid @RequestBody ApproveProductRequest request) {
        log.info("Approve product request received: {}", id);
        ProductResponse product = productService.approveProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Product approved successfully", product));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<ProductResponse.ProductHistoryItem>>> getProductHistory(@PathVariable UUID id) {
        log.info("Get product history request received: {}", id);
        List<ProductResponse.ProductHistoryItem> history = productService.getProductHistory(id);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProductEvents(@PathVariable UUID id) {
        log.info("Get product events request received: {}", id);
        List<Map<String, Object>> events = productService.getProductEvents(id);
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    @GetMapping("/farmer/{farmerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByFarmer(@PathVariable UUID farmerId) {
        log.info("Get products by farmer request received: {}", farmerId);
        List<ProductResponse> products = productService.getProductsByFarmer(farmerId);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('INSPECTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByStatus(@PathVariable ProductStatus status) {
        log.info("Get products by status request received: {}", status);
        List<ProductResponse> products = productService.getProductsByStatus(status);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/approved")
    @PreAuthorize("hasRole('DISTRIBUTOR')")  // RETAILER dùng /retailer thay thế
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getApprovedProducts() {
        log.info("Get approved products request received");
        List<ProductResponse> products = productService.getApprovedProducts();
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getMyProducts() {
        log.info("Get my products request received");
        UUID farmerId = securityUtils.getCurrentUserId();
        List<ProductResponse> products = productService.getProductsByFarmer(farmerId);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/retailer")
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getRetailerProducts() {
        log.info("Get retailer products request received");
        UUID userId = securityUtils.getCurrentUserId();
        List<ProductResponse> products = productService.getRetailerProducts(userId);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/distributor")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getDistributorProducts() {
        log.info("Get distributor products request received");
        UUID userId = securityUtils.getCurrentUserId();
        List<ProductResponse> products = productService.getDistributorProducts(userId);
        return ResponseEntity.ok(ApiResponse.success(products));
    }
}
