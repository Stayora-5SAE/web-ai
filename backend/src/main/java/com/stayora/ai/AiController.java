package com.stayora.ai;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {
  private final AiService ai;

  public AiController(AiService ai) {
    this.ai = ai;
  }

  @PostMapping("/assist")
  public AiService.AiResponse assist(@Valid @RequestBody AiService.AiRequest request) {
    return ai.assist(request);
  }
}
