// ==========================================
// MARKETRADING - TRANSACTIONS.JS
// ==========================================

let allTransactions = [];
let activeFilter = "all";


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

async function initTransactions() {

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = "login.html";
        return;
    }

    const userId = session.user.id;

    const transactionsBody =
        document.getElementById("transactionsBody");

    // Load only the user's normal transactions.
    // Admin credit transactions are excluded completely.
    const { data, error } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .neq("type", "admin_credit")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading transactions:", error);

        if (transactionsBody) {
            transactionsBody.innerHTML = `
                <tr>
                    <td colspan="5">Unable to load transactions.</td>
                </tr>
            `;
        }

        return;
    }

    allTransactions = data || [];

    renderTransactions();
}




// ------------------------------------------------------
// RENDER
// ------------------------------------------------------

function renderTransactions() {

    const transactionsBody =
        document.getElementById("transactionsBody");

    if (!transactionsBody) {
        return;
    }

    const filtered =
        activeFilter === "all"
            ? allTransactions
            : allTransactions.filter(t => t.type === activeFilter);

    if (!filtered.length) {

        transactionsBody.innerHTML = `
            <tr>
                <td colspan="5">No transactions found.</td>
            </tr>
        `;

        return;
    }

    transactionsBody.innerHTML = "";

    filtered.forEach(t => {

        const row = document.createElement("tr");

        const date =
            t.created_at
                ? new Date(t.created_at).toLocaleString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                })
                : "-";

        const typeLabel =
            (t.type || "transaction")
                .replace(/_/g, " ")
                .replace(/^\w/, c => c.toUpperCase());

        const status = t.status || "pending";

        row.innerHTML = `
            <td>${date}</td>
            <td>${typeLabel}</td>
            <td>${escapeHtmlLocal(t.description || "-")}</td>
            <td>${formatMoney(t.amount)}</td>
            <td class="status status-${status}">
                ${status.replace(/^\w/, c => c.toUpperCase())}
            </td>
        `;

        transactionsBody.appendChild(row);
    });
}


// ------------------------------------------------------
// SMALL HTML ESCAPE HELPER
// ------------------------------------------------------

function escapeHtmlLocal(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ------------------------------------------------------
// FILTER BUTTONS
// ------------------------------------------------------

const filterButtons =
    document.querySelectorAll(".filter-btn");

filterButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        activeFilter = btn.dataset.filter;

        renderTransactions();
    });
});


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

document.addEventListener("DOMContentLoaded", initTransactions);
