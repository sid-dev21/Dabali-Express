# API Documentation - Cafeteria Management System

## Base URL
```
http://localhost:5000/api
```

## Authentication Endpoints

### 1. Register
**POST** `/auth/register`

**Description:** Create a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "role": "PARENT",
  "first_name": "Jean",
  "last_name": "Ouedraogo",
  "phone": "+22670000000"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "PARENT",
    "first_name": "Jean",
    "last_name": "Ouedraogo"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- 400: Email already in use
- 422: Invalid data

---

### 2. Login
**POST** `/auth/login`

**Description:** Login to the application

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "PARENT",
    "first_name": "Jean",
    "last_name": "Ouedraogo"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- 401: Email or password incorrect
- 404: User not found

---

### 3. Get Current User
**GET** `/auth/me`

**Headers:** 
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "PARENT",
    "first_name": "Jean",
    "last_name": "Ouedraogo",
    "phone": "+22670000000"
  }
}
```

---

## Schools Endpoints

### 1. Get All Schools
**GET** `/schools`

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number per page (default: 10)
- `city` (optional): Filter by city

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "École Primaire de Ouagadougou",
      "address": "Secteur 15",
      "city": "Ouagadougou",
      "admin": {
        "id": 2,
        "first_name": "Koné",
        "last_name": "Ibrahim"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 2. Create School
**POST** `/schools`

**Authorized Roles:** SUPER_ADMIN

**Request Body:**
```json
{
  "name": "École Primaire de Bobo",
  "address": "Secteur 5",
  "city": "Bobo-Dioulasso",
  "admin_id": 3
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "School created successfully",
  "data": {
    "id": 2,
    "name": "École Primaire de Bobo",
    "address": "Secteur 5",
    "city": "Bobo-Dioulasso"
  }
}
```

---

### 3. Get School by ID
**GET** `/schools/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "École Primaire de Ouagadougou",
    "address": "Secteur 15",
    "city": "Ouagadougou",
    "admin": {
      "id": 2,
      "first_name": "Koné",
      "last_name": "Ibrahim",
      "email": "admin@school.bf"
    },
    "students_count": 150,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### 4. Update School
**PUT** `/schools/:id`

**Authorized Roles:** SUPER_ADMIN, SCHOOL_ADMIN (only their school)

**Request Body:**
```json
{
  "name": "École Primaire Moderne de Ouaga",
  "address": "Secteur 15, Avenue Kwame Nkrumah"
}
```

---

### 5. Delete School
**DELETE** `/schools/:id`

**Authorized Roles:** SUPER_ADMIN

**Response (200):**
```json
{
  "success": true,
  "message": "School deleted successfully"
}
```

---

## Students Endpoints

### 1. Get All Students
**GET** `/students`

**Query Parameters:**
- `school_id` (optional): Filter by school
- `parent_id` (optional): Filter by parent
- `class_name` (optional): Filter by class

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Amina",
      "last_name": "Ouedraogo",
      "class_name": "CE2",
      "school": {
        "id": 1,
        "name": "École Primaire de Ouagadougou"
      },
      "parent": {
        "id": 5,
        "first_name": "Jean",
        "last_name": "Ouedraogo"
      },
      "photo_url": "https://example.com/photo.jpg"
    }
  ]
}
```

---

### 2. Create Student
**POST** `/students`

**Request Body:**
```json
{
  "first_name": "Boureima",
  "last_name": "Zongo",
  "class_name": "CM1",
  "school_id": 1,
  "parent_id": 5,
  "photo_url": "https://example.com/photo.jpg"
}
```

---

### 3. Get Students by Parent
**GET** `/students/parent/:parentId`

**Description:** Retrieve all children of a parent

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Amina",
      "last_name": "Ouedraogo",
      "class_name": "CE2",
      "school": {
        "id": 1,
        "name": "École Primaire de Ouagadougou"
      },
      "active_subscription": {
        "id": 1,
        "type": "MONTHLY",
        "status": "ACTIVE",
        "end_date": "2024-02-28"
      }
    },
    {
      "id": 3,
      "first_name": "Fatoumata",
      "last_name": "Ouedraogo",
      "class_name": "CP",
      "school": {
        "id": 1,
        "name": "École Primaire de Ouagadougou"
      },
      "active_subscription": null
    }
  ]
}
```

---

## Menus Endpoints

### 1. Get Menus
**GET** `/menus`

