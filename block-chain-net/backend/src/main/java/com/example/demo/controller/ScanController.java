package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.scan.*;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import com.example.demo.entity.Shipment;
import com.example.demo.entity.ShipmentStatus;
import com.example.demo.entity.SignatureAction;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.SignatureVerificationException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ShipmentRepository;
import com.example.demo.security.SecurityUtils;
import com.example.demo.service.GatewayService;
import com.example.demo.service.ProductService;
import com.example.demo.service.SignatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
@Slf4j
public class ScanController {

    private final SignatureService signatureService;
    private final ProductService productService;
    private final ProductRepository productRepository;
    private final GatewayService gatewayService;
    private final SecurityUtils securityUtils;
    private final ShipmentRepository shipmentRepository;

    @PutMapping("/shipping")
    @Transactional
    public ResponseEntity<ApiResponse<ScanResponse>> scanShipping(
            @Valid @RequestBody ScanShippingRequest request) {
        log.info("Scan shipping request - product: {}", request.getProductId());

        User currentUser = securityUtils.getCurrentUser();
        UUID productId = UUID.fromString(request.getProductId());
        String signatureFromQR = request.getSignature();

        // 1. Lấy product và verify
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

//        // 2. Verify signature từ QR
//        if (signatureFromQR == null || signatureFromQR.isBlank()) {
//            throw new BadRequestException("QR signature is required");
//        }
//
//        if (!signatureService.verifySignature(signatureFromQR)) {
//            throw new SignatureVerificationException("Invalid signature from QR code");
//        }

        // 3. Tìm shipment của product này
        Shipment shipment = shipmentRepository.findByProductId(productId)
                .orElseThrow(() -> new BadRequestException("No active shipment found for this product"));

        // 4. Verify user có quyền trên shipment
        if (shipment.getDistributorId() == null || 
            !shipment.getDistributorId().equals(currentUser.getId())) {
            throw new ForbiddenException("You are not authorized to update this shipment");
        }

        // 5. Verify shipment status đúng
        if (shipment.getStatus() != ShipmentStatus.ACCEPTED) {
            throw new BadRequestException("Shipment must be in ACCEPTED status to start shipping. Current: " + shipment.getStatus());
        }

        // 6. Cập nhật shipment status → IN_TRANSIT
        shipment.setStatus(ShipmentStatus.IN_TRANSIT);
        shipment.setDepartureTime(LocalDateTime.now());
        if (request.getTransportType() != null) {
            shipment.setTransportType(request.getTransportType());
        }
        if (request.getVehiclePlate() != null) {
            shipment.setVehiclePlate(request.getVehiclePlate());
        }
        if (request.getLocation() != null) {
            shipment.setFromLocation(request.getLocation());
        }
        shipmentRepository.save(shipment);
        log.info("Shipment {} updated to IN_TRANSIT", shipment.getId());

        // 7. Cập nhật product status → IN_TRANSIT và LOCK (không cho đặt hàng)
        product.setStatus(ProductStatus.IN_TRANSIT);
        product.setCurrentSignature(signatureFromQR);
        product.setLocked(true);
        product.setLockedReason("Product has been shipped");
        productRepository.save(product);
        log.info("Product {} status updated to IN_TRANSIT and LOCKED", productId);

        // 8. Tạo signature mới cho action SHIPPED
        String prevHash = signatureService.getLastSignatureHash(productId);
//        String newSignature = signatureService.createSignature(
//                productId,
//                SignatureAction.SHIPPED,
//                currentUser.getId(),
//                request.getLocation() != null ? request.getLocation() : "Shipping",
//                prevHash
//        );
//
//        String newSignature = "485405sdkfjdfjsdfsdf";
//
//        signatureService.markSignatureUsed(
//                newSignature, productId, SignatureAction.SHIPPED,
//                currentUser.getId(),
//                request.getLocation() != null ? request.getLocation() : "Shipping",
//                prevHash
//        );

        // 9. Cập nhật blockchain
        ScanResponse response = ScanResponse.builder()
                .success(true)
                .message("Shipping verified and signed successfully")
                .signature("44324234")
                .productId(productId.toString())
                .shipmentId(shipment.getId().toString())
                .qrUrl(String.format("https://agritrace.example.com/verify/%s?sig=%s",
                        productId,
                        "2342423423423423"))
                .build();

        gatewayService.shipProduct(
                productId.toString(),
                currentUser.getId().toString(),
                currentUser.getFullName(),
                request.getLocation() != null ? request.getLocation() : "Shipping"
        );

        return ResponseEntity.ok(ApiResponse.success("Shipping scan successful", response));
    }

