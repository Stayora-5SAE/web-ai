package com.stayora.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ConfiguredAiProvider implements AiProvider {
  static final String DEFAULT_FALLBACK_MODELS =
      "google/gemma-4-31b-it:free,cohere/north-mini-code:free";
  private final String provider;
  private final String baseUrl;
  private final String key;
  private final String model;
  private final String fallbackModels;
  private final Duration timeout;
  private final HttpClient client;
  private final ObjectMapper json;

  @Autowired
  public ConfiguredAiProvider(
      @Value("${stayora.ai.provider:openrouter}") String provider,
      @Value("${stayora.ai.base-url:https://openrouter.ai/api/v1}") String baseUrl,
      @Value("${stayora.ai.api-key:}") String key,
      @Value("${stayora.ai.model:google/gemma-4-26b-a4b-it:free}") String model,
      @Value("${stayora.ai.timeout-seconds:30}") int seconds,
      ObjectMapper json,
      @Value("${stayora.ai.fallback-models:" + DEFAULT_FALLBACK_MODELS + "}")
          String fallbackModels) {
    this(
        provider,
        baseUrl,
        key,
        model,
        seconds,
        json,
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(Math.max(1, Math.min(seconds, 30))))
            .build(),
        fallbackModels);
  }

  ConfiguredAiProvider(
      String provider,
      String baseUrl,
      String key,
      String model,
      int seconds,
      ObjectMapper json,
      HttpClient client) {
    this(provider, baseUrl, key, model, seconds, json, client, DEFAULT_FALLBACK_MODELS);
  }

  ConfiguredAiProvider(
      String provider,
      String baseUrl,
      String key,
      String model,
      int seconds,
      ObjectMapper json,
      HttpClient client,
      String fallbackModels) {
    this.provider = provider;
    this.baseUrl = baseUrl.replaceAll("/+$", "");
    this.key = key.trim();
    this.model = model;
    this.fallbackModels = fallbackModels;
    this.timeout = Duration.ofSeconds(Math.max(1, Math.min(seconds, 30)));
    this.client = client;
    this.json = json;
    if (!Set.of("mock", "openrouter", "groq", "openai-compatible", "ollama").contains(provider))
      throw new IllegalStateException(
          "Unsupported AI_PROVIDER. Use openrouter, mock, groq, openai-compatible, or ollama.");
  }

  @Override
  public ProviderResult generate(String systemPrompt, String safeContext) {
    if (provider.equals("mock"))
      return new ProviderResult(null, "Offline mode: deterministic response, no external request.");
    if (!provider.equals("ollama")
        && (key.isBlank() || key.equals("REPLACE_WITH_YOUR_OPENROUTER_API_KEY")))
      return new ProviderResult(
          null,
          provider.equals("openrouter")
              ? "No OpenRouter API key is configured yet. Showing the offline response until AI is connected."
              : "No AI key is configured. Showing the offline response.");
    try {
      URI uri = URI.create(baseUrl + "/chat/completions");
      boolean loopback = Set.of("localhost", "127.0.0.1", "::1", "[::1]").contains(uri.getHost());
      if (uri.getUserInfo() != null
          || !("https".equals(uri.getScheme())
              || provider.equals("ollama") && loopback && "http".equals(uri.getScheme())))
        return new ProviderResult(
            null, "The AI endpoint configuration is invalid. Showing the offline response.");
      Map<String, Object> body =
          new LinkedHashMap<>(
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
                      Map.of("role", "user", "content", safeContext))));
      if (provider.equals("openrouter")) {
        // OpenRouter tries these in order within this single, time-bounded request.
        var models = new LinkedHashSet<String>();
        models.add(model.trim());
        Arrays.stream(fallbackModels.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .forEach(models::add);
        body.remove("model");
        body.put("models", models.stream().limit(3).toList());
        body.put("reasoning", Map.of("enabled", false));
      }
      HttpRequest.Builder request =
          HttpRequest.newBuilder(uri)
              .timeout(timeout)
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
      if (!key.isBlank()) request.header("Authorization", "Bearer " + key);
      if (provider.equals("openrouter")) request.header("X-OpenRouter-Title", "Stayora");
      HttpResponse<String> response =
          client.send(request.build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() == 429)
        return new ProviderResult(
            null,
            provider.equals("openrouter")
                ? "All configured AI models are rate-limited. Showing the offline response."
                : "The AI provider quota is unavailable. Showing the offline response.");
      if (response.statusCode() == 401)
        return new ProviderResult(
            null, "The AI provider rejected the configured API key. Showing the offline response.");
      if (response.statusCode() == 402)
        return new ProviderResult(
            null,
            "The AI provider has insufficient credits for this model. Showing the offline response.");
      if (response.statusCode() < 200 || response.statusCode() >= 300)
        return new ProviderResult(
            null, "The AI provider could not complete the request. Showing the offline response.");
      if (response.body().length() > 32_000)
        return new ProviderResult(
            null, "The AI response was too large. Showing the offline response.");
      JsonNode payload = json.readTree(response.body());
      if (provider.equals("openrouter") && payload.path("error").path("code").asInt() == 429)
        return new ProviderResult(
            null, "All configured AI models are rate-limited. Showing the offline response.");
      if (payload.has("error"))
        return new ProviderResult(
            null, "The AI provider could not generate a response. Showing the offline response.");
      JsonNode content = payload.path("choices").path(0).path("message").path("content");
      if (!content.isTextual() || content.asText().isBlank())
        return new ProviderResult(
            null, "The AI model returned no text. Please try again. Showing the offline response.");
      String usedModel = payload.path("model").asText(model);
      boolean backup =
          !usedModel.replaceFirst(":free$", "").equals(model.replaceFirst(":free$", ""));
      return new ProviderResult(
          content.asText(),
          provider.equals("openrouter")
              ? (backup
                  ? "OpenRouter backup model response: review before using it."
                  : "OpenRouter model response: review before using it.")
              : "Provider response: review before using it.",
          usedModel);
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
