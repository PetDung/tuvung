package com.example.demo.dto.product;

import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {
    private UUID id;
    private UUID farmerId;
    private String farmerName;
    private String productName;
    private String category;
    private String origin;
    private LocalDate harvestDate;
    private String grade;
    private String description;
    private String qrCode;
    private String currentSignature;
    private String blockchainTxId;
    private ProductStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ProductHistoryItem> history;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductHistoryItem {
        private String action;
        private String actorId;
        private String actorName;
        private String location;
        private String timestamp;
        private String bcTxId;
    }

    public static ProductResponse fromEntity(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .farmerId(product.getFarmerId())
                .farmerName(product.getFarmerName())
                .productName(product.getProductName())
                .category(product.getCategory())
                .origin(product.getOrigin())
                .harvestDate(product.getHarvestDate())
                .grade(product.getGrade())
                .description(product.getDescription())
                .qrCode(product.getQrCode())
                .currentSignature(product.getCurrentSignature())
                .blockchainTxId(product.getBlockchainTxId())
                .status(product.getStatus())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    public static ProductResponse fromEntityWithHistory(Product product, List<ProductHistoryItem> history) {
        ProductResponse response = fromEntity(product);
        response.setHistory(history);
        return response;
    }
}
