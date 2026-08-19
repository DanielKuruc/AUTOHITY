import { useWindowDimensions, Platform } from 'react-native';

export const useTabletLayout = () => {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // iPad/Tablet detection: width > 600dp AND Platform supports it
  const isTablet = width >= 600;

  // Layout mode
  const layoutMode = isTablet ? 'tablet' : 'phone';

  // Grid columns for purchase list — na webu širší monitory dostanou víc sloupců
  let gridColumns: number;
  if (!isTablet) {
    gridColumns = 1;
  } else if (isWeb) {
    if (width >= 1800) gridColumns = 5;
    else if (width >= 1400) gridColumns = 4;
    else if (width >= 1100) gridColumns = 3;
    else gridColumns = 2;
  } else {
    gridColumns = width >= 1000 ? 3 : 2;
  }

  // Sidebar width for tablet
  const sidebarWidth = isTablet ? 280 : 0;

  // Content width
  const contentWidth = isTablet ? width - sidebarWidth : width;

  // Form layout: split-view on tablet
  const isSplitView = isTablet && height > 700;

  // Photo grid columns
  const photoGridColumns = isTablet ? (width >= 1000 ? 4 : 3) : 2;

  // Kompaktní tablet varianta pro web (menší foto, kompaktnější typografie)
  const isCompact = isWeb && isTablet;

  return {
    isTablet,
    isWeb,
    isCompact,
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
