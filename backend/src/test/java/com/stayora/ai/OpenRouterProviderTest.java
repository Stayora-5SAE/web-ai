package com.stayora.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stayora.availability.HostSummaryAiSkill;
import com.stayora.listings.ListingAiSkill;
import com.stayora.messages.MessageDraftAiSkill;
import com.stayora.reservations.ReservationAiSkill;
import com.stayora.reviews.ReviewAiSkill;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class OpenRouterProviderTest {
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void missingAndPlaceholderKeysNeverMakeExternalRequests() {
    HttpClient client = mock(HttpClient.class);
    for (String key : List.of("", "REPLACE_WITH_YOUR_OPENROUTER_API_KEY")) {
      var provider = provider(key, client);
      var result = provider.generate("System prompt", "La Marsa");
      assertThat(result.text()).isNull();
      assertThat(result.notice()).contains("OpenRouter API key", "offline");
    }
    verifyNoInteractions(client);
  }

  @Test
  @SuppressWarnings("unchecked")
  void everyBusinessSkillUsesOpenRouterWithItsOwnPromptAndSanitizedFacts() throws Exception {
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(200);
    when(response.body())
        .thenReturn(
            "{\"choices\":[{\"message\":{\"content\":\"A thoughtful suggestion based on the supplied stay facts.\"}}]}");
    var skills =
        List.<AiSkill>of(
            new ListingAiSkill(),
            new ReservationAiSkill(),
            new HostSummaryAiSkill(),
            new ReviewAiSkill(),
            new MessageDraftAiSkill());
    var requests = new java.util.ArrayList<HttpRequest>();
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenAnswer(
            invocation -> {
              requests.add(invocation.getArgument(0));
              return response;
            });
    var ai = new AiService(skills, provider("test-openrouter-key", client), new AiPrivacy());
    for (var skill : skills) {
      var result =
          ai.assist(
              new AiService.AiRequest(
                  skill.id(),
                  "La Marsa, kitchen, guests=2, reviews count=3, rating average=4.5, private@example.invalid"));
      assertThat(result.mode()).isEqualTo("live");
      assertThat(result.skill()).isEqualTo(skill.id());
      assertThat(result.notice()).contains("OpenRouter");
      HttpRequest request = requests.get(requests.size() - 1);
      assertThat(request.uri().toString())
          .isEqualTo("https://openrouter.ai/api/v1/chat/completions");
      assertThat(request.method()).isEqualTo("POST");
      assertThat(request.headers().firstValue("Authorization"))
          .contains("Bearer test-openrouter-key");
      assertThat(request.headers().firstValue("X-OpenRouter-Title")).contains("Stayora");
      var body = json.readTree(body(request));
      assertThat(body.has("model")).isFalse();
      assertThat(json.convertValue(body.path("models"), List.class))
          .containsExactly(
              "google/gemma-4-26b-a4b-it:free",
              "google/gemma-4-31b-it:free",
              "cohere/north-mini-code:free");
      assertThat(body.path("messages").get(0).path("content").asText())
          .startsWith(skill.systemPrompt());
      assertThat(body.path("messages").get(1).path("content").asText())
          .contains("La Marsa", "kitchen", "guests=2")
          .doesNotContain("private@example.invalid");
    }
    assertThat(requests).hasSize(5);
  }

  @Test
  @SuppressWarnings("unchecked")
  void invalidKeyCreditsAndErrorEnvelopesAreActionableAndNeverExposeProviderPayloads()
      throws Exception {
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenAnswer(invocation -> response);
    var provider = provider("test-openrouter-key", client);
    when(response.statusCode()).thenReturn(401);
    assertThat(provider.generate("Prompt", "La Marsa").notice()).contains("rejected", "API key");
    when(response.statusCode()).thenReturn(402);
    assertThat(provider.generate("Prompt", "La Marsa").notice()).contains("credits", "model");
    when(response.statusCode()).thenReturn(200);
    when(response.body()).thenReturn("{\"error\":{\"message\":\"private provider diagnostics\"}}");
    var result = provider.generate("Prompt", "La Marsa");
    assertThat(result.text()).isNull();
    assertThat(result.notice()).contains("offline").doesNotContain("private provider diagnostics");
    when(response.body())
        .thenReturn(
            "{\"choices\":[{\"message\":{\"content\":\"\"},\"finish_reason\":\"length\"}]}");
    assertThat(provider.generate("Prompt", "La Marsa").notice())
        .contains("no text", "try again", "offline");
  }

  private ConfiguredAiProvider provider(String key, HttpClient client) {
    return new ConfiguredAiProvider(
        "openrouter",
        "https://openrouter.ai/api/v1/",
        key,
        "google/gemma-4-26b-a4b-it:free",
        30,
        json,
        client);
  }

  @Test
  @SuppressWarnings("unchecked")
  void backupModelSelectedByOrderedRoutingIsReturnedAsLiveWithActualModel() throws Exception {
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(200);
    when(response.body())
        .thenReturn(
            "{\"model\":\"cohere/north-mini-code:free\",\"choices\":[{\"message\":{\"content\":\"Guests gave this stay a positive rating.\"}}]}");
    var captured = new java.util.ArrayList<HttpRequest>();
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenAnswer(
            invocation -> {
              captured.add(invocation.getArgument(0));
              return response;
            });
    var ai =
        new AiService(
            List.of(new ReviewAiSkill()), provider("test-openrouter-key", client), new AiPrivacy());
    var result =
        ai.assist(new AiService.AiRequest("review-summary", "reviews count=2; rating average=4.5"));
    assertThat(result.mode()).isEqualTo("live");
    assertThat(result.model()).isEqualTo("cohere/north-mini-code:free");
    assertThat(result.notice()).contains("backup model");
    var body = json.readTree(body(captured.get(0)));
    assertThat(json.convertValue(body.path("models"), List.class))
        .containsExactly(
            "google/gemma-4-26b-a4b-it:free",
            "google/gemma-4-31b-it:free",
            "cohere/north-mini-code:free");
    assertThat(body.path("reasoning").path("enabled").asBoolean()).isFalse();
    verify(client, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
  }

  @Test
  @SuppressWarnings("unchecked")
  void exhaustedModelChainRemainsOfflineForHttpAndEmbeddedRateLimitErrors() throws Exception {
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenAnswer(invocation -> response);
    when(response.body())
        .thenReturn("{\"error\":{\"code\":429,\"message\":\"provider diagnostics\"}}");
    var ai =
        new AiService(
            List.of(new ReviewAiSkill()), provider("test-openrouter-key", client), new AiPrivacy());
    for (int status : List.of(429, 200)) {
      when(response.statusCode()).thenReturn(status);
      var result =
          ai.assist(
              new AiService.AiRequest("review-summary", "reviews count=2; rating average=4.5"));
      assertThat(result.mode()).isEqualTo("mock");
      assertThat(result.model()).isNull();
      assertThat(result.notice())
          .contains("All configured AI models are rate-limited")
          .doesNotContain("provider diagnostics");
    }
    verify(client, times(2)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
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
