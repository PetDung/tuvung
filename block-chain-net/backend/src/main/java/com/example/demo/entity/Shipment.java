package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shipments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_name", length = 200)
    private String productName;

    @Column(name = "from_user_id", nullable = false)
    private UUID fromUserId;

    @Column(name = "from_user_name", length = 200)
    private String fromUserName;

    @Column(name = "to_user_id", nullable = false)
    private UUID toUserId;

    @Column(name = "to_user_name", length = 200)
    private String toUserName;

    // Distributor - người vận chuyển
    @Column(name = "distributor_id")
    private UUID distributorId;

    @Column(name = "distributor_name", length = 200)
    private String distributorName;

    @Column(length = 255)
    private String fromLocation;

    @Column(length = 255)
    private String toLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ShipmentStatus status = ShipmentStatus.PENDING;

    @Column(length = 50)
    private String transportType;

    @Column(length = 20)
    private String vehiclePlate;

    @Column(name = "departure_time")
    private LocalDateTime departureTime;

    @Column(name = "arrival_time")
    private LocalDateTime arrivalTime;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "qr_code", columnDefinition = "TEXT")
    private String qrCode;

    @Column(name = "current_signature", columnDefinition = "TEXT")
    private String currentSignature;

    @Column(name = "blockchain_tx_id", length = 100)
    private String blockchainTxId;

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
        if (status == null) status = ShipmentStatus.PENDING;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
