/**
 * Genera src/types/database.ts a partir de las migraciones, sin Docker:
 * aplica todo en PGlite e introspecciona el catálogo de Postgres.
 *
 * El formato replica el de `supabase gen types typescript` para que el
 * cliente tipado de supabase-js infiera filas, inserts, joins y RPC. Con un
 * proyecto remoto vinculado también se puede usar el CLI oficial.
 *
 * Uso: npm run db:types
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDb } from "../supabase/tests/helpers/test-db";

const SCHEMA = "public";
const OUTPUT = join(process.cwd(), "src", "types", "database.ts");

interface ColumnRow {
  table_name: string;
  column_name: string;
  type_name: string;
  type_schema: string;
  type_category: string;
  element_type: string | null;
  element_schema: string | null;
  not_null: boolean;
  has_default: boolean;
  identity: string;
  generated: string;
  relkind: string;
}

interface FkRow {
  table_name: string;
  constraint_name: string;
  columns: string[];
  referenced_table: string;
  referenced_columns: string[];
  is_one_to_one: boolean;
}

interface EnumRow {
  enum_name: string;
  labels: string[];
}

interface FunctionRow {
  name: string;
  arg_names: string[] | null;
  arg_types: string[];
  arg_modes: string[] | null;
  num_defaults: number;
  return_type: string;
  return_type_schema: string;
  return_type_category: string;
  return_type_relkind: string | null;
  returns_set: boolean;
}

const db = await createTestDb();

const enums = await db.sql<EnumRow>(
  `select t.typname as enum_name, array_agg(e.enumlabel order by e.enumsortorder) as labels
   from pg_type t
   join pg_enum e on e.enumtypid = t.oid
   join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = $1
   group by t.typname
   order by t.typname`,
  [SCHEMA],
);
const enumNames = new Set(enums.map((e) => e.enum_name));

const columns = await db.sql<ColumnRow>(
  `select
     c.relname as table_name,
     a.attname as column_name,
     t.typname as type_name,
     tn.nspname as type_schema,
     t.typcategory as type_category,
     et.typname as element_type,
     etn.nspname as element_schema,
     a.attnotnull as not_null,
     a.atthasdef as has_default,
     a.attidentity as identity,
     a.attgenerated as generated,
     c.relkind::text as relkind
   from pg_attribute a
   join pg_class c on c.oid = a.attrelid
   join pg_namespace n on n.oid = c.relnamespace
   join pg_type t on t.oid = a.atttypid
   join pg_namespace tn on tn.oid = t.typnamespace
   left join pg_type et on et.oid = t.typelem and t.typcategory = 'A'
   left join pg_namespace etn on etn.oid = et.typnamespace
   where n.nspname = $1
     and c.relkind in ('r', 'p', 'v', 'm')
     and a.attnum > 0
     and not a.attisdropped
   order by c.relname, a.attnum`,
  [SCHEMA],
);

const fks = await db.sql<FkRow>(
  `select
     c.relname as table_name,
     con.conname as constraint_name,
     array(select a.attname from unnest(con.conkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum order by k.ord) as columns,
     rc.relname as referenced_table,
     array(select a.attname from unnest(con.confkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum order by k.ord) as referenced_columns,
     exists (
       select 1 from pg_constraint u
       where u.conrelid = con.conrelid and u.contype in ('p', 'u')
         and (select array_agg(x order by x) from unnest(u.conkey) x)
           = (select array_agg(x order by x) from unnest(con.conkey) x)
     ) as is_one_to_one
   from pg_constraint con
   join pg_class c on c.oid = con.conrelid
   join pg_namespace n on n.oid = c.relnamespace
   join pg_class rc on rc.oid = con.confrelid
   join pg_namespace rn on rn.oid = rc.relnamespace
   where con.contype = 'f' and n.nspname = $1 and rn.nspname = $1
   order by c.relname, con.conname`,
  [SCHEMA],
);

const functions = await db.sql<FunctionRow>(
  `select
     p.proname as name,
     p.proargnames as arg_names,
     array(select format_type(x, null) from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) x) as arg_types,
     p.proargmodes::text[] as arg_modes,
     p.pronargdefaults as num_defaults,
     rt.typname as return_type,
     rtn.nspname as return_type_schema,
     rt.typcategory as return_type_category,
     rc.relkind::text as return_type_relkind,
     p.proretset as returns_set
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   join pg_type rt on rt.oid = p.prorettype
   join pg_namespace rtn on rtn.oid = rt.typnamespace
   left join pg_class rc on rc.oid = rt.typrelid
   where n.nspname = $1
     and p.prokind = 'f'
     and rt.typname <> 'trigger'
     and p.proname not like '\\_%'
   order by p.proname`,
  [SCHEMA],
);

await db.close();

// -----------------------------------------------------------------------------
// Mapeo de tipos
// -----------------------------------------------------------------------------

const STRING_TYPES = new Set([
  "uuid", "text", "varchar", "bpchar", "char", "name", "citext", "date", "time", "timetz",
  "timestamp", "timestamptz", "interval", "inet", "cidr", "macaddr", "bytea", "daterange",
  "tstzrange", "tsrange", "numrange", "int4range", "int8range",
]);
const NUMBER_TYPES = new Set(["int2", "int4", "int8", "float4", "float8", "numeric", "oid"]);

function scalar(typeName: string, typeSchema: string): string {
  if (typeSchema === SCHEMA && enumNames.has(typeName)) {
    return `Database["public"]["Enums"]["${typeName}"]`;
  }
  if (STRING_TYPES.has(typeName)) return "string";
  if (NUMBER_TYPES.has(typeName)) return "number";
  if (typeName === "bool") return "boolean";
  if (typeName === "json" || typeName === "jsonb") return "Json";
  if (typeName === "void") return "undefined";
  return "unknown";
}

function columnType(c: ColumnRow): string {
  if (c.type_category === "A" && c.element_type) {
    return `${scalar(c.element_type, c.element_schema ?? "")}[]`;
  }
  return scalar(c.type_name, c.type_schema);
}

/** format_type() → nombre interno para el mapeo (e.g. "uuid[]", "public.group_role"). */
function formattedType(formatted: string): string {
  const isArray = formatted.endsWith("[]");
  const base = isArray ? formatted.slice(0, -2) : formatted;
  const aliases: Record<string, string> = {
    "timestamp with time zone": "timestamptz",
    "timestamp without time zone": "timestamp",
    "time with time zone": "timetz",
    "time without time zone": "time",
    integer: "int4",
    smallint: "int2",
    bigint: "int8",
    boolean: "bool",
    "double precision": "float8",
    real: "float4",
    "character varying": "varchar",
    character: "bpchar",
  };
  const [schema, name] = base.includes(".") ? base.split(".") : ["pg_catalog", base];
  const resolved = aliases[name] ?? name.replace(/\(.*\)$/, "");
  const ts = scalar(resolved, schema === "pg_catalog" && enumNames.has(resolved) ? SCHEMA : schema);
  return isArray ? `${ts}[]` : ts;
}

