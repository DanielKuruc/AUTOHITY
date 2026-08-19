import { Platform } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

const FLOATING_ON_IPAD: KeyboardTypeOptions[] = ['numeric', 'number-pad', 'decimal-pad', 'phone-pad'];

/**
 * On iPadOS, numeric/phone-pad keyboards render as a small floating popover
 * near the input's caret instead of a full-width docked keyboard, which can
 * overlap nearby fields (see support screenshot from the new-purchase form).
 * Swapping to the numbers page of the full keyboard keeps digit entry but
 * docks properly like on iPhone.
 */
export function resolveKeyboardType(keyboardType?: KeyboardTypeOptions): KeyboardTypeOptions {
  if (!keyboardType) return 'default';
  if (Platform.OS === 'ios' && Platform.isPad && FLOATING_ON_IPAD.includes(keyboardType)) {
    return 'numbers-and-punctuation';
  }
  return keyboardType;
}
