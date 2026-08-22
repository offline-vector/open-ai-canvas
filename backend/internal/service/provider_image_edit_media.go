package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/draw"
	_ "image/jpeg"
	"image/png"
	"mime/multipart"
	"strings"

	_ "golang.org/x/image/webp"
)

// writeRemoteOnlyImageEditParts prepares edit inputs in memory. Remote generated
// images remain remote at rest, while OpenAI-compatible multipart endpoints still
// receive real file parts for the duration of this request.
func writeRemoteOnlyImageEditParts(ctx context.Context, config providerConfig, writer *multipart.Writer, images []providerMedia, mask *providerMedia) error {
	if len(images) == 0 {
		return errors.New("图片编辑必须提供至少一张源图片")
	}

	firstRaw, firstMimeType, err := remoteOnlyImageEditMediaBytes(ctx, config, images[0])
	if err != nil {
		return fmt.Errorf("读取第一张源图片失败：%w", err)
	}

	if mask != nil {
		maskRaw, _, maskErr := remoteOnlyImageEditMediaBytes(ctx, config, *mask)
		if maskErr != nil {
			return fmt.Errorf("读取蒙版失败：%w", maskErr)
		}
		firstRaw, maskRaw, err = normalizeMaskedImageEditPair(firstRaw, maskRaw)
		if err != nil {
			return err
		}
		firstMimeType = "image/png"
		if err := writeMediaPartBytes(writer, "image", images[0], firstRaw, firstMimeType); err != nil {
			return err
		}
		if err := writeMediaPartBytes(writer, "mask", *mask, maskRaw, "image/png"); err != nil {
			return err
		}
	} else if err := writeMediaPartBytes(writer, "image", images[0], firstRaw, firstMimeType); err != nil {
		return err
	}

	for _, media := range images[1:] {
		raw, mimeType, readErr := remoteOnlyImageEditMediaBytes(ctx, config, media)
		if readErr != nil {
			return fmt.Errorf("读取参考图片失败：%w", readErr)
		}
		if err := writeMediaPartBytes(writer, "image", media, raw, mimeType); err != nil {
			return err
		}
	}
	return nil
}

func remoteOnlyImageEditMediaBytes(ctx context.Context, config providerConfig, media providerMedia) ([]byte, string, error) {
	value := strings.TrimSpace(firstNonEmpty(media.DataURL, media.URL))
	if strings.HasPrefix(value, "data:") {
		return mediaBytes(media)
	}
	if !isBrowserMediaURL(value) {
		return nil, "", errors.New("远程参考图片必须使用可公开访问的 HTTPS URL")
	}
	raw, mimeType, err := getProviderExternalBinary(withProviderRequestKind(ctx, "download"), config, value)
	if err != nil {
		return nil, "", err
	}
	return raw, normalizedMediaMimeType(defaultString(mimeType, media.Type), raw), nil
}

func normalizeMaskedImageEditPair(sourceRaw []byte, maskRaw []byte) ([]byte, []byte, error) {
	source, _, err := image.Decode(bytes.NewReader(sourceRaw))
	if err != nil {
		return nil, nil, errors.New("源图片不是受支持的 PNG、JPEG 或 WebP 图片")
	}
	mask, _, err := image.Decode(bytes.NewReader(maskRaw))
	if err != nil {
		return nil, nil, errors.New("蒙版不是受支持的 PNG、JPEG 或 WebP 图片")
	}
	if source.Bounds().Dx() != mask.Bounds().Dx() || source.Bounds().Dy() != mask.Bounds().Dy() {
		return nil, nil, fmt.Errorf("蒙版尺寸 %dx%d 必须与第一张源图片 %dx%d 一致", mask.Bounds().Dx(), mask.Bounds().Dy(), source.Bounds().Dx(), source.Bounds().Dy())
	}

	sourcePNG, err := encodeNRGBAPNG(source)
	if err != nil {
		return nil, nil, err
	}
	maskPNG, err := encodeNRGBAPNG(mask)
	if err != nil {
		return nil, nil, err
	}
	return sourcePNG, maskPNG, nil
}

func encodeNRGBAPNG(source image.Image) ([]byte, error) {
	bounds := source.Bounds()
	converted := image.NewNRGBA(image.Rect(0, 0, bounds.Dx(), bounds.Dy()))
	draw.Draw(converted, converted.Bounds(), source, bounds.Min, draw.Src)
	var encoded bytes.Buffer
	if err := png.Encode(&encoded, converted); err != nil {
		return nil, err
	}
	return encoded.Bytes(), nil
}
