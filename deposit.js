// ==========================================
// MARKETRADING - DEPOSIT.JS
// ==========================================

let currentUserId = null;
let selectedMethod = "Bank Transfer";


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

async function initDeposit() {

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

    const balanceElement =
        document.getElementById("currentBalance");

    if (balanceElement) {
        balanceElement.textContent =
            formatMoney(profile ? profile.balance : 0);
    }


    await loadDepositHistory();
}


// ------------------------------------------------------
// METHOD SELECTION
// ------------------------------------------------------

const methodCards =
    document.querySelectorAll(".method");

methodCards.forEach(card => {

    card.addEventListener("click", () => {

        methodCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");

        selectedMethod =
            card.dataset.method || card.querySelector("h3").textContent.trim();
    });
});


// ------------------------------------------------------
// SUBMIT DEPOSIT
// ------------------------------------------------------

const depositForm =
    document.getElementById("depositForm");

const depositSubmitBtn =
    document.getElementById("depositSubmitBtn");


if (depositForm) {

    depositForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        if (!currentUserId) {
            alert("You must be logged in to deposit.");
            return;
        }

        const amountInput =
            document.getElementById("depositAmount");

        const currencyInput =
            document.getElementById("depositCurrency");

        const referenceInput =
            document.getElementById("depositReference");

        const amount = Number(amountInput.value);

        if (!amount || amount <= 0) {
            alert("Please enter a valid deposit amount.");
            return;
        }


        if (depositSubmitBtn) {
            depositSubmitBtn.disabled = true;
            depositSubmitBtn.textContent = "Processing...";
        }


        try {

            const description =
                `${selectedMethod} deposit` +
                (referenceInput.value.trim()
                    ? ` (ref: ${referenceInput.value.trim()})`
                    : "");

            // NOTE: this only logs the deposit request as
            // "pending". It does NOT credit the user's balance
            // directly from the client — that should only ever
            // happen through a trusted, server-side process
            // (e.g. an admin verifying the payment, same as
            // admin-dashboard.js's admin_credit RPC) once the
            // payment is confirmed.
            const { error } = await supabaseClient
                .from("transactions")
                .insert([
                    {
                        user_id: currentUserId,
                        amount,
                        type: "deposit",
                        status: "pending",
                        description
                    }
                ]);

            if (error) {
                console.error("Deposit error:", error);
                alert(error.message || "Unable to submit deposit.");
                return;
            }

            alert(
                "Deposit request submitted! It will reflect in your " +
                "balance once confirmed."
            );

            depositForm.reset();

            await loadDepositHistory();

        } catch (err) {

            console.error("Unexpected deposit error:", err);
            alert(err.message || "An unexpected error occurred.");

        } finally {

            if (depositSubmitBtn) {
                depositSubmitBtn.disabled = false;
                depositSubmitBtn.textContent = "Confirm Deposit";
            }
        }
    });
}


// ------------------------------------------------------
// LOAD DEPOSIT HISTORY
// ------------------------------------------------------

async function loadDepositHistory() {

    const depositHistoryBody =
        document.getElementById("depositHistoryBody");

    if (!depositHistoryBody || !currentUserId) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("type", "deposit")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error loading deposit history:", error);

        depositHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">Unable to load deposits.</td>
            </tr>
        `;

        return;
    }

    if (!data || !data.length) {

        depositHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">No deposits yet.</td>
            </tr>
        `;

        return;
    }

    depositHistoryBody.innerHTML = "";

    data.forEach(deposit => {

        const row = document.createElement("tr");

        const date =
            deposit.created_at
                ? new Date(deposit.created_at).toLocaleDateString(
                    "en-US",
                    { day: "numeric", month: "long", year: "numeric" }
                )
                : "-";

        const method =
            (deposit.description || "").split(" (ref:")[0] ||
            "Deposit";

        row.innerHTML = `
            <td>${date}</td>
            <td>${formatMoney(deposit.amount)}</td>
            <td>${method}</td>
            <td class="${deposit.status || "pending"}">
                ${(deposit.status || "pending")
                    .replace(/^\w/, c => c.toUpperCase())}
            </td>
        `;

        depositHistoryBody.appendChild(row);
    });
}


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", initDeposit);
