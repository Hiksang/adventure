# Task Completion Checklist

When completing a task:

1. **Lint check**
   ```bash
   pnpm lint
   ```

2. **Build verification**
   ```bash
   pnpm build
   ```

3. **Type checking**
   Build includes TypeScript type checking

4. **Local testing**
   ```bash
   pnpm dev
   # Test in browser at http://localhost:3000
   ```

5. **Database changes**
   - Add migration files to `supabase/migrations/`
   - Name format: `00X_descriptive_name.sql`
   - Run in Supabase dashboard or via CLI
