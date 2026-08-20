package service

import (
	"testing"

	"infinite-canvas/backend/internal/model"
	"infinite-canvas/backend/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestBrowserWorkspaceCreatesAndReusesAnonymousOwner(t *testing.T) {
	svc := newBrowserWorkspaceTestService(t)

	first, cookie, shouldSetCookie, err := svc.BrowserWorkspace("")
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != cookie || !shouldSetCookie {
		t.Fatalf("first workspace = %#v, cookie = %q, shouldSetCookie = %v", first, cookie, shouldSetCookie)
	}
	if first.PasswordHash != "" || first.Email != "" {
		t.Fatalf("anonymous workspace unexpectedly has credentials: %#v", first)
	}

	second, secondCookie, shouldSetCookie, err := svc.BrowserWorkspace(cookie)
	if err != nil {
		t.Fatal(err)
	}
	if second.ID != first.ID || secondCookie != cookie || shouldSetCookie {
		t.Fatalf("reused workspace = %#v, cookie = %q, shouldSetCookie = %v", second, secondCookie, shouldSetCookie)
	}
}

func TestBrowserWorkspaceSeparatesDifferentBrowsers(t *testing.T) {
	svc := newBrowserWorkspaceTestService(t)

	first, _, _, err := svc.BrowserWorkspace("")
	if err != nil {
		t.Fatal(err)
	}
	second, _, _, err := svc.BrowserWorkspace("")
	if err != nil {
		t.Fatal(err)
	}
	if first.ID == second.ID {
		t.Fatalf("different browser workspaces share ID %q", first.ID)
	}
}

func TestBrowserWorkspaceRejectsForgedCookieFormat(t *testing.T) {
	svc := newBrowserWorkspaceTestService(t)

	workspace, cookie, shouldSetCookie, err := svc.BrowserWorkspace("local-workspace")
	if err != nil {
		t.Fatal(err)
	}
	if workspace.ID == "local-workspace" || cookie == "local-workspace" || !shouldSetCookie {
		t.Fatalf("invalid cookie was accepted: workspace=%q cookie=%q shouldSetCookie=%v", workspace.ID, cookie, shouldSetCookie)
	}
}

func newBrowserWorkspaceTestService(t *testing.T) *Service {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+newID()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatal(err)
	}
	return New(repository.New(db), t.TempDir())
}
