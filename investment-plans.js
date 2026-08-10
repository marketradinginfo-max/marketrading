// ==========================================
// MARKETRADING - INVESTMENT-PLANS.JS
// ==========================================

let currentUserId = null;
let currentBalance = 0;


// ------------------------------------------------------
// FORMAT MONEY
// ------------------------------------------------------

function formatMoney(amount) {

    const number = Number(amount || 0);

    return number.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}


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

async function initInvestmentPlans() {

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = "login.html";
        return;
    }

    currentUserId = session.user.id;

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("balance")
        .eq("id", currentUserId)
        .maybeSingle();

    if (profileError) {
        console.error("Error loading profile:", profileError);
    }

    currentBalance = profile ? Number(profile.balance || 0) : 0;
}


// ------------------------------------------------------
// INVEST NOW BUTTONS
// ------------------------------------------------------

const investButtons =
    document.querySelectorAll(".invest-btn");

investButtons.forEach(button => {

    button.addEventListener("click", async () => {

        if (!currentUserId) {
            alert("Please wait for the page to finish loading.");
            return;
        }

        const plan = button.dataset.plan;
        const min = Number(button.dataset.min || 0);
        const max = button.dataset.max
            ? Number(button.dataset.max)
            : null;

        const rangeLabel =
            max
                ? `${formatMoney(min)} - ${formatMoney(max)}`
                : `${formatMoney(min)}+`;

        const input = prompt(
            `How much would you like to invest in the ${plan} plan?\n` +
            `Range: ${rangeLabel}\n` +
            `Available balance: ${formatMoney(currentBalance)}`
        );

        if (input === null) {
            return;
        }

        const amount = Number(input);

        if (!amount || amount <= 0) {
            showMessage("Please enter a valid amount.", "error");
            return;
        }

        if (amount < min || (max && amount > max)) {
            showMessage(
                `Amount must be between ${rangeLabel} for the ${plan} plan.`,
                "error"
            );
            return;
        }

        if (amount > currentBalance) {
            showMessage(
                "Insufficient balance. Please deposit funds first.",
                "error"
            );
            return;
        }


        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Processing...";


        try {

            // NOTE: like deposits, this only logs the investment
            // request as "pending". Actually moving funds out of
            // the user's balance and into an active investment
            // should happen through a trusted server-side process
            // (a Supabase RPC/function), not directly from the
            // client, so it can be reviewed and can't be forged.
            const { error } = await supabaseClient
                .from("transactions")
                .insert([
                    {
                        user_id: currentUserId,
                        amount,
                        type: "investment",
                        status: "pending",
                        description: `${plan} plan investment`
                    }
                ]);

            if (error) {
                console.error("Investment error:", error);
                showMessage(
                    error.message || "Unable to submit investment.",
                    "error"
                );
                return;
            }

            showMessage(
                `Investment request for ${formatMoney(amount)} in the ` +
                `${plan} plan submitted for review.`,
                "success"
            );

        } catch (err) {

            console.error("Unexpected investment error:", err);
            showMessage(
                err.message || "An unexpected error occurred.",
                "error"
            );

        } finally {

            button.disabled = false;
            button.textContent = originalText;
        }
    });
});


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", initInvestmentPlans);