// -----------------------------------------------------------------------------
// Emisión
// -----------------------------------------------------------------------------

const indent = (level: number) => "  ".repeat(level);
const key = (name: string) => (/^[a-z_][a-z0-9_]*$/i.test(name) ? name : JSON.stringify(name));

function groupBy<T>(rows: T[], by: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = by(row);
    map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}

const byTable = groupBy(columns, (c) => c.table_name);
const fksByTable = groupBy(fks, (f) => f.table_name);

function relationships(table: string, level: number): string {
  const rels = fksByTable.get(table) ?? [];
  if (rels.length === 0) return `${indent(level)}Relationships: []`;
  const items = rels.map((r) =>
    [
      `${indent(level + 1)}{`,
      `${indent(level + 2)}foreignKeyName: "${r.constraint_name}"`,
      `${indent(level + 2)}columns: [${r.columns.map((c) => `"${c}"`).join(", ")}]`,
      `${indent(level + 2)}isOneToOne: ${r.is_one_to_one}`,
      `${indent(level + 2)}referencedRelation: "${r.referenced_table}"`,
      `${indent(level + 2)}referencedColumns: [${r.referenced_columns.map((c) => `"${c}"`).join(", ")}]`,
      `${indent(level + 1)}},`,
    ].join("\n"),
  );
  return `${indent(level)}Relationships: [\n${items.join("\n")}\n${indent(level)}]`;
}

function tableBlock(table: string, cols: ColumnRow[], level: number): string {
  const row = cols.map((c) => `${indent(level + 2)}${key(c.column_name)}: ${columnType(c)}${c.not_null ? "" : " | null"}`);
  const insert = cols.map((c) => {
    const type = `${columnType(c)}${c.not_null ? "" : " | null"}`;
    if (c.generated === "s" || c.identity === "a") return `${indent(level + 2)}${key(c.column_name)}?: never`;
    const optional = !c.not_null || c.has_default || c.identity === "d";
    return `${indent(level + 2)}${key(c.column_name)}${optional ? "?" : ""}: ${type}`;
  });
  const update = cols.map((c) => {
    if (c.generated === "s" || c.identity === "a") return `${indent(level + 2)}${key(c.column_name)}?: never`;
    return `${indent(level + 2)}${key(c.column_name)}?: ${columnType(c)}${c.not_null ? "" : " | null"}`;
  });
  return [
    `${indent(level)}${key(table)}: {`,
    `${indent(level + 1)}Row: {`,
    ...row,
    `${indent(level + 1)}}`,
    `${indent(level + 1)}Insert: {`,
    ...insert,
    `${indent(level + 1)}}`,
    `${indent(level + 1)}Update: {`,
    ...update,
    `${indent(level + 1)}}`,
    relationships(table, level + 1),
    `${indent(level)}}`,
  ].join("\n");
}

