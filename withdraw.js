// ==========================================
// MARKETRADING - WITHDRAW.JS
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
// INIT
// ------------------------------------------------------

async function initWithdraw() {

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

    const balanceElement =
        document.getElementById("currentBalance");

    if (balanceElement) {
        balanceElement.textContent = formatMoney(currentBalance);
    }

    await loadWithdrawHistory();
}


// ------------------------------------------------------
// SUBMIT WITHDRAWAL
// ------------------------------------------------------

const withdrawForm =
    document.getElementById("withdrawForm");

const withdrawSubmitBtn =
    document.getElementById("withdrawSubmitBtn");


if (withdrawForm) {

    withdrawForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        if (!currentUserId) {
            alert("You must be logged in to withdraw.");
            return;
        }

        const amountInput =
            document.getElementById("withdrawAmount");

        const methodInput =
            document.getElementById("withdrawMethod");

        const destinationInput =
            document.getElementById("withdrawDestination");

        const amount = Number(amountInput.value);

        if (!amount || amount <= 0) {
            alert("Please enter a valid withdrawal amount.");
            return;
        }

        if (amount > currentBalance) {
            alert("Insufficient balance for this withdrawal.");
            return;
        }

        if (!destinationInput.value.trim()) {
            alert("Please provide destination account/wallet details.");
            return;
        }


        if (withdrawSubmitBtn) {
            withdrawSubmitBtn.disabled = true;
            withdrawSubmitBtn.textContent = "Processing...";
        }


        try {

            // NOTE: like deposits and investments, this only logs
            // the withdrawal request as "pending". The balance is
            // NOT deducted from the client — that must happen
            // through a trusted server-side process once an admin
            // reviews and approves the request, so a user can't
            // just edit client code to withdraw more than they have.
            const { error } = await supabaseClient
                .from("transactions")
                .insert([
                    {
                        user_id: currentUserId,
                        amount,
                        type: "withdrawal",
                        status: "pending",
                        description:
                            `${methodInput.value} withdrawal to ` +
                            destinationInput.value.trim()
                    }
                ]);

            if (error) {
                console.error("Withdrawal error:", error);
                alert(error.message || "Unable to submit withdrawal.");
                return;
            }

            alert(
                "Withdrawal request submitted! It will be processed " +
                "once reviewed."
            );

            withdrawForm.reset();

            await loadWithdrawHistory();

        } catch (err) {

            console.error("Unexpected withdrawal error:", err);
            alert(err.message || "An unexpected error occurred.");

        } finally {

            if (withdrawSubmitBtn) {
                withdrawSubmitBtn.disabled = false;
                withdrawSubmitBtn.textContent = "Request Withdrawal";
            }
        }
    });
}


// ------------------------------------------------------
// LOAD WITHDRAWAL HISTORY
// ------------------------------------------------------

async function loadWithdrawHistory() {

    const withdrawHistoryBody =
        document.getElementById("withdrawHistoryBody");

    if (!withdrawHistoryBody || !currentUserId) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error loading withdrawal history:", error);

        withdrawHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">Unable to load withdrawals.</td>
            </tr>
        `;

        return;
    }

    if (!data || !data.length) {

        withdrawHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">No withdrawals yet.</td>
            </tr>
        `;

        return;
    }

    withdrawHistoryBody.innerHTML = "";

    data.forEach(withdrawal => {

        const row = document.createElement("tr");

        const date =
            withdrawal.created_at
                ? new Date(withdrawal.created_at).toLocaleDateString(
                    "en-US",
                    { day: "numeric", month: "long", year: "numeric" }
                )
                : "-";

        const method =
            (withdrawal.description || "").split(" withdrawal to")[0] ||
            "Withdrawal";

        row.innerHTML = `
            <td>${date}</td>
            <td>${formatMoney(withdrawal.amount)}</td>
            <td>${method}</td>
            <td class="${withdrawal.status || "pending"}">
                ${(withdrawal.status || "pending")
                    .replace(/^\w/, c => c.toUpperCase())}
            </td>
        `;

        withdrawHistoryBody.appendChild(row);
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

document.addEventListener("DOMContentLoaded", initWithdraw);
