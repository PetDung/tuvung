package com.example.demo.service;

import com.example.demo.dto.product.*;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import com.example.demo.entity.SignatureAction;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.ProductRepository;
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
    private final GatewayService gatewayService;
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

        Map<String, Object> gatewayResponse = gatewayService.createProduct(
                product.getId().toString(),
                product.getId().toString(),
                product.getFarmerId().toString(),
                product.getFarmerName(),
                signature
        );

        if (gatewayResponse != null && gatewayResponse.containsKey("txId")) {
            product.setBlockchainTxId(gatewayResponse.get("txId").toString());
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

        // Get inspector from current user
        User currentUser = securityUtils.getCurrentUser();

        String prevHash = signatureService.getLastSignatureHash(productId);
        String signature = signatureService.createSignature(
                productId,
                SignatureAction.APPROVED,
                currentUser.getId(),
                request.getLocation(),
                prevHash
        );

        Map<String, Object> gatewayResponse = gatewayService.approveProduct(
                productId.toString(),
                currentUser.getId().toString(),
                currentUser.getFullName(),
                request.getLocation()
        );

        signatureService.markSignatureUsed(
                signature, productId, SignatureAction.APPROVED,
                currentUser.getId(),
                request.getLocation(),
                prevHash
        );

        product.setStatus(ProductStatus.INSPECTED);
        product.setCurrentSignature(signature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), signature));
        
        if (request.getGrade() != null) {
            product.setGrade(request.getGrade());
        }
        if (request.getNotes() != null) {
            product.setDescription(request.getNotes());
        }

        if (gatewayResponse != null && gatewayResponse.containsKey("txId")) {
            product.setBlockchainTxId(gatewayResponse.get("txId").toString());
        }

        product = productRepository.save(product);
        log.info("Product approved successfully: {}", productId);

        return ProductResponse.fromEntity(product);
    }

    @Transactional
    public ProductResponse shipProduct(UUID productId, ShipProductRequest request) {
        log.info("Shipping product: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (product.getStatus() != ProductStatus.INSPECTED) {
            throw new BadRequestException("Product can only be shipped from INSPECTED status");
        }

        String prevHash = signatureService.getLastSignatureHash(productId);
        String signature = signatureService.createSignature(
                productId,
                SignatureAction.SHIPPED,
                UUID.fromString(request.getDistributorId()),
                request.getLocation(),
                prevHash
        );

        Map<String, Object> gatewayResponse = gatewayService.shipProduct(
                productId.toString(),
                request.getDistributorId(),
                request.getDistributorName(),
                request.getLocation()
        );

        signatureService.markSignatureUsed(
                signature, productId, SignatureAction.SHIPPED,
                UUID.fromString(request.getDistributorId()),
                request.getLocation(),
                prevHash
        );

        product.setStatus(ProductStatus.IN_TRANSIT);
        product.setCurrentSignature(signature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), signature));

        if (gatewayResponse != null && gatewayResponse.containsKey("txId")) {
            product.setBlockchainTxId(gatewayResponse.get("txId").toString());
        }

        product = productRepository.save(product);
        log.info("Product shipped successfully: {}", productId);

        return ProductResponse.fromEntity(product);
    }

    @Transactional
    public ProductResponse receiveProduct(UUID productId, ReceiveProductRequest request) {
        log.info("Receiving product: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (product.getStatus() != ProductStatus.IN_TRANSIT) {
            throw new BadRequestException("Product can only be received from IN_TRANSIT status");
        }

        String prevHash = signatureService.getLastSignatureHash(productId);
        String signature = signatureService.createSignature(
                productId,
                SignatureAction.DELIVERED,
                UUID.fromString(request.getRetailerId()),
                request.getLocation(),
                prevHash
        );

        Map<String, Object> gatewayResponse = gatewayService.receiveProduct(
                productId.toString(),
                request.getRetailerId(),
                request.getRetailerName(),
                request.getLocation()
        );

        signatureService.markSignatureUsed(
                signature, productId, SignatureAction.DELIVERED,
                UUID.fromString(request.getRetailerId()),
                request.getLocation(),
                prevHash
        );

        product.setStatus(ProductStatus.DELIVERED);
        product.setCurrentSignature(signature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), signature));

        if (gatewayResponse != null && gatewayResponse.containsKey("txId")) {
            product.setBlockchainTxId(gatewayResponse.get("txId").toString());
        }

        product = productRepository.save(product);
        log.info("Product received successfully: {}", productId);

        return ProductResponse.fromEntity(product);
    }

    @Transactional
    public ProductResponse updateProductStatus(UUID productId, UpdateProductStatusRequest request) {
        log.info("Updating product status: {} to {}", productId, request.getStatus());

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        String prevHash = signatureService.getLastSignatureHash(productId);
        String signature = signatureService.createSignature(
                productId,
                SignatureAction.SOLD,
                UUID.fromString(request.getActorId()),
                "Sale",
                prevHash
        );

        Map<String, Object> gatewayResponse = gatewayService.updateProductStatus(
                productId.toString(),
                request.getStatus().name(),
                request.getActorId(),
                request.getActorName()
        );

        signatureService.markSignatureUsed(
                signature, productId, SignatureAction.SOLD,
                UUID.fromString(request.getActorId()),
                "Sale",
                prevHash
        );

        product.setStatus(request.getStatus());
        product.setCurrentSignature(signature);
        product.setQrCode(generateQrCodeUrl(productId.toString(), signature));

        if (gatewayResponse != null && gatewayResponse.containsKey("txId")) {
            product.setBlockchainTxId(gatewayResponse.get("txId").toString());
        }

        product = productRepository.save(product);
        log.info("Product status updated successfully: {}", productId);

        return ProductResponse.fromEntity(product);
    }

    public ProductResponse getProduct(UUID productId) {
        log.info("Getting product: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        return ProductResponse.fromEntity(product);
    }

    public ProductResponse getProductWithHistory(UUID productId) {
        log.info("Getting product with history: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        List<Map<String, Object>> historyData = gatewayService.getProductHistory(productId.toString());

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

        return ProductResponse.fromEntityWithHistory(product, history);
    }

    public List<ProductResponse.ProductHistoryItem> getProductHistory(UUID productId) {
        log.info("Getting product history: {}", productId);

        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }

        List<Map<String, Object>> historyData = gatewayService.getProductHistory(productId.toString());

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

        return gatewayService.getProductEvents(productId.toString());
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

    public List<ProductResponse> getApprovedProducts() {
        log.info("Getting approved products for retailer");
        
        List<Product> products = productRepository.findByStatus(ProductStatus.INSPECTED);
        return products.stream()
                .map(ProductResponse::fromEntity)
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

    private String generateQrCodeUrl(String productId, String signature) {
        return String.format("%s|%s", productId, signature);
    }
}
