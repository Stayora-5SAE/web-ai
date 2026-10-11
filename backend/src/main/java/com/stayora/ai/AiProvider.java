package com.stayora.ai;

public interface AiProvider {
  ProviderResult generate(String systemPrompt, String safeContext);

  record ProviderResult(String text, String notice) {}
}
