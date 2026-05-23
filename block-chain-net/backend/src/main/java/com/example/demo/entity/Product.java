package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "farmer_id")
    private UUID farmerId;

    @Column(name = "farmer_name", length = 200)
    private String farmerName;

    @Column(name = "product_name", length = 200)
    private String productName;

    @Column(length = 100)
    private String category;

    @Column(length = 255)
    private String origin;

    @Column(name = "harvest_date")
    private LocalDate harvestDate;

    @Column(length = 20)
    private String grade;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "qr_code", columnDefinition = "TEXT")
    private String qrCode;

    @Column(name = "current_signature", columnDefinition = "TEXT")
    private String currentSignature;

    @Column(name = "blockchain_tx_id", length = 100)
    private String blockchainTxId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ProductStatus status = ProductStatus.REGISTERED;

    @Column(name = "locked", nullable = false)
    @Builder.Default
    private boolean locked = false;

    @Column(name = "locked_reason")
    private String lockedReason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (status == null) status = ProductStatus.REGISTERED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
