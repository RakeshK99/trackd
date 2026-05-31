import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { T } from '@/theme/tokens';
import { logoUrl, searchCompanies, type CompanyHint } from '@/lib/companies';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  /** Called when the user picks a suggestion (vs. just typing). */
  onSelectSuggestion?: (hint: CompanyHint) => void;
  placeholder?: string;
}

export function CompanyAutocomplete({ value, onChangeText, onSelectSuggestion, placeholder }: Props) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const suggestions = useMemo(() => searchCompanies(value, 5), [value]);
  const exactMatch = suggestions.some((s) => s.name.toLowerCase() === value.trim().toLowerCase());
  const showSuggestions = focused && !dismissed && suggestions.length > 0 && !exactMatch;

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(t) => {
          setDismissed(false);
          onChangeText(t);
        }}
        placeholder={placeholder ?? 'Stripe'}
        placeholderTextColor={T.ink3}
        style={styles.input}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        autoCapitalize="words"
      />
      {showSuggestions && (
        <View style={styles.dropdown}>
          {suggestions.map((s) => (
            <Pressable
              key={s.domain}
              onPress={() => {
                onChangeText(s.name);
                onSelectSuggestion?.(s);
                setDismissed(true);
              }}
              style={styles.row}
            >
              <Image source={{ uri: logoUrl(s.domain, 48) }} style={styles.logo} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.domain}>{s.domain}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: T.ink,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: T.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: T.border,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: T.surface3,
  },
  name: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: T.ink },
  domain: { fontFamily: 'DMMono_400Regular', fontSize: 11, color: T.ink3 },
});
