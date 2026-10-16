import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * Base de datos de prueba: Postgres real (PGlite/WASM) con un esquema mínimo
 * que imita lo que Supabase provee (roles, auth.users, auth.uid(), storage) y
 * todas las migraciones aplicadas en orden.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const SUPABASE_SHIM = /* sql */ `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(
      coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      ),
      ''
    )::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    owner uuid,
    created_at timestamptz not null default now()
  );
  alter table storage.objects enable row level security;
  grant select on storage.buckets to anon, authenticated;
  grant all on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  grant execute on function storage.foldername(text) to anon, authenticated;
`;

export type Row = Record<string, unknown>;
export type Executor = Pick<Transaction, "query" | "exec">;

export interface TestDb {
  /** Conexión como superusuario (equivale a migraciones / dashboard). */
  db: PGlite;
  /** Crea una cuenta en auth.users (dispara la creación del perfil). */
  createUser(name?: string): Promise<string>;
  /** Ejecuta `fn` como un usuario autenticado (o anónimo con null) en una transacción. */
  as<T>(userId: string | null, fn: (tx: Executor) => Promise<T>): Promise<T>;
  /** Consulta SQL como un usuario. */
  queryAs<T = Row>(userId: string | null, sql: string, params?: unknown[]): Promise<T[]>;
  /** Llama a una función RPC con argumentos con nombre, como un usuario. */
  rpc<T = Row>(userId: string | null, fn: string, args?: Record<string, unknown>): Promise<T[]>;
  /** Consulta como superusuario. */
  sql<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

let userSeq = 0;

export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Falló la migración ${file}: ${(error as Error).message}`);
    }
  }

  const as: TestDb["as"] = (userId, fn) =>
    db.transaction(async (tx) => {
      if (userId) {
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: userId, role: "authenticated" }),
        ]);
        await tx.exec("set local role authenticated");
      } else {
        await tx.exec("set local role anon");
      }
      return fn(tx);
    });

  const queryAs: TestDb["queryAs"] = async (userId, sql, params = []) =>
    as(userId, async (tx) => (await tx.query(sql, params)).rows as never);

  const rpc: TestDb["rpc"] = (userId, fn, args = {}) => {
    const entries = Object.entries(args);
    const named = entries.map(([key], i) => `${key} => $${i + 1}`).join(", ");
    return queryAs(
      userId,
      `select * from public.${fn}(${named})`,
      entries.map(([, value]) => serialize(value)),
    );
  };

  return {
    db,
    as,
    queryAs,
    rpc,
    async createUser(name) {
      userSeq += 1;
      const displayName = name ?? `Usuario ${userSeq}`;
      const { rows } = await db.query<{ id: string }>(
        "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
        [`user${userSeq}-${Date.now()}@test.local`, JSON.stringify({ display_name: displayName })],
      );
      return rows[0].id;
    },
    async sql(sql, params = []) {
      return (await db.query(sql, params)).rows as never;
    },
    close: () => db.close(),
  };
}

/**
 * Arrays no vacíos de valores simples → literal de array de Postgres (uuid[]).
 * Objetos y arrays de objetos (o vacíos) → JSON (jsonb).
 */
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v !== "object")) {
    return `{${value.map((v) => `"${String(v)}"`).join(",")}}`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

/** Espera que la promesa falle con un error de base que contenga `fragment`. */
export async function expectDbError(promise: Promise<unknown>, fragment: string | RegExp): Promise<void> {
  let failed = false;
  try {
    await promise;
  } catch (error) {
    failed = true;
    const message = (error as Error).message;
    const matches = typeof fragment === "string" ? message.includes(fragment) : fragment.test(message);
    if (!matches) {
      throw new Error(`Se esperaba un error con "${fragment}" pero se obtuvo: ${message}`);
    }
  }
  if (!failed) {
    throw new Error(`Se esperaba un error con "${fragment}" pero la operación tuvo éxito`);
  }
}
