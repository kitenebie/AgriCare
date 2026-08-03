# 🤖 PROMPTS.md — AgriCare

## AI Rules
1. Hierarchical architecture (app → components → services → hooks → utils → constants → types)
2. TypeScript strict — no `any` (use proper types)
3. Animations: `react-native-reanimated` only
4. Images: `expo-image` only
5. Icons: `lucide-react-native` via `<Icon>` wrapper
6. Colors/spacing: `@/constants/theme` only
7. Asset paths: relative (never `@/../../`)
8. All pages scrollable
9. After EVERY task → update all 15 MD files
10. Firebase data layer in `src/services/`

## When Adding a Firebase Feature
```
1. Add function to appropriate service file
2. Add types to src/types/index.ts
3. Update seedDatabase.ts if mock data needed
4. Update API.md with new endpoints
5. Update TASKS.md, CHANGELOG.md
```
