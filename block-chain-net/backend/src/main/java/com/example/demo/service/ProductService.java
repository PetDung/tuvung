package com.example.demo.service;

import com.example.demo.dto.product.*;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import com.example.demo.entity.Shipment;
import com.example.demo.entity.ShipmentStatus;
import com.example.demo.entity.SignatureAction;
import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ShipmentRepository;
import com.example.demo.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final ShipmentRepository shipmentRepository;
    private final ProductBlockchainService blockchainService;
    private final SignatureService signatureService;
    private final SecurityUtils securityUtils;

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        log.info("Creating new product: {}", request.getProductName());

        User currentUser = securityUtils.getCurrentUser();

        Product product = Product.builder()
                .farmerId(currentUser.getId())
                .farmerName(request.getFarmerName() != null ? request.getFarmerName() : currentUser.getFullName())
                .productName(request.getProductName())
                .category(request.getCategory())
                .origin(request.getOrigin())
                .harvestDate(request.getHarvestDate())
                .grade(request.getGrade())
                .description(request.getDescription())
                .status(ProductStatus.REGISTERED)
                .build();

        product = productRepository.save(product);

        String signature = signatureService.createSignature(
                product.getId(),
                SignatureAction.REGISTERED,
                currentUser.getId(),
                product.getOrigin(),
                null
        );

        String txId = blockchainService.syncCreateProduct(
                product.getId().toString(),
                product.getId().toString(),
                product.getFarmerId().toString(),
                product.getFarmerName(),
                signature
        );

        if (txId != null) {
            product.setBlockchainTxId(txId);
        }

        product.setCurrentSignature(signature);
        product = productRepository.save(product);

        log.info("Product created successfully: {}", product.getId());
        return ProductResponse.fromEntity(product);
    }

    @Transactional
    public ProductResponse approveProduct(UUID productId, ApproveProductRequest request) {
        log.info("Approving product: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (product.getStatus() != ProductStatus.REGISTERED) {
            throw new BadRequestException("Product can only be approved from REGISTERED status");
        }

        User currentUser = securityUtils.getCurrentUser();

        // 1. Mark old signature (REGISTERED) as used — consumed by this approval
        String oldSignature = product.getCurrentSignature();
        if (oldSignature != null) {
            signatureService.markSignatureUsed(
                    oldSignature, productId, SignatureAction.REGISTERED,
                    product.getFarmerId(), product.getOrigin(), "GENESIS"
            );
        }

        // 2. Create new active signature (APPROVED) — NOT marked as used
        String prevHash = signatureService.getLastSignatureHash(productId);
        String signature = signatureService.createSignature(
                productId,
                SignatureAction.APPROVED,
                currentUser.getId(),
                request.getLocation(),
                prevHash
        );

        // 3. Sync blockchain
        String txId = blockchainService.syncApproveProduct(
                productId.toString(),
                currentUser.getId().toString(),
                currentUser.getFullName(),
                request.getLocation()
        );

        // 4. Update product state
        product.setStatus(ProductStatus.INSPECTED);
        product.setCurrentSignature(signature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), signature));
        
        if (request.getGrade() != null) {
            product.setGrade(request.getGrade());
        }
        if (request.getNotes() != null) {
            product.setDescription(request.getNotes());
        }

        if (txId != null) {
            product.setBlockchainTxId(txId);
        }

        product = productRepository.save(product);
        log.info("Product approved successfully: {}", productId);

        return ProductResponse.fromEntity(product);
    }

    public ProductResponse getProduct(UUID productId) {
        log.info("Getting product: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        ProductResponse response = ProductResponse.fromEntity(product);
        applyQrVisibilityForCurrentUser(Collections.singletonList(response));
        return response;
    }

    public ProductResponse getProductWithHistory(UUID productId) {
        log.info("Getting product with history: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        List<Map<String, Object>> historyData = blockchainService.getHistory(productId.toString());

        List<ProductResponse.ProductHistoryItem> history = historyData.stream()
                .map(item -> ProductResponse.ProductHistoryItem.builder()
                        .action((String) item.get("action"))
                        .actorId((String) item.get("ActorID"))
                        .actorName((String) item.get("actorName"))
                        .location((String) item.get("location"))
                        .timestamp((String) item.get("timestamp"))
                        .bcTxId((String) item.get("txId"))
                        .build())
                .collect(Collectors.toList());

        ProductResponse response = ProductResponse.fromEntityWithHistory(product, history);
        applyQrVisibilityForCurrentUser(Collections.singletonList(response));
        return response;
    }

    public List<ProductResponse.ProductHistoryItem> getProductHistory(UUID productId) {
        log.info("Getting product history: {}", productId);

        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }

        List<Map<String, Object>> historyData = blockchainService.getHistory(productId.toString());

        return historyData.stream()
                .map(item -> ProductResponse.ProductHistoryItem.builder()
                        .action((String) item.get("EventType"))
                        .actorId((String) item.get("ActorID"))
                        .actorName((String) item.get("ActorName"))
                        .location((String) item.get("Location"))
                        .timestamp((String) item.get("Timestamp"))
                        .bcTxId((String) item.get("TxID"))
                        .build())
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getProductEvents(UUID productId) {
        log.info("Getting product events: {}", productId);

        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }

        return blockchainService.getEvents(productId.toString());
    }

    public List<ProductResponse> getProductsByFarmer(UUID farmerId) {
        log.info("Getting products by farmer: {}", farmerId);

        List<Product> products = productRepository.findByFarmerId(farmerId);
        return products.stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public List<ProductResponse> getProductsByStatus(ProductStatus status) {
        log.info("Getting products by status: {}", status);

        List<Product> products = productRepository.findByStatus(status);
        return products.stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get products for RETAILER: approved products (INSPECTED) + products in their shipments
     */
    public List<ProductResponse> getRetailerProducts(UUID retailerId) {
        log.info("Getting products for retailer: {}", retailerId);

        // 1. Get INSPECTED products (available to order)
        List<Product> approvedProducts = productRepository.findByStatus(ProductStatus.INSPECTED);
        
        // 2. Get products in retailer's shipments (toUserId = retailer)
        List<Shipment> retailerShipments = shipmentRepository.findByToUserId(retailerId);
        Set<UUID> shipmentProductIds = retailerShipments.stream()
                .map(Shipment::getProductId)
                .collect(Collectors.toSet());
        
        // 3. Merge: add products from shipments (not already in INSPECTED list)
        Set<UUID> inspectedIds = approvedProducts.stream()
                .map(Product::getId)
                .collect(Collectors.toSet());
        
        // Only fetch products that are NOT already in the INSPECTED list
        List<UUID> shipmentOnlyIds = shipmentProductIds.stream()
                .filter(id -> !inspectedIds.contains(id))
                .collect(Collectors.toList());
        
        List<Product> allProducts = new ArrayList<>(approvedProducts);
        if (!shipmentOnlyIds.isEmpty()) {
            allProducts.addAll(productRepository.findByIdIn(shipmentOnlyIds));
        }
        
        // 4. Enrich with hasActiveShipment and apply QR visibility
        List<ProductResponse> responses = enrichWithActiveShipment(allProducts);
        applyQrVisibilityForCurrentUser(responses);
        return responses;
    }

    /**
     * Get products for DISTRIBUTOR: only products in shipments they've accepted
     */
    public List<ProductResponse> getDistributorProducts(UUID distributorId) {
        log.info("Getting products for distributor: {}", distributorId);

        // Get shipments where distributor accepted (ACCEPTED, IN_TRANSIT, DELIVERED)
        List<Shipment> distributorShipments = shipmentRepository.findByDistributorId(distributorId);
        
        if (distributorShipments.isEmpty()) {
            log.info("No shipments found for distributor: {}", distributorId);
            return Collections.emptyList();
        }
        
        // Get products from these shipments
        List<UUID> productIds = distributorShipments.stream()
                .map(Shipment::getProductId)
                .collect(Collectors.toList());
        
        List<Product> products = productRepository.findByIdIn(productIds);
        
        // Enrich with hasActiveShipment and apply QR visibility
        List<ProductResponse> responses = enrichWithActiveShipment(products);
        applyQrVisibilityForCurrentUser(responses);
        return responses;
    }

    /**
     * Get approved products (INSPECTED) — kept for backward compatibility
     */
    public List<ProductResponse> getApprovedProducts() {
        log.info("Getting approved products");
        
        List<Product> products = productRepository.findByStatus(ProductStatus.INSPECTED);
        List<ProductResponse> responses = enrichWithActiveShipment(products);
        applyQrVisibilityForCurrentUser(responses);
        return responses;
    }

    /**
     * Enrich products with hasActiveShipment flag and convert to response
     */
    private List<ProductResponse> enrichWithActiveShipment(List<Product> products) {
        if (products.isEmpty()) return Collections.emptyList();

        // Get all shipments for these products
        List<UUID> productIds = products.stream()
                .map(Product::getId)
                .collect(Collectors.toList());
        List<Shipment> shipments = shipmentRepository.findByProductIdIn(productIds);
        
        // Build map: productId -> has active (non-DELIVERED) shipment?
        Set<UUID> productsWithActiveShipment = shipments.stream()
                .filter(s -> s.getStatus() != ShipmentStatus.DELIVERED)
                .map(Shipment::getProductId)
                .collect(Collectors.toSet());

        return products.stream()
                .map(product -> {
                    ProductResponse response = ProductResponse.fromEntity(product);
                    response.setHasActiveShipment(productsWithActiveShipment.contains(product.getId()));
                    return response;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getAllProducts(int page, int size) {
        log.info("Getting all products - page: {}, size: {}", page, size);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> productPage = productRepository.findAll(pageable);

        List<ProductResponse> products = productPage.getContent().stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("products", products);
        result.put("page", productPage.getNumber());
        result.put("size", productPage.getSize());
        result.put("totalElements", productPage.getTotalElements());
        result.put("totalPages", productPage.getTotalPages());
        result.put("hasNext", productPage.hasNext());
        result.put("hasPrevious", productPage.hasPrevious());

        return result;
    }

    /**
     * Apply QR visibility rules based on current user's role and product status.
     * Clears qrCode and sets qrHiddenReason if the user is not authorized to view it.
     */
    private void applyQrVisibilityForCurrentUser(List<ProductResponse> responses) {
        User currentUser = securityUtils.getCurrentUser();
        if (currentUser == null) return;

        UserRole role = currentUser.getRole();

        for (ProductResponse response : responses) {
            String reason = null;

            if (role == UserRole.RETAILER && response.getStatus() != ProductStatus.DELIVERED) {
                reason = "QR sẽ hiển thị khi hàng đã giao đến bạn";
            } else if (role == UserRole.DISTRIBUTOR
                    && response.getStatus() != ProductStatus.INSPECTED
                    && response.getStatus() != ProductStatus.IN_TRANSIT) {
                reason = "QR chỉ hiển thị trong quá trình vận chuyển";
            }

            if (reason != null) {
                response.setQrCode(null);
                response.setQrHiddenReason(reason);
            }
        }
    }

    private String generateQrCodeUrl(String productId, String signature) {
        return String.format("%s|%s", productId, signature);
    }
}
