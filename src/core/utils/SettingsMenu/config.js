// Configuration settings for the SettingsMenu component
const settingsConfig = {
  // Icon settings
  // Available icon options: 'gear' or 'hamburger'
  iconType: 'gear', // Choose between 'gear' or 'hamburger'
  icons: {
    gear: {
      color: 'white',
      size: 28, // Size in pixels
    },
    hamburger: {
      color: 'white',
      size: 28, // Size in pixels
    },
  },
  menu: {
    backgroundColor: 'rgb(23, 23, 23)', // Neutral-900 equivalent
    borderColor: 'rgb(38, 38, 38)', // Neutral-800 equivalent
    textColor: 'white',
    animationDuration: 0.3, // seconds
    borderRadius: '8px',
    padding: '16px',
  },
};

export default settingsConfig;
