-- ==========================================
-- ForgeTrack Seed Data
-- ==========================================

-- Clean up existing data (optional, useful for clean runs)
TRUNCATE TABLE public.materials CASCADE;
TRUNCATE TABLE public.attendance CASCADE;
TRUNCATE TABLE public.sessions CASCADE;
TRUNCATE TABLE public.students CASCADE;

-- 1. Insert 25 Students
INSERT INTO public.students (id, name, usn, email, branch_code) VALUES
(1, 'Abhishek Sharma', '4SH24CS001', 'abhishek.s@forgetrack.local', 'CS'),
(2, 'Divya Kulkarni', '4SH24CS002', 'divya.k@forgetrack.local', 'AI'),
(3, 'Ravi Kumar', '4SH24CS003', 'ravi.k@forgetrack.local', 'CS'),
(4, 'Sneha Reddy', '4SH24CS004', 'sneha.r@forgetrack.local', 'IS'),
(5, 'Karthik N', '4SH24CS005', 'karthik.n@forgetrack.local', 'CS'),
(6, 'Priya Menon', '4SH24CS006', 'priya.m@forgetrack.local', 'AI'),
(7, 'Arjun Rao', '4SH24CS007', 'arjun.r@forgetrack.local', 'CS'),
(8, 'Meghana Bhat', '4SH24CS008', 'meghana.b@forgetrack.local', 'IS'),
(9, 'Rahul K', '4SH24CS009', 'rahul.k@forgetrack.local', 'AI'),
(10, 'Anjali Desai', '4SH24CS010', 'anjali.d@forgetrack.local', 'CS'),
(11, 'Vikram Singh', '4SH24CS011', 'vikram.s@forgetrack.local', 'IS'),
(12, 'Neha Patil', '4SH24CS012', 'neha.p@forgetrack.local', 'CS'),
(13, 'Sanjay Kumar', '4SH24CS013', 'sanjay.k@forgetrack.local', 'AI'),
(14, 'Pooja Joshi', '4SH24CS014', 'pooja.j@forgetrack.local', 'CS'),
(15, 'Manoj Gowda', '4SH24CS015', 'manoj.g@forgetrack.local', 'IS'),
(16, 'Lakshmi Narayan', '4SH24CS016', 'lakshmi.n@forgetrack.local', 'CS'),
(17, 'Sachin S', '4SH24CS017', 'sachin.s@forgetrack.local', 'AI'),
(18, 'Shruti Hassan', '4SH24CS018', 'shruti.h@forgetrack.local', 'IS'),
(19, 'Naveen Kumar', '4SH24CS019', 'naveen.k@forgetrack.local', 'CS'),
(20, 'Swathi R', '4SH24CS020', 'swathi.r@forgetrack.local', 'AI'),
(21, 'Harish M', '4SH24CS021', 'harish.m@forgetrack.local', 'CS'),
(22, 'Kavya T', '4SH24CS022', 'kavya.t@forgetrack.local', 'IS'),
(23, 'Deepak V', '4SH24CS023', 'deepak.v@forgetrack.local', 'CS'),
(24, 'Ashwini P', '4SH24CS024', 'ashwini.p@forgetrack.local', 'AI'),
(25, 'Ganesh C', '4SH24CS025', 'ganesh.c@forgetrack.local', 'CS');

-- Update sequence for students
SELECT setval('public.students_id_seq', 25);

