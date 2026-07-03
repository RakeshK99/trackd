import { Alert, Linking } from 'react-native';

/** Open an external URL, surfacing a fallback alert instead of failing silently. */
export async function openExternalUrl(url: string, label: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(`Couldn't open ${label}`, `Open this manually in your browser:\n${url}`);
  }
}
