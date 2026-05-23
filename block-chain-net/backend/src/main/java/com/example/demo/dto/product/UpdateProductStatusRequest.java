package com.example.demo.dto.product;

import com.example.demo.entity.ProductStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProductStatusRequest {

    @NotBlank(message = "New status is required")
    private ProductStatus status;

    private String actorId;

    private String actorName;
}
