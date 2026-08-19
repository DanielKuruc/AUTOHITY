import { Alert, AlertButton, AlertOptions, Platform } from 'react-native';

/**
 * Cross-platform náhrada za Alert.alert().
 *
 * react-native-web má Alert.alert() implementovaný jako prázdnou funkci
 * (`static alert() {}`), takže na webu se dialog nezobrazí a hlavně se NIKDY
 * nezavolá onPress - potvrzovací akce (odhlášení, mazání) tichounce nic
 * neudělají. Na webu proto padáme na window.confirm / window.alert.
 *
 * Signatura je záměrně shodná s Alert.alert(), aby šlo volání nahradit 1:1.
 *
 * Pozor: window.confirm umí jen dvě tlačítka. Alert se třemi a více se na webu
 * zjednoduší na "první nezrušující akce" vs "zrušit".
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons, options);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  // Bez tlačítek (nebo s jediným) jde jen o oznámení
  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }
  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
