package com.stayora.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ConfiguredAiProvider implements AiProvider {
  private final String provider;
  private final String baseUrl;
  private final String key;
  private final String model;
  private final Duration timeout;
  private final HttpClient client;
  private final ObjectMapper json;

  public ConfiguredAiProvider(
      @Value("${stayora.ai.provider:mock}") String provider,
      @Value("${stayora.ai.base-url:https://api.groq.com/openai/v1}") String baseUrl,
      @Value("${stayora.ai.api-key:}") String key,
      @Value("${stayora.ai.model:llama-3.3-70b-versatile}") String model,
      @Value("${stayora.ai.timeout-seconds:12}") int seconds,
      ObjectMapper json) {
    this.provider = provider;
    this.baseUrl = baseUrl.replaceAll("/+$", "");
    this.key = key;
    this.model = model;
    this.timeout = Duration.ofSeconds(Math.max(1, Math.min(seconds, 30)));
    this.client = HttpClient.newBuilder().connectTimeout(timeout).build();
    this.json = json;
    if (!Set.of("mock", "groq", "openai-compatible", "ollama").contains(provider))
      throw new IllegalStateException(
          "Unsupported AI_PROVIDER. Use mock, groq, openai-compatible, or ollama.");
  }

  @Override
  public ProviderResult generate(String systemPrompt, String safeContext) {
    if (provider.equals("mock"))
      return new ProviderResult(null, "Offline mode: deterministic response, no external request.");
    if (!provider.equals("ollama") && key.isBlank())
      return new ProviderResult(null, "No AI key is configured. Showing the offline response.");
    try {
      URI uri = URI.create(baseUrl + "/chat/completions");
      boolean loopback = Set.of("localhost", "127.0.0.1", "::1", "[::1]").contains(uri.getHost());
      if (uri.getUserInfo() != null
          || !("https".equals(uri.getScheme())
              || provider.equals("ollama") && loopback && "http".equals(uri.getScheme())))
        return new ProviderResult(
            null, "The AI endpoint configuration is invalid. Showing the offline response.");
      Map<String, Object> body =
          Map.of(
              "model",
              model,
              "temperature",
              0.2,
              "max_tokens",
              600,
              "messages",
              List.of(
                  Map.of(
                      "role",
                      "system",
                      "content",
                      systemPrompt
                          + " Use only the anonymous public facts supplied. Do not infer personal names, contact information, access codes, or legal guarantees. Return plain English text, not HTML. Recommendations require human review; never execute an action."),
                  Map.of("role", "user", "content", safeContext)));
      HttpRequest.Builder request =
          HttpRequest.newBuilder(uri)
              .timeout(timeout)
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
      if (!key.isBlank()) request.header("Authorization", "Bearer " + key);
      HttpResponse<String> response =
          client.send(request.build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() == 429)
        return new ProviderResult(
            null, "The AI provider quota is unavailable. Showing the offline response.");
      if (response.statusCode() < 200 || response.statusCode() >= 300)
        return new ProviderResult(
            null, "The AI provider could not complete the request. Showing the offline response.");
      if (response.body().length() > 32_000)
        return new ProviderResult(
            null, "The AI response was too large. Showing the offline response.");
      JsonNode content =
          json.readTree(response.body()).path("choices").path(0).path("message").path("content");
      return new ProviderResult(
          content.isTextual() ? content.asText() : null,
          "Provider response: review before using it.");
    } catch (HttpTimeoutException e) {
      return new ProviderResult(null, "The AI provider timed out. Showing the offline response.");
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return new ProviderResult(
          null, "The AI request was interrupted. Showing the offline response.");
    } catch (Exception e) {
      return new ProviderResult(
          null, "The AI provider is unavailable. Showing the offline response.");
    }
  }
}
