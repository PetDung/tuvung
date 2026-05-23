package com.example.demo.dto.scan;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanResponse {
    private boolean success;
    private String message;
    private String qrUrl;
    private String signature;
    private String shipmentId;
    private String productId;
    private Object shipment;
    private Object product;
}
