--
-- PostgreSQL database dump
--

\restrict 9R0bVN7wSakkkTrwL3l2YdGMnxnpq5JRFPEWDOBpe58IYP17JQj8ljf8yeOzWzn

-- Dumped from database version 16.13 (Homebrew)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cache; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache OWNER TO tito;

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO tito;

--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO tito;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_jobs_id_seq OWNER TO tito;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: finance_categories; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.finance_categories (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.finance_categories OWNER TO tito;

--
-- Name: finance_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.finance_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.finance_categories_id_seq OWNER TO tito;

--
-- Name: finance_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.finance_categories_id_seq OWNED BY public.finance_categories.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO tito;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO tito;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO tito;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: manhours; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.manhours (
    id bigint NOT NULL,
    user_id bigint,
    project_id bigint,
    project_role_id bigint,
    date date NOT NULL,
    hours numeric(8,2) NOT NULL,
    amount_idr numeric(15,2),
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.manhours OWNER TO tito;

--
-- Name: manhours_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.manhours_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.manhours_id_seq OWNER TO tito;

--
-- Name: manhours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.manhours_id_seq OWNED BY public.manhours.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO tito;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO tito;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO tito;

--
-- Name: permission_role; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.permission_role (
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL
);


ALTER TABLE public.permission_role OWNER TO tito;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    module character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.permissions OWNER TO tito;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO tito;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO tito;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_access_tokens_id_seq OWNER TO tito;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: presales; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.presales (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    sector character varying(255),
    estimated_value numeric(15,2),
    description text,
    status character varying(255) DEFAULT 'Lead'::character varying NOT NULL,
    proposal_doc_url character varying(255),
    presentation_log text,
    quotation_value numeric(15,2),
    lost_reason character varying(255),
    competitor character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.presales OWNER TO tito;

--
-- Name: presales_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.presales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.presales_id_seq OWNER TO tito;

--
-- Name: presales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.presales_id_seq OWNED BY public.presales.id;


--
-- Name: project_allocations; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.project_allocations (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    category_id bigint NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    is_topup boolean DEFAULT false NOT NULL
);


ALTER TABLE public.project_allocations OWNER TO tito;

--
-- Name: project_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.project_allocations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_allocations_id_seq OWNER TO tito;

--
-- Name: project_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.project_allocations_id_seq OWNED BY public.project_allocations.id;


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.project_members (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    project_role_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.project_members OWNER TO tito;

--
-- Name: project_members_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.project_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_members_id_seq OWNER TO tito;

--
-- Name: project_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.project_members_id_seq OWNED BY public.project_members.id;


--
-- Name: project_role_quotas; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.project_role_quotas (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    project_role_id bigint NOT NULL,
    quota_hours numeric(10,2) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.project_role_quotas OWNER TO tito;

--
-- Name: project_role_quotas_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.project_role_quotas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_role_quotas_id_seq OWNER TO tito;

--
-- Name: project_role_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.project_role_quotas_id_seq OWNED BY public.project_role_quotas.id;


--
-- Name: project_roles; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.project_roles (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.project_roles OWNER TO tito;

--
-- Name: project_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.project_roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_roles_id_seq OWNER TO tito;

--
-- Name: project_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.project_roles_id_seq OWNED BY public.project_roles.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.projects (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    budget_status character varying(255) NOT NULL,
    completion integer NOT NULL,
    methodology character varying(255),
    jobs json,
    start_date date,
    end_date date,
    total_manhours integer,
    hourly_rate numeric(15,2),
    total_cost numeric(15,2),
    quotation_value numeric(15,2),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.projects OWNER TO tito;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO tito;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.roles OWNER TO tito;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO tito;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO tito;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.tasks (
    id bigint NOT NULL,
    project_id bigint,
    title character varying(255) NOT NULL,
    feature_title character varying(255),
    description text,
    status character varying(255) NOT NULL,
    priority character varying(255) NOT NULL,
    assignee_id bigint,
    estimated_hours numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    project_role_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.tasks OWNER TO tito;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO tito;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: tito
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone_number character varying(255),
    status character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255),
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    role_id bigint
);


ALTER TABLE public.users OWNER TO tito;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: tito
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO tito;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tito
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: finance_categories id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.finance_categories ALTER COLUMN id SET DEFAULT nextval('public.finance_categories_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: manhours id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.manhours ALTER COLUMN id SET DEFAULT nextval('public.manhours_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: presales id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.presales ALTER COLUMN id SET DEFAULT nextval('public.presales_id_seq'::regclass);


--
-- Name: project_allocations id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_allocations ALTER COLUMN id SET DEFAULT nextval('public.project_allocations_id_seq'::regclass);


--
-- Name: project_members id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_members ALTER COLUMN id SET DEFAULT nextval('public.project_members_id_seq'::regclass);


--
-- Name: project_role_quotas id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_role_quotas ALTER COLUMN id SET DEFAULT nextval('public.project_role_quotas_id_seq'::regclass);


--
-- Name: project_roles id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_roles ALTER COLUMN id SET DEFAULT nextval('public.project_roles_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.cache (key, value, expiration) FROM stdin;
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: finance_categories; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.finance_categories (id, name, created_at, updated_at) FROM stdin;
1	Freelance Fee	2026-03-16 04:37:50	2026-03-16 04:37:50
2	Commission	2026-03-16 04:37:50	2026-03-16 04:37:50
3	Internal Resource	2026-03-16 04:37:50	2026-03-16 04:37:50
4	Operational	2026-03-16 04:37:50	2026-03-16 04:37:50
5	Others	2026-03-16 04:37:50	2026-03-16 04:37:50
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- Data for Name: manhours; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.manhours (id, user_id, project_id, project_role_id, date, hours, amount_idr, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_03_16_043604_create_project_roles_table	1
5	2026_03_16_043604_create_projects_table	1
6	2026_03_16_043604_create_roles_table	1
7	2026_03_16_043605_create_manhours_table	1
8	2026_03_16_043605_create_presales_table	1
9	2026_03_16_043605_create_project_members_table	1
10	2026_03_16_043605_create_project_role_quotas_table	1
11	2026_03_16_043605_create_tasks_table	1
12	2026_03_16_043606_create_finance_categories_table	1
13	2026_03_16_043606_create_project_allocations_table	1
14	2026_03_16_044137_create_personal_access_tokens_table	2
15	2026_03_16_054856_add_is_topup_to_project_allocations_table	3
16	2026_03_16_060123_create_permissions_and_role_pivot_tables	4
17	2026_03_16_060124_update_users_table_for_rbac	4
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- Data for Name: permission_role; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.permission_role (role_id, permission_id) FROM stdin;
1	1
1	2
1	3
1	4
1	5
1	6
1	7
1	8
1	9
1	10
1	11
1	12
1	13
1	14
1	15
1	16
1	17
1	18
1	19
1	20
1	21
1	22
1	23
1	24
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.permissions (id, name, slug, module, created_at, updated_at) FROM stdin;
1	Create Projects	projects.create	Projects	2026-03-16 06:02:27	2026-03-16 06:02:27
2	Read Projects	projects.read	Projects	2026-03-16 06:02:27	2026-03-16 06:02:27
3	Update Projects	projects.update	Projects	2026-03-16 06:02:27	2026-03-16 06:02:27
4	Delete Projects	projects.delete	Projects	2026-03-16 06:02:27	2026-03-16 06:02:27
5	Create Tasks	tasks.create	Tasks	2026-03-16 06:02:27	2026-03-16 06:02:27
6	Read Tasks	tasks.read	Tasks	2026-03-16 06:02:27	2026-03-16 06:02:27
7	Update Tasks	tasks.update	Tasks	2026-03-16 06:02:27	2026-03-16 06:02:27
8	Delete Tasks	tasks.delete	Tasks	2026-03-16 06:02:27	2026-03-16 06:02:27
9	Create Finance	finance.create	Finance	2026-03-16 06:02:27	2026-03-16 06:02:27
10	Read Finance	finance.read	Finance	2026-03-16 06:02:27	2026-03-16 06:02:27
11	Update Finance	finance.update	Finance	2026-03-16 06:02:27	2026-03-16 06:02:27
12	Delete Finance	finance.delete	Finance	2026-03-16 06:02:27	2026-03-16 06:02:27
13	Create Presales	presales.create	Presales	2026-03-16 06:02:27	2026-03-16 06:02:27
14	Read Presales	presales.read	Presales	2026-03-16 06:02:27	2026-03-16 06:02:27
15	Update Presales	presales.update	Presales	2026-03-16 06:02:27	2026-03-16 06:02:27
16	Delete Presales	presales.delete	Presales	2026-03-16 06:02:27	2026-03-16 06:02:27
17	Create Roles	roles.create	Roles	2026-03-16 06:02:27	2026-03-16 06:02:27
18	Read Roles	roles.read	Roles	2026-03-16 06:02:27	2026-03-16 06:02:27
19	Update Roles	roles.update	Roles	2026-03-16 06:02:27	2026-03-16 06:02:27
20	Delete Roles	roles.delete	Roles	2026-03-16 06:02:27	2026-03-16 06:02:27
21	Create Users	users.create	Users	2026-03-16 06:02:27	2026-03-16 06:02:27
22	Read Users	users.read	Users	2026-03-16 06:02:27	2026-03-16 06:02:27
23	Update Users	users.update	Users	2026-03-16 06:02:27	2026-03-16 06:02:27
24	Delete Users	users.delete	Users	2026-03-16 06:02:27	2026-03-16 06:02:27
\.


--
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
1	App\\Models\\User	6	auth_token	366f89b0f026e69d60c6e97db99fdb4bf89150505e4ef4bc8805377c5cc66917	["*"]	\N	\N	2026-03-16 06:38:16	2026-03-16 06:38:16
\.


--
-- Data for Name: presales; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.presales (id, name, sector, estimated_value, description, status, proposal_doc_url, presentation_log, quotation_value, lost_reason, competitor, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_allocations; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.project_allocations (id, project_id, category_id, amount, description, created_at, updated_at, is_topup) FROM stdin;
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.project_members (id, project_id, user_id, project_role_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_role_quotas; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.project_role_quotas (id, project_id, project_role_id, quota_hours, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_roles; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.project_roles (id, name, created_at, updated_at) FROM stdin;
1	UI/UX Designer	2026-03-16 04:37:50	2026-03-16 04:37:50
2	Frontend Dev	2026-03-16 04:37:50	2026-03-16 04:37:50
3	Backend Dev	2026-03-16 04:37:50	2026-03-16 04:37:50
4	System Analyst	2026-03-16 04:37:50	2026-03-16 04:37:50
5	QA Engineer	2026-03-16 04:37:50	2026-03-16 04:37:50
6	Product Manager	2026-03-16 04:37:50	2026-03-16 04:37:50
7	Tester Role	2026-03-16 05:16:25	2026-03-16 05:16:25
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.projects (id, name, status, budget_status, completion, methodology, jobs, start_date, end_date, total_manhours, hourly_rate, total_cost, quotation_value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.roles (id, name, created_at, updated_at) FROM stdin;
1	Admin	2026-03-16 04:37:50	2026-03-16 04:37:50
2	Project Manager	2026-03-16 04:37:50	2026-03-16 04:37:50
3	Developer	2026-03-16 04:37:50	2026-03-16 04:37:50
4	Designer	2026-03-16 04:37:50	2026-03-16 04:37:50
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
Av74gddq2bo827U69ZzPvniZD0vugTgo3Dr0nCSf	\N	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:148.0) Gecko/20100101 Firefox/148.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiTDhvM1RHUkYweFdmRno2MkpmWTI4ZWtCRjBsNlpsbXA5ckV6SkZzbCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjg6Imh0dHA6Ly8xMjcuMC4wLjE6ODAwMC9zaWdudXAiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=	1773643083
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.tasks (id, project_id, title, feature_title, description, status, priority, assignee_id, estimated_hours, project_role_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: tito
--

COPY public.users (id, name, role, email, phone_number, status, email_verified_at, password, remember_token, created_at, updated_at, role_id) FROM stdin;
1	Jane Doe	Project Manager	jane@example.com	081234567890	Active	\N	\N	\N	2026-03-16 04:37:50	2026-03-16 04:37:50	2
2	John Smith	Developer	john@example.com	089876543210	Active	\N	\N	\N	2026-03-16 04:37:50	2026-03-16 04:37:50	3
6	Tito	Admin	akbartitowic@gmail.com	\N	Active	\N	$2y$12$qM/68vuWSgTou3guVwwT..L6kfsK1N3nd3Q8psMGq70AvMCKGCpXO	\N	2026-03-16 06:38:16	2026-03-16 06:38:16	1
\.


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- Name: finance_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.finance_categories_id_seq', 5, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- Name: manhours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.manhours_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.migrations_id_seq', 17, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.permissions_id_seq', 24, true);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 1, true);


--
-- Name: presales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.presales_id_seq', 1, false);


--
-- Name: project_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.project_allocations_id_seq', 1, false);


--
-- Name: project_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.project_members_id_seq', 1, false);


--
-- Name: project_role_quotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.project_role_quotas_id_seq', 1, false);


--
-- Name: project_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.project_roles_id_seq', 7, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.projects_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.roles_id_seq', 7, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.tasks_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tito
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: finance_categories finance_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.finance_categories
    ADD CONSTRAINT finance_categories_name_unique UNIQUE (name);


--
-- Name: finance_categories finance_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.finance_categories
    ADD CONSTRAINT finance_categories_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: manhours manhours_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.manhours
    ADD CONSTRAINT manhours_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: permission_role permission_role_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.permission_role
    ADD CONSTRAINT permission_role_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_slug_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_slug_unique UNIQUE (slug);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: presales presales_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.presales
    ADD CONSTRAINT presales_pkey PRIMARY KEY (id);


--
-- Name: project_allocations project_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_allocations
    ADD CONSTRAINT project_allocations_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_project_id_user_id_project_role_id_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_user_id_project_role_id_unique UNIQUE (project_id, user_id, project_role_id);


--
-- Name: project_role_quotas project_role_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_role_quotas
    ADD CONSTRAINT project_role_quotas_pkey PRIMARY KEY (id);


--
-- Name: project_role_quotas project_role_quotas_project_id_project_role_id_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_role_quotas
    ADD CONSTRAINT project_role_quotas_project_id_project_role_id_unique UNIQUE (project_id, project_role_id);


--
-- Name: project_roles project_roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_name_unique UNIQUE (name);


--
-- Name: project_roles project_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: tito
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: tito
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: tito
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: tito
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: tito
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: tito
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: tito
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: manhours manhours_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.manhours
    ADD CONSTRAINT manhours_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: manhours manhours_project_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.manhours
    ADD CONSTRAINT manhours_project_role_id_foreign FOREIGN KEY (project_role_id) REFERENCES public.project_roles(id) ON DELETE SET NULL;


--
-- Name: manhours manhours_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.manhours
    ADD CONSTRAINT manhours_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: permission_role permission_role_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.permission_role
    ADD CONSTRAINT permission_role_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: permission_role permission_role_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.permission_role
    ADD CONSTRAINT permission_role_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: project_allocations project_allocations_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_allocations
    ADD CONSTRAINT project_allocations_category_id_foreign FOREIGN KEY (category_id) REFERENCES public.finance_categories(id) ON DELETE CASCADE;


--
-- Name: project_allocations project_allocations_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_allocations
    ADD CONSTRAINT project_allocations_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_role_id_foreign FOREIGN KEY (project_role_id) REFERENCES public.project_roles(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_role_quotas project_role_quotas_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_role_quotas
    ADD CONSTRAINT project_role_quotas_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_role_quotas project_role_quotas_project_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.project_role_quotas
    ADD CONSTRAINT project_role_quotas_project_role_id_foreign FOREIGN KEY (project_role_id) REFERENCES public.project_roles(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_foreign FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_role_id_foreign FOREIGN KEY (project_role_id) REFERENCES public.project_roles(id) ON DELETE SET NULL;


--
-- Name: users users_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: tito
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 9R0bVN7wSakkkTrwL3l2YdGMnxnpq5JRFPEWDOBpe58IYP17JQj8ljf8yeOzWzn

