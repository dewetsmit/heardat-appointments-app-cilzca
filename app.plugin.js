
const { withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

/**
 * Expo config plugin to ensure Material Components theme is properly configured
 * for react-native-edge-to-edge and other Material-dependent libraries
 */
const withMaterialComponentsTheme = (config) => {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    
    // Ensure we have a styles object
    if (!styles.resources) {
      styles.resources = {};
    }
    
    if (!styles.resources.style) {
      styles.resources.style = [];
    }
    
    // Find or create the AppTheme style
    let appThemeIndex = styles.resources.style.findIndex(
      (style) => style.$.name === 'AppTheme'
    );
    
    if (appThemeIndex === -1) {
      // Create new AppTheme if it doesn't exist
      styles.resources.style.push({
        $: {
          name: 'AppTheme',
          parent: 'Theme.MaterialComponents.DayNight.NoActionBar'
        },
        item: [
          {
            _: '@android:color/transparent',
            $: { name: 'android:statusBarColor' }
          },
          {
            _: 'true',
            $: { name: 'android:windowLightStatusBar' }
          },
          {
            _: 'false',
            $: { name: 'android:windowTranslucentStatus' }
          },
          {
            _: 'false',
            $: { name: 'android:windowTranslucentNavigation' }
          }
        ]
      });
    } else {
      // Update existing AppTheme to use Material Components parent
      const appTheme = styles.resources.style[appThemeIndex];
      appTheme.$.parent = 'Theme.MaterialComponents.DayNight.NoActionBar';
      
      // Ensure required items exist
      if (!appTheme.item) {
        appTheme.item = [];
      }
      
      const requiredItems = [
        { name: 'android:statusBarColor', value: '@android:color/transparent' },
        { name: 'android:windowLightStatusBar', value: 'true' },
        { name: 'android:windowTranslucentStatus', value: 'false' },
        { name: 'android:windowTranslucentNavigation', value: 'false' }
      ];
      
      requiredItems.forEach(({ name, value }) => {
        const existingItem = appTheme.item.find((item) => item.$.name === name);
        if (!existingItem) {
          appTheme.item.push({
            _: value,
            $: { name }
          });
        }
      });
    }
    
    return config;
  });
};

module.exports = (config) => {
  config = withMaterialComponentsTheme(config);
  return config;
};
