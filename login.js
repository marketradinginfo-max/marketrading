document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");

    if (!form) {
        console.error("loginForm was not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const loginInput =
            form.querySelector('[name="email"]')?.value.trim() || "";

        const password =
            form.querySelector('[name="password"]')?.value || "";

        const button =
            form.querySelector('button[type="submit"]');

        if (!loginInput || !password) {
            alert("Please enter your username/email and password.");
            return;
        }

        if (!window.supabaseClient) {
            alert(
                "Supabase is not connected. Check supabase.js and the script order."
            );
            return;
        }

        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "Logging in...";
        }

        try {
            let loginEmail = loginInput;

            // --------------------------------------------------
            // DETERMINE WHETHER USER ENTERED EMAIL OR USERNAME
            // --------------------------------------------------

            const looksLikeEmail =
                loginInput.includes("@");

            if (!looksLikeEmail) {

                // ----------------------------------------------
                // USERNAME LOGIN
                // ----------------------------------------------

                const { data: emailData, error: usernameError } =
                    await window.supabaseClient.rpc(
                        "get_login_email",
                        {
                            p_username: loginInput
                        }
                    );

                if (usernameError) {
                    console.error(
                        "USERNAME LOOKUP ERROR:",
                        usernameError
                    );

                    throw new Error(
                        "Unable to find that username. Please try again."
                    );
                }

                if (!emailData) {
                    throw new Error(
                        "Username not found. Please check your username."
                    );
                }

                loginEmail = String(emailData)
                    .trim()
                    .toLowerCase();
            }

            // --------------------------------------------------
            // SUPABASE AUTH LOGIN
            // --------------------------------------------------

            const { data, error } =
                await window.supabaseClient.auth.signInWithPassword({
                    email: loginEmail,
                    password
                });

            if (error) {
                throw error;
            }

            if (!data?.user) {
                throw new Error(
                    "Login succeeded but no user session was returned."
                );
            }

            const user = data.user;
            const metadata = user.user_metadata || {};

            // --------------------------------------------------
            // LOAD PROFILE
            // --------------------------------------------------

            let { data: profile, error: profileError } =
                await window.supabaseClient
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

            if (profileError) {
                throw new Error(
                    "Your login worked, but your profile could not be loaded: " +
                    profileError.message
                );
            }

            // --------------------------------------------------
            // CREATE PROFILE IF MISSING
            // --------------------------------------------------

            if (!profile) {

                const { data: createdProfile, error: createError } =
                    await window.supabaseClient
                        .from("profiles")
                        .insert({
                            id: user.id,
                            fullname:
                                metadata.fullname ||
                                metadata.full_name ||
                                "",
                            username:
                                metadata.username ||
                                "",
                            email:
                                user.email ||
                                loginEmail,
                            phone:
                                metadata.phone ||
                                "",
                            country:
                                metadata.country ||
                                "",
                            account_type:
                                metadata.account_type ||
                                "Standard",
                            balance: 0,
                            role: "user"
                        })
                        .select("*")
                        .single();

                if (createError) {
                    throw new Error(
                        "Login worked, but your profile could not be created: " +
                        createError.message
                    );
                }

                profile = createdProfile;
            }

            // --------------------------------------------------
            // SAVE USER ID
            // --------------------------------------------------

            localStorage.setItem(
                "user_id",
                user.id
            );

            // --------------------------------------------------
            // REDIRECT
            // --------------------------------------------------

            if (
                String(profile.role || "user").toLowerCase() ===
                "admin"
            ) {
                window.location.href =
                    "admin-dashboard.html";
            } else {
                window.location.href =
                    "dashboard.html";
            }

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            alert(
                error?.message ||
                "Login failed."
            );

        } finally {

            if (button) {
                button.disabled = false;

                button.textContent =
                    button.dataset.originalText ||
                    "Login";
            }
        }
    });
});
