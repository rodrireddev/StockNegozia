// Mobile habla con el backend de la PC por la LAN en HTTP (http://<ip>:38123): Android bloquea el
// tráfico sin cifrar en builds de release si el manifest no lo permite. El acceso lo controla el backend.
const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults.manifest.application[0].$["android:usesCleartextTraffic"] = "true";
    return cfg;
  });
};
