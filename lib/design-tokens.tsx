/**
 * Ticketiv Design System Tokens
 *
 * This file documents the design tokens used throughout the Ticketiv application.
 * All tokens are defined in app/globals.css and consumed via Tailwind utility classes.
 */

export const designTokens = {
  /**
   * SPACING SCALE
   * Use Tailwind's spacing scale consistently across the app.
   * Based on 0.25rem (4px) increments.
   */
  spacing: {
    0: "0", // 0px
    px: "1px", // 1px
    0.5: "0.125rem", // 2px
    1: "0.25rem", // 4px
    1.5: "0.375rem", // 6px
    2: "0.5rem", // 8px
    2.5: "0.625rem", // 10px
    3: "0.75rem", // 12px
    3.5: "0.875rem", // 14px
    4: "1rem", // 16px - Base unit
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    7: "1.75rem", // 28px
    8: "2rem", // 32px
    9: "2.25rem", // 36px
    10: "2.5rem", // 40px
    11: "2.75rem", // 44px
    12: "3rem", // 48px
    14: "3.5rem", // 56px
    16: "4rem", // 64px
    20: "5rem", // 80px
    24: "6rem", // 96px
    28: "7rem", // 112px
    32: "8rem", // 128px
  },

  /**
   * BORDER RADIUS
   * Use semantic radius values defined in globals.css
   * Base radius: 0.625rem (10px)
   */
  radius: {
    sm: "rounded-sm", // radius-sm: 6px
    DEFAULT: "rounded", // radius-md: 8px
    md: "rounded-md", // radius-md: 8px
    lg: "rounded-lg", // radius-lg: 10px (base)
    xl: "rounded-xl", // radius-xl: 14px
    "2xl": "rounded-2xl", // 16px
    "3xl": "rounded-3xl", // 24px
    full: "rounded-full", // 9999px (circular)
  },

  /**
   * TYPOGRAPHY SCALE
   * Font families: Geist Sans (body), Geist Mono (code)
   */
  typography: {
    fontFamily: {
      sans: "font-sans", // Geist
      mono: "font-mono", // Geist Mono
    },

    fontSize: {
      xs: "text-xs", // 0.75rem (12px), line-height: 1rem
      sm: "text-sm", // 0.875rem (14px), line-height: 1.25rem
      base: "text-base", // 1rem (16px), line-height: 1.5rem
      lg: "text-lg", // 1.125rem (18px), line-height: 1.75rem
      xl: "text-xl", // 1.25rem (20px), line-height: 1.75rem
      "2xl": "text-2xl", // 1.5rem (24px), line-height: 2rem
      "3xl": "text-3xl", // 1.875rem (30px), line-height: 2.25rem
      "4xl": "text-4xl", // 2.25rem (36px), line-height: 2.5rem
      "5xl": "text-5xl", // 3rem (48px), line-height: 1
      "6xl": "text-6xl", // 3.75rem (60px), line-height: 1
    },

    fontWeight: {
      normal: "font-normal", // 400
      medium: "font-medium", // 500
      semibold: "font-semibold", // 600
      bold: "font-bold", // 700
    },

    lineHeight: {
      none: "leading-none", // 1
      tight: "leading-tight", // 1.25
      snug: "leading-snug", // 1.375
      normal: "leading-normal", // 1.5
      relaxed: "leading-relaxed", // 1.625 - Recommended for body text
      loose: "leading-loose", // 2
    },

    letterSpacing: {
      tighter: "tracking-tighter", // -0.05em
      tight: "tracking-tight", // -0.025em
      normal: "tracking-normal", // 0em
      wide: "tracking-wide", // 0.025em
      wider: "tracking-wider", // 0.05em
    },
  },

  /**
   * SHADOWS
   * Shadow scale for elevation and depth
   */
  shadows: {
    sm: "shadow-sm", // Subtle shadow for cards
    DEFAULT: "shadow", // Default shadow
    md: "shadow-md", // Medium shadow for elevated cards
    lg: "shadow-lg", // Large shadow for modals
    xl: "shadow-xl", // Extra large shadow
    "2xl": "shadow-2xl", // Maximum shadow
    none: "shadow-none", // Remove shadow
  },

  /**
   * BREAKPOINTS
   * Responsive design breakpoints
   */
  breakpoints: {
    sm: "640px", // Mobile landscape
    md: "768px", // Tablet
    lg: "1024px", // Desktop (primary breakpoint)
    xl: "1280px", // Large desktop
    "2xl": "1536px", // Extra large desktop
  },

  /**
   * COLOR SEMANTIC TOKENS
   * Use semantic color classes defined in globals.css
   */
  colors: {
    // Layout
    background: "bg-background text-foreground",
    card: "bg-card text-card-foreground",
    popover: "bg-popover text-popover-foreground",

    // Brand
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",

    // States
    muted: "bg-muted text-muted-foreground",
    destructive: "bg-destructive text-destructive-foreground",

    // Form elements
    border: "border-border",
    input: "bg-input",
    ring: "ring-ring",
  },
}

/**
 * COMPONENT PATTERNS
 */

export const componentPatterns = {
  /**
   * CARD STYLES
   * Standard card configurations for consistent appearance
   */
  cards: {
    // Default card - Used for content containers
    default: "bg-card text-card-foreground rounded-xl border shadow-sm",

    // Interactive card - Hover states for clickable cards
    interactive:
      "bg-card text-card-foreground rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer",

    // Elevated card - More prominent shadow
    elevated: "bg-card text-card-foreground rounded-xl border shadow-md",

    // Flat card - Minimal shadow, subtle appearance
    flat: "bg-card text-card-foreground rounded-xl border",

    // Event card - Special card for event listings
    event: "bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden",

    // Ticket card - Special card for ticket displays
    ticket: "bg-gradient-to-br from-card to-card/80 rounded-xl border shadow-md",
  },

  /**
   * CARD SPACING
   * Standard padding and gap values for card internals
   */
  cardSpacing: {
    padding: "p-6", // Default card padding
    gap: "gap-6", // Gap between card sections
    headerGap: "gap-2", // Gap in card header
    contentGap: "gap-4", // Gap in card content
  },

  /**
   * BUTTON HIERARCHY
   * Button variants by visual hierarchy and usage
   */
  buttons: {
    // Primary action - Main CTAs
    primary: {
      variant: "default",
      usage: 'Primary actions like "Buy Tickets", "Create Event", "Submit"',
      example: '<Button variant="default">Buy Tickets</Button>',
    },

    // Secondary action - Supporting actions
    secondary: {
      variant: "outline",
      usage: 'Secondary actions like "Learn More", "Cancel", "Back"',
      example: '<Button variant="outline">Learn More</Button>',
    },

    // Tertiary action - Low emphasis actions
    tertiary: {
      variant: "ghost",
      usage: 'Tertiary actions like navigation items, "View Details"',
      example: '<Button variant="ghost">View Details</Button>',
    },

    // Destructive action - Delete, remove, dangerous actions
    destructive: {
      variant: "destructive",
      usage: 'Destructive actions like "Delete", "Remove", "Cancel Order"',
      example: '<Button variant="destructive">Delete Event</Button>',
    },

    // Link action - Text-only link appearance
    link: {
      variant: "link",
      usage: 'Inline links, "Learn more" links',
      example: '<Button variant="link">Terms and Conditions</Button>',
    },
  },

  /**
   * BUTTON SIZES
   */
  buttonSizes: {
    sm: { size: "sm", usage: "Compact spaces, table actions" },
    default: { size: "default", usage: "Standard buttons" },
    lg: { size: "lg", usage: "Primary CTAs, hero actions" },
    icon: { size: "icon", usage: "Icon-only buttons" },
  },

  /**
   * LAYOUT PATTERNS
   */
  layouts: {
    // Container widths
    container: "container mx-auto px-4 sm:px-6 lg:px-8",
    narrow: "max-w-3xl mx-auto px-4",
    wide: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",

    // Section spacing
    section: "py-12 lg:py-20",
    sectionTight: "py-8 lg:py-12",

    // Grid layouts
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-6",
    grid3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    grid4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",

    // Flex layouts
    stack: "flex flex-col gap-4",
    stackTight: "flex flex-col gap-2",
    row: "flex flex-row items-center gap-4",
    rowTight: "flex flex-row items-center gap-2",
    between: "flex items-center justify-between",
  },
}

/**
 * USAGE EXAMPLES
 */

export const usageExamples = {
  // Card with consistent spacing
  standardCard: `
    <Card className="p-6 gap-6">
      <CardHeader className="gap-2">
        <CardTitle>Event Title</CardTitle>
        <CardDescription>Event description</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {/* Content */}
      </CardContent>
    </Card>
  `,

  // Interactive event card
  eventCard: `
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="aspect-video bg-muted" />
      <div className="p-6 gap-4">
        <h3 className="text-xl font-semibold">Event Name</h3>
        <p className="text-sm text-muted-foreground">Event details</p>
      </div>
    </Card>
  `,

  // Button group with hierarchy
  buttonGroup: `
    <div className="flex items-center gap-3">
      <Button variant="default" size="lg">Buy Tickets</Button>
      <Button variant="outline">Learn More</Button>
      <Button variant="ghost" size="icon"><Heart /></Button>
    </div>
  `,

  // Responsive layout
  responsiveGrid: `
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {items.map(item => <Card key={item.id}>...</Card>)}
    </div>
  `,
}

export default designTokens
