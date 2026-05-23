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
public class ShipProductRequest {

    @NotBlank(message = "Distributor ID is required")
    private String distributorId;

    @NotBlank(message = "Distributor name is required")
    private String distributorName;

    @NotBlank(message = "Location is required")
    private String location;
}
