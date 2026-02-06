import { useWindowDimensions, Platform } from 'react-native';

export const useTabletLayout = () => {
  const { width, height } = useWindowDimensions();
  
  // iPad/Tablet detection: width > 600dp AND Platform supports it
  const isTablet = width >= 600;
  
  // Layout mode
  const layoutMode = isTablet ? 'tablet' : 'phone';
  
  // Grid columns for purchase list
  const gridColumns = isTablet ? (width >= 1000 ? 3 : 2) : 1;
  
  // Sidebar width for tablet
  const sidebarWidth = isTablet ? 280 : 0;
  
  // Content width
  const contentWidth = isTablet ? width - sidebarWidth : width;
  
  // Form layout: split-view on tablet
  const isSplitView = isTablet && height > 700;
  
  // Photo grid columns
  const photoGridColumns = isTablet ? (width >= 1000 ? 4 : 3) : 2;
  
  return {
    isTablet,
    layoutMode,
    gridColumns,
    sidebarWidth,
    contentWidth,
    isSplitView,
    photoGridColumns,
    width,
    height,
  };
};
