package resources

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/model"
	"github.com/zxh326/kite/pkg/rbac"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"
)

const helmReleaseResourceName = "helmrelease"

type HelmReleaseHandler struct{}

type HelmRelease struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata"`
	Spec              HelmReleaseSpec   `json:"spec"`
	Status            HelmReleaseStatus `json:"status"`
}

type HelmReleaseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []HelmRelease `json:"items"`
}

type HelmReleaseSpec struct {
	ReleaseName  string                 `json:"releaseName"`
	Namespace    string                 `json:"namespace"`
	Chart        string                 `json:"chart"`
	ChartName    string                 `json:"chartName"`
	ChartVersion string                 `json:"chartVersion"`
	AppVersion   string                 `json:"appVersion,omitempty"`
	Revision     int                    `json:"revision"`
	Values       map[string]interface{} `json:"values,omitempty"`
	Manifest     string                 `json:"manifest,omitempty"`
	Notes        string                 `json:"notes,omitempty"`
	Description  string                 `json:"description,omitempty"`
	Hooks        []helmHook             `json:"hooks,omitempty"`
}

type HelmReleaseStatus struct {
	Status        string                `json:"status"`
	FirstDeployed *time.Time            `json:"firstDeployed,omitempty"`
	LastDeployed  *time.Time            `json:"lastDeployed,omitempty"`
	Deleted       *time.Time            `json:"deleted,omitempty"`
	Resources     []HelmReleaseResource `json:"resources,omitempty"`
}

type HelmReleaseResource struct {
	APIVersion string `json:"apiVersion"`
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace,omitempty"`
	Status     string `json:"status,omitempty"`
}

type helmReleaseFile struct {
	Name      string                 `json:"name"`
	Namespace string                 `json:"namespace"`
	Version   int                    `json:"version"`
	Manifest  string                 `json:"manifest"`
	Config    map[string]interface{} `json:"config"`
	Info      helmInfo               `json:"info"`
	Chart     helmChart              `json:"chart"`
	Hooks     []helmHook             `json:"hooks"`
}

type helmInfo struct {
	FirstDeployed helmTime `json:"first_deployed"`
	LastDeployed  helmTime `json:"last_deployed"`
	Deleted       helmTime `json:"deleted"`
	Description   string   `json:"description"`
	Status        string   `json:"status"`
	Notes         string   `json:"notes"`
}

type helmChart struct {
	Metadata helmChartMetadata `json:"metadata"`
}
type helmChartMetadata struct {
	Name       string `json:"name"`
	Version    string `json:"version"`
	AppVersion string `json:"appVersion"`
}
type helmHook struct {
	Name     string                 `json:"name"`
	Kind     string                 `json:"kind"`
	Path     string                 `json:"path"`
	Manifest string                 `json:"manifest"`
	Events   []string               `json:"events"`
	LastRun  map[string]interface{} `json:"last_run,omitempty"`
	Weight   int                    `json:"weight,omitempty"`
}

type helmTime struct{ time.Time }

func (t *helmTime) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), "\"")
	if s == "" || s == "null" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return err
	}
	t.Time = parsed
	return nil
}
func timePtr(t helmTime) *time.Time {
	if t.IsZero() {
		return nil
	}
	v := t.Time
	return &v
}

func NewHelmReleaseHandler() *HelmReleaseHandler    { return &HelmReleaseHandler{} }
func (h *HelmReleaseHandler) IsClusterScoped() bool { return false }
func (h *HelmReleaseHandler) Searchable() bool      { return true }
func (h *HelmReleaseHandler) ListHistory(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "helm release history is included in Helm storage and is not exposed as resource history yet",
	})
}
func (h *HelmReleaseHandler) Create(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "installing Helm charts is not supported yet"})
}
func (h *HelmReleaseHandler) Update(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "helm release upgrade is not supported in storage-only mode"})
}
func (h *HelmReleaseHandler) Patch(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "patching Helm releases is not supported"})
}
func (h *HelmReleaseHandler) Describe(c *gin.Context) {
	obj, err := h.get(c, c.Param("namespace"), c.Param("name"), true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"result": fmt.Sprintf(
			"Name: %s\nNamespace: %s\nRevision: %d\nStatus: %s\nChart: %s\nDescription: %s\n",
			obj.Name,
			obj.Namespace,
			obj.Spec.Revision,
			obj.Status.Status,
			obj.Spec.Chart,
			obj.Spec.Description,
		),
	})
}