-- 2. Insert 15 Sessions (Across Month 4, 5, 6 - Recent past)
INSERT INTO public.sessions (id, date, topic, month_number, duration_hours) VALUES
(1, CURRENT_DATE - INTERVAL '60 days', 'Introduction to Python for AI', 4, 2.0),
(2, CURRENT_DATE - INTERVAL '58 days', 'Data Structures and Algorithms', 4, 2.0),
(3, CURRENT_DATE - INTERVAL '55 days', 'Linear Algebra Foundations', 4, 2.0),
(4, CURRENT_DATE - INTERVAL '53 days', 'Calculus for Machine Learning', 4, 2.0),
(5, CURRENT_DATE - INTERVAL '50 days', 'Pandas and Data Wrangling', 4, 2.0),
(6, CURRENT_DATE - INTERVAL '40 days', '8-Layer AI Stack', 5, 2.0),
(7, CURRENT_DATE - INTERVAL '38 days', 'Prompt Engineering Deep Dive', 5, 2.0),
(8, CURRENT_DATE - INTERVAL '35 days', 'Building your first LLM App', 5, 2.0),
(9, CURRENT_DATE - INTERVAL '33 days', 'Vector Databases & Embeddings', 5, 2.0),
(10, CURRENT_DATE - INTERVAL '30 days', 'pgvector RAG', 5, 2.0),
(11, CURRENT_DATE - INTERVAL '20 days', 'Agentic Workflows', 6, 2.0),
(12, CURRENT_DATE - INTERVAL '18 days', 'ReAct Agent Pattern', 6, 2.0),
(13, CURRENT_DATE - INTERVAL '15 days', 'Tiered Autonomy Multi-Agent', 6, 2.0),
(14, CURRENT_DATE - INTERVAL '13 days', 'Function Calling with LLMs', 6, 2.0),
(15, CURRENT_DATE - INTERVAL '10 days', 'Deployment and Monitoring', 6, 2.0);

-- Update sequence for sessions
SELECT setval('public.sessions_id_seq', 15);

-- 3. Insert Attendance (Cross product of Students and Sessions with ~80% present rate)
-- We'll use a DO block to generate this procedurally
DO $$
DECLARE
    s_id INTEGER;
    sess_id INTEGER;
    is_present BOOLEAN;
BEGIN
    FOR s_id IN 1..25 LOOP
        FOR sess_id IN 1..15 LOOP
            -- 80% chance of being present, with some variation
            -- Student 1 (Test student) has perfect attendance for testing
            IF s_id = 1 THEN
                is_present := true;
            -- Student 2 has poor attendance
            ELSIF s_id = 2 THEN
                is_present := random() > 0.5;
            ELSE
                is_present := random() > 0.2;
            END IF;
            
            INSERT INTO public.attendance (student_id, session_id, present, marked_by)
            VALUES (s_id, sess_id, is_present, 'system');
        END LOOP;
    END LOOP;
END $$;

-- 4. Insert Materials (2 per session)
DO $$
DECLARE
    sess_id INTEGER;
    topic_name TEXT;
BEGIN
    FOR sess_id IN 1..15 LOOP
        SELECT topic INTO topic_name FROM public.sessions WHERE id = sess_id;
        
        -- Add Slides
        INSERT INTO public.materials (session_id, title, type, url, description)
        VALUES (sess_id, topic_name || ' - Slides', 'slides', 'https://docs.google.com/presentation/d/fake-link-for-' || sess_id, 'Class presentation slides');
        
        -- Add Recording
        INSERT INTO public.materials (session_id, title, type, url, description)
        VALUES (sess_id, topic_name || ' - Recording', 'recording', 'https://youtube.com/watch?v=fake-video-' || sess_id, 'Full class recording');
    END LOOP;
END $$;

-- 5. Insert Mock Import Log
INSERT INTO public.import_log (id, filename, uploaded_by, uploaded_at, total_rows, imported_rows, skipped_rows, warnings, column_mapping, status) VALUES
(1, 'month4_attendance.csv', 'nischay@theboringpeople.in', CURRENT_DATE - INTERVAL '45 days', 125, 125, 0, '[]', '{"name": "student_name", "usn": "usn", "15/4/26": "date"}', 'completed'),
(2, 'month5_attendance.csv', 'varun@theboringpeople.in', CURRENT_DATE - INTERVAL '25 days', 128, 125, 3, '[{"row": 12, "msg": "Student Rahul K not found in DB"}]', '{"name": "student_name", "usn": "usn", "8/4/26": "date"}', 'completed');

-- Update sequence for import_log
SELECT setval('public.import_log_id_seq', 2);

-- Note: The users table is populated by Supabase Auth triggers in a real environment.
-- The actual auth credentials for Nischay, Varun, and Student 1 should be created manually 
-- in the Supabase Dashboard, assigning role metadata via SQL or the admin UI.
