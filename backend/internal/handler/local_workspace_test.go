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
	t.Setenv("CANVAS_AUTH_MODE", "guest")
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

func TestGuestWorkspaceDisablesAccountEndpoints(t *testing.T) {
	t.Setenv("CANVAS_AUTH_MODE", "guest")
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterAuthRoutes(router.Group("/api"), newHandlerWorkspaceTestService(t))

	for _, path := range []string{"/api/auth/register", "/api/auth/email-code", "/api/auth/login"} {
		t.Run(path, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPost, path, nil)
			router.ServeHTTP(response, request)
			if response.Code != http.StatusNotFound {
				t.Fatalf("POST %s status = %d, want %d", path, response.Code, http.StatusNotFound)
			}
		})
	}
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
