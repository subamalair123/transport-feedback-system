<<<<<<< HEAD
-- Transport Feedback System Database Schema
-- Azure SQL Database

-- 1. Routes Table
CREATE TABLE routes (
    RouteID INT IDENTITY(1,1) PRIMARY KEY,
    RouteName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(MAX),
    StartLocation NVARCHAR(255),
    EndLocation NVARCHAR(255),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- 2. Categories Table
CREATE TABLE categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(MAX),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- 3. Feedback Table
CREATE TABLE feedback (
    FeedbackID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(20),
    UserType NVARCHAR(50) NOT NULL,
    RouteName NVARCHAR(100) NOT NULL,
    CategoryName NVARCHAR(100) NOT NULL,
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    FeedbackText NVARCHAR(MAX) NOT NULL,
    Suggestions NVARCHAR(MAX),
    SubmittedAt DATETIME2 DEFAULT GETDATE(),
    INDEX IX_Feedback_Route (RouteName),
    INDEX IX_Feedback_Category (CategoryName),
    INDEX IX_Feedback_Date (SubmittedAt DESC)
);

-- 4. Emergency Reports Table
CREATE TABLE emergency_reports (
    ReportID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Contact NVARCHAR(50) NOT NULL,
    IssueType NVARCHAR(100) NOT NULL,
    Location NVARCHAR(255) NOT NULL,
    Details NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending',
    ReportedAt DATETIME2 DEFAULT GETDATE(),
    ResolvedAt DATETIME2 NULL,
    INDEX IX_Emergency_Status (Status),
    INDEX IX_Emergency_Date (ReportedAt DESC)
);

-- Insert Sample Data
INSERT INTO routes (RouteName, Description, StartLocation, EndLocation) VALUES
('Route A - Main Campus', 'Main Campus Route', 'City Center', 'Main Campus'),
('Route B - North Campus', 'North Campus Route', 'North Station', 'North Campus'),
('Route C - South Campus', 'South Campus Route', 'South Station', 'South Campus'),
('Route D - City Center', 'City Center Route', 'College Gate', 'City Center'),
('Route E - East Wing', 'East Wing Route', 'East Junction', 'East Campus');

INSERT INTO categories (CategoryName, Description) VALUES
('punctuality', 'Bus timing and schedule adherence'),
('cleanliness', 'Vehicle cleanliness and hygiene'),
('driver_behavior', 'Driver conduct and professionalism'),
('safety', 'Safety measures and protocols'),
('comfort', 'Seating and comfort level'),
('route_efficiency', 'Route planning and efficiency'),
=======
-- Transport Feedback System Database Schema
-- Azure SQL Database

-- 1. Routes Table
CREATE TABLE routes (
    RouteID INT IDENTITY(1,1) PRIMARY KEY,
    RouteName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(MAX),
    StartLocation NVARCHAR(255),
    EndLocation NVARCHAR(255),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- 2. Categories Table
CREATE TABLE categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(MAX),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- 3. Feedback Table
CREATE TABLE feedback (
    FeedbackID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(20),
    UserType NVARCHAR(50) NOT NULL,
    RouteName NVARCHAR(100) NOT NULL,
    CategoryName NVARCHAR(100) NOT NULL,
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    FeedbackText NVARCHAR(MAX) NOT NULL,
    Suggestions NVARCHAR(MAX),
    SubmittedAt DATETIME2 DEFAULT GETDATE(),
    INDEX IX_Feedback_Route (RouteName),
    INDEX IX_Feedback_Category (CategoryName),
    INDEX IX_Feedback_Date (SubmittedAt DESC)
);

-- 4. Emergency Reports Table
CREATE TABLE emergency_reports (
    ReportID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Contact NVARCHAR(50) NOT NULL,
    IssueType NVARCHAR(100) NOT NULL,
    Location NVARCHAR(255) NOT NULL,
    Details NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending',
    ReportedAt DATETIME2 DEFAULT GETDATE(),
    ResolvedAt DATETIME2 NULL,
    INDEX IX_Emergency_Status (Status),
    INDEX IX_Emergency_Date (ReportedAt DESC)
);

-- Insert Sample Data
INSERT INTO routes (RouteName, Description, StartLocation, EndLocation) VALUES
('Route A - Main Campus', 'Main Campus Route', 'City Center', 'Main Campus'),
('Route B - North Campus', 'North Campus Route', 'North Station', 'North Campus'),
('Route C - South Campus', 'South Campus Route', 'South Station', 'South Campus'),
('Route D - City Center', 'City Center Route', 'College Gate', 'City Center'),
('Route E - East Wing', 'East Wing Route', 'East Junction', 'East Campus');

INSERT INTO categories (CategoryName, Description) VALUES
('punctuality', 'Bus timing and schedule adherence'),
('cleanliness', 'Vehicle cleanliness and hygiene'),
('driver_behavior', 'Driver conduct and professionalism'),
('safety', 'Safety measures and protocols'),
('comfort', 'Seating and comfort level'),
('route_efficiency', 'Route planning and efficiency'),
>>>>>>> a3ab75a711ea6b9fc4aff52012b283739e7f76c4
('other', 'Other feedback and suggestions');