LaptopPOS Service Management System
Overview

LaptopPOS is a comprehensive Point of Sale and service management system specifically designed for laptop sales and repair businesses. The application combines traditional POS functionality with service ticket management, inventory tracking, and financial reporting. Built with modern web technologies, it provides a complete business management solution for laptop retailers and service centers.
User Preferences

Preferred communication style: Simple, everyday language.
System Architecture
Frontend Architecture

    Framework: React with TypeScript for type safety and better development experience
    Routing: Wouter for lightweight client-side routing
    UI Components: shadcn/ui component library built on Radix UI primitives for accessibility and consistency
    Styling: Tailwind CSS with custom design tokens and CSS variables for theming
    State Management: TanStack Query (React Query) for server state management and caching
    Build Tool: Vite for fast development and optimized production builds

Backend Architecture

    Runtime: Node.js with Express.js framework for RESTful API endpoints
    Language: TypeScript throughout for consistent type safety across the stack
    Database ORM: Drizzle ORM for type-safe database operations and schema management
    Authentication: Replit Auth integration with role-based access control (admin, kasir, teknisi, purchasing, finance, owner)
    Session Management: PostgreSQL-backed sessions using connect-pg-simple

Database Design

    Primary Database: PostgreSQL with Neon serverless hosting
    Schema Management: Drizzle Kit for migrations and schema versioning
    Core Entities: Users, products, customers, suppliers, transactions, service tickets, financial records, and store configuration
    Relationship Structure: Well-defined foreign key relationships with proper indexing for performance

Authentication & Authorization

    Authentication Provider: Replit Auth with JWT token handling
    Session Storage: Database-backed sessions for persistent login state
    Role-Based Access: Six distinct user roles with feature-specific permissions
    Middleware Protection: Route-level authentication checks with role validation
    Session Security: Cookie files and session data are never committed to repository
    Endpoint Security: All sensitive endpoints (including service cancellation) require authentication

API Architecture

    Pattern: RESTful API design with consistent endpoint naming
    Error Handling: Centralized error handling with proper HTTP status codes
    Data Validation: Zod schema validation for request/response data
    Response Format: Consistent JSON response structure across all endpoints

File Structure Organization

    Monorepo Structure: Shared schema and types between client and server
    Component Organization: Feature-based component structure with reusable UI components
    Asset Management: Centralized asset handling with proper aliasing
    Configuration: Environment-based configuration management

External Dependencies
Database Services

    Neon Database: Serverless PostgreSQL hosting with connection pooling
    Database Driver: @neondatabase/serverless for optimized serverless connections

Authentication Services

    Replit Auth: Integrated authentication system with OpenID Connect
    Session Management: PostgreSQL session store for persistent authentication

UI Component Libraries

    Radix UI: Headless UI primitives for accessible component foundation
    Lucide React: Icon library for consistent iconography
    shadcn/ui: Pre-built component library with customizable styling

Development & Build Tools

    TypeScript: Static type checking across the entire application
    Vite: Modern build tool with hot module replacement
    Tailwind CSS: Utility-first CSS framework with PostCSS processing
    ESBuild: Fast JavaScript bundler for server-side code

Validation & Forms

    Zod: Runtime type validation and schema definition
    React Hook Form: Form state management with validation integration
    @hookform/resolvers: Zod integration for form validation

Utility Libraries

    date-fns: Date manipulation and formatting
    date-fns-tz: Timezone-aware date operations for Jakarta timezone
    clsx & class-variance-authority: Dynamic CSS class management
    memoizee: Function memoization for performance optimization

Recent Changes
Deployment Field Consistency Bug Fix (September 3, 2025)

    Issue: Critical deployment bugs affecting core business operations:
        Service ticket completion with spare parts failing ("Gagal memperbarui tiket servis")
        Asset inventory value showing Rp 0 instead of correct values
        Stock movement reports showing incorrect quantity data
        Dashboard data synchronization issues between development and deployment
    Root Cause: Systematic field inconsistency between totalStock and stock fields across multiple calculations
    Solution: Comprehensive field consistency audit and fixes across all stock-related operations
    Files Modified:
        server/storage.ts: Fixed all stock calculations to use consistent stock field instead of totalStock
        server/routes.ts: Enhanced session validation with debugging for deployment differences
        client/src/pages/dashboard.tsx: Added WhatsApp connection status with real-time synchronization
        client/src/components/WhatsAppSettings.tsx: Added dashboard invalidation for status sync
    Additional Fixes Added:
        client/src/pages/stock-movements.tsx: Fixed movement display field mismatch (movement.type → movement.movementType)
        server/whatsappService.ts: Fixed Baileys logger crash with proper logger methods implementation
    Impact:
        Asset inventory value: 3.6M → 317.8M (8,828% improvement through correct field usage)
        Service stock movements display: Now correctly shows "Keluar" (out) instead of "Masuk" (in)
        Service ticket completion with stock updates: Now works reliably in deployment
        Dashboard data synchronization: All metrics now accurate in deployment environment
        WhatsApp status integration: Real-time sync between dashboard and settings
        WhatsApp service stability: No more logger crashes preventing server startup

GMT+7 Timezone Implementation (September 11, 2025)

    Scope: Comprehensive GMT+7 (Asia/Jakarta - Bangkok/Hanoi/Jakarta) timezone support throughout entire application
    Technical Implementation:
        Built production-ready timezone utilities using date-fns-tz library with proper UTC storage and Jakarta display
        Updated all database schemas to use timezone-aware timestamps with consistent UTC storage strategy
        Updated 19+ frontend files to use Jakarta timezone formatting functions, eliminating browser timezone dependencies
        Completely overhauled backend timestamp handling in routes and storage layers
    Critical Issues Resolved:
        Eliminated manual timezone math that caused off-by-7-hours errors near midnight and date boundaries
        Fixed database timestamp storage to prevent +7h skew in stored data
        Fixed date boundary calculations for accurate reporting and date-based queries
        Resolved all TypeScript compilation errors (65 → 0 errors) from timezone refactoring and schema updates
    Production-Ready Architecture:
        Proper separation between UTC storage and Jakarta display prevents data integrity issues
        Uses date-fns-tz with utcToZonedTime/zonedTimeToUtc for timezone-aware calculations
        Consistent handling across all date operations: creation, updates, filtering, and reporting
    Files Modified:
        shared/utils/timezone.ts: Complete rewrite with timezone-aware functions
        shared/schema.ts: Updated all timestamp fields with timezone support
        server/storage.ts and server/routes.ts: Comprehensive backend timestamp handling overhaul
        Multiple frontend components for consistent Jakarta timezone display
    Zero Breaking Changes: Application continues running normally with enhanced timezone accuracy and data integrity

Security Hardening (September 15, 2025)

    Issue: Cookie files containing session data were committed to repository, creating security risk
    Solution: Implemented comprehensive security cleanup and prevention measures:
        Removed all cookie files (cookies*.txt, auth_cookies.txt, test_cookies*.txt) from repository
        Updated .gitignore with comprehensive patterns to prevent future cookie file commits
        Added security patterns for session files, auth_info_*, and local environment files
    Security Verification:
        Confirmed no hardcoded API keys, tokens, or credentials in codebase
        Verified service cancellation endpoint (POST /api/service-tickets/:id/cancel) uses proper authentication
        Confirmed all sensitive endpoints use isAuthenticated middleware
        Validated business rule validation and Zod schema validation for service operations
    Prevention Measures:
        Comprehensive .gitignore patterns for session/cookie files
        Documentation added to prevent future cookie file commits
        Security best practices enforced in development workflow