func (h *HelmReleaseHandler) registerCustomRoutes(group *gin.RouterGroup) {
	group.POST("/:namespace/:name/upgrade", h.Upgrade)
	group.POST("/:namespace/:name/rollback", h.Rollback)
}

func (h *HelmReleaseHandler) List(c *gin.Context) {
	list, err := h.list(c, c.Param("namespace"), false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}
func (h *HelmReleaseHandler) Get(c *gin.Context) {
	obj, err := h.get(c, c.Param("namespace"), c.Param("name"), true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, obj)
}
func (h *HelmReleaseHandler) GetResource(c *gin.Context, namespace, name string) (interface{}, error) {
	return h.get(c, namespace, name, true)
}

func (h *HelmReleaseHandler) Search(c *gin.Context, q string, limit int64) ([]common.SearchResult, error) {
	list, err := h.list(c, common.AllNamespaces, false)
	if err != nil {
		return nil, err
	}
	results := []common.SearchResult{}
	for _, item := range list.Items {
		if !strings.Contains(strings.ToLower(item.Name), strings.ToLower(q)) {
			continue
		}
		results = append(results, common.SearchResult{ID: string(item.UID), Name: item.Name, Namespace: item.Namespace, ResourceType: helmReleaseResourceName, CreatedAt: item.CreationTimestamp.String()})
		if limit > 0 && int64(len(results)) >= limit {
			break
		}
	}
	return results, nil
}

func (h *HelmReleaseHandler) Delete(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	ctx := c.Request.Context()
	ns, name := c.Param("namespace"), c.Param("name")
	rel, err := h.get(c, ns, name, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, rr := range rel.Status.Resources {
		_ = deleteManifestResource(ctx, cs, rr)
	}
	secrets, err := h.releaseSecrets(ctx, cs, ns, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range secrets {
		if err := cs.K8sClient.Delete(ctx, &secrets[i]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "helm release deleted"})
}

type helmReleaseActionRequest struct {
	Revision    int                    `json:"revision"`
	Manifest    string                 `json:"manifest"`
	Values      map[string]interface{} `json:"values"`
	Description string                 `json:"description"`
}

func (h *HelmReleaseHandler) Upgrade(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	ctx := c.Request.Context()
	namespace, name := c.Param("namespace"), c.Param("name")
	var req helmReleaseActionRequest
	_ = c.ShouldBindJSON(&req)

	secrets, err := h.releaseSecrets(ctx, cs, namespace, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	latest, rel, err := latestHelmReleaseSecret(secrets)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if req.Manifest != "" {
		rel.Manifest = req.Manifest
	}
	if req.Values != nil {
		rel.Config = req.Values
	}
	description := req.Description
	if description == "" {
		description = "Upgrade requested from Kite"
	}
	if err := h.createRevision(ctx, cs, latest, rel, description); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "helm release upgraded"})
}

func (h *HelmReleaseHandler) Rollback(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	ctx := c.Request.Context()
	namespace, name := c.Param("namespace"), c.Param("name")
	var req helmReleaseActionRequest
	_ = c.ShouldBindJSON(&req)

	secrets, err := h.releaseSecrets(ctx, cs, namespace, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(secrets) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("helm release %s/%s not found", namespace, name)})
		return
	}
	sort.Slice(secrets, func(i, j int) bool {
		return helmSecretVersion(secrets[i]) > helmSecretVersion(secrets[j])
	})
	targetRevision := req.Revision
	if targetRevision == 0 && len(secrets) > 1 {
		targetRevision = helmSecretVersion(secrets[1])
	}
	if targetRevision == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no previous helm release revision found"})
		return
	}
	var target *corev1.Secret
	for i := range secrets {
		if helmSecretVersion(secrets[i]) == targetRevision {
			target = &secrets[i]
			break
		}
	}
	if target == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("revision %d not found", targetRevision)})
		return
	}
	rel, err := decodeHelmReleaseSecret(*target)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	description := req.Description
	if description == "" {
		description = fmt.Sprintf("Rollback to %d requested from Kite", targetRevision)
	}
	if err := h.createRevision(ctx, cs, secrets[0], rel, description); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "helm release rolled back", "revision": targetRevision})
}

