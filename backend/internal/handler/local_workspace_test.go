package handler

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"infinite-canvas/backend/internal/model"
	"infinite-canvas/backend/internal/repository"
	"infinite-canvas/backend/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestCurrentUserSetsSecureAnonymousWorkspaceCookie(t *testing.T) {
	svc := newHandlerWorkspaceTestService(t)
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, "http://studio.example/api/projects", nil)
	context.Request.Header.Set("X-Forwarded-Proto", "https")

	user, err := currentUser(context, svc)
	if err != nil {
		t.Fatal(err)
	}
	cookies := response.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("Set-Cookie count = %d, want 1", len(cookies))
	}
	cookie := cookies[0]
	if cookie.Name != service.BrowserWorkspaceCookieName || cookie.Value != user.ID {
		t.Fatalf("workspace cookie = %#v, user ID = %q", cookie, user.ID)
	}
	if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteLaxMode || cookie.MaxAge <= 0 {
		t.Fatalf("workspace cookie security attributes = %#v", cookie)
	}
}

func TestCurrentUserReusesCookieAndSeparatesBrowsers(t *testing.T) {
	svc := newHandlerWorkspaceTestService(t)
	firstUser, firstCookie := requestWorkspaceUser(t, svc, nil)
	reusedUser, reusedCookie := requestWorkspaceUser(t, svc, firstCookie)
	otherUser, otherCookie := requestWorkspaceUser(t, svc, nil)

	if reusedUser.ID != firstUser.ID || reusedCookie != nil {
		t.Fatalf("same browser was not reused: first=%q reused=%q cookie=%#v", firstUser.ID, reusedUser.ID, reusedCookie)
	}
	if otherUser.ID == firstUser.ID || otherCookie == nil {
		t.Fatalf("different browser was not isolated: first=%q other=%q cookie=%#v", firstUser.ID, otherUser.ID, otherCookie)
	}
}

func requestWorkspaceUser(t *testing.T, svc *service.Service, cookie *http.Cookie) (*model.User, *http.Cookie) {
	t.Helper()
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, "http://studio.example/api/projects", nil)
	if cookie != nil {
		context.Request.AddCookie(cookie)
	}
	user, err := currentUser(context, svc)
	if err != nil {
		t.Fatal(err)
	}
	cookies := response.Result().Cookies()
	if len(cookies) == 0 {
		return user, nil
	}
	return user, cookies[0]
}

func newHandlerWorkspaceTestService(t *testing.T) *service.Service {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "workspace.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatal(err)
	}
	return service.New(repository.New(db), t.TempDir())
}
