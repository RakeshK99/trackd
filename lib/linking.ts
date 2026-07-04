import { Alert, Linking } from 'react-native';

/** Open an external URL, surfacing a fallback alert instead of failing silently. */
export async function openExternalUrl(url: string, label: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(`Couldn't open ${label}`, `Open this manually in your browser:\n${url}`);
  }
}

/**
 * Open Gmail — the native app if installed, else the web inbox. There is no
 * reliable deep link (app or web) straight to the filter-creation screen on
 * mobile: Gmail's mobile web view doesn't honor the `#settings/filters` hash
 * route desktop uses (it just lands on the inbox), and the Gmail app exposes
 * no documented "create filter" URL scheme. So this only gets the user to
 * Gmail — the numbered steps in the UI cover the manual nav from there.
 */
export async function openGmail() {
  try {
    await Linking.openURL('googlegmail://');
    return;
  } catch {
    // Gmail app not installed (or scheme unavailable) — fall back to web.
  }
  await openExternalUrl('https://mail.google.com/mail/u/0/', 'Gmail');
}
