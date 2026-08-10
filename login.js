// ======================================================
// MARKETRADING - LOGIN
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");

    if (!form) {
        console.error("loginForm was not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = form.querySelector('[name="email"]')?.value.trim().toLowerCase();
        const password = form.querySelector('[name="password"]')?.value || "";
        const button = form.querySelector('button[type="submit"]');

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        if (!window.supabaseClient) {
            alert("Supabase is not connected. Check supabase.js and the script order.");
            return;
        }

        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "Logging in...";
        }

        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            if (!data?.user) throw new Error("Login succeeded but no user session was returned.");

            const user = data.user;
            const metadata = user.user_metadata || {};

            let { data: profile, error: profileError } = await window.supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

            if (profileError) throw new Error("Your login worked, but your profile could not be loaded: " + profileError.message);

            // Create a profile if the Auth account exists but the profile row is missing.
            if (!profile) {
                const { data: createdProfile, error: createError } = await window.supabaseClient
                    .from("profiles")
                    .insert({
                        id: user.id,
                        fullname: metadata.fullname || metadata.full_name || "",
                        username: metadata.username || "",
                        email: user.email || email,
                        phone: metadata.phone || "",
                        country: metadata.country || "",
                        account_type: metadata.account_type || "Standard",
                        balance: 0,
                        role: "user"
                    })
                    .select("*")
                    .single();

                if (createError) {
                    throw new Error("Login worked, but your profile could not be created: " + createError.message);
                }

                profile = createdProfile;
            }

            localStorage.setItem("user_id", user.id);

            if (String(profile.role || "user").toLowerCase() === "admin") {
                window.location.href = "admin-dashboard.html";
            } else {
                window.location.href = "dashboard.html";
            }
        } catch (error) {
            console.error("LOGIN ERROR:", error);
            alert(error?.message || "Login failed.");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = button.dataset.originalText || "Login";
            }
        }
    });
});
