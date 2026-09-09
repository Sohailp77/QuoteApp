import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the height of the floating tab bar plus any extra padding needed
 * so that scrollable content is never hidden behind the tab bar.
 *
 * Tab bar layout (from MainNavigator):
 *   height: 64 (tabBar height)
 *   bottom: Math.max(insets.bottom, 14) + 6
 *   The bar sits visually above all content at that offset.
 *
 * Total space consumed from the bottom of the viewport:
 *   tabBarBottom + tabBarHeight + extra breathing room (16)
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 14) + 6;
  const TAB_BAR_HEIGHT = 64;
  const BREATHING = 16;
  return tabBarBottom + TAB_BAR_HEIGHT + BREATHING;
}
