package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	semver "github.com/blang/semver/v4"
	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/model"
	kiteversion "github.com/zxh326/kite/pkg/version"
)

const (
	pluginManifestSchemaVersion = "v1"
	pluginManifestFetchTimeout  = 10 * time.Second
)

type installPluginRequest struct {
	ManifestURL string `json:"manifestUrl" binding:"required,url"`
	Enabled     *bool  `json:"enabled,omitempty"`
}

type installedPluginResponse struct {
	ID               uint                   `json:"id"`
	PluginID         string                 `json:"pluginId"`
	Name             string                 `json:"name"`
	Version          string                 `json:"version"`
	Enabled          bool                   `json:"enabled"`
	Status           string                 `json:"status"`
	ManifestURL      string                 `json:"manifestUrl"`
	AssetURL         string                 `json:"assetUrl"`
	SDKVersionRange  string                 `json:"sdkVersionRange"`
	HostVersionRange string                 `json:"hostVersionRange"`
	ErrorMessage     string                 `json:"errorMessage,omitempty"`
	InstallSource    string                 `json:"installSource"`
	Manifest         *common.PluginManifest `json:"manifest,omitempty"`
	CreatedAt        time.Time              `json:"createdAt"`
	UpdatedAt        time.Time              `json:"updatedAt"`
}

type installedPluginListPayload struct {
	Plugins []installedPluginResponse `json:"plugins"`
}

func ListInstalledPlugins(c *gin.Context) {
	plugins, err := model.ListInstalledPlugins()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := installedPluginListPayload{
		Plugins: make([]installedPluginResponse, 0, len(plugins)),
	}

	for _, plugin := range plugins {
		response.Plugins = append(response.Plugins, buildInstalledPluginResponse(plugin))
	}

	c.JSON(http.StatusOK, response)
}

func InstallPlugin(c *gin.Context) {
	var req installPluginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	manifest, err := fetchPluginManifest(c.Request.Context(), req.ManifestURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existingPlugin, err := model.GetInstalledPluginByPluginID(manifest.ID)
	if err != nil && !model.IsInstalledPluginNotFound(err) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	} else if existingPlugin != nil {
		enabled = existingPlugin.Enabled
	}

	entryURL, err := resolvePluginEntryURL(req.ManifestURL, manifest.Entry)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	entryContent, err := fetchPluginEntryContent(c.Request.Context(), entryURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	manifestJSON, err := json.Marshal(manifest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	status := model.InstalledPluginStatusDisabled
	if enabled {
		status = model.InstalledPluginStatusEnabled
	}

	pluginRecord := model.InstalledPlugin{
		PluginID:         manifest.ID,
		Name:             manifest.Name,
		Version:          manifest.Version,
		Enabled:          enabled,
		Status:           status,
		ManifestURL:      strings.TrimSpace(req.ManifestURL),
		EntryContent:     entryContent,
		SDKVersionRange:  manifest.SDKVersionRange,
		HostVersionRange: manifest.HostVersionRange,
		ManifestJSON:     string(manifestJSON),
		ErrorMessage:     "",
		InstallSource:    model.InstalledPluginSourceManifestURL,
	}

	if existingPlugin != nil {
		pluginRecord.Model = existingPlugin.Model
	}

	if err := model.SaveInstalledPlugin(&pluginRecord); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, buildInstalledPluginResponse(pluginRecord))
}

func EnableInstalledPlugin(c *gin.Context) {
	updateInstalledPluginEnabledState(c, true)
}

func DisableInstalledPlugin(c *gin.Context) {
	updateInstalledPluginEnabledState(c, false)
}

func DeleteInstalledPlugin(c *gin.Context) {
	pluginID := strings.TrimSpace(c.Param("pluginId"))
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pluginId is required"})
		return
	}

	plugin, err := model.GetInstalledPluginByPluginID(pluginID)
	if err != nil {
		if model.IsInstalledPluginNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "plugin not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := model.DeleteInstalledPluginByPluginID(pluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"pluginId": plugin.PluginID,
		"deleted":  true,
	})
}

func updateInstalledPluginEnabledState(c *gin.Context, enabled bool) {
	pluginID := strings.TrimSpace(c.Param("pluginId"))
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pluginId is required"})
		return
	}

	plugin, err := model.GetInstalledPluginByPluginID(pluginID)
	if err != nil {
		if model.IsInstalledPluginNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "plugin not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	plugin.Enabled = enabled
	if enabled {
		plugin.Status = model.InstalledPluginStatusEnabled
	} else {
		plugin.Status = model.InstalledPluginStatusDisabled
	}
	plugin.ErrorMessage = ""

	if err := model.SaveInstalledPlugin(plugin); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, buildInstalledPluginResponse(*plugin))
}

