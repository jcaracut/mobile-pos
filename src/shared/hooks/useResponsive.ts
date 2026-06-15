import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const isLandscape = width > height;
  return { width, height, isTablet, isLandscape };
}
