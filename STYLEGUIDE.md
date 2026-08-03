# 🎨 STYLEGUIDE.md — AgriCare

## Design Tokens
- Primary: `#1B5E20` | Secondary: `#4CAF50` | Accent: `#81C784`
- Background: `#FFFFFF` | Surface: `#F5F5F5`
- Error: `#D32F2F` | Warning: `#FF9800` | Star: `#FFC107`

## Icons
- Library: `lucide-react-native`
- Usage: `<Icon name="home" size={24} color={Colors.primary} />`
- Wrapper: `src/components/ui/Icon.tsx` (maps custom names → Lucide components)

## Component Rules
1. TypeScript props interface required
2. Animations via `react-native-reanimated` only
3. Images via `expo-image`
4. All colors/spacing from `@/constants/theme`
5. All pages wrapped in `ScrollView`
6. Asset paths: use relative (e.g. `../../../../assets/app/man.png`)

## Naming
| Item | Convention |
|------|-----------|
| Component file | PascalCase (`TechnicianCard.tsx`) |
| Service file | camelCase (`chatService.ts`) |
| Hook file | camelCase + `use` prefix |
| Type/Interface | PascalCase |