func buildInstalledPluginResponse(plugin model.InstalledPlugin) installedPluginResponse {
	response := installedPluginResponse{
		ID:               plugin.ID,
		PluginID:         plugin.PluginID,
		Name:             plugin.Name,
		Version:          plugin.Version,
		Enabled:          plugin.Enabled,
		Status:           plugin.Status,
		ManifestURL:      plugin.ManifestURL,
		AssetURL:         buildInstalledPluginAssetURL(plugin),
		SDKVersionRange:  plugin.SDKVersionRange,
		HostVersionRange: plugin.HostVersionRange,
		ErrorMessage:     plugin.ErrorMessage,
		InstallSource:    plugin.InstallSource,
		CreatedAt:        plugin.CreatedAt,
		UpdatedAt:        plugin.UpdatedAt,
	}

	if strings.TrimSpace(plugin.ManifestJSON) != "" {
		var manifest common.PluginManifest
		if err := json.Unmarshal([]byte(plugin.ManifestJSON), &manifest); err == nil {
			response.Manifest = &manifest
		}
	}

	return response
}

func fetchPluginManifest(ctx context.Context, manifestURL string) (*common.PluginManifest, error) {
	parsedURL, err := parsePluginURL(manifestURL)
	if err != nil {
		return nil, err
	}

	requestCtx, cancel := context.WithTimeout(ctx, pluginManifestFetchTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch manifest: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch manifest: %s", resp.Status)
	}

	var manifest common.PluginManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return nil, fmt.Errorf("failed to decode manifest: %w", err)
	}

	if err := validatePluginManifest(&manifest); err != nil {
		return nil, err
	}

	return &manifest, nil
}

func fetchPluginEntryContent(ctx context.Context, entryURL string) (string, error) {
	parsedURL, err := parsePluginURL(entryURL)
	if err != nil {
		return "", err
	}

	requestCtx, cancel := context.WithTimeout(ctx, pluginManifestFetchTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch entry: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch entry: %s", resp.Status)
	}

	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read entry: %w", err)
	}

	if len(content) == 0 {
		return "", fmt.Errorf("entry content is empty")
	}

	return string(content), nil
}

func parsePluginURL(rawURL string) (*url.URL, error) {
	parsedURL, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, fmt.Errorf("invalid url")
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return nil, fmt.Errorf("url must use http or https")
	}
	return parsedURL, nil
}

func validatePluginManifest(manifest *common.PluginManifest) error {
	if manifest == nil {
		return fmt.Errorf("manifest is required")
	}
	if strings.TrimSpace(manifest.SchemaVersion) != pluginManifestSchemaVersion {
		return fmt.Errorf("unsupported schemaVersion: %s", manifest.SchemaVersion)
	}
	if strings.TrimSpace(manifest.ID) == "" {
		return fmt.Errorf("manifest.id is required")
	}
	if strings.TrimSpace(manifest.Name) == "" {
		return fmt.Errorf("manifest.name is required")
	}
	normalizedVersion, err := normalizePluginVersion(manifest.Version)
	if err != nil {
		return fmt.Errorf("invalid manifest.version: %w", err)
	}
	manifest.Version = normalizedVersion

	if strings.TrimSpace(manifest.Entry) == "" {
		return fmt.Errorf("manifest.entry is required")
	}

	if len(manifest.Lists) == 0 {
		return fmt.Errorf("manifest.lists must contain at least one item")
	}

	if err := validateVersionRange(manifest.SDKVersionRange, common.PluginSDKVersion, false); err != nil {
		return fmt.Errorf("invalid sdkVersionRange: %w", err)
	}

	if err := validateVersionRange(manifest.HostVersionRange, kiteversion.Version, true); err != nil {
		return fmt.Errorf("invalid hostVersionRange: %w", err)
	}

	listRoutes := make(map[string]struct{}, len(manifest.Lists))
	for _, listEntry := range manifest.Lists {
		if err := validatePluginRegistryListEntry(listEntry); err != nil {
			return err
		}
		if _, exists := listRoutes[listEntry.RouterName]; exists {
			return fmt.Errorf("duplicate list routerName: %s", listEntry.RouterName)
		}
		listRoutes[listEntry.RouterName] = struct{}{}
	}

	detailRoutes := make(map[string]struct{}, len(manifest.Details))
	for _, detailEntry := range manifest.Details {
		if err := validatePluginRegistryDetailEntry(detailEntry); err != nil {
			return err
		}
		if _, exists := detailRoutes[detailEntry.RouterName]; exists {
			return fmt.Errorf("duplicate detail routerName: %s", detailEntry.RouterName)
		}
		if _, exists := listRoutes[detailEntry.RouterName]; !exists {
			return fmt.Errorf("detail routerName %s has no matching list definition", detailEntry.RouterName)
		}
		detailRoutes[detailEntry.RouterName] = struct{}{}
	}

	return nil
}

