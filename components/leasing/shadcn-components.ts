/**
 * Leasing Module - shadcn/ui Component Exports
 * 
 * This file serves as the ONLY source of UI components for the leasing module.
 * All components in the leasing module MUST import from this file to ensure
 * consistent use of shadcn/ui components.
 */

// Core shadcn/ui components - ONLY these are allowed in leasing module
export { Button, buttonVariants } from "@/components/ui/button";
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Label } from "@/components/ui/label";
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export { Badge } from "@/components/ui/badge";
export { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
export { Separator } from "@/components/ui/separator";
export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export { Checkbox } from "@/components/ui/checkbox";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export { Calendar } from "@/components/ui/calendar";
export { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
export { Progress } from "@/components/ui/progress";
export { Skeleton } from "@/components/ui/skeleton";

// Utility functions
export { cn } from "@/lib/utils";

// Icons - Only lucide-react is allowed
export * from "lucide-react";

/**
 * USAGE RULES:
 * 
 * ✅ CORRECT:
 * import { Button, Card, Dialog } from "@/components/leasing/shadcn-components";
 * 
 * ❌ INCORRECT:
 * import { Button } from "@/components/ui/button";
 * import { CustomButton } from "@/components/custom/button";
 * import { SomeButton } from "some-library";
 * 
 * This ensures:
 * 1. Only approved shadcn/ui components are used
 * 2. Consistent imports across the leasing module
 * 3. Easy enforcement and maintenance
 * 4. Clear component boundaries
 */

// Type exports for TypeScript support
export type { ButtonProps } from "@/components/ui/button";

/**
 * Custom variants for leasing module styling
 * These extend the base shadcn/ui components with our design system
 */
export const leasingTheme = {
  card: {
    glass: "bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 hover:border-white/30",
    skeleton: "bg-white/5 border-white/10 animate-pulse"
  },
  button: {
    silver: "bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black hover:shadow-lg",
    ghost: "text-white/70 hover:text-white hover:bg-black/60"
  },
  text: {
    primary: "text-white",
    secondary: "text-white/70",
    muted: "text-white/50",
    disabled: "text-white/40"
  }
} as const;
