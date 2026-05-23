package com.example.demo.dto.shipment;

import com.example.demo.entity.Shipment;
import com.example.demo.entity.ShipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShipmentResponse {
    private UUID id;
    private UUID productId;
    private String productName;
    private UUID fromUserId;
    private String fromUserName;
    private UUID toUserId;
    private String toUserName;
    private UUID distributorId;
    private String distributorName;
    private String fromLocation;
    private String toLocation;
    private ShipmentStatus status;
    private String transportType;
    private String vehiclePlate;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private String notes;
    private String qrCode;
    private String currentSignature;
    private String blockchainTxId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ShipmentResponse fromEntity(Shipment shipment) {
        return ShipmentResponse.builder()
                .id(shipment.getId())
                .productId(shipment.getProductId())
                .productName(shipment.getProductName())
                .fromUserId(shipment.getFromUserId())
                .fromUserName(shipment.getFromUserName())
                .toUserId(shipment.getToUserId())
                .toUserName(shipment.getToUserName())
                .distributorId(shipment.getDistributorId())
                .distributorName(shipment.getDistributorName())
                .fromLocation(shipment.getFromLocation())
                .toLocation(shipment.getToLocation())
                .status(shipment.getStatus())
                .transportType(shipment.getTransportType())
                .vehiclePlate(shipment.getVehiclePlate())
                .departureTime(shipment.getDepartureTime())
                .arrivalTime(shipment.getArrivalTime())
                .notes(shipment.getNotes())
                .qrCode(shipment.getQrCode())
                .currentSignature(shipment.getCurrentSignature())
                .blockchainTxId(shipment.getBlockchainTxId())
                .createdAt(shipment.getCreatedAt())
                .updatedAt(shipment.getUpdatedAt())
                .build();
    }
}