    @PutMapping("/delivered")
    @Transactional
    public ResponseEntity<ApiResponse<ScanResponse>> scanDelivered(
            @Valid @RequestBody ScanDeliveredRequest request) {
        log.info("Scan delivered request - product: {}", request.getProductId());

        User currentUser = securityUtils.getCurrentUser();
        UUID productId = UUID.fromString(request.getProductId());
        String signatureFromQR = request.getSignature();

        // 1. Lấy product và verify
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // 2. Verify signature từ QR
        if (signatureFromQR == null || signatureFromQR.isBlank()) {
            throw new BadRequestException("QR signature is required");
        }
        
        if (!signatureService.verifySignature(signatureFromQR)) {
            throw new SignatureVerificationException("Invalid signature from QR code");
        }

        // 3. Tìm shipment của product này
        Shipment shipment = shipmentRepository.findByProductId(productId)
                .orElseThrow(() -> new BadRequestException("No active shipment found for this product"));

        // 4. Verify user có quyền trên shipment
        if (shipment.getDistributorId() == null || 
            !shipment.getDistributorId().equals(currentUser.getId())) {
            throw new ForbiddenException("You are not authorized to update this shipment");
        }

        // 5. Verify shipment status đúng
        if (shipment.getStatus() != ShipmentStatus.IN_TRANSIT) {
            throw new BadRequestException("Shipment must be IN_TRANSIT to mark as delivered. Current: " + shipment.getStatus());
        }

        // 6. Cập nhật shipment status → DELIVERED
        shipment.setStatus(ShipmentStatus.DELIVERED);
        shipment.setArrivalTime(LocalDateTime.now());
        if (request.getArrivalLocation() != null) {
            shipment.setToLocation(request.getArrivalLocation());
        }
        shipmentRepository.save(shipment);
        log.info("Shipment {} updated to DELIVERED", shipment.getId());

        // 7. Cập nhật product status → DELIVERED
        product.setStatus(ProductStatus.DELIVERED);
        product.setCurrentSignature(signatureFromQR);
        productRepository.save(product);
        log.info("Product {} status updated to DELIVERED", productId);

        // 8. Tạo signature mới cho action DELIVERED
        String prevHash = signatureService.getLastSignatureHash(productId);
        String newSignature = signatureService.createSignature(
                productId,
                SignatureAction.DELIVERED,
                currentUser.getId(),
                request.getArrivalLocation() != null ? request.getArrivalLocation() : "Delivered",
                prevHash
        );

        signatureService.markSignatureUsed(
                newSignature, productId, SignatureAction.DELIVERED,
                currentUser.getId(),
                request.getArrivalLocation() != null ? request.getArrivalLocation() : "Delivered",
                prevHash
        );

        // 9. Cập nhật blockchain
        gatewayService.receiveProduct(
                productId.toString(),
                currentUser.getId().toString(),
                currentUser.getFullName(),
                request.getArrivalLocation() != null ? request.getArrivalLocation() : "Delivered"
        );

        ScanResponse response = ScanResponse.builder()
                .success(true)
                .message("Delivery verified and signed successfully")
                .signature(newSignature)
                .productId(productId.toString())
                .shipmentId(shipment.getId().toString())
                .qrUrl(String.format("https://agritrace.example.com/verify/%s?sig=%s",
                        productId,
                        newSignature.replace("+", "-").replace("/", "_").replace("=", "")))
                .build();

        return ResponseEntity.ok(ApiResponse.success("Delivery scan successful", response));
    }

    @PutMapping("/sold")
    @Transactional
    public ResponseEntity<ApiResponse<ScanResponse>> scanSold(
            @Valid @RequestBody ScanSoldRequest request) {
        log.info("Scan sold request - product: {}", request.getProductId());

        User currentUser = securityUtils.getCurrentUser();
        UUID productId = UUID.fromString(request.getProductId());
        String signatureFromQR = request.getSignature();

        // 1. Lấy product và verify
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // 2. Verify signature từ QR
        if (signatureFromQR == null || signatureFromQR.isBlank()) {
            throw new BadRequestException("QR signature is required");
        }
        
        if (!signatureService.verifySignature(signatureFromQR)) {
            throw new SignatureVerificationException("Invalid signature from QR code");
        }

        // 3. Verify product có thể bán (phải là RETAILER và product đã DELIVERED)
        if (currentUser.getRole().name().equals("RETAILER") && 
            product.getStatus() != ProductStatus.DELIVERED) {
            throw new BadRequestException("Product must be DELIVERED before marking as sold");
        }

        // 4. Cập nhật product status → SOLD
        product.setStatus(ProductStatus.SOLD);
        product.setCurrentSignature(signatureFromQR);
        productRepository.save(product);
        log.info("Product {} status updated to SOLD", productId);

        // 5. Tạo signature mới cho action SOLD
        String prevHash = signatureService.getLastSignatureHash(productId);
        String newSignature = signatureService.createSignature(
                productId,
                SignatureAction.SOLD,
                currentUser.getId(),
                request.getSoldLocation() != null ? request.getSoldLocation() : "Sold",
                prevHash
        );

        signatureService.markSignatureUsed(
                newSignature, productId, SignatureAction.SOLD,
                currentUser.getId(),
                request.getSoldLocation() != null ? request.getSoldLocation() : "Sold",
                prevHash
        );

        // 6. Cập nhật blockchain
        gatewayService.updateProductStatus(
                productId.toString(),
                ProductStatus.SOLD.name(),
                currentUser.getId().toString(),
                currentUser.getFullName()
        );

        ScanResponse response = ScanResponse.builder()
                .success(true)
                .message("Product sale verified and signed")
                .signature(newSignature)
                .productId(productId.toString())
                .qrUrl(String.format("https://agritrace.example.com/verify/%s?sig=%s",
                        productId,
                        newSignature.replace("+", "-").replace("/", "_").replace("=", "")))
                .build();

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
