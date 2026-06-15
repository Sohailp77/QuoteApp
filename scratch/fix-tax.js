const fs = require('fs');

const path = '/home/cctns/Documents/Projects/quote-native-app/src/screens/profile/TaxRatesScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Instantiate createStyles
content = content.replace(
  'const { colors } = useAppTheme();\n  const nav = useNavigation();',
  'const { colors } = useAppTheme();\n  const styles = createStyles(colors);\n  const nav = useNavigation();'
);

// 2. Replace all Colors. with colors.
content = content.replace(/Colors\./g, 'colors.');

// 3. Replace all colors.accent with colors.primary
content = content.replace(/colors\.accent/g, 'colors.primary');

// 4. Change const styles = StyleSheet.create({ to const createStyles = (colors: any) => StyleSheet.create({
content = content.replace(
  'const styles = StyleSheet.create({',
  'const createStyles = (colors: any) => StyleSheet.create({'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed TaxRatesScreen.tsx');
