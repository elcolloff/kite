package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	semver "github.com/blang/semver/v4"
	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/version"
	"k8s.io/klog/v2"
)

type pluginConfig struct {
	Plugins []pluginConfigEntry `json:"plugins"`
}

type pluginConfigEntry struct {
	Manifest string `json:"manifest"`
}

type pluginManifest struct {
	SchemaVersion int                 `json:"schemaVersion"`
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	Version       string              `json:"version"`
	Entry         string              `json:"entry"`
	Contributions pluginContributions `json:"contributions,omitempty"`
	Kite          pluginKite          `json:"kite"`
}

type pluginContributions struct {
	Routes  []pluginRouteContribution `json:"routes,omitempty"`
	Groups  []pluginSidebarGroup      `json:"groups,omitempty"`
	Sidebar []pluginSidebarItem       `json:"sidebar,omitempty"`
}

type pluginRouteContribution struct {
	ID        string `json:"id"`
	Path      string `json:"path"`
	Component string `json:"component"`
}

type pluginSidebarItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Path  string `json:"path"`
	Group string `json:"group,omitempty"`
	Icon  string `json:"icon,omitempty"`
	Order *int   `json:"order,omitempty"`
}

type pluginSidebarGroup struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Order *int   `json:"order,omitempty"`
}

type pluginKite struct {
	MinVersion string `json:"minVersion"`
}

type pluginsPayload struct {
	Plugins []pluginManifest `json:"plugins"`
}

var pluginIDPattern = regexp.MustCompile(`^[a-z0-9-]+$`)

var pluginHTTPClient = &http.Client{
	Timeout: 10 * time.Second,
}

func GetPlugins(c *gin.Context) {
	plugins, err := loadPluginManifests(c.Request.Context(), common.PluginsFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for index := range plugins {
		plugins[index].Entry = buildPluginEntryProxyPath(plugins[index].ID)
	}
	c.JSON(http.StatusOK, pluginsPayload{Plugins: plugins})
}

func GetPluginEntry(c *gin.Context) {
	pluginID := c.Param("pluginID")
	if !pluginIDPattern.MatchString(pluginID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid plugin id"})
		return
	}

	manifest, err := loadPluginManifestByID(c.Request.Context(), common.PluginsFilePath, pluginID)
	if err != nil {
		if errors.Is(err, errPluginNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "plugin not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, manifest.Entry, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resp, err := pluginHTTPClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("plugin entry returned %s", resp.Status)})
		return
	}

	c.Header("Cache-Control", "no-cache")
	c.DataFromReader(http.StatusOK, resp.ContentLength, "application/javascript; charset=utf-8", resp.Body, nil)
}

func loadPluginManifests(ctx context.Context, configPath string) ([]pluginManifest, error) {
	config, err := readPluginConfig(configPath)
	if err != nil {
		return nil, err
	}

	type result struct {
		manifest pluginManifest
		ok       bool
	}

	results := make([]result, len(config.Plugins))
	var wg sync.WaitGroup

	for index, plugin := range config.Plugins {
		manifestURL := strings.TrimSpace(plugin.Manifest)
		if manifestURL == "" {
			continue
		}

		wg.Add(1)
		go func(index int, manifestURL string) {
			defer wg.Done()
			manifest, err := fetchPluginManifest(ctx, manifestURL)
			if err != nil {
				klog.Warningf("Failed to load plugin manifest %s: %v", manifestURL, err)
				return
			}
			results[index] = result{manifest: manifest, ok: true}
		}(index, manifestURL)
	}

	wg.Wait()

	plugins := make([]pluginManifest, 0, len(config.Plugins))
	seen := map[string]bool{}
	for _, item := range results {
		if !item.ok {
			continue
		}
		if seen[item.manifest.ID] {
			klog.Warningf("Skipping duplicate plugin id %s", item.manifest.ID)
			continue
		}
		seen[item.manifest.ID] = true
		plugins = append(plugins, item.manifest)
	}
	return plugins, nil
}

var errPluginNotFound = errors.New("plugin not found")

func loadPluginManifestByID(ctx context.Context, configPath string, pluginID string) (pluginManifest, error) {
	plugins, err := loadPluginManifests(ctx, configPath)
	if err != nil {
		return pluginManifest{}, err
	}
	for _, plugin := range plugins {
		if plugin.ID == pluginID {
			return plugin, nil
		}
	}
	return pluginManifest{}, errPluginNotFound
}

func buildPluginEntryProxyPath(pluginID string) string {
	return common.Base + "/api/v1/plugins/" + url.PathEscape(pluginID) + "/entry.js"
}

func readPluginConfig(configPath string) (*pluginConfig, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &pluginConfig{}, nil
		}
		return nil, fmt.Errorf("failed to read plugin config %s: %w", configPath, err)
	}

	var config pluginConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse plugin config %s: %w", configPath, err)
	}
	return &config, nil
}

