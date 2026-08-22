package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"infinite-canvas/backend/internal/model"

	"gorm.io/gorm"
)

const (
	BrowserWorkspaceCookieName = "open_ai_canvas_workspace"
	browserWorkspaceIDPrefix   = "ws-"
)

// BrowserWorkspace creates only an anonymous ownership boundary. It does not
// grant account, administrator, billing, or platform-channel privileges.
func (s *Service) BrowserWorkspace(cookieValue string) (*model.User, string, bool, error) {
	workspaceID, valid := parseBrowserWorkspaceID(cookieValue)
	if !valid {
		generated, err := newBrowserWorkspaceID()
		if err != nil {
			return nil, "", false, err
		}
		workspaceID = generated
	}

	user, err := s.ensureBrowserWorkspace(workspaceID)
	if err != nil {
		return nil, "", false, err
	}
	return user, workspaceID, !valid, nil
}

func (s *Service) ensureBrowserWorkspace(workspaceID string) (*model.User, error) {
	user, err := s.repo.User(workspaceID)
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	now := time.Now()
	user = &model.User{
		ID:          workspaceID,
		Username:    workspaceID,
		DisplayName: "本地创作空间",
		Role:        model.UserRoleUser,
		Status:      model.UserStatusActive,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.repo.Create(user); err != nil {
		// Parallel first requests from one browser may race on the unique ID.
		if existing, readErr := s.repo.User(workspaceID); readErr == nil {
			return existing, nil
		}
		return nil, err
	}
	return user, nil
}

func newBrowserWorkspaceID() (string, error) {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", err
	}
	return browserWorkspaceIDPrefix + hex.EncodeToString(value[:]), nil
}

func parseBrowserWorkspaceID(value string) (string, bool) {
	value = strings.TrimSpace(value)
	if !strings.HasPrefix(value, browserWorkspaceIDPrefix) {
		return "", false
	}
	encoded := strings.TrimPrefix(value, browserWorkspaceIDPrefix)
	if len(encoded) != 32 {
		return "", false
	}
	if _, err := hex.DecodeString(encoded); err != nil {
		return "", false
	}
	return value, true
}
