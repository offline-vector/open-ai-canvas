package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRemoteOnlyImageGenerationRequestsURLAndKeepsReference(t *testing.T) {
	t.Setenv("CANVAS_GENERATED_MEDIA_MODE", "remote_only")
	t.Setenv("CANVAS_ALLOW_PRIVATE_UPSTREAMS", "true")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body["response_format"] != "url" {
			t.Fatalf("response_format = %#v, want url", body["response_format"])
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"url":"https://media.example/generated.png"}]}`))
	}))
	defer server.Close()

	result, err := runImageTask(context.Background(), canvasGenerationInput{
		Prompt: "test",
		Config: providerConfig{BaseURL: server.URL, APIKey: "test", Model: "gpt-image-2"},
	})
	if err != nil {
		t.Fatal(err)
	}
	images, _ := result["images"].([]map[string]string)
	if len(images) != 1 || images[0]["dataUrl"] != "https://media.example/generated.png" {
		t.Fatalf("images = %#v", result["images"])
	}
}

func TestRemoteOnlyPersistenceRejectsInlineMedia(t *testing.T) {
	t.Setenv("CANVAS_GENERATED_MEDIA_MODE", "remote_only")
	svc := &Service{}
	_, err := svc.persistGeneratedMediaResult("user-1", map[string]interface{}{
		"mode":   "image",
		"images": []map[string]interface{}{{"dataUrl": "data:image/png;base64,aGVsbG8="}},
	})
	if err == nil || !strings.Contains(err.Error(), "不接收或存储") {
		t.Fatalf("persistGeneratedMediaResult() error = %v", err)
	}
}

func TestRemoteOnlyPersistenceDoesNotCreateResourceReference(t *testing.T) {
	t.Setenv("CANVAS_GENERATED_MEDIA_MODE", "remote_only")
	svc := &Service{}
	result, err := svc.persistGeneratedMediaResult("user-1", map[string]interface{}{
		"mode":  "video",
		"video": map[string]interface{}{"dataUrl": "https://media.example/generated.mp4", "mimeType": "video/mp4"},
	})
	if err != nil {
		t.Fatal(err)
	}
	video, _ := result["video"].(map[string]interface{})
	if video["dataUrl"] != "https://media.example/generated.mp4" || video["storageKey"] != nil || video["resourceId"] != nil {
		t.Fatalf("video = %#v", video)
	}
}

func TestRemoteOnlyGeneratedMediaRejectsHTTPURL(t *testing.T) {
	t.Setenv("CANVAS_GENERATED_MEDIA_MODE", "remote_only")
	if _, err := remoteGeneratedMediaResult("video", "http://media.example/generated.mp4", "video/mp4"); err == nil || !strings.Contains(err.Error(), "HTTPS URL") {
		t.Fatalf("remoteGeneratedMediaResult() error = %v", err)
	}

	svc := &Service{}
	_, err := svc.persistGeneratedMediaResult("user-1", map[string]interface{}{
		"mode":  "audio",
		"audio": map[string]interface{}{"dataUrl": "http://media.example/generated.mp3"},
	})
	if err == nil || !strings.Contains(err.Error(), "HTTPS") {
		t.Fatalf("persistGeneratedMediaResult() error = %v", err)
	}
}
