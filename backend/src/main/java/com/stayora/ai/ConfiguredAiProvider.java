package com.stayora.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ConfiguredAiProvider implements AiProvider {
  private static final Logger log = LoggerFactory.getLogger(ConfiguredAiProvider.class);
  private static final String OFFLINE = " Showing the offline response.";
  private final String provider;
  private final String baseUrl;
  private final String key;
  private final String model;
  private final Duration timeout;
  private final HttpClient client;
  private final ObjectMapper json;

  @Autowired
  public ConfiguredAiProvider(
      @Value("${stayora.ai.provider:gemini}") String provider,
      @Value("${stayora.ai.base-url:https://generativelanguage.googleapis.com/v1beta}")
          String baseUrl,
      @Value("${stayora.ai.api-key:}") String key,
      @Value("${stayora.ai.model:gemini-3.5-flash-lite}") String model,
      @Value("${stayora.ai.timeout-seconds:30}") int seconds,
      ObjectMapper json,
      @Value("${stayora.ai.gemini-api-key:}") String geminiKey) {
    this(
        provider,
        baseUrl,
        provider.equals("gemini") ? geminiKey : key,
        model,
        seconds,
        json,
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(Math.max(1, Math.min(seconds, 30))))
            .build());
  }

  ConfiguredAiProvider(
      String provider,
      String baseUrl,
      String key,
      String model,
      int seconds,
      ObjectMapper json,
      HttpClient client) {
    this.provider = provider;
    this.baseUrl = baseUrl.replaceAll("/+$", "");
    this.key = key.trim();
    this.model = model.replaceFirst("^models/", "").trim();
    this.timeout = Duration.ofSeconds(Math.max(1, Math.min(seconds, 30)));
    this.client = client;
    this.json = json;
    if (!Set.of("mock", "gemini", "groq", "openai-compatible", "ollama").contains(provider))
      throw new IllegalStateException(
          "Unsupported AI_PROVIDER. Use gemini, mock, groq, openai-compatible, or ollama.");
  }

  @Override
  public ProviderResult generate(String systemPrompt, String safeContext) {
    if (provider.equals("mock"))
      return new ProviderResult(null, "Offline mode: deterministic response, no external request.");
    if (!provider.equals("ollama")
        && (key.isBlank() || key.equals("REPLACE_WITH_YOUR_GEMINI_API_KEY")))
      return failure(
          provider.equals("gemini")
              ? "No Google Gemini key is configured. Set AI_GEMENI_KEY on the backend."
              : "No AI key is configured.");
    try {
      boolean gemini = provider.equals("gemini");
      if (gemini && !model.matches("[A-Za-z0-9._-]+"))
        return failure("The Gemini model ID is invalid. Check AI_MODEL.");
      URI uri =
          URI.create(
              baseUrl + (gemini ? "/models/" + model + ":generateContent" : "/chat/completions"));
      boolean loopback = Set.of("localhost", "127.0.0.1", "::1", "[::1]").contains(uri.getHost());
      if (uri.getUserInfo() != null
          || uri.getRawQuery() != null
          || uri.getFragment() != null
          || !("https".equals(uri.getScheme())
              || provider.equals("ollama") && loopback && "http".equals(uri.getScheme()))
          || gemini && !"generativelanguage.googleapis.com".equals(uri.getHost()))
        return failure("The AI endpoint configuration is invalid.");
      String instructions =
          systemPrompt
              + " Use only the anonymous public facts supplied. Do not infer personal names, contact information, access codes, or legal guarantees. Return plain English text, not HTML. Keep the answer under 200 words. Recommendations require human review; never execute an action.";
      Map<String, Object> body =
          gemini
              ? Map.of(
                  "systemInstruction", Map.of("parts", List.of(Map.of("text", instructions))),
                  "contents",
                      List.of(
                          Map.of("role", "user", "parts", List.of(Map.of("text", safeContext)))),
                  "generationConfig", Map.of("temperature", 0.2, "maxOutputTokens", 800))
              : Map.of(
                  "model",
                  model,
                  "temperature",
                  0.2,
                  "max_tokens",
                  600,
                  "messages",
                  List.of(
                      Map.of("role", "system", "content", instructions),
                      Map.of("role", "user", "content", safeContext)));
      HttpRequest.Builder request =
          HttpRequest.newBuilder(uri)
              .timeout(timeout)
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
      if (!key.isBlank())
        request.header(gemini ? "x-goog-api-key" : "Authorization", gemini ? key : "Bearer " + key);
      HttpResponse<String> response =
          client.send(request.build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300)
        return httpFailure(response.statusCode());
      if (response.body() == null || response.body().length() > 32_000)
        return failure("The AI response was empty or too large.");
      JsonNode payload = json.readTree(response.body());
      if (payload == null || !payload.isObject())
        return failure("The AI provider returned an invalid response.");
      if (payload.has("error")) return httpFailure(payload.path("error").path("code").asInt(500));
      if (gemini) return geminiResult(payload);
      JsonNode content = payload.path("choices").path(0).path("message").path("content");
      if (!content.isTextual() || content.asText().isBlank())
        return failure("The AI model returned no text. Please try again.");
      return new ProviderResult(
          content.asText(),
          "Provider response: review before using it.",
          payload.path("model").asText(model));
    } catch (HttpTimeoutException e) {
      return failure("The AI provider timed out. Please retry when your connection is stable.");
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return failure("The AI request was interrupted.");
    } catch (JsonProcessingException e) {
      log.warn("AI response parsing failed ({})", e.getClass().getSimpleName());
      return failure("The AI provider returned malformed JSON. Please retry.");
    } catch (IOException e) {
      log.warn("AI connection failed ({})", e.getClass().getSimpleName());
      return failure(
          "The AI connection failed. Check your internet connection and DNS, then retry.");
    } catch (IllegalArgumentException e) {
      return failure("The AI endpoint or request configuration is invalid.");
    }
  }

  private ProviderResult geminiResult(JsonNode payload) {
    if (!payload.path("promptFeedback").path("blockReason").asText().isBlank())
      return failure("Google Gemini blocked this prompt. Rephrase it using public property facts.");
    JsonNode candidate = payload.path("candidates").path(0);
    String finish = candidate.path("finishReason").asText();
    if (finish.equals("MAX_TOKENS"))
      return failure("Google Gemini reached the response token limit. Try a shorter request.");
    if (!finish.isBlank() && !finish.equals("STOP"))
      return failure(
          "Google Gemini could not return a complete response. Rephrase the request and try again.");
    List<String> parts = new ArrayList<>();
    for (JsonNode part : candidate.path("content").path("parts")) {
      if (!part.path("thought").asBoolean(false) && part.path("text").isTextual())
        parts.add(part.path("text").asText());
    }
    String text = String.join("\n", parts).trim();
    if (text.isBlank()) return failure("Google Gemini returned no text. Please try again.");
    return new ProviderResult(
        text,
        "Google Gemini response: review before using it.",
        payload.path("modelVersion").asText(model));
  }

  private ProviderResult httpFailure(int status) {
    String name = provider.equals("gemini") ? "Google Gemini" : "The AI provider";
    return failure(
        switch (status) {
          case 400 -> name + " rejected the request. Check the API key and model configuration.";
          case 401, 403 ->
              name
                  + " rejected the API key or its permissions. Check the backend key and API access.";
          case 402 -> name + " has insufficient credits for this model.";
          case 404 -> name + " could not find the configured model. Check AI_MODEL.";
          case 429 ->
              name
                  + " quota or rate limit was reached. Wait before retrying or check the project's limits.";
          case 503 -> name + " is temporarily at capacity. Please retry later.";
          default -> name + " could not complete the request (HTTP " + status + ").";
        });
  }

  private ProviderResult failure(String notice) {
    return new ProviderResult(null, notice + OFFLINE);
  }
}