func (h *HelmReleaseHandler) createRevision(
	ctx context.Context,
	cs *cluster.ClientSet,
	latest corev1.Secret,
	rel *helmReleaseFile,
	description string,
) error {
	if err := applyManifestResources(ctx, cs, rel.Manifest, rel.Namespace); err != nil {
		return err
	}
	nextVersion := helmSecretVersion(latest) + 1
	rel.Version = nextVersion
	rel.Info.Status = "deployed"
	rel.Info.Description = description
	rel.Info.LastDeployed = helmTime{Time: time.Now().UTC()}
	rel.Info.Deleted = helmTime{}

	payload, err := encodeHelmRelease(rel)
	if err != nil {
		return err
	}
	labels := map[string]string{}
	for k, v := range latest.Labels {
		labels[k] = v
	}
	labels["owner"] = "helm"
	labels["name"] = rel.Name
	labels["status"] = "deployed"
	labels["version"] = strconv.Itoa(nextVersion)
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("sh.helm.release.v1.%s.v%d", rel.Name, nextVersion),
			Namespace: rel.Namespace,
			Labels:    labels,
		},
		Type: corev1.SecretType("helm.sh/release.v1"),
		Data: map[string][]byte{"release": payload},
	}
	if latest.Labels == nil {
		latest.Labels = map[string]string{}
	}
	latest.Labels["status"] = "superseded"
	_ = cs.K8sClient.Update(ctx, &latest)
	return cs.K8sClient.Create(ctx, secret)
}

func (h *HelmReleaseHandler) list(c *gin.Context, namespace string, details bool) (*HelmReleaseList, error) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	user := c.MustGet("user").(model.User)
	ctx := c.Request.Context()
	var opts []client.ListOption
	opts = append(opts, client.MatchingLabels{"owner": "helm"})
	if namespace != "" && namespace != common.AllNamespaces {
		opts = append(opts, client.InNamespace(namespace))
	}
	var secretList corev1.SecretList
	if err := cs.K8sClient.List(ctx, &secretList, opts...); err != nil {
		return nil, err
	}
	latest := map[string]HelmRelease{}
	for i := range secretList.Items {
		sec := secretList.Items[i]
		if namespace == common.AllNamespaces && !rbac.CanAccessNamespace(user, cs.Name, sec.Namespace) {
			continue
		}
		rel, err := decodeHelmReleaseSecret(sec)
		if err != nil {
			continue
		}
		hr := toHelmRelease(sec, rel)
		if details {
			hr.Status.Resources = resolveManifestResources(ctx, cs, rel.Manifest, rel.Namespace)
		}
		key := hr.Namespace + "/" + hr.Name
		if prev, ok := latest[key]; !ok || hr.Spec.Revision > prev.Spec.Revision {
			latest[key] = hr
		}
	}
	items := make([]HelmRelease, 0, len(latest))
	for _, v := range latest {
		items = append(items, v)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].CreationTimestamp.After(items[j].CreationTimestamp.Time)
	})
	return &HelmReleaseList{TypeMeta: metav1.TypeMeta{Kind: "HelmReleaseList", APIVersion: "v1"}, Items: items}, nil
}

