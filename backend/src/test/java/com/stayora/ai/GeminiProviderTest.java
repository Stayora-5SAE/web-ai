package com.stayora.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stayora.availability.HostSummaryAiSkill;
import com.stayora.listings.ListingAiSkill;
import com.stayora.messages.MessageDraftAiSkill;
import com.stayora.reservations.ReservationAiSkill;
import com.stayora.reviews.ReviewAiSkill;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class GeminiProviderTest {
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void missingAndPlaceholderKeysNeverMakeExternalRequests() {
    HttpClient client = mock(HttpClient.class);
    for (String key : List.of("", "REPLACE_WITH_YOUR_GEMINI_API_KEY")) {
      var result = provider(key, client).generate("Prompt", "La Marsa");
      assertThat(result.text()).isNull();
      assertThat(result.notice()).contains("AI_GEMENI_KEY", "offline");
    }
    verifyNoInteractions(client);
  }

  @Test
  @SuppressWarnings("unchecked")
  void everyBusinessSkillUsesNativeGeminiWithSanitizedFactsAndHeaderOnlyKey() throws Exception {
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(200);
    when(response.body())
        .thenReturn(
            """
        {"modelVersion":"gemini-3.5-flash-lite-001","candidates":[{"finishReason":"STOP","content":{"parts":[{"thought":true,"text":"Hidden reasoning"},{"text":"A thoughtful suggestion."},{"text":"Review it before use."}]}}]}
        """);
    var requests = new java.util.ArrayList<HttpRequest>();
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenAnswer(
            invocation -> {
              requests.add(invocation.getArgument(0));
              return response;
            });
    var skills =
        List.<AiSkill>of(
            new ListingAiSkill(),
            new ReservationAiSkill(),
            new HostSummaryAiSkill(),
            new ReviewAiSkill(),
            new MessageDraftAiSkill());
    var ai = new AiService(skills, provider("test-gemini-key", client), new AiPrivacy());
    for (var skill : skills) {
      var result =
          ai.assist(
              new AiService.AiRequest(
                  skill.id(),
                  "La Marsa, kitchen, guests=2, reviews count=3, rating average=4.5, private@example.invalid"));
      assertThat(result.mode()).isEqualTo("live");
      assertThat(result.model()).isEqualTo("gemini-3.5-flash-lite-001");
      assertThat(result.text()).isEqualTo("A thoughtful suggestion.\nReview it before use.");
      assertThat(result.notice()).contains("Google Gemini");
      HttpRequest request = requests.get(requests.size() - 1);
      assertThat(request.uri().toString())
          .isEqualTo(
              "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
      assertThat(request.uri().getQuery()).isNull();
      assertThat(request.headers().firstValue("x-goog-api-key")).contains("test-gemini-key");
      assertThat(request.headers().firstValue("Authorization")).isEmpty();
      var body = json.readTree(body(request));
      assertThat(body.path("systemInstruction").path("parts").get(0).path("text").asText())
          .startsWith(skill.systemPrompt());
      assertThat(body.path("contents").get(0).path("parts").get(0).path("text").asText())
          .contains("La Marsa", "guests=2")
          .doesNotContain("private@example.invalid");
      assertThat(body.path("generationConfig").path("maxOutputTokens").asInt()).isEqualTo(800);
      assertThat(body.has("models")).isFalse();
    }
    assertThat(requests).hasSize(5);
  }

  @Test
  @SuppressWarnings("unchecked")
  void statusErrorsAreActionableAndDoNotExposeProviderBodies() throws Exception {
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(response);
    when(response.body()).thenReturn("secret provider diagnostics and test-gemini-key");
    var provider = provider("test-gemini-key", client);
    for (var error :
        java.util.Map.of(
                400,
                "configuration",
                401,
                "API key",
                403,
                "permissions",
                404,
                "AI_MODEL",
                429,
                "quota or rate limit",
                503,
                "capacity")
            .entrySet()) {
      when(response.statusCode()).thenReturn(error.getKey());
      var result = provider.generate("Prompt", "La Marsa");
      assertThat(result.text()).isNull();
      assertThat(result.notice())
          .contains(error.getValue(), "offline")
          .doesNotContain("secret provider", "test-gemini-key");
    }
  }

  @Test
  @SuppressWarnings("unchecked")
  void blockedTruncatedEmptyMalformedAndEmbeddedErrorsStayOffline() throws Exception {
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(200);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(response);
    var provider = provider("test-gemini-key", client);
    for (String payload :
        List.of(
            "{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}",
            "{\"candidates\":[{\"finishReason\":\"SAFETY\",\"content\":{\"parts\":[{\"text\":\"blocked\"}]}}]}",
            "{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\",\"content\":{\"parts\":[{\"text\":\"partial\"}]}}]}",
            "{\"candidates\":[{\"content\":{\"parts\":[{\"thought\":true,\"text\":\"Reasoning only\"}]}}]}",
            "{\"error\":{\"code\":429,\"message\":\"private diagnostics\"}}",
            "{}",
            "null",
            "not json")) {
      when(response.body()).thenReturn(payload);
      var result = provider.generate("Prompt", "La Marsa");
      assertThat(result.text()).isNull();
      assertThat(result.notice()).contains("offline").doesNotContain("private diagnostics");
    }
  }

  @Test
  @SuppressWarnings("unchecked")
  void connectionAndTimeoutFailuresHaveDistinctNotices() throws Exception {
    HttpClient client = mock(HttpClient.class);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new IOException("test-gemini-key must never appear in notices"))
        .thenThrow(new HttpTimeoutException("Timed out"));
    var provider = provider("test-gemini-key", client);
    assertThat(provider.generate("Prompt", "La Marsa").notice())
        .contains("connection failed")
        .doesNotContain("test-gemini-key");
    assertThat(provider.generate("Prompt", "La Marsa").notice()).contains("timed out");
  }

  @Test
  void rejectsUntrustedGeminiEndpointsAndInvalidModelPathsWithoutSendingKeys() {
    HttpClient client = mock(HttpClient.class);
    var endpoint =
        new ConfiguredAiProvider(
            "gemini",
            "https://example.invalid/v1beta",
            "test-gemini-key",
            "gemini-3.5-flash-lite",
            30,
            json,
            client);
    assertThat(endpoint.generate("Prompt", "La Marsa").notice())
        .contains("configuration is invalid");
    var model =
        new ConfiguredAiProvider(
            "gemini",
            "https://generativelanguage.googleapis.com/v1beta",
            "test-gemini-key",
            "../other?key=secret",
            30,
            json,
            client);
    assertThat(model.generate("Prompt", "La Marsa").notice()).contains("model ID is invalid");
    verifyNoInteractions(client);
  }

  private ConfiguredAiProvider provider(String key, HttpClient client) {
    return new ConfiguredAiProvider(
        "gemini",
        "https://generativelanguage.googleapis.com/v1beta/",
        key,
        "models/gemini-3.5-flash-lite",
        30,
        json,
        client);
  }

  private String body(HttpRequest request) throws Exception {
    var text = new StringBuilder();
    var done = new CompletableFuture<String>();
    request
        .bodyPublisher()
        .orElseThrow()
        .subscribe(
            new Flow.Subscriber<ByteBuffer>() {
              public void onSubscribe(Flow.Subscription subscription) {
                subscription.request(Long.MAX_VALUE);
              }

              public void onNext(ByteBuffer bytes) {
                text.append(StandardCharsets.UTF_8.decode(bytes));
              }

              public void onError(Throwable error) {
                done.completeExceptionally(error);
              }

              public void onComplete() {
                done.complete(text.toString());
              }
            });
    return done.get(2, TimeUnit.SECONDS);
  }
}
