package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/model"
)

type pluginRegistryPayload struct {
	Plugins []common.PluginRegistryEntry `json:"plugins"`
}

func GetPluginRegistry(c *gin.Context) {
	installedPlugins, err := model.ListEnabledInstalledPlugins()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	payload := pluginRegistryPayload{
		Plugins: make([]common.PluginRegistryEntry, 0, len(installedPlugins)),
	}

	for _, installedPlugin := range installedPlugins {
		registry, err := buildInstalledPluginRegistry(installedPlugin)
		if err != nil {
			continue
		}
		payload.Plugins = append(payload.Plugins, registry)
	}

	c.JSON(http.StatusOK, payload)
}

func ServeInstalledPluginAsset(c *gin.Context) {
	pluginAsset := strings.TrimSpace(c.Param("pluginAsset"))
	if !strings.HasSuffix(pluginAsset, ".js") {
		c.String(http.StatusNotFound, "Not Found")
		return
	}

	pluginID := strings.TrimSpace(strings.SplitN(pluginAsset, "/", 2)[0])
	if pluginID == "" {
		c.String(http.StatusNotFound, "Not Found")
		return
	}

	plugin, err := model.GetInstalledPluginByPluginID(pluginID)
	if err != nil {
		if model.IsInstalledPluginNotFound(err) {
			c.String(http.StatusNotFound, "Not Found")
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "application/javascript; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.String(http.StatusOK, plugin.EntryContent)
}

func buildInstalledPluginRegistry(installedPlugin model.InstalledPlugin) (common.PluginRegistryEntry, error) {
	manifest, err := decodeInstalledPluginManifest(installedPlugin)
	if err != nil {
		return common.PluginRegistryEntry{}, err
	}

	return common.PluginRegistryEntry{
		ID:      installedPlugin.PluginID,
		Name:    installedPlugin.Name,
		Version: installedPlugin.Version,
		Enabled: installedPlugin.Enabled,
		Entry:   buildInstalledPluginAssetURL(installedPlugin),
		Lists:   manifest.Lists,
		Details: manifest.Details,
	}, nil
}

func decodeInstalledPluginManifest(installedPlugin model.InstalledPlugin) (*common.PluginManifest, error) {
	var manifest common.PluginManifest
	if err := json.Unmarshal([]byte(installedPlugin.ManifestJSON), &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func buildInstalledPluginAssetURL(installedPlugin model.InstalledPlugin) string {
	return fmt.Sprintf(
		"/assets/plugins/%s/%s-%d.js",
		installedPlugin.PluginID,
		sanitizePluginAssetVersion(installedPlugin.Version),
		installedPlugin.UpdatedAt.UnixMilli(),
	)
}

var pluginAssetVersionSanitizer = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func sanitizePluginAssetVersion(version string) string {
	trimmedVersion := strings.TrimSpace(version)
	if trimmedVersion == "" {
		return "unknown"
	}
	sanitizedVersion := pluginAssetVersionSanitizer.ReplaceAllString(trimmedVersion, "-")
	sanitizedVersion = strings.Trim(sanitizedVersion, "-.")
	if sanitizedVersion == "" {
		return "unknown"
	}
	return sanitizedVersion
}
