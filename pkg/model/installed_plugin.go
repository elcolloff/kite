package model

import (
	"errors"

	"gorm.io/gorm"
)

const (
	InstalledPluginStatusEnabled  = "enabled"
	InstalledPluginStatusDisabled = "disabled"
	InstalledPluginStatusFailed   = "failed"

	InstalledPluginSourceManifestURL = "manifest_url"
)

type InstalledPlugin struct {
	Model
	PluginID         string `json:"pluginId" gorm:"column:plugin_id;type:varchar(255);uniqueIndex;not null"`
	Name             string `json:"name" gorm:"column:name;type:varchar(255);not null"`
	Version          string `json:"version" gorm:"column:version;type:varchar(64);not null"`
	Enabled          bool   `json:"enabled" gorm:"column:enabled;type:boolean;not null;default:true"`
	Status           string `json:"status" gorm:"column:status;type:varchar(32);not null"`
	ManifestURL      string `json:"manifestUrl" gorm:"column:manifest_url;type:text;not null"`
	EntryContent     string `json:"-" gorm:"column:entry_content;type:longtext;not null"`
	SDKVersionRange  string `json:"sdkVersionRange" gorm:"column:sdk_version_range;type:varchar(255);not null"`
	HostVersionRange string `json:"hostVersionRange" gorm:"column:host_version_range;type:varchar(255);not null"`
	ManifestJSON     string `json:"-" gorm:"column:manifest_json;type:text;not null"`
	ErrorMessage     string `json:"errorMessage,omitempty" gorm:"column:error_message;type:text"`
	InstallSource    string `json:"installSource" gorm:"column:install_source;type:varchar(64);not null"`
}

func ListInstalledPlugins() ([]InstalledPlugin, error) {
	var plugins []InstalledPlugin
	if err := DB.Order("plugin_id ASC").Find(&plugins).Error; err != nil {
		return nil, err
	}
	return plugins, nil
}

func ListEnabledInstalledPlugins() ([]InstalledPlugin, error) {
	var plugins []InstalledPlugin
	if err := DB.Where("enabled = ?", true).Order("plugin_id ASC").Find(&plugins).Error; err != nil {
		return nil, err
	}
	return plugins, nil
}

func GetInstalledPluginByPluginID(pluginID string) (*InstalledPlugin, error) {
	var plugin InstalledPlugin
	if err := DB.Where("plugin_id = ?", pluginID).First(&plugin).Error; err != nil {
		return nil, err
	}
	return &plugin, nil
}

func SaveInstalledPlugin(plugin *InstalledPlugin) error {
	if plugin == nil {
		return errors.New("plugin is nil")
	}
	return DB.Save(plugin).Error
}

func DeleteInstalledPluginByPluginID(pluginID string) error {
	return DB.Where("plugin_id = ?", pluginID).Delete(&InstalledPlugin{}).Error
}

func IsInstalledPluginNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}
