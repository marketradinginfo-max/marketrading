// ======================================================
// MARKETRADING - REGISTER
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");

    if (!form) {
        console.error("registerForm was not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const get = (selector) => form.querySelector(selector);

        const fullname = get('[name="fullname"]')?.value.trim() || "";
        const username = get('[name="username"]')?.value.trim() || "";
        const email = get('[name="email"]')?.value.trim().toLowerCase() || "";
        const phone = get('[name="phone"]')?.value.trim() || "";
        const country = get('[name="country"]')?.value.trim() || "";
        const password = get('[name="password"]')?.value || "";
        const confirmPassword =
            get('[name="confirm_password"]')?.value ||
            get('[name="confirmPassword"]')?.value ||
            "";

        const submitButton = form.querySelector('button[type="submit"]');

        if (!fullname) return alert("Please enter your full name.");
        if (!username) return alert("Please enter a username.");
        if (!email) return alert("Please enter your email address.");
        if (!phone) return alert("Please enter your phone number.");
        if (!password) return alert("Please enter a password.");
        if (password.length < 6) return alert("Password must contain at least 6 characters.");
        if (password !== confirmPassword) return alert("Passwords do not match.");

        if (!window.supabaseClient) {
            alert("Supabase is not connected. Check supabase.js.");
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalText = submitButton.textContent;
            submitButton.textContent = "Creating Account...";
        }

        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        fullname,
                        username,
                        phone,
                        country,
                        account_type: "Standard"
                    }
                }
            });

            if (error) throw error;
            if (!data?.user) throw new Error("Supabase did not return a user.");

            // If email confirmation is disabled, create the profile immediately.
            // If confirmation is enabled, login.js will create it after confirmation.
            if (data.session) {
                const { error: profileError } = await window.supabaseClient
                    .from("profiles")
                    .insert({
                        id: data.user.id,
                        fullname,
                        username,
                        email,
                        phone,
                        country,
                        account_type: "Standard",
                        balance: 0,
                        role: "user"
                    });

                if (profileError) {
                    throw new Error("Account was created, but the profile could not be saved: " + profileError.message);
                }

                localStorage.setItem("user_id", data.user.id);
                alert("Account created successfully.");
                window.location.href = "dashboard.html";
            } else {
                alert("Account created. Please confirm your email, then log in.");
                window.location.href = "login.html";
            }
        } catch (error) {
            console.error("REGISTRATION ERROR:", error);
            alert(error?.message || "Unable to create your account.");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.originalText || "Create Account";
            }
        }
    });
});
