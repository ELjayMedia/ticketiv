# Ticketiv Design System

This document defines the design system for Ticketiv, ensuring consistency across all screens and components.

## Design Tokens

All design tokens are defined in `lib/design-tokens.ts` and implemented via Tailwind CSS utilities. See `app/globals.css` for CSS custom properties.

### Color System

Use semantic color tokens for consistent theming:

```tsx
// Layout colors
bg-background text-foreground  // Page background
bg-card text-card-foreground   // Card surfaces
bg-popover text-popover-foreground  // Popovers and dropdowns

// Brand colors
bg-primary text-primary-foreground      // Primary actions
bg-secondary text-secondary-foreground  // Secondary actions
bg-accent text-accent-foreground        // Accent elements

// State colors
bg-muted text-muted-foreground              // Muted/disabled states
bg-destructive text-destructive-foreground  // Destructive actions
```

### Spacing Scale

Use Tailwind's spacing scale based on 4px increments:

```tsx
// Common spacing values
gap-2   // 8px - Tight spacing (card headers, button groups)
gap-4   // 16px - Default spacing (card content, form fields)
gap-6   // 24px - Loose spacing (card sections, page sections)

p-4     // 16px - Compact padding
p-6     // 24px - Default card padding
p-8     // 32px - Generous padding

// Mobile-first responsive spacing
px-4 lg:px-8  // Horizontal padding
py-6 lg:py-12 // Vertical padding
```

### Border Radius

```tsx
rounded-sm    // 6px - Small elements
rounded-md    // 8px - Default radius
rounded-lg    // 10px - Cards (base radius)
rounded-xl    // 14px - Large cards, modals
rounded-full  // Circular (avatars, pills)
```

### Typography

**Font Families:**
- `font-sans` - Geist (body text)
- `font-mono` - Geist Mono (code, technical content)

**Type Scale:**
```tsx
text-xs       // 12px - Fine print, captions
text-sm       // 14px - Body text (small), labels
text-base     // 16px - Body text (default)
text-lg       // 18px - Large body text
text-xl       // 20px - Subheadings
text-2xl      // 24px - Section headings
text-3xl      // 30px - Page headings
text-4xl      // 36px - Hero headings
```

**Font Weights:**
```tsx
font-normal    // 400 - Body text
font-medium    // 500 - Emphasis
font-semibold  // 600 - Headings
font-bold      // 700 - Strong emphasis
```

**Line Height:**
```tsx
leading-tight    // 1.25 - Headings
leading-normal   // 1.5 - Default
leading-relaxed  // 1.625 - Body text (recommended)
```

## Component Patterns

### Card Styles

**Default Card:**
```tsx
<Card className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 gap-6">
  <CardHeader className="gap-2">
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent className="gap-4">
    {/* Content */}
  </CardContent>
</Card>
```

**Interactive Card (Clickable):**
```tsx
<Card className="hover:shadow-md transition-shadow cursor-pointer">
  {/* Card content */}
</Card>
```

**Event Card:**
```tsx
<Card className="overflow-hidden">
  <div className="aspect-video bg-muted">
    <Image src={event.image || "/placeholder.svg"} alt={event.title} fill />
  </div>
  <div className="p-6 gap-4">
    <Badge>Category</Badge>
    <h3 className="text-xl font-semibold">{event.title}</h3>
    <p className="text-sm text-muted-foreground">{event.date}</p>
  </div>
</Card>
```

**Standard Card Spacing:**
- Padding: `p-6`
- Gap between sections: `gap-6`
- Header gap: `gap-2`
- Content gap: `gap-4`

### Button Hierarchy

**1. Primary Actions (Default variant)**
Use for main CTAs and primary actions:
```tsx
<Button variant="default" size="lg">Buy Tickets</Button>
<Button variant="default">Create Event</Button>
```

**2. Secondary Actions (Outline variant)**
Use for secondary actions and alternatives:
```tsx
<Button variant="outline">Learn More</Button>
<Button variant="outline">Cancel</Button>
```

**3. Tertiary Actions (Ghost variant)**
Use for low-emphasis actions and navigation:
```tsx
<Button variant="ghost">View Details</Button>
<Button variant="ghost" size="icon"><MoreVertical /></Button>
```

**4. Destructive Actions**
Use for dangerous actions:
```tsx
<Button variant="destructive">Delete Event</Button>
```

**5. Link Actions**
Use for inline text links:
```tsx
<Button variant="link">Terms and Conditions</Button>
```

**Button Sizes:**
```tsx
<Button size="sm">Small</Button>      // Compact spaces
<Button size="default">Default</Button> // Standard
<Button size="lg">Large</Button>      // Hero CTAs
<Button size="icon"><Heart /></Button> // Icon only
```

**Button Combinations:**
```tsx
// Primary + Secondary pattern
<div className="flex items-center gap-3">
  <Button variant="default">Primary</Button>
  <Button variant="outline">Secondary</Button>
</div>

// Icon + Text pattern
<Button>
  <Plus className="size-4" />
  Add Item
</Button>
```

## Layout Patterns

### Responsive Breakpoints

```tsx
lg:hidden          // Hide on desktop (lg+)
hidden lg:block    // Show only on desktop
```

Primary breakpoint: `lg` (1024px)

### Container Patterns

```tsx
// Full width container
<div className="container mx-auto px-4 sm:px-6 lg:px-8">

// Narrow content
<div className="max-w-3xl mx-auto px-4">

// Wide content
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Grid Layouts

```tsx
// 2-column responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// 3-column responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 4-column responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

### Flex Layouts

```tsx
// Vertical stack
<div className="flex flex-col gap-4">

// Horizontal row
<div className="flex flex-row items-center gap-4">

// Space between
<div className="flex items-center justify-between">

// Centered content
<div className="flex items-center justify-center">
```

## Mobile vs Desktop Patterns

Use the normalized routing pattern for materially different experiences:

```tsx
export default function Page() {
  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden">
        <MobileOptimizedLayout />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopOptimizedLayout />
      </div>
    </>
  )
}
```

## Accessibility

- Use semantic HTML elements
- Include ARIA labels for icon buttons: `<Button aria-label="Add to favorites">`
- Maintain focus states: All buttons have `focus-visible:ring-ring`
- Ensure proper color contrast
- Use `sr-only` for screen reader text

## Best Practices

1. **Always use semantic color tokens** - Never use hard-coded colors like `text-white` or `bg-black`
2. **Maintain consistent spacing** - Use the spacing scale, avoid arbitrary values
3. **Follow button hierarchy** - Primary → Secondary → Tertiary
4. **Keep card padding uniform** - Default to `p-6` with `gap-6`
5. **Mobile-first responsive** - Start with mobile layout, enhance for desktop
6. **Use my ability to quickly edit** - When updating files, skip unchanged code
7. **Test both mobile and desktop** - Every screen should work on all sizes

## Quick Reference

```tsx
// Standard page layout
<div className="container mx-auto px-4 py-12">
  <h1 className="text-3xl font-bold mb-8">Page Title</h1>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {items.map(item => (
      <Card key={item.id} className="p-6 gap-6">
        <CardHeader className="gap-2">
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          {/* Content */}
        </CardContent>
        <CardFooter>
          <Button variant="default">Primary</Button>
          <Button variant="outline">Secondary</Button>
        </CardFooter>
      </Card>
    ))}
  </div>
</div>
