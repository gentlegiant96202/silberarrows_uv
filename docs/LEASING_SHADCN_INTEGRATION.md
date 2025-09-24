# Leasing Module - shadcn/ui Integration Guide

## Overview

The leasing module has been fully integrated with **shadcn/ui** components to ensure consistency, accessibility, and maintainability. This document explains how to work with shadcn/ui components in the leasing module.

## What is shadcn/ui?

shadcn/ui is **not a traditional component library**. Instead, it's a collection of copy-and-paste components that you own and control:

- **Open Code**: You have full access to component source code
- **Customizable**: Modify components directly to fit your needs
- **Accessible**: Built with accessibility standards
- **AI-Friendly**: Open code that AI can read and improve
- **Composable**: Consistent API across all components

## Project Setup ✅

The following has been configured in your project:

### 1. shadcn/ui Initialization
```bash
npx shadcn@latest init
```

### 2. Installed Components
- `Button` - Interactive buttons with variants
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
- `DropdownMenu` - Context menus

### 3. Configuration Files
- `components.json` - shadcn/ui configuration
- `lib/utils.ts` - Utility functions including `cn()`
- `components/ui/` - All shadcn/ui component source code

## Usage Rules for Leasing Module

### ✅ CORRECT Usage

```typescript
// Import from the leasing-specific export file
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Dialog,
  DialogContent,
  Badge,
  cn 
} from "@/components/leasing/shadcn-components";

// Use components with custom styling
<Card className={cn("bg-white/10 backdrop-blur-sm", className)}>
  <CardHeader>
    <CardTitle>Lease Details</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default">Action</Button>
  </CardContent>
</Card>
```

### ❌ INCORRECT Usage

```typescript
// Don't import directly from ui components
import { Button } from "@/components/ui/button";

// Don't use other UI libraries
import { Button } from "antd";
import { Button } from "@mui/material";

// Don't create custom UI components
import { CustomButton } from "@/components/custom/button";
```

## Component Customization

Since you own the component code, you can customize any component:

### Method 1: Direct File Modification
Edit the component files in `/components/ui/` directly:

```typescript
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground...",
        // Add your custom variant
        silver: "bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black hover:shadow-lg",
      }
    }
  }
)
```

### Method 2: Runtime Customization
Use the `cn()` utility for conditional styling:

```typescript
<Button 
  className={cn(
    "bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black",
    isActive && "shadow-lg",
    className
  )}
>
  Custom Styled Button
</Button>
```

## Leasing Module Implementation

The `LeasingKanbanBoard` has been refactored to use only shadcn/ui components:

### Key Changes Made:
1. **Card Components**: Replaced custom divs with `Card`, `CardHeader`, `CardContent`
2. **Button Components**: All buttons now use shadcn/ui `Button` with variants
3. **Dialog Modal**: Replaced custom modal with shadcn/ui `Dialog`
4. **Badge Components**: Status indicators use shadcn/ui `Badge`
5. **Consistent Styling**: All components use the `cn()` utility for styling

### Design Consistency Maintained:
- ✅ White/silver gradient theme [[memory:7055457]]
- ✅ Glass morphism effects
- ✅ Custom scrollbars [[memory:7055451]]
- ✅ Same hover and interaction patterns

## Enforcement System

### 1. Component Export Control
All UI components must be imported from:
```typescript
import { ... } from "@/components/leasing/shadcn-components";
```

### 2. ESLint Rules
Custom ESLint configuration prevents:
- Direct imports from `@/components/ui/*`
- Third-party UI library usage
- Non-lucide icon libraries

### 3. Guidelines Documentation
- `components/leasing/ui-guidelines.md` - Detailed usage rules
- `docs/LEASING_SHADCN_INTEGRATION.md` - This comprehensive guide

## Adding New Components

When you need a new shadcn/ui component:

```bash
# Add the component
npx shadcn@latest add [component-name]

# Export it in the leasing components file
# components/leasing/shadcn-components.ts
export { NewComponent } from "@/components/ui/new-component";
```

## Benefits for AI Collaboration

1. **Predictable API**: All components follow the same patterns
2. **Open Source Code**: AI can read and understand component implementation
3. **Consistent Styling**: Easy to maintain design system
4. **Type Safety**: Full TypeScript support
5. **Accessibility**: Built-in ARIA attributes and keyboard navigation

## Development Workflow

1. **Design**: Use shadcn/ui components as building blocks
2. **Customize**: Modify component source code or use `cn()` utility
3. **Implement**: Import from `@/components/leasing/shadcn-components`
4. **Test**: Components are accessible and consistent by default
5. **Maintain**: Update component source code as needed

## Next Steps

The leasing module is now fully integrated with shadcn/ui. You can:

1. **Add more components** as needed using `npx shadcn@latest add [component]`
2. **Customize existing components** by editing files in `/components/ui/`
3. **Extend the theme** by adding variants to the `leasingTheme` object
4. **Build new features** using only shadcn/ui components

This setup ensures that all future development in the leasing module will be consistent, accessible, and maintainable while giving you full control over the component code.
