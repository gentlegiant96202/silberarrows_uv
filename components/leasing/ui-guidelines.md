# Leasing Module UI Guidelines

## shadcn/ui Component Usage

This document enforces the use of **ONLY** shadcn/ui components within the leasing module to maintain consistency, accessibility, and design standards.

## Available Components

### Core Components
- `Button` - All interactive buttons
- `Card` - Container components for lease items
- `Dialog` - Modal dialogs and overlays
- `Input` - Text input fields
- `Textarea` - Multi-line text inputs
- `Label` - Form labels
- `Select` - Dropdown selections
- `Badge` - Status indicators
- `Avatar` - User profile images
- `Separator` - Visual dividers
- `Sheet` - Side panels and drawers
- `Form` - Form handling and validation

### Import Pattern
```typescript
// ✅ CORRECT - Use shadcn/ui components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// ❌ INCORRECT - Don't use custom components or other libraries
import { CustomButton } from "@/components/custom/button"
import { SomeOtherButton } from "some-ui-library"
```

## Design Consistency

### Color Scheme
All components should maintain the existing white/silver gradient theme:
- Use `bg-white/5 backdrop-blur-sm border border-white/10` for glass morphism
- Apply `bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black` for active states
- Maintain `text-white/70` for secondary text

### Component Customization
Since shadcn/ui provides source code, customize components by:
1. Modifying the component files directly in `/components/ui/`
2. Using the `cn()` utility function for conditional classes
3. Extending with custom variants using `class-variance-authority`

## Enforcement Rules

1. **Only shadcn/ui components** are allowed in the leasing module
2. **No custom UI components** unless they extend shadcn/ui components
3. **No third-party UI libraries** (except lucide-react for icons)
4. **All styling** must use Tailwind CSS classes
5. **Accessibility** is built-in with shadcn/ui components

## Component Mapping

| Use Case | shadcn/ui Component | Custom Classes |
|----------|-------------------|----------------|
| Kanban Cards | `Card` | Glass morphism styling |
| Action Buttons | `Button` | Silver gradient variants |
| Modals | `Dialog` | Dark theme customization |
| Form Inputs | `Input`, `Textarea`, `Select` | Consistent styling |
| Status Indicators | `Badge` | Custom color variants |
| Navigation | `Button` with variants | Header styling |

## AI Assistant Instructions

When working on the leasing module:
1. **ALWAYS** use shadcn/ui components from `@/components/ui/`
2. **NEVER** create custom UI components
3. **CUSTOMIZE** existing shadcn/ui components by modifying their source code
4. **MAINTAIN** the existing design language and color scheme
5. **ENSURE** all components are accessible and follow shadcn/ui patterns
