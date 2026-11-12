const files = [
  "test_create.ts",
  "test_insert.ts",
  "test_query.ts",
  "test_update.ts",
  "test_delete.ts",
];

let failed = 0;
const cwd = import.meta.dirname;

for (const f of files) {
  console.log(`\n=== ${f} ===`);
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-ffi", "--allow-read", "--allow-write", "--allow-env", f],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await cmd.output();
  if (code !== 0) failed++;
}

console.log(
  `\n${failed === 0 ? "✅ all passed" : `❌ ${failed} file(s) failed`}`,
);
Deno.exit(failed === 0 ? 0 : 1);

