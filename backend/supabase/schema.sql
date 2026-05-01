-- ==========================================
-- ForgeTrack Database Schema
-- ==========================================

-- Enable the pgvector extension if needed later, and uuid-ossp for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students Table
CREATE TABLE public.students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    usn TEXT UNIQUE NOT NULL,
    admission_number TEXT,
    email TEXT,
    branch_code TEXT NOT NULL,
    batch TEXT DEFAULT '2024-2028',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sessions Table
CREATE TABLE public.sessions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    month_number INTEGER NOT NULL,
    duration_hours DECIMAL(3,1) DEFAULT 2.0,
    session_type TEXT DEFAULT 'offline',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ImportLog Table
CREATE TABLE public.import_log (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_rows INTEGER NOT NULL,
    imported_rows INTEGER NOT NULL,
    skipped_rows INTEGER NOT NULL,
    warnings TEXT,
    column_mapping TEXT,
    status TEXT NOT NULL
);

-- 4. Attendance Table
CREATE TABLE public.attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    marked_by TEXT DEFAULT 'system',
    import_id INTEGER REFERENCES public.import_log(id) ON DELETE SET NULL,
    UNIQUE(student_id, session_id)
);

-- 5. Materials Table
CREATE TABLE public.materials (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Users Table (Public extension of auth.users)
-- We store role and link to student_id here to use in RLS.
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
    student_id INTEGER REFERENCES public.students(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- Constraints (Spec §6.1)
-- ==========================================

-- Trigger to prevent attendance for future dates and dates before 2025-08-04
CREATE OR REPLACE FUNCTION check_attendance_date()
RETURNS TRIGGER AS $$
DECLARE
    session_date DATE;
BEGIN
    SELECT date INTO session_date FROM public.sessions WHERE id = NEW.session_id;
    IF session_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot mark attendance for a future date.';
    END IF;
    IF session_date < '2025-08-04' THEN
        RAISE EXCEPTION 'Cannot mark attendance for a date before program start (2025-08-04).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_attendance_date
    BEFORE INSERT OR UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION check_attendance_date();

-- ==========================================
-- Row Level Security (RLS)
-- ==========================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get current user's student_id
CREATE OR REPLACE FUNCTION public.get_user_student_id()
RETURNS INTEGER AS $$
  SELECT student_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Students table policies
CREATE POLICY "Mentors can do all on students" ON public.students
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "Students can read own student record" ON public.students
    FOR SELECT USING (id = public.get_user_student_id());

-- Sessions table policies
CREATE POLICY "Mentors can do all on sessions" ON public.sessions
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "Students can read all sessions" ON public.sessions
    FOR SELECT USING (true);

-- Attendance table policies
CREATE POLICY "Mentors can do all on attendance" ON public.attendance
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "Students can read own attendance" ON public.attendance
    FOR SELECT USING (student_id = public.get_user_student_id());

-- Materials table policies
CREATE POLICY "Mentors can do all on materials" ON public.materials
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "Students can read all materials" ON public.materials
    FOR SELECT USING (true);

-- ImportLog table policies
CREATE POLICY "Mentors can do all on import_log" ON public.import_log
    FOR ALL USING (public.get_user_role() = 'mentor');
-- Students have NO access to import_log

-- Users table policies
CREATE POLICY "Users can read own record" ON public.users
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Mentors can read all users" ON public.users
    FOR SELECT USING (public.get_user_role() = 'mentor');
CREATE POLICY "System can insert users" ON public.users
    FOR INSERT WITH CHECK (true); -- Usually handled by triggers with SECURITY DEFINER

-- ==========================================
-- Auto-create User Trigger
-- ==========================================

-- Trigger to auto-create a user when a student is added
CREATE OR REPLACE FUNCTION create_student_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    default_password TEXT;
BEGIN
    default_password := NEW.usn;
    -- Note: In a real Supabase environment, you would call the Supabase Auth Admin API 
    -- to create the user with the password. Since we cannot easily do that from a pg trigger
    -- without pg_net extension and service keys, we will assume user creation is either 
    -- handled application-side for the MVP or by inserting into auth.users directly (if permitted).
    
    -- For simplicity in this SQL, we will just insert into auth.users directly 
    -- (Supabase allows this in raw SQL if we provide the encrypted password, but it's tricky).
    -- A better approach for the MVP is to handle the auth creation in the backend/Edge Function 
    -- or from the client application right after student insertion.
    
    -- We will create a placeholder in public.users if we have an auth.uid() context, 
    -- but usually this is done via a trigger ON auth.users AFTER INSERT.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative: A trigger ON auth.users AFTER INSERT to create public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- We assume metadata will contain role, display_name, and student_id
  INSERT INTO public.users (id, email, role, display_name, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    (NEW.raw_user_meta_data->>'student_id')::INTEGER
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

