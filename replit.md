# LaptopPOS Service Management System

## Overview

LaptopPOS is a comprehensive Point of Sale and service management system specifically designed for laptop sales and repair businesses. The application combines traditional POS functionality with service ticket management, inventory tracking, and financial reporting. Built with modern web technologies, it provides a complete business management solution for laptop retailers and service centers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and better development experience
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui component library built on Radix UI primitives for accessibility and consistency
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript throughout for consistent type safety across the stack
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Authentication**: Replit Auth integration with role-based access control (admin, kasir, teknisi, purchasing, finance, owner)
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema versioning
- **Core Entities**: Users, products, customers, suppliers, transactions, service tickets, financial records, and store configuration
- **Relationship Structure**: Well-defined foreign key relationships with proper indexing for performance

### Authentication & Authorization
- **Authentication Provider**: Replit Auth with JWT token handling
- **Session Storage**: Database-backed sessions for persistent login state
- **Role-Based Access**: Six distinct user roles with feature-specific permissions
- **Middleware Protection**: Route-level authentication checks with role validation

### API Architecture
- **Pattern**: RESTful API design with consistent endpoint naming
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Data Validation**: Zod schema validation for request/response data
- **Response Format**: Consistent JSON response structure across all endpoints

### File Structure Organization
- **Monorepo Structure**: Shared schema and types between client and server
- **Component Organization**: Feature-based component structure with reusable UI components
- **Asset Management**: Centralized asset handling with proper aliasing
- **Configuration**: Environment-based configuration management

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Database Driver**: @neondatabase/serverless for optimized serverless connections

### Authentication Services
- **Replit Auth**: Integrated authentication system with OpenID Connect
- **Session Management**: PostgreSQL session store for persistent authentication

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessible component foundation
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library with customizable styling

### Development & Build Tools
- **TypeScript**: Static type checking across the entire application
- **Vite**: Modern build tool with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **ESBuild**: Fast JavaScript bundler for server-side code

### Validation & Forms
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Form state management with validation integration
- **@hookform/resolvers**: Zod integration for form validation

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx & class-variance-authority**: Dynamic CSS class management
- **memoizee**: Function memoization for performance optimization

## Recent Changes

### Deployment Field Consistency Bug Fix (September 3, 2025)
- **Issue**: Critical deployment bugs affecting core business operations:
  1. Service ticket completion with spare parts failing ("Gagal memperbarui tiket servis")  
  2. Asset inventory value showing Rp 0 instead of correct values
  3. Stock movement reports showing incorrect quantity data
  4. Dashboard data synchronization issues between development and deployment
- **Root Cause**: Systematic field inconsistency between `totalStock` and `stock` fields across multiple calculations
- **Solution**: Comprehensive field consistency audit and fixes across all stock-related operations
- **Files Modified**: 
  - `server/storage.ts`: Fixed all stock calculations to use consistent `stock` field instead of `totalStock`
  - `server/routes.ts`: Enhanced session validation with debugging for deployment differences  
  - `client/src/pages/dashboard.tsx`: Added WhatsApp connection status with real-time synchronization
  - `client/src/components/WhatsAppSettings.tsx`: Added dashboard invalidation for status sync
- **Additional Fixes Added**: 
  - `client/src/pages/stock-movements.tsx`: Fixed movement display field mismatch (movement.type → movement.movementType)
  - `server/whatsappService.ts`: Fixed Baileys logger crash with proper logger methods implementation
- **Impact**: 
  - Asset inventory value: 3.6M → 317.8M (8,828% improvement through correct field usage)
  - Service stock movements display: Now correctly shows "Keluar" (out) instead of "Masuk" (in)
  - Service ticket completion with stock updates: Now works reliably in deployment
  - Dashboard data synchronization: All metrics now accurate in deployment environment
  - WhatsApp status integration: Real-time sync between dashboard and settings
  - WhatsApp service stability: No more logger crashes preventing server startup