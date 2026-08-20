package handler

import (
	"infinite-canvas/backend/internal/service"

	"github.com/gin-gonic/gin"
)

func RegisterFeatureAvailabilityRoutes(r *gin.RouterGroup, svc *service.Service) {
	r.GET("/workspace/bootstrap", func(c *gin.Context) {
		if _, err := currentUser(c, svc); err != nil {
			failService(c, err)
			return
		}
		ok(c, gin.H{"ready": true})
	})
	r.GET("/features", func(c *gin.Context) {
		setting, err := svc.FeatureAvailability()
		if err != nil {
			failService(c, err)
			return
		}
		ok(c, gin.H{"features": setting})
	})
}

func RequireFeature(svc *service.Service, feature string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := svc.RequireFeature(feature); err != nil {
			failService(c, err)
			c.Abort()
			return
		}
		c.Next()
	}
}
