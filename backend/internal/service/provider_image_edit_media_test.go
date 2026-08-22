package service

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRemoteOnlyMaskedEditNormalizesJPEGSourceAndAlphaMaskToPNG(t *testing.T) {
	source := image.NewRGBA(image.Rect(0, 0, 4, 3))
	for y := 0; y < 3; y++ {
		for x := 0; x < 4; x++ {
			source.Set(x, y, color.RGBA{R: 220, G: 80, B: 30, A: 255})
		}
	}
	var sourceBytes bytes.Buffer
	if err := jpeg.Encode(&sourceBytes, source, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}

	mask := image.NewNRGBA(image.Rect(0, 0, 4, 3))
	for y := 0; y < 3; y++ {
		for x := 0; x < 4; x++ {
			alpha := uint8(255)
			if x < 2 {
				alpha = 0
			}
			mask.SetNRGBA(x, y, color.NRGBA{R: 255, G: 255, B: 255, A: alpha})
		}
	}
	var maskBytes bytes.Buffer
	if err := png.Encode(&maskBytes, mask); err != nil {
		t.Fatal(err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	err := writeRemoteOnlyImageEditParts(context.Background(), providerConfig{}, writer,
		[]providerMedia{{ID: "source", Type: "image/jpeg", DataURL: dataURL("image/jpeg", sourceBytes.Bytes())}},
		&providerMedia{ID: "mask", Type: "image/png", DataURL: dataURL("image/png", maskBytes.Bytes())},
	)
	if err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	request := httptest.NewRequest(http.MethodPost, "http://example.test", bytes.NewReader(body.Bytes()))
	request.Header.Set("Content-Type", writer.FormDataContentType())
	if err := request.ParseMultipartForm(1 << 20); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"image", "mask"} {
		files := request.MultipartForm.File[field]
		if len(files) != 1 {
			t.Fatalf("%s files = %d, want 1", field, len(files))
		}
		if got := files[0].Header.Get("Content-Type"); got != "image/png" {
			t.Fatalf("%s Content-Type = %q, want image/png", field, got)
		}
		opened, openErr := files[0].Open()
		if openErr != nil {
			t.Fatal(openErr)
		}
		decoded, _, decodeErr := image.Decode(opened)
		_ = opened.Close()
		if decodeErr != nil {
			t.Fatal(decodeErr)
		}
		if decoded.Bounds().Dx() != 4 || decoded.Bounds().Dy() != 3 {
			t.Fatalf("%s dimensions = %v", field, decoded.Bounds())
		}
		if field == "mask" {
			_, _, _, alpha := decoded.At(0, 0).RGBA()
			if alpha != 0 {
				t.Fatalf("mask transparent region alpha = %d, want 0", alpha)
			}
		}
	}
}

func TestNormalizeMaskedImageEditPairRejectsMismatchedDimensions(t *testing.T) {
	encode := func(bounds image.Rectangle) []byte {
		var output bytes.Buffer
		if err := png.Encode(&output, image.NewNRGBA(bounds)); err != nil {
			t.Fatal(err)
		}
		return output.Bytes()
	}
	_, _, err := normalizeMaskedImageEditPair(encode(image.Rect(0, 0, 4, 3)), encode(image.Rect(0, 0, 3, 4)))
	if err == nil {
		t.Fatal("mismatched mask dimensions must be rejected")
	}
}

func TestRemoteOnlyImageEditRejectsNonHTTPSReference(t *testing.T) {
	_, _, err := remoteOnlyImageEditMediaBytes(context.Background(), providerConfig{}, providerMedia{URL: "http://example.com/reference.png"})
	if err == nil {
		t.Fatal("non-HTTPS remote reference must be rejected")
	}
}
