# Code Style & Conventions

## TypeScript
- Strict TypeScript with type definitions
- Types in `types/` directory
- Interface naming: PascalCase (e.g., `AuthContextType`)
- No explicit return types required on simple functions

## React
- Functional components with hooks
- 'use client' directive for client components
- Context for global state (useAuth hook pattern)
- Named exports for components

## File Naming
- Components: PascalCase.tsx (e.g., `FeedContainer.tsx`)
- API routes: route.ts
- Utilities: camelCase.ts (e.g., `challengeStore.ts`)
- Index exports: index.ts for component barrels

## API Routes
- Next.js App Router style
- POST/GET functions exported from route.ts
- JSON responses with success/error pattern:
  ```typescript
  { success: true, data: ... }
  { success: false, error: 'message' }
  ```

## Styling
- TailwindCSS utility classes
- Responsive mobile-first design
- Dark theme with gradients (purple/blue)

## Error Handling
- try/catch with console.warn/error logging
- Return appropriate HTTP status codes
- User-friendly error messages
