import { test, expect } from "vitest";
import { buildCreateTable, buildInsert } from "./sqlgen";

const detail = {
  columns: [
    { name: "id", dataType: "bigint", default: null, comment: null, notNull: true, isPk: true },
    { name: "email", dataType: "text", default: "'x@x.com'::text", comment: null, notNull: true, isPk: false },
    { name: "note", dataType: "text", default: null, comment: null, notNull: false, isPk: false },
  ],
  indexes: [
    { name: "t_pkey", columns: "id", isPrimary: true, isUnique: true },
    { name: "t_email_idx", columns: "email", isPrimary: false, isUnique: true },
  ],
};

test("buildCreateTable includes columns, not null, default, pk and index", () => {
  const ddl = buildCreateTable("users", detail);
  expect(ddl).toContain('CREATE TABLE "users"');
  expect(ddl).toContain('"id" bigint NOT NULL');
  expect(ddl).toContain(`"email" text NOT NULL DEFAULT 'x@x.com'::text`);
  expect(ddl).toContain('PRIMARY KEY ("id")');
  expect(ddl).toContain('CREATE UNIQUE INDEX "t_email_idx" ON "users" ("email")');
});

test("buildInsert lists all columns with placeholders", () => {
  const ins = buildInsert("users", detail);
  expect(ins).toContain('INSERT INTO "users" ("id", "email", "note")');
  expect(ins).toContain("VALUES (<id>, <email>, <note>)");
});
