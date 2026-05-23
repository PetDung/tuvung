package com.example.demo.service;

import com.example.demo.dto.trace.TraceResponse;
import com.example.demo.entity.Product;
import com.example.demo.entity.UsedSignature;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UsedSignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TraceService {

    private final ProductRepository productRepository;
    private final UsedSignatureRepository signatureRepository;
    private final GatewayService gatewayService;

    public TraceResponse traceProduct(UUID productId) {
        log.info("Tracing product: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        List<UsedSignature> signatures = signatureRepository.findByProductIdOrderByUsedAtDesc(productId);

        List<TraceResponse.TraceEvent> events = signatures.stream()
                .map(sig -> TraceResponse.TraceEvent.builder()
                        .action(sig.getAction().name())
                        .actorId(sig.getActorId() != null ? sig.getActorId().toString() : null)
                        .location(sig.getLocation())
                        .timestamp(sig.getUsedAt() != null ? sig.getUsedAt().toString() : null)
                        .signature(sig.getSignature())
                        .build())
                .collect(Collectors.toList());

        if (events.isEmpty()) {
            List<java.util.Map<String, Object>> bcEvents = gatewayService.getProductHistory(productId.toString());
            events = bcEvents.stream()
                    .map(item -> TraceResponse.TraceEvent.builder()
                            .action((String) item.get("EventType"))
                            .actorId((String) item.get("ActorID"))
                            .actorName((String) item.get("ActorName"))
                            .location((String) item.get("Location"))
                            .timestamp((String) item.get("Timestamp"))
                            .bcTxId((String) item.get("TxID"))
                            .build())
                    .collect(Collectors.toList());
        }

        return TraceResponse.builder()
                .productId(product.getId().toString())
                .farmerName(product.getFarmerName())
                .status(product.getStatus().name())
                .currentQrCode(product.getQrCode())
                .events(events)
                .build();
    }
}