function viewBlock(view: string, cols: ColumnRow[], level: number): string {
  return [
    `${indent(level)}${key(view)}: {`,
    `${indent(level + 1)}Row: {`,
    ...cols.map((c) => `${indent(level + 2)}${key(c.column_name)}: ${columnType(c)} | null`),
    `${indent(level + 1)}}`,
    relationships(view, level + 1),
    `${indent(level)}}`,
  ].join("\n");
}

function functionBlock(fn: FunctionRow, level: number): string {
  const names = fn.arg_names ?? [];
  const modes = fn.arg_modes ?? fn.arg_types.map(() => "i");
  const inputs: Array<{ name: string; type: string }> = [];
  const outputs: Array<{ name: string; type: string }> = [];
  fn.arg_types.forEach((type, i) => {
    const entry = { name: names[i] ?? `arg${i}`, type: formattedType(type) };
    if (modes[i] === "t" || modes[i] === "o") outputs.push(entry);
    else inputs.push(entry);
  });

  const firstDefault = inputs.length - fn.num_defaults;
  const args =
    inputs.length === 0
      ? `${indent(level + 1)}Args: never`
      : [
          `${indent(level + 1)}Args: {`,
          ...inputs.map((a, i) => `${indent(level + 2)}${key(a.name)}${i >= firstDefault ? "?" : ""}: ${a.type}`),
          `${indent(level + 1)}}`,
        ].join("\n");

  let returns: string;
  if (outputs.length > 0) {
    // Postgres no declara nulabilidad en RETURNS TABLE: se asume que puede ser null.
    const shape = [`{`, ...outputs.map((o) => `${indent(level + 2)}${key(o.name)}: ${o.type} | null`), `${indent(level + 1)}}`].join("\n");
    returns = `${indent(level + 1)}Returns: ${shape}${fn.returns_set ? "[]" : ""}`;
  } else if (fn.return_type_category === "C" && fn.return_type_schema === SCHEMA && fn.return_type_relkind) {
    const rowType = `Database["public"]["Tables"]["${fn.return_type}"]["Row"]`;
    returns = `${indent(level + 1)}Returns: ${rowType}${fn.returns_set ? "[]" : ""}`;
  } else {
    const t = scalar(fn.return_type, fn.return_type_schema);
    returns = `${indent(level + 1)}Returns: ${t}${fn.returns_set ? "[]" : ""}`;
  }

  return [`${indent(level)}${key(fn.name)}: {`, args, returns, `${indent(level)}}`].join("\n");
}

const tables = [...byTable.entries()].filter(([, cols]) => ["r", "p"].includes(cols[0].relkind));
const views = [...byTable.entries()].filter(([, cols]) => ["v", "m"].includes(cols[0].relkind));

const out = `// Archivo generado por scripts/gen-db-types.mts — no editar a mano.
// Regenerar con: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
${tables.map(([name, cols]) => tableBlock(name, cols, 3)).join("\n")}
    }
    Views: {
${views.length ? views.map(([name, cols]) => viewBlock(name, cols, 3)).join("\n") : `${indent(3)}[_ in never]: never`}
    }
    Functions: {
${functions.map((fn) => functionBlock(fn, 3)).join("\n")}
    }
    Enums: {
${enums.map((e) => `${indent(3)}${key(e.enum_name)}: ${e.labels.map((l) => `"${l}"`).join(" | ")}`).join("\n")}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type FunctionArgs<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Args"]
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Returns"]

export const Constants = {
  public: {
    Enums: {
${enums.map((e) => `${indent(3)}${key(e.enum_name)}: [${e.labels.map((l) => `"${l}"`).join(", ")}],`).join("\n")}
    },
  },
} as const
`;

writeFileSync(OUTPUT, out, "utf8");
console.log(`Tipos generados en ${OUTPUT}: ${tables.length} tablas, ${views.length} vistas, ${functions.length} funciones, ${enums.length} enums.`);
