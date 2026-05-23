package com.example.demo.dto.product;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiveProductRequest {

    @NotBlank(message = "Retailer ID is required")
    private String retailerId;

    @NotBlank(message = "Retailer name is required")
    private String retailerName;

    @NotBlank(message = "Location is required")
    private String location;
}