func (h *HelmReleaseHandler) get(c *gin.Context, namespace, name string, details bool) (*HelmRelease, error) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	ctx := c.Request.Context()
	secrets, err := h.releaseSecrets(ctx, cs, namespace, name)
	if err != nil {
		return nil, err
	}
	if len(secrets) == 0 {
		return nil, fmt.Errorf("helm release %s/%s not found", namespace, name)
	}
	sort.Slice(secrets, func(i, j int) bool {
		return helmSecretVersion(secrets[i]) > helmSecretVersion(secrets[j])
	})
	rel, err := decodeHelmReleaseSecret(secrets[0])
	if err != nil {
		return nil, err
	}
	hr := toHelmRelease(secrets[0], rel)
	if details {
		hr.Status.Resources = resolveManifestResources(ctx, cs, rel.Manifest, rel.Namespace)
	}
	return &hr, nil
}

func latestHelmReleaseSecret(secrets []corev1.Secret) (corev1.Secret, *helmReleaseFile, error) {
	if len(secrets) == 0 {
		return corev1.Secret{}, nil, fmt.Errorf("helm release not found")
	}
	sort.Slice(secrets, func(i, j int) bool {
		return helmSecretVersion(secrets[i]) > helmSecretVersion(secrets[j])
	})
	rel, err := decodeHelmReleaseSecret(secrets[0])
	if err != nil {
		return corev1.Secret{}, nil, err
	}
	return secrets[0], rel, nil
}

func (h *HelmReleaseHandler) releaseSecrets(ctx context.Context, cs *cluster.ClientSet, namespace, name string) ([]corev1.Secret, error) {
	var sl corev1.SecretList
	opts := []client.ListOption{client.InNamespace(namespace), client.MatchingLabels{"owner": "helm", "name": name}}
	if err := cs.K8sClient.List(ctx, &sl, opts...); err != nil {
		return nil, err
	}
	return sl.Items, nil
}

func decodeHelmReleaseSecret(sec corev1.Secret) (*helmReleaseFile, error) {
	raw, ok := sec.Data["release"]
	if !ok {
		return nil, fmt.Errorf("secret %s has no release payload", sec.Name)
	}
	decoded, err := base64.StdEncoding.DecodeString(string(raw))
	if err != nil {
		decoded = raw
	}
	gz, err := gzip.NewReader(bytes.NewReader(decoded))
	if err == nil {
		defer gz.Close()
		decoded, err = io.ReadAll(gz)
		if err != nil {
			return nil, err
		}
	}
	var rel helmReleaseFile
	if err := json.Unmarshal(decoded, &rel); err != nil {
		return nil, err
	}
	return &rel, nil
}

func encodeHelmRelease(rel *helmReleaseFile) ([]byte, error) {
	jsonPayload, err := json.Marshal(rel)
	if err != nil {
		return nil, err
	}
	var compressed bytes.Buffer
	gz := gzip.NewWriter(&compressed)
	if _, err := gz.Write(jsonPayload); err != nil {
		_ = gz.Close()
		return nil, err
	}
	if err := gz.Close(); err != nil {
		return nil, err
	}
	encoded := base64.StdEncoding.EncodeToString(compressed.Bytes())
	return []byte(encoded), nil
}

