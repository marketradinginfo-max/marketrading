// ==========================================
// MARKETRADING - SETTINGS.JS
// ==========================================

let currentUserId = null;


// ------------------------------------------------------
// SHOW MESSAGE
// ------------------------------------------------------

function showMessage(message, type = "success") {

    const messageBox =
        document.getElementById("messageBox");

    if (!messageBox) {
        alert(message);
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = "block";

    setTimeout(() => {
        messageBox.style.display = "none";
    }, 5000);
}


// ------------------------------------------------------
// INIT
// ------------------------------------------------------

async function initSettings() {

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = "login.html";
        return;
    }

    currentUserId = session.user.id;

    // Load current notification preference, if the column exists.
    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("notifications_enabled")
        .eq("id", currentUserId)
        .maybeSingle();

    const emailNotifications =
        document.getElementById("emailNotifications");

    if (
        !profileError &&
        profile &&
        emailNotifications &&
        profile.notifications_enabled !== null &&
        profile.notifications_enabled !== undefined
    ) {
        emailNotifications.checked =
            Boolean(profile.notifications_enabled);
    }
}


// ------------------------------------------------------
// CHANGE PASSWORD
// ------------------------------------------------------

const passwordForm =
    document.getElementById("passwordForm");

const passwordSubmitBtn =
    document.getElementById("passwordSubmitBtn");


if (passwordForm) {

    passwordForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmNewPassword =
            document.getElementById("confirmNewPassword").value;

        if (newPassword.length < 6) {
            showMessage(
                "Password must be at least 6 characters.",
                "error"
            );
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showMessage("Passwords do not match.", "error");
            return;
        }


        if (passwordSubmitBtn) {
            passwordSubmitBtn.disabled = true;
            passwordSubmitBtn.textContent = "Updating...";
        }


        try {

            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                showMessage(
                    error.message || "Unable to update password.",
                    "error"
                );
                return;
            }

            showMessage("Password updated successfully.", "success");
            passwordForm.reset();

        } catch (err) {

            console.error("Unexpected password update error:", err);
            showMessage(
                err.message || "An unexpected error occurred.",
                "error"
            );

        } finally {

            if (passwordSubmitBtn) {
                passwordSubmitBtn.disabled = false;
                passwordSubmitBtn.textContent = "Update Password";
            }
        }
    });
}


// ------------------------------------------------------
// SAVE NOTIFICATION PREFERENCES
// ------------------------------------------------------

const savePreferencesBtn =
    document.getElementById("savePreferencesBtn");


if (savePreferencesBtn) {

    savePreferencesBtn.addEventListener("click", async () => {

        if (!currentUserId) {
            return;
        }

        const emailNotifications =
            document.getElementById("emailNotifications");

        savePreferencesBtn.disabled = true;
        savePreferencesBtn.textContent = "Saving...";

        try {

            const { error } = await supabaseClient
                .from("profiles")
                .update({
                    notifications_enabled:
                        emailNotifications
                            ? emailNotifications.checked
                            : true
                })
                .eq("id", currentUserId);

            if (error) {
                console.error("Preferences save error:", error);
                showMessage(
                    "Unable to save preferences. If this keeps " +
                    "happening, your profiles table may be missing " +
                    "a 'notifications_enabled' column.",
                    "error"
                );
                return;
            }

            showMessage("Preferences saved.", "success");

        } catch (err) {

            console.error("Unexpected preferences error:", err);
            showMessage(
                err.message || "An unexpected error occurred.",
                "error"
            );

        } finally {

            savePreferencesBtn.disabled = false;
            savePreferencesBtn.textContent = "Save Preferences";
        }
    });
}


// ------------------------------------------------------
// LOGOUT
// ------------------------------------------------------

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async (e) => {

        e.preventDefault();

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout error:", error);
            alert("Logout failed. Please try again.");
            return;
        }

        window.location.href = "login.html";
    });
}


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", initSettings);