func validatePluginRegistryListEntry(entry common.PluginRegistryListEntry) error {
	if strings.TrimSpace(entry.RouterName) == "" {
		return fmt.Errorf("list.routerName is required")
	}
	if strings.TrimSpace(entry.Title) == "" {
		return fmt.Errorf("list.title is required")
	}
	if err := validatePluginResource(entry.Resource); err != nil {
		return fmt.Errorf("invalid list resource for %s: %w", entry.RouterName, err)
	}
	if entry.Menu.GroupID != "plugin" {
		return fmt.Errorf("list.menu.groupId for %s must be plugin", entry.RouterName)
	}
	if strings.TrimSpace(entry.Menu.Title) == "" {
		return fmt.Errorf("list.menu.title for %s is required", entry.RouterName)
	}
	return nil
}

func validatePluginRegistryDetailEntry(entry common.PluginRegistryDetailEntry) error {
	if strings.TrimSpace(entry.RouterName) == "" {
		return fmt.Errorf("detail.routerName is required")
	}
	if err := validatePluginResource(entry.Resource); err != nil {
		return fmt.Errorf("invalid detail resource for %s: %w", entry.RouterName, err)
	}
	return nil
}

func validatePluginResource(resource common.PluginRegistryResource) error {
	if resource.Scope != "namespaced" && resource.Scope != "cluster" {
		return fmt.Errorf("scope must be namespaced or cluster")
	}

	switch resource.Source {
	case "builtin":
		if strings.TrimSpace(resource.ResourceType) == "" {
			return fmt.Errorf("resourceType is required")
		}
	case "crd":
		if strings.TrimSpace(resource.CRDName) == "" {
			return fmt.Errorf("crdName is required")
		}
		if strings.TrimSpace(resource.Kind) == "" {
			return fmt.Errorf("kind is required")
		}
	default:
		return fmt.Errorf("source must be builtin or crd")
	}

	return nil
}

func validateVersionRange(rangeValue, currentVersion string, allowDev bool) error {
	trimmedRange := strings.TrimSpace(rangeValue)
	if trimmedRange == "" {
		return fmt.Errorf("range is required")
	}

	parsedRange, err := semver.ParseRange(trimmedRange)
	if err != nil {
		return err
	}

	trimmedCurrent := strings.TrimSpace(currentVersion)
	if allowDev && strings.EqualFold(trimmedCurrent, "dev") {
		return nil
	}

	normalizedCurrent, err := normalizePluginVersion(trimmedCurrent)
	if err != nil {
		return err
	}

	parsedCurrent, err := semver.Parse(normalizedCurrent)
	if err != nil {
		return err
	}

	if !parsedRange(parsedCurrent) {
		return fmt.Errorf("current version %s does not satisfy %s", normalizedCurrent, trimmedRange)
	}

	return nil
}

func normalizePluginVersion(rawVersion string) (string, error) {
	trimmedVersion := strings.TrimSpace(rawVersion)
	trimmedVersion = strings.TrimPrefix(trimmedVersion, "v")
	if trimmedVersion == "" {
		return "", fmt.Errorf("version is required")
	}

	parsedVersion, err := semver.Parse(trimmedVersion)
	if err != nil {
		return "", err
	}

	return parsedVersion.String(), nil
}

func resolvePluginEntryURL(manifestURL, entry string) (string, error) {
	baseURL, err := parsePluginURL(manifestURL)
	if err != nil {
		return "", err
	}

	entryURL, err := url.Parse(strings.TrimSpace(entry))
	if err != nil {
		return "", err
	}

	resolvedURL := baseURL.ResolveReference(entryURL)
	if resolvedURL.Scheme != "http" && resolvedURL.Scheme != "https" {
		return "", fmt.Errorf("resolved entry must use http or https")
	}

	return resolvedURL.String(), nil
}
