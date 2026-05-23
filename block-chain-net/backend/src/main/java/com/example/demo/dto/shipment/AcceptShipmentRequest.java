package com.example.demo.dto.shipment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcceptShipmentRequest {

    private String transportType;

    private String vehiclePlate;
}
