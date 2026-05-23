package com.example.demo.dto.scan;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanDeliveredRequest {

    @NotBlank(message = "Product ID is required")
    private String productId;

    @NotBlank(message = "Signature is required")
    private String signature;

    private String arrivalLocation;
}
