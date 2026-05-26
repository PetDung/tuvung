package com.example.demo.service;

import com.example.demo.dto.scan.ScanDeliveredRequest;
import com.example.demo.dto.scan.ScanResponse;
import com.example.demo.dto.scan.ScanShippingRequest;
import com.example.demo.dto.scan.ScanSoldRequest;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.SignatureVerificationException;
import com.example.demo.service.GatewayService.GatewayException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ShipmentRepository;
import com.example.demo.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanService {

    private final SignatureService signatureService;
    private final ProductRepository productRepository;
    private final ShipmentRepository shipmentRepository;
    private final GatewayService gatewayService;
    private final SecurityUtils securityUtils;

    @Transactional
    public ScanResponse processShipping(ScanShippingRequest request) {
        log.info("Processing scan shipping - product: {}", request.getProductId());

        User currentUser = securityUtils.getCurrentUser();
        UUID productId = UUID.fromString(request.getProductId());
        String signatureFromQR = request.getSignature();

        // 1. Get product
        Product product = getProductOrThrow(productId);

        // 2. Verify signature (HMAC + nonce + expiry + one-time-use)
        verifySignature(signatureFromQR);

        // 3. Verify action trong signature khớp với APPROVED (chỉ QR từ INSPECTOR mới dùng được)
        SignatureAction scannedAction = signatureService.extractActionFromSignature(signatureFromQR);
        if (scannedAction != SignatureAction.APPROVED) {
            throw new BadRequestException("Invalid QR: expected APPROVED signature, got " + scannedAction);
        }

        // 4. Verify đây là signature hiện tại của product (chỉ QR mới nhất mới có hiệu lực)
        if (!signatureFromQR.equals(product.getCurrentSignature())) {
            throw new BadRequestException("QR code is outdated. Please use the latest QR code for this product.");
        }

        // 5. Find shipment & validate permissions & status
        Shipment shipment = getValidatedShipmentForDistributor(productId, currentUser, ShipmentStatus.ACCEPTED,
                "Shipment must be in ACCEPTED status to start shipping. Current: ");

        // 6. Mark OLD signature (APPROVED) as used — consumed by this scan
        try {
            signatureService.markSignatureUsed(signatureFromQR, productId, SignatureAction.APPROVED,
                    product.getFarmerId(), product.getOrigin(), "GENESIS");
        } catch (SignatureVerificationException e) {
            // Already used - this shouldn't happen because verifySignature passed, but just in case
            throw new BadRequestException("QR code has already been used");
        }

        // 7. Update shipment status → IN_TRANSIT
        updateShipmentForShipping(shipment, currentUser, request);

        // 8. Update product status → IN_TRANSIT and LOCK
        lockProductForShipping(product, signatureFromQR);

        // 9. Create NEW active signature (SHIPPED) — NOT marked as used yet
        String newSignature = createNewActiveSignature(
                productId, SignatureAction.SHIPPED, currentUser,
                request.getLocation() != null ? request.getLocation() : "Shipping"
        );

        // 10. Set new signature as product's current signature
        product.setCurrentSignature(newSignature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), newSignature));
        productRepository.save(product);

        // 11. Sync blockchain — nếu fail, toàn bộ transaction rollback
        try {
            gatewayService.shipProduct(
                    productId.toString(),
                    currentUser.getId().toString(),
                    currentUser.getFullName(),
                    request.getLocation() != null ? request.getLocation() : "Shipping"
            );
        } catch (GatewayException e) {
            log.error("Blockchain sync failed for shipping product {}: {}", productId, e.getMessage());
            throw new RuntimeException("Blockchain sync failed: " + e.getMessage(), e);
        }

        log.info("Shipping processed successfully for product: {}. New signature created.", productId);
        return buildScanResponse(true, "Shipping verified and signed successfully",
                newSignature, productId, shipment.getId());
    }

    @Transactional
    public ScanResponse processDelivered(ScanDeliveredRequest request) {
        log.info("Processing scan delivered - product: {}", request.getProductId());

        User currentUser = securityUtils.getCurrentUser();
        UUID productId = UUID.fromString(request.getProductId());
        String signatureFromQR = request.getSignature();

        // 1. Get product
        Product product = getProductOrThrow(productId);

        // 2. Verify signature
        verifySignature(signatureFromQR);

        // 3. Verify action = SHIPPED (chỉ QR từ SHIPPING mới dùng được)
        SignatureAction scannedAction = signatureService.extractActionFromSignature(signatureFromQR);
        if (scannedAction != SignatureAction.SHIPPED) {
            throw new BadRequestException("Invalid QR: expected SHIPPED signature, got " + scannedAction);
        }

        // 4. Verify current signature
        if (!signatureFromQR.equals(product.getCurrentSignature())) {
            throw new BadRequestException("QR code is outdated. Please use the latest QR code.");
        }

        // 5. Validate shipment
        Shipment shipment = getValidatedShipmentForDistributor(productId, currentUser, ShipmentStatus.IN_TRANSIT,
                "Shipment must be IN_TRANSIT to mark as delivered. Current: ");

        // 6. Mark OLD signature (SHIPPED) as used
        signatureService.markSignatureUsed(signatureFromQR, productId, SignatureAction.SHIPPED,
                currentUser.getId(), request.getArrivalLocation(), null);

        // 7. Update shipment → DELIVERED
        shipment.setStatus(ShipmentStatus.DELIVERED);
        shipment.setArrivalTime(LocalDateTime.now());
        if (request.getArrivalLocation() != null) {
            shipment.setToLocation(request.getArrivalLocation());
        }
        shipmentRepository.save(shipment);
        log.info("Shipment {} updated to DELIVERED", shipment.getId());

        // 8. Update product → DELIVERED
        product.setStatus(ProductStatus.DELIVERED);
        product.setLocked(true);
        product.setLockedReason("Product has been delivered");
        productRepository.save(product);
        log.info("Product {} status updated to DELIVERED", productId);

        // 9. Create NEW active signature (DELIVERED)
        String newSignature = createNewActiveSignature(
                productId, SignatureAction.DELIVERED, currentUser,
                request.getArrivalLocation() != null ? request.getArrivalLocation() : "Delivered"
        );

        // 10. Set new current signature
        product.setCurrentSignature(newSignature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), newSignature));
        productRepository.save(product);

        // 11. Blockchain sync — nếu fail, toàn bộ transaction rollback
        try {
            gatewayService.receiveProduct(
                    productId.toString(),
                    currentUser.getId().toString(),
                    currentUser.getFullName(),
                    request.getArrivalLocation() != null ? request.getArrivalLocation() : "Delivered"
            );
        } catch (GatewayException e) {
            log.error("Blockchain sync failed for delivered product {}: {}", productId, e.getMessage());
            throw new RuntimeException("Blockchain sync failed: " + e.getMessage(), e);
        }

        return buildScanResponse(true, "Delivery verified and signed successfully",
                newSignature, productId, shipment.getId());
    }

    @Transactional
    public ScanResponse processSold(ScanSoldRequest request) {
        log.info("Processing scan sold - product: {}", request.getProductId());

        User currentUser = securityUtils.getCurrentUser();
        UUID productId = UUID.fromString(request.getProductId());
        String signatureFromQR = request.getSignature();

        // 1. Get product
        Product product = getProductOrThrow(productId);

        // 2. Verify signature
        verifySignature(signatureFromQR);

        // 3. Verify action = DELIVERED (chỉ QR từ DELIVERED mới dùng được)
        SignatureAction scannedAction = signatureService.extractActionFromSignature(signatureFromQR);
        if (scannedAction != SignatureAction.DELIVERED) {
            throw new BadRequestException("Invalid QR: expected DELIVERED signature, got " + scannedAction);
        }

        // 4. Verify current signature
        if (!signatureFromQR.equals(product.getCurrentSignature())) {
            throw new BadRequestException("QR code is outdated. Please use the latest QR code.");
        }

        // 5. Validate role & status
        if (currentUser.getRole().name().equals("RETAILER") &&
                product.getStatus() != ProductStatus.DELIVERED) {
            throw new BadRequestException("Product must be DELIVERED before marking as sold");
        }

        // 6. Mark OLD signature (DELIVERED) as used
        signatureService.markSignatureUsed(signatureFromQR, productId, SignatureAction.DELIVERED,
                currentUser.getId(), request.getSoldLocation(), null);

        // 7. Update product → SOLD
        product.setStatus(ProductStatus.SOLD);
        productRepository.save(product);
        log.info("Product {} status updated to SOLD", productId);

        // 8. Create NEW signature (SOLD) — terminal state
        String newSignature = createNewActiveSignature(
                productId, SignatureAction.SOLD, currentUser,
                request.getSoldLocation() != null ? request.getSoldLocation() : "Sold"
        );

        // 9. Set final signature
        product.setCurrentSignature(newSignature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), newSignature));
        productRepository.save(product);

        // 10. Blockchain sync — nếu fail, toàn bộ transaction rollback
        try {
            gatewayService.updateProductStatus(
                    productId.toString(),
                    ProductStatus.SOLD.getChaincodeName(),
                    currentUser.getId().toString(),
                    currentUser.getFullName()
            );
        } catch (GatewayException e) {
            log.error("Blockchain sync failed for sold product {}: {}", productId, e.getMessage());
            throw new RuntimeException("Blockchain sync failed: " + e.getMessage(), e);
        }

        return buildScanResponse(true, "Product sale verified and signed",
                newSignature, productId, null);
    }

    // ========== Private Helpers ==========

    private Product getProductOrThrow(UUID productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
    }

    private void verifySignature(String signature) {
        if (signature == null || signature.isBlank()) {
            throw new BadRequestException("QR signature is required");
        }
        if (!signatureService.verifySignature(signature)) {
            throw new SignatureVerificationException("Invalid or expired QR code. Please request a new QR code.");
        }
    }

    private Shipment getValidatedShipmentForDistributor(UUID productId, User currentUser,
                                                         ShipmentStatus expectedStatus, String errorMsg) {
        Shipment shipment = shipmentRepository.findByProductId(productId)
                .orElseThrow(() -> new BadRequestException("No active shipment found for this product"));

        if (shipment.getDistributorId() == null ||
                !shipment.getDistributorId().equals(currentUser.getId())) {
            throw new ForbiddenException("You are not authorized to update this shipment");
        }

        if (shipment.getStatus() != expectedStatus) {
            throw new BadRequestException(errorMsg + shipment.getStatus());
        }

        return shipment;
    }

    private void updateShipmentForShipping(Shipment shipment, User currentUser, ScanShippingRequest request) {
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
    }

    private void lockProductForShipping(Product product, String signature) {
        product.setStatus(ProductStatus.IN_TRANSIT);
        product.setLocked(true);
        product.setLockedReason("Product has been shipped");
        productRepository.save(product);
        log.info("Product {} status updated to IN_TRANSIT and LOCKED", product.getId());
    }

    /**
     * Tạo signature mới ở trạng thái ACTIVE (chưa đánh dấu used).
     * Signature này sẽ được verify khi scan ở bước tiếp theo.
     */
    private String createNewActiveSignature(UUID productId, SignatureAction action,
                                            User actor, String location) {
        String prevHash = signatureService.getLastSignatureHash(productId);
        return signatureService.createSignature(
                productId, action, actor.getId(), location, prevHash
        );
    }

    private String generateQrCodeUrl(String productId, String signature) {
        return String.format("%s|%s", productId, signature);
    }

    private ScanResponse buildScanResponse(boolean success, String message,
                                            String signature, UUID productId, UUID shipmentId) {
        String qrUrl = generateQrCodeUrl(productId.toString(), signature);

        return ScanResponse.builder()
                .success(success)
                .message(message)
                .signature(signature)
                .productId(productId.toString())
                .shipmentId(shipmentId != null ? shipmentId.toString() : null)
                .qrUrl(qrUrl)
                .build();
    }
}
