# Microcement 3D Configurator with Supabase Authentication

This project implements a Supabase-based authentication system with user-specific scene configuration management for a 3D microcement configurator.

## Features

- **Supabase Authentication**: Email/password authentication with JWT tokens
- **User-Specific Scene Configs**: Each user can create, manage, and save multiple 3D scene configurations
- **Database Storage**: PostgreSQL with Row Level Security (RLS) for data isolation
- **API Routes**: RESTful API for CRUD operations on scene configurations
- **TypeScript**: Full type safety throughout the application
- **Docker Support**: Runs entirely in Docker containers

## Architecture

### Database Schema

The `user_scene_configs` table stores user-specific 3D scene configurations:

```sql
CREATE TABLE user_scene_configs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    config_name VARCHAR(255),
    model_path VARCHAR(500),
    camera_fov INTEGER,
    camera_near DECIMAL,
    camera_far DECIMAL,
    orbital_height DECIMAL,
    orbital_radius_multiplier DECIMAL,
    orbital_speed DECIMAL,
    target_size DECIMAL,
    scale_multiplier DECIMAL,
    rotation_y DECIMAL,
    intro_duration INTEGER,
    intro_start_pos JSONB,
    intro_end_pos JSONB,
    hotspot_colors JSONB,
    pulse_animation JSONB,
    hotspot_focal_distances JSONB,
    hotspot_categories JSONB,
    camera_points JSONB,
    look_at_targets JSONB,
    api_hotspot_key_aliases JSONB,
    is_default BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Security Features

- **Row Level Security (RLS)**: Users can only access their own configurations
- **JWT Authentication**: Secure token-based authentication
- **Foreign Key Constraints**: Data integrity with cascade delete
- **Input Validation**: Type-safe API endpoints

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### 1. Start Supabase Services

```bash
# Start Supabase database and services
docker compose -f supabase/docker-compose.yml up -d
```

### 2. Start the Application

```bash
# Start the Next.js development server
docker compose up app-dev -d
```

### 3. Access the Application

- **Main App**: http://localhost:3000
- **Test Auth Page**: http://localhost:3000/test-auth
- **Login Page**: http://localhost:3000/login
- **Supabase Studio**: http://localhost:8000 (admin: supabase / password: this_password_is_insecure_and_should_be_updated)

## Test Users

Two test users have been created for testing:

1. **User 1**: 
   - Email: `user1@example.com`
   - Password: `password123`

2. **User 2**: 
   - Email: `user2@example.com`
   - Password: `password123`

## API Endpoints

### Authentication
- Uses Supabase Auth with JWT tokens
- Authorization header: `Bearer <jwt_token>`

### Scene Configurations

#### Get All Configurations
```http
GET /api/scene-configs
Authorization: Bearer <jwt_token>
```

#### Create New Configuration
```http
POST /api/scene-configs
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "config_name": "My Custom Config",
  "camera_fov": 75,
  "camera_near": 0.1,
  "camera_far": 1000,
  "orbital_height": 40,
  "orbital_radius_multiplier": 6,
  "orbital_speed": 0.2,
  "target_size": 30,
  "scale_multiplier": 2,
  "rotation_y": 1.5707963267948966,
  "intro_duration": 3000,
  "intro_start_pos": {"x": 0, "y": 20, "z": 0},
  "intro_end_pos": {"x": -6.55, "y": 7.00, "z": 26.29},
  "hotspot_colors": {"normal": 9223167, "hover": 11722918, "pulse": 9223167},
  "pulse_animation": {"duration": 800, "scale": 1.5, "opacity": 0.8},
  "hotspot_focal_distances": {},
  "hotspot_categories": {},
  "camera_points": [],
  "look_at_targets": [],
  "api_hotspot_key_aliases": {},
  "is_default": false
}
```

#### Get Specific Configuration
```http
GET /api/scene-configs/{id}
Authorization: Bearer <jwt_token>
```

#### Update Configuration
```http
PUT /api/scene-configs/{id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "config_name": "Updated Config Name",
  "camera_fov": 90
}
```

#### Delete Configuration
```http
DELETE /api/scene-configs/{id}
Authorization: Bearer <jwt_token>
```

## Components

### Auth Component
- Handles user authentication (sign in/sign up)
- Manages authentication state
- Provides user session information

### SceneConfigManager Component
- Displays user's scene configurations
- Allows creating new configurations
- Supports setting default configurations
- Enables configuration deletion

### SceneConfigService
- Singleton service for managing scene configurations
- Handles database operations
- Converts between database and application formats
- Manages user context

## File Structure

```
├── app/
│   ├── api/scene-configs/          # API routes for scene configs
│   ├── login/                      # Login page
│   └── test-auth/                  # Test page for authentication
├── components/
│   ├── Auth.tsx                    # Authentication component
│   └── SceneConfigManager.tsx     # Scene config management
├── lib/
│   ├── supabase.ts                # Supabase client configuration
│   ├── services/
│   │   └── SceneConfigService.ts  # Scene config business logic
│   └── config/
│       └── sceneConfig.ts         # Updated scene config with user support
└── supabase/
    ├── migrations/                # Database migrations
    └── docker-compose.yml         # Supabase services
```

## Testing

1. Navigate to http://localhost:3000/test-auth
2. Sign in with one of the test users
3. Create new scene configurations
4. Test setting configurations as default
5. Test deleting configurations
6. Sign out and sign in with the other user to verify data isolation

## Development

### Adding New Configuration Fields

1. Update the database migration in `supabase/migrations/`
2. Update the TypeScript types in `lib/supabase.ts`
3. Update the API routes to handle new fields
4. Update the SceneConfigService methods
5. Update the UI components

### Environment Variables

The application uses these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Security Considerations

- All database operations use Row Level Security
- JWT tokens are validated on every API request
- User data is isolated by user ID
- Input validation prevents SQL injection
- CORS is properly configured

## Troubleshooting

### Supabase Not Starting
- Check if ports 8000, 5432 are available
- Verify Docker is running
- Check Supabase logs: `docker logs supabase-db`

### Authentication Issues
- Verify environment variables are set correctly
- Check Supabase service status
- Ensure JWT secret is consistent

### Database Connection Issues
- Verify PostgreSQL is running: `docker ps | grep supabase-db`
- Check database logs: `docker logs supabase-db`
- Test connection: `docker exec supabase-db psql -U postgres -d postgres -c "SELECT 1;"`

## Next Steps

- Add email verification for new users
- Implement configuration sharing between users
- Add configuration import/export functionality
- Implement real-time collaboration features
- Add configuration versioning
- Implement configuration templates
