package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.shipment.AcceptShipmentRequest;
import com.example.demo.dto.shipment.CreateShipmentRequest;
import com.example.demo.dto.shipment.ShipmentListResponse;
import com.example.demo.dto.shipment.ShipmentResponse;
import com.example.demo.entity.ShipmentEvent;
import com.example.demo.security.SecurityUtils;
import com.example.demo.service.ShipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
@Slf4j
public class ShipmentController {

    private final ShipmentService shipmentService;
    private final SecurityUtils securityUtils;

    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> createShipment(
            @Valid @RequestBody CreateShipmentRequest request) {
        log.info("Create shipment request received");
        ShipmentResponse shipment = shipmentService.createShipment(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Shipment created successfully", shipment));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ShipmentListResponse>> getShipments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Get all shipments request received");
        UUID userId = securityUtils.getCurrentUserId();
        ShipmentListResponse shipments = shipmentService.getShipmentsByUser(userId, page, size);
        return ResponseEntity.ok(ApiResponse.success(shipments));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ShipmentListResponse>> getAllShipments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Get all shipments request received (admin)");
        ShipmentListResponse shipments = shipmentService.getAllShipments(page, size);
        return ResponseEntity.ok(ApiResponse.success(shipments));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<List<ShipmentResponse>>> getPendingShipments() {
        log.info("Get pending shipments request received");
        List<ShipmentResponse> shipments = shipmentService.getPendingShipments();
        return ResponseEntity.ok(ApiResponse.success(shipments));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShipmentResponse>> getShipment(@PathVariable UUID id) {
        log.info("Get shipment request received: {}", id);
        ShipmentResponse shipment = shipmentService.getShipment(id);
        return ResponseEntity.ok(ApiResponse.success(shipment));
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> acceptShipment(
            @PathVariable UUID id,
            @RequestBody AcceptShipmentRequest request) {
        log.info("Accept shipment request received: {}", id);
        UUID distributorId = securityUtils.getCurrentUserId();
        ShipmentResponse shipment = shipmentService.acceptShipment(id, distributorId, request);
        return ResponseEntity.ok(ApiResponse.success("Shipment accepted successfully", shipment));
    }

    @PutMapping("/{id}/start")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> startShipping(
            @PathVariable UUID id,
            @RequestParam(required = false) String transportType,
            @RequestParam(required = false) String vehiclePlate) {
        log.info("Start shipping request received: {}", id);
        ShipmentResponse shipment = shipmentService.startShipping(id, transportType, vehiclePlate);
        return ResponseEntity.ok(ApiResponse.success("Shipping started successfully", shipment));
    }

    @PutMapping("/{id}/delivered")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> markDelivered(@PathVariable UUID id) {
        log.info("Mark delivered request received: {}", id);
        ShipmentResponse shipment = shipmentService.markDelivered(id);
        return ResponseEntity.ok(ApiResponse.success("Shipment marked as delivered", shipment));
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<ApiResponse<List<ShipmentEvent>>> getShipmentEvents(@PathVariable UUID id) {
        log.info("Get shipment events request received: {}", id);
        List<ShipmentEvent> events = shipmentService.getShipmentEvents(id);
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    @GetMapping("/distributor/{distributorId}")
    @PreAuthorize("hasRole('DISTRIBUTOR')")
    public ResponseEntity<ApiResponse<List<ShipmentResponse>>> getShipmentsByDistributor(
            @PathVariable UUID distributorId) {
        log.info("Get shipments by distributor request received: {}", distributorId);
        List<ShipmentResponse> shipments = shipmentService.getShipmentsByDistributor(distributorId);
        return ResponseEntity.ok(ApiResponse.success(shipments));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<ShipmentListResponse>> getMyShipments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Get my shipments request received");
        UUID userId = securityUtils.getCurrentUserId();
        ShipmentListResponse shipments = shipmentService.getShipmentsByUser(userId, page, size);
        return ResponseEntity.ok(ApiResponse.success(shipments));
    }
}