func toHelmRelease(sec corev1.Secret, rel *helmReleaseFile) HelmRelease {
	chart := rel.Chart.Metadata.Name
	if rel.Chart.Metadata.Version != "" {
		chart += "-" + rel.Chart.Metadata.Version
	}
	return HelmRelease{
		TypeMeta: metav1.TypeMeta{Kind: "HelmRelease", APIVersion: "v1"},
		ObjectMeta: metav1.ObjectMeta{
			Name:              rel.Name,
			Namespace:         rel.Namespace,
			UID:               sec.UID,
			ResourceVersion:   sec.ResourceVersion,
			CreationTimestamp: sec.CreationTimestamp,
			Labels:            sec.Labels,
			Annotations:       sec.Annotations,
		},
		Spec: HelmReleaseSpec{
			ReleaseName:  rel.Name,
			Namespace:    rel.Namespace,
			Chart:        chart,
			ChartName:    rel.Chart.Metadata.Name,
			ChartVersion: rel.Chart.Metadata.Version,
			AppVersion:   rel.Chart.Metadata.AppVersion,
			Revision:     rel.Version,
			Values:       rel.Config,
			Manifest:     rel.Manifest,
			Notes:        rel.Info.Notes,
			Description:  rel.Info.Description,
			Hooks:        rel.Hooks,
		},
		Status: HelmReleaseStatus{
			Status:        rel.Info.Status,
			FirstDeployed: timePtr(rel.Info.FirstDeployed),
			LastDeployed:  timePtr(rel.Info.LastDeployed),
			Deleted:       timePtr(rel.Info.Deleted),
		},
	}
}

func helmSecretVersion(sec corev1.Secret) int {
	if v := sec.Labels["version"]; v != "" {
		n, _ := strconv.Atoi(v)
		return n
	}
	parts := strings.Split(sec.Name, ".v")
	if len(parts) > 1 {
		n, _ := strconv.Atoi(parts[len(parts)-1])
		return n
	}
	return 0
}

func resolveManifestResources(ctx context.Context, cs *cluster.ClientSet, manifest, defaultNamespace string) []HelmReleaseResource {
	docs := strings.Split(manifest, "\n---")
	out := []HelmReleaseResource{}
	for _, doc := range docs {
		doc = strings.TrimSpace(doc)
		if doc == "" {
			continue
		}
		var u unstructured.Unstructured
		if err := yaml.Unmarshal([]byte(doc), &u.Object); err != nil || u.GetKind() == "" || u.GetName() == "" {
			continue
		}
		ns := u.GetNamespace()
		if ns == "" {
			ns = defaultNamespace
		}
		rr := HelmReleaseResource{
			APIVersion: u.GetAPIVersion(),
			Kind:       u.GetKind(),
			Name:       u.GetName(),
			Namespace:  ns,
		}
		live := &unstructured.Unstructured{}
		live.SetGroupVersionKind(u.GroupVersionKind())
		key := types.NamespacedName{Name: u.GetName(), Namespace: ns}
		if err := cs.K8sClient.Get(ctx, key, live); err == nil {
			rr.Status = "Ready"
		} else {
			rr.Status = "NotFound"
		}
		out = append(out, rr)
	}
	return out
}

func applyManifestResources(ctx context.Context, cs *cluster.ClientSet, manifest, defaultNamespace string) error {
	docs := strings.Split(manifest, "\n---")
	for _, doc := range docs {
		doc = strings.TrimSpace(doc)
		if doc == "" {
			continue
		}
		var u unstructured.Unstructured
		if err := yaml.Unmarshal([]byte(doc), &u.Object); err != nil || u.GetKind() == "" || u.GetName() == "" {
			continue
		}
		if u.GetNamespace() == "" {
			u.SetNamespace(defaultNamespace)
		}
		if err := cs.K8sClient.Patch(
			ctx,
			&u,
			client.Apply,
			client.FieldOwner("kite-helmrelease"),
			client.ForceOwnership,
		); err != nil {
			return err
		}
	}
	return nil
}

func deleteManifestResource(ctx context.Context, cs *cluster.ClientSet, rr HelmReleaseResource) error {
	gv, err := schema.ParseGroupVersion(rr.APIVersion)
	if err != nil {
		return err
	}
	u := &unstructured.Unstructured{}
	u.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   gv.Group,
		Version: gv.Version,
		Kind:    rr.Kind,
	})
	u.SetName(rr.Name)
	u.SetNamespace(rr.Namespace)
	return cs.K8sClient.Delete(ctx, u)
}
