// Theme colors inspired by PfotenDoc but unique
export const COLORS = {
  // Primary colors (warm, friendly)
  primary: '#FF8C61',       // Coral orange (main accent)
  primaryLight: '#FFB89A',
  primaryDark: '#E56B45',
  
  // Secondary colors
  secondary: '#6BADC6',     // Soft blue
  secondaryLight: '#A2D5E8',
  secondaryDark: '#4A8FA7',
  
  // Status colors
  success: '#4CAF50',       // Green (safe foods)
  warning: '#FF9800',       // Orange (caution)
  danger: '#F44336',        // Red (toxic)
  info: '#2196F3',
  
  // Neutrals
  background: '#F8F8F8',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  
  // Special
  premium: '#FFD700',       // Gold
  admin: '#9C27B0',         // Purple
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};
