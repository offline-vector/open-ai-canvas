package service

import (
	"os"
	"strings"
)

const (
	AuthModeGuest                = "guest"
	GeneratedMediaModeRemoteOnly = "remote_only"
)

func GuestWorkspaceEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("CANVAS_AUTH_MODE")), AuthModeGuest)
}

func GeneratedMediaRemoteOnly() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("CANVAS_GENERATED_MEDIA_MODE")), GeneratedMediaModeRemoteOnly)
}