**Query Parameters:**
- `school_id` (required): School ID
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `meal_type` (optional): BREAKFAST, LUNCH, DINNER

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_id": 1,
      "date": "2024-01-28",
      "meal_type": "LUNCH",
      "description": "Riz sauce tomate",
      "items": ["Riz", "Sauce tomate", "Poulet", "Salade"],
      "created_at": "2024-01-27T08:00:00Z"
    }
  ]
}
```

---

### 2. Get Week Menu
**GET** `/menus/week/:schoolId`

**Description:** Retrieve the current week's menu

**Response (200):**
```json
{
  "success": true,
  "data": {
    "school_id": 1,
    "week_start": "2024-01-28",
    "week_end": "2024-02-03",
    "menus": [
      {
        "date": "2024-01-28",
        "day": "Lundi",
        "lunch": {
          "description": "Riz sauce tomate",
          "items": ["Riz", "Sauce tomate", "Poulet", "Salade"]
        }
      },
      {
        "date": "2024-01-29",
        "day": "Mardi",
        "lunch": {
          "description": "Tô sauce arachide",
          "items": ["Tô", "Sauce arachide", "Viande", "Légumes"]
        }
      }
    ]
  }
}
```

---

### 3. Create Menu
**POST** `/menus`

**Authorized Roles:** SCHOOL_ADMIN, CANTEEN_MANAGER

**Request Body:**
```json
{
  "school_id": 1,
  "date": "2024-01-30",
  "meal_type": "LUNCH",
  "description": "Riz gras",
  "items": ["Riz gras", "Poisson", "Légumes", "Fruit"]
}
```

---

### 4. Update Menu
**PUT** `/menus/:id`

---

### 5. Delete Menu
**DELETE** `/menus/:id`

---

## Subscriptions Endpoints

### 1. Get All Subscriptions
**GET** `/subscriptions`

**Query Parameters:**
- `student_id` (optional)
- `status` (optional): ACTIVE, EXPIRED, SUSPENDED

---

### 2. Create Subscription
**POST** `/subscriptions`

**Request Body:**
```json
{
  "student_id": 1,
  "type": "MONTHLY",
  "start_date": "2024-02-01",
  "amount": 15000
}
```

**Note:** `end_date` is calculated automatically according to the type:
- DAILY: +1 day
- WEEKLY: +7 days
- MONTHLY: +30 days
- TRIMESTER: +90 days

---

### 3. Get Subscriptions by Student
**GET** `/subscriptions/student/:studentId`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": 1,
      "type": "MONTHLY",
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "amount": 15000,
      "status": "ACTIVE",
      "payments": [
        {
          "id": 1,
          "amount": 15000,
          "method": "ORANGE_MONEY",
          "status": "SUCCESS",
          "paid_at": "2024-01-01T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

## Payments Endpoints

### 1. Get All Payments
**GET** `/payments`

**Query Parameters:**
- `parent_id` (optional)
- `subscription_id` (optional)
- `status` (optional)
- `method` (optional)

---

### 2. Create Payment
**POST** `/payments`

**Request Body:**
```json
{
  "subscription_id": 1,
  "amount": 15000,
  "method": "ORANGE_MONEY",
  "phone": "+22670000000"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Paiement initié",
  "data": {
    "id": 1,
    "subscription_id": 1,
    "amount": 15000,
    "method": "ORANGE_MONEY",
    "status": "PENDING",
    "reference": "OM20240128001"
  }
}
```

**Note:** In development, payment is simulated. In production, integrate Orange Money/Moov Money API.

---

### 3. Verify Payment
**GET** `/payments/:id/verify`

**Description:** Check the status of a payment

---

## Attendance Endpoints

### 1. Get Attendance
**GET** `/attendance`

**Query Parameters:**
- `student_id` (optional)
- `date` (optional)
- `school_id` (optional)

---

### 2. Mark Attendance
**POST** `/attendance/mark`

**Request Body:**
```json
{
  "student_id": 1,
  "menu_id": 1,
  "date": "2024-01-28",
  "present": true
}
```

---

### 3. Bulk Mark Attendance
**POST** `/attendance/bulk-mark`

**Request Body:**
```json
{
  "menu_id": 1,
  "date": "2024-01-28",
  "attendances": [
    { "student_id": 1, "present": true },
    { "student_id": 2, "present": true },
    { "student_id": 3, "present": false }
  ]
}
```

---

## Reports Endpoints

### 1. Dashboard Statistics
**GET** `/reports/dashboard`

**Query Parameters:**
- `school_id` (optional): Pour School Admin
- `start_date` (optional)
- `end_date` (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_students": 150,
    "active_subscriptions": 120,
    "total_revenue": 1800000,
    "attendance_rate": 85.5,
    "recent_payments": [...],
    "charts": {
      "daily_attendance": [...],
      "monthly_revenue": [...]
    }
  }
}
```

---

### 2. Payment Reports
**GET** `/reports/payments`

**Query Parameters:**
- `school_id` (optional)
- `start_date` (required)
- `end_date` (required)
- `format` (optional): json, csv, pdf

---

### 3. Attendance Reports
**GET** `/reports/attendance`

---

### 4. Subscription Reports
**GET** `/reports/subscriptions`

---

## Error Responses

All endpoints can return these errors:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid data",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authenticated. Token missing or invalid."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error. Please try again later."
}
```

---

## Authentication & Authorization

### JWT Token
All endpoints (except `/auth/register` and `/auth/login`) require a JWT token in the header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Roles & Permissions

| Endpoint | SUPER_ADMIN | SCHOOL_ADMIN | CANTEEN_MANAGER | PARENT | STUDENT |
|----------|-------------|--------------|-----------------|--------|---------|
| Create School | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Own School | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Menu | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark Attendance | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Subscription | ✅ | ✅ | ✅ | ✅ | ❌ |
| Make Payment | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Own Data | ✅ | ✅ | ✅ | ✅ | ✅ |

