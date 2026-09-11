// node scripts/diagnose-db2.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xfgjpxadsjsuzqeuolgi.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ2pweGFkc2pzdXpxZXVvbGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTA3MzIsImV4cCI6MjA4ODc2NjczMn0.FCmTdGhNIEFw23dt71diqBFU-Ur5F0NP5-mpTbcuqPk";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ2pweGFkc2pzdXpxZXVvbGdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE5MDczMiwiZXhwIjoyMDg4NzY2NzMyfQ.2OUH0B-pLIKuVYFC-sNUthYnEemdxjr8TfHhCdCrCXo";

const anon = createClient(SUPABASE_URL, ANON_KEY);
const svc = createClient(SUPABASE_URL, SERVICE_KEY);

async function test(label, fn) {
  try {
    const r = await fn();
    if (r?.error) {
      console.error(`❌ FAIL  [${label}]`, r.error.code, r.error.message);
      return null;
    }
    console.log(`✅ OK    [${label}]`, JSON.stringify(r?.data ?? "").slice(0,100));
    return r?.data;
  } catch(e) {
    console.error(`❌ THROW [${label}]`, e.message);
    return null;
  }
}

const HOST_ID = "test-diag-" + Date.now();

async function run() {
  // ----- qt_session_results -----
  console.log("\n=== qt_session_results ===");
  
  // What columns exist?
  const { data: cols } = await svc.from("qt_session_results").select("*").limit(1);
  if (cols?.[0]) console.log("Columns:", Object.keys(cols[0]).join(", "));
  else console.log("Table empty, checking schema via insert test...");

  // Does owner_id column EXIST?
  const { error: colCheck } = await svc
    .from("qt_session_results")
    .insert({ host_id: HOST_ID, title: "col-test", player_count:0, question_count:0,
              final_leaderboard:[], question_stats:[], finished_at: new Date().toISOString(),
              owner_id: null })
    .select("id").single();
  if (colCheck) {
    console.log("Service insert error:", colCheck.code, colCheck.message);
    // Try without owner_id
    const { error: noOwner } = await svc
      .from("qt_session_results")
      .insert({ host_id: HOST_ID, title: "col-test-noowner", player_count:0, question_count:0,
                final_leaderboard:[], question_stats:[], finished_at: new Date().toISOString() })
      .select("id").single();
    if (noOwner) console.log("Service insert (no owner_id) error:", noOwner.code, noOwner.message);
    else console.log("✅ Service insert without owner_id worked");
  } else {
    console.log("✅ Service insert with owner_id worked");
  }

  // Anon insert test (what the app actually does)
  console.log("\n--- Anon insert (no auth session) ---");
  await test("anon INSERT qt_session_results (with owner_id=null)", () =>
    anon.from("qt_session_results").insert({
      host_id: HOST_ID,
      owner_id: null,
      title: "anon-test",
      player_count: 0,
      question_count: 0,
      final_leaderboard: [],
      question_stats: [],
      finished_at: new Date().toISOString(),
    }).select("id").single()
  );

  // ----- qt_question_bank -----
  console.log("\n=== qt_question_bank ===");
  await test("anon INSERT qt_question_bank", () =>
    anon.from("qt_question_bank").insert({
      host_id: HOST_ID,
      owner_id: null,
      type: "multiple_choice",
      question_text: "Test Q?",
      options: ["A","B","C","D"],
      correct_answer: "A",
      time_limit: 15,
      points_base: 1000,
      is_joker: false,
    }).select("id").single()
  );

  // ----- Check active RLS policies via SQL -----
  console.log("\n=== Active RLS policies (via SQL) ===");
  const { data: rlsData, error: rlsErr } = await svc.rpc("exec_sql", {
    sql: `SELECT tablename, policyname, cmd, permissive, qual, with_check
          FROM pg_policies 
          WHERE schemaname = 'public'
          AND tablename IN ('qt_quiz_templates','qt_question_bank','qt_session_results')
          ORDER BY tablename, cmd`
  });
  if (rlsErr) {
    // exec_sql not available, try another way
    console.log("Cannot read policies directly. Checking via information_schema...");
    const { data: tables } = await svc
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["qt_quiz_templates","qt_question_bank","qt_session_results"]);
    console.log("Tables:", tables?.map(t => t.table_name).join(", "));
  } else {
    (rlsData || []).forEach(r => {
      console.log(`[${r.tablename}] "${r.policyname}" ${r.cmd} permissive=${r.permissive}`);
      if (r.qual) console.log(`  USING: ${r.qual}`);
      if (r.with_check) console.log(`  CHECK: ${r.with_check}`);
    });
  }

  // ----- Check if user_quiz_logs is blocking -----
  console.log("\n=== user_quiz_logs ===");
  await test("anon INSERT user_quiz_logs", () =>
    anon.from("user_quiz_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      activity_type: "quiz_created",
      metadata: {},
    }).select("id").single()
  );

  // CLEANUP
  await svc.from("qt_session_results").delete().like("host_id", "test-diag-%");
  await svc.from("qt_question_bank").delete().like("host_id", "test-diag-%");
  await svc.from("qt_quiz_templates").delete().like("host_id", "test-diag-%");
  console.log("\n✅ Cleanup done");
}

run().catch(e => console.error("Fatal:", e.message));
