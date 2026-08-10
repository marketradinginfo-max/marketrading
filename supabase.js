// ======================================================
// MARKETRADING - SUPABASE CLIENT
// ======================================================

const SUPABASE_URL = "https://zuvthowcxloiqlgrcvqk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xkZ3koTppF3EVtlPwQL_Tg_kf0sxzn7";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Marketrading: Supabase library was not loaded.");
} else {
    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    );

    window.supabaseClient = supabaseClient;
    console.log("Marketrading: Supabase connected.");
}
