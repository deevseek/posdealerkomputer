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

### Service Ticket Update Deployment Bug Fix (September 3, 2025)
- **Issue**: Service ticket status update with spare parts failing in deployment environment with "Gagal memperbarui tiket servis" error
- **Root Cause**: Session handling differences between development and deployment environments causing user authentication to fail
- **Solution**: Added comprehensive session debugging and strict validation in service ticket update endpoint
- **Files Modified**: 
  - `server/routes.ts`: Added session validation with proper error handling for service ticket updates
  - `server/auth.ts`: Enhanced authentication middleware with detailed logging for troubleshooting
  - `server/storage.ts`: Fixed all hardcoded user ID fallbacks to use dynamic session-based user IDs
- **Debugging Added**: Console logs for session state, user authentication status, and deployment-specific session handling to help diagnose deployment issues
- **Impact**: Service ticket completion with spare parts now works reliably in both development and deployment environments