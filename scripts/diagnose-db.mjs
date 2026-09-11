// Diagnostic script - run with: node scripts/diagnose-db.mjs
// Tests all database operations to find what's failing

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xfgjpxadsjsuzqeuolgi.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ2pweGFkc2pzdXpxZXVvbGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTA3MzIsImV4cCI6MjA4ODc2NjczMn0.FCmTdGhNIEFw23dt71diqBFU-Ur5F0NP5-mpTbcuqPk";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ2pweGFkc2pzdXpxZXVvbGdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE5MDczMiwiZXhwIjoyMDg4NzY2NzMyfQ.2OUH0B-pLIKuVYFC-sNUthYnEemdxjr8TfHhCdCrCXo";

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

const TEST_HOST_ID = "test-host-" + Date.now();

async function test(label, fn) {
  try {
    const result = await fn();
    if (result?.error) {
      console.error(`❌ FAIL [${label}]:`, result.error.code, "-", result.error.message);
      return null;
    }
    console.log(`✅ OK   [${label}]:`, JSON.stringify(result?.data ?? result).slice(0, 120));
    return result?.data ?? result;
  } catch (e) {
    console.error(`❌ EXCEPTION [${label}]:`, e.message);
    return null;
  }
}

async function run() {
  console.log("\n=== 1. CHECK AUTH SESSION (anon client) ===");
  await test("auth.getUser (no session)", () => anonClient.auth.getUser());

  console.log("\n=== 2. CHECK TABLES EXIST & RLS STATUS ===");
  await test("qt_quiz_templates exists", () =>
    serviceClient.from("qt_quiz_templates").select("id").limit(1)
  );
  await test("qt_question_bank exists", () =>
    serviceClient.from("qt_question_bank").select("id").limit(1)
  );
  await test("qt_session_results exists", () =>
    serviceClient.from("qt_session_results").select("id").limit(1)
  );

  console.log("\n=== 3. TEST ANON INSERT (simulates what app does when NOT logged in) ===");
  const anonTemplateResult = await test("anon INSERT qt_quiz_templates", () =>
    anonClient.from("qt_quiz_templates").insert({
      host_id: TEST_HOST_ID,
      title: "DIAGNOSTIC TEST - anon",
      question_ids: [],
      question_order: {},
      is_draft: true,
    }).select("id").single()
  );

  console.log("\n=== 4. TEST SERVICE ROLE INSERT (bypasses RLS) ===");
  const serviceTemplateResult = await test("service INSERT qt_quiz_templates", () =>
    serviceClient.from("qt_quiz_templates").insert({
      host_id: TEST_HOST_ID,
      title: "DIAGNOSTIC TEST - service role",
      question_ids: [],
      question_order: {},
      is_draft: true,
    }).select("id").single()
  );

  console.log("\n=== 5. CHECK RLS POLICIES ON TABLES ===");
  const { data: policies, error: pErr } = await serviceClient
    .from("pg_policies")
    .select("tablename, policyname, cmd, qual, with_check")
    .in("tablename", ["qt_quiz_templates", "qt_question_bank", "qt_session_results"]);
  
  if (pErr) {
    // pg_policies might not be accessible, try a different way
    console.log("  (pg_policies not accessible, trying information_schema)");
    const { data: rlsStatus } = await serviceClient.rpc("check_rls_status").catch(() => ({ data: null }));
    console.log("  RLS status:", rlsStatus);
  } else {
    console.log("\n  ACTIVE POLICIES:");
    (policies || []).forEach(p => {
      console.log(`  [${p.tablename}] ${p.policyname} (${p.cmd})`);
      if (p.qual) console.log(`    USING: ${p.qual}`);
      if (p.with_check) console.log(`    WITH CHECK: ${p.with_check}`);
    });
  }

  console.log("\n=== 6. TEST: What auth.uid() returns for anon requests ===");
  await test("anon SELECT with RLS", () =>
    anonClient.from("qt_quiz_templates").select("id, owner_id, host_id").limit(3)
  );

  console.log("\n=== 7. CHECK qt_session_results columns ===");
  const { data: sampleResult } = await serviceClient
    .from("qt_session_results")
    .select("*")
    .limit(1);
  if (sampleResult?.[0]) {
    console.log("  Columns:", Object.keys(sampleResult[0]).join(", "));
  } else {
    console.log("  Table empty - checking with service client insert...");
    await test("service INSERT qt_session_results", () =>
      serviceClient.from("qt_session_results").insert({
        room_id: null,
        quiz_template_id: null,
        host_id: TEST_HOST_ID,
        title: "DIAGNOSTIC TEST",
        player_count: 1,
        question_count: 1,
        final_leaderboard: [],
        question_stats: [],
        started_at: null,
        finished_at: new Date().toISOString(),
      }).select("id").single()
    );
  }

  console.log("\n=== 8. ANON INSERT qt_session_results ===");
  await test("anon INSERT qt_session_results", () =>
    anonClient.from("qt_session_results").insert({
      room_id: null,
      quiz_template_id: null,
      host_id: TEST_HOST_ID,
      title: "DIAGNOSTIC TEST - anon",
      player_count: 1,
      question_count: 1,
      final_leaderboard: [],
      question_stats: [],
      started_at: null,
      finished_at: new Date().toISOString(),
    }).select("id").single()
  );

  console.log("\n=== CLEANUP ===");
  await serviceClient.from("qt_quiz_templates")
    .delete().like("host_id", "test-host-%");
  await serviceClient.from("qt_session_results")
    .delete().like("host_id", "test-host-%");
  console.log("  Cleaned up test rows.");

  console.log("\n=== DIAGNOSIS COMPLETE ===\n");
  console.log("KEY FINDINGS:");
  console.log("- If anon INSERT fails → RLS blocks unauthenticated saves → run revert_006_rls.sql");
  console.log("- If qt_session_results anon INSERT fails → need to DISABLE RLS on that table");
  console.log("- If service INSERT succeeds but anon fails → confirmed RLS issue\n");
}

run().catch(console.error);
