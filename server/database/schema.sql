-- Refuge Bay Door Inspection System Database Schema

-- Users table for authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('inspector', 'engineer', 'admin', 'client')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders table
CREATE TABLE purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Doors table
CREATE TABLE doors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER,
    door_number INTEGER NOT NULL,
    serial_number TEXT UNIQUE NOT NULL,
    drawing_number TEXT NOT NULL,
    job_number TEXT,
    description TEXT NOT NULL,
    pressure INTEGER NOT NULL, -- 140 or 400
    door_type TEXT CHECK(door_type IN ('V1', 'V2')) NOT NULL,
    size TEXT CHECK(size IN ('1.5', '1.8', '2.0')) NOT NULL,
    inspection_status TEXT CHECK(inspection_status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    certification_status TEXT CHECK(certification_status IN ('pending', 'certified')) DEFAULT 'pending',
    completion_status TEXT CHECK(completion_status IN ('pending', 'completed')) DEFAULT 'pending',
    paid_status TEXT CHECK(paid_status IN ('pending', 'paid')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (po_id) REFERENCES purchase_orders (id)
);

-- Dynamic inspection points
CREATE TABLE inspection_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Door inspections
CREATE TABLE door_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    door_id INTEGER NOT NULL,
    inspector_id INTEGER NOT NULL,
    inspection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
    notes TEXT,
    FOREIGN KEY (door_id) REFERENCES doors (id),
    FOREIGN KEY (inspector_id) REFERENCES users (id)
);

-- Inspection point checks
CREATE TABLE inspection_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    inspection_point_id INTEGER NOT NULL,
    is_checked BOOLEAN DEFAULT 0,
    photo_path TEXT,
    notes TEXT,
    checked_at DATETIME,
    FOREIGN KEY (inspection_id) REFERENCES door_inspections (id),
    FOREIGN KEY (inspection_point_id) REFERENCES inspection_points (id)
);

-- Certifications
CREATE TABLE certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    door_id INTEGER NOT NULL,
    engineer_id INTEGER NOT NULL,
    certified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    certificate_pdf_path TEXT,
    signature TEXT, -- Base64 encoded signature
    FOREIGN KEY (door_id) REFERENCES doors (id),
    FOREIGN KEY (engineer_id) REFERENCES users (id)
);

-- Insert default inspection points from the PDF checklist
INSERT INTO inspection_points (name, description, order_index) VALUES
('Drawing Number Confirmation', 'Confirm Drawing Number used by Fabricator', 1),
('Overall Dimensions', 'Confirm Over-All Dimensions', 2),
('Member Sizes', 'Confirm Member Sizes as per Drawing (As Per Drawing)', 3),
('Plate Thickness', 'Confirm Plate Thickness (HP=6mm / LP=3mm) (140 kPa - HP & LP=3mm)', 4),
('Structural Welding', 'Confirm Welding on Structural Members. Size and Quality (6mm) (100 x 200 space Weld)', 5),
('Hinge Welding', 'Confirm Welding on Hinges. Size and Quality (8mm)', 6),
('Hinge Plate Thickness', 'Confirm Hinge Plate Thickness (8mm)', 7),
('Hinge Pin Dimension', 'Confirm Hinge Pin Dimension (M24 x 200) (M20 for 140 kPa Door)', 8),
('General Fit Check', 'Check for General fit, excessive Gaps between frame and door', 9),
('Door Cleaning', 'Door cleaned of all spatter and welding defects', 10),
('Grease Nipples', 'Grease nipples fitted to all hinges', 11),
('Door Functionality', 'Door Functionality & Smooth operation', 12),
('Silicone Seal', 'Silicone added to the inside joints to insure a water/ airtight seal', 13);

-- Insert default users
-- Admin (password: admin123)
INSERT INTO users (email, password, name, role) VALUES 
('admin@inspex.com', '$2a$10$9Me5/SBCWE8Pwlij9cbHp.MW8myaAE0CV5IDWqmNo/AtITp8Q8ohG', 'System Admin', 'admin');

-- Inspector (password: inspector123)  
INSERT INTO users (email, password, name, role) VALUES 
('inspector@inspex.com', '$2a$10$.y26ih7eH/.RTWAL5hFg6.tIt0jq7YOXsUxwKfotlr380z44fIwsm', 'John Inspector', 'inspector');

-- Engineer (password: engineer123)
INSERT INTO users (email, password, name, role) VALUES 
('engineer@inspex.com', '$2a$10$PEavEB7OzGag8Gt9w0dcTuiPHlSLU5BwYOdga.PU1Ve/.PZQRH.N2', 'Sarah Engineer', 'engineer');

-- Client (password: client123)
INSERT INTO users (email, password, name, role) VALUES 
('client@inspex.com', '$2a$10$EvsMBlIMJhsT3wLPPzkQM.Iu4hijojGH21Gm5ZxhyjIJPt.DB7.iS', 'Mike Client', 'client');