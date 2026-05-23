package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.trace.TraceResponse;
import com.example.demo.service.TraceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/trace")
@RequiredArgsConstructor
@Slf4j
public class TraceController {

    private final TraceService traceService;

    @GetMapping("/{productId}")
    public ResponseEntity<ApiResponse<TraceResponse>> traceProduct(@PathVariable UUID productId) {
        log.info("Trace product request received: {}", productId);
        TraceResponse trace = traceService.traceProduct(productId);
        return ResponseEntity.ok(ApiResponse.success(trace));
    }
}