func fetchPluginManifest(ctx context.Context, manifestURL string) (pluginManifest, error) {
	parsedURL, err := url.Parse(manifestURL)
	if err != nil {
		return pluginManifest{}, err
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return pluginManifest{}, fmt.Errorf("plugin manifest must use http or https: %s", manifestURL)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, manifestURL, nil)
	if err != nil {
		return pluginManifest{}, err
	}
	resp, err := pluginHTTPClient.Do(req)
	if err != nil {
		return pluginManifest{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return pluginManifest{}, fmt.Errorf("unexpected status %s", resp.Status)
	}

	var manifest pluginManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return pluginManifest{}, err
	}
	if err := validatePluginManifest(&manifest, parsedURL); err != nil {
		return pluginManifest{}, err
	}
	return manifest, nil
}

func validatePluginManifest(manifest *pluginManifest, manifestURL *url.URL) error {
	if manifest.SchemaVersion != 1 {
		return fmt.Errorf("unsupported schemaVersion %d", manifest.SchemaVersion)
	}
	if !pluginIDPattern.MatchString(manifest.ID) {
		return fmt.Errorf("invalid plugin id %q", manifest.ID)
	}
	if strings.TrimSpace(manifest.Name) == "" {
		return errors.New("plugin name is required")
	}
	if strings.TrimSpace(manifest.Version) == "" {
		return errors.New("plugin version is required")
	}
	if strings.TrimSpace(manifest.Entry) == "" {
		return errors.New("plugin entry is required")
	}
	if !isPluginVersionCompatible(manifest.Kite.MinVersion) {
		return fmt.Errorf("plugin requires Kite >= %s", manifest.Kite.MinVersion)
	}

	entryURL, err := manifestURL.Parse(manifest.Entry)
	if err != nil {
		return err
	}
	manifest.Entry = entryURL.String()

	routePaths := map[string]bool{}
	for _, route := range manifest.Contributions.Routes {
		if strings.TrimSpace(route.ID) == "" {
			return errors.New("plugin route id is required")
		}
		if strings.TrimSpace(route.Component) == "" {
			return fmt.Errorf("plugin route %s component is required", route.ID)
		}
		if !isPluginRoutePath(manifest.ID, route.Path) {
			return fmt.Errorf("plugin route %s must be under /plugins/%s", route.Path, manifest.ID)
		}
		routePaths[route.Path] = true
	}

	for _, group := range manifest.Contributions.Groups {
		if !pluginIDPattern.MatchString(group.ID) {
			return fmt.Errorf("plugin sidebar group id %q is invalid", group.ID)
		}
		if strings.TrimSpace(group.Title) == "" {
			return fmt.Errorf("plugin sidebar group %s title is required", group.ID)
		}
	}

	for _, item := range manifest.Contributions.Sidebar {
		if strings.TrimSpace(item.ID) == "" {
			return errors.New("plugin sidebar id is required")
		}
		if strings.TrimSpace(item.Title) == "" {
			return fmt.Errorf("plugin sidebar %s title is required", item.ID)
		}
		if !routePaths[item.Path] {
			return fmt.Errorf("plugin sidebar %s path must point to a declared plugin route", item.ID)
		}
		if item.Group != "" && !pluginIDPattern.MatchString(item.Group) {
			return fmt.Errorf("plugin sidebar %s group is invalid", item.ID)
		}
	}
	return nil
}

func isPluginRoutePath(pluginID string, path string) bool {
	prefix := "/plugins/" + pluginID
	return path == prefix || strings.HasPrefix(path, prefix+"/")
}

func isPluginVersionCompatible(minVersion string) bool {
	minVersion = strings.TrimSpace(minVersion)
	if minVersion == "" || version.Version == "dev" {
		return true
	}

	current, err := parsePluginSemver(version.Version)
	if err != nil {
		return true
	}
	minimum, err := parsePluginSemver(minVersion)
	if err != nil {
		return false
	}
	return current.GTE(minimum)
}

func parsePluginSemver(value string) (semver.Version, error) {
	value = strings.TrimPrefix(strings.TrimSpace(value), "v")
	return semver.Parse(value)
}
