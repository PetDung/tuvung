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
public class ApproveProductRequest {

    @NotBlank(message = "Location is required")
    private String location;

    private String grade;
    private String notes;
}
