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

    // If user is not logged in, send them to login
    if (sessionError || !session) {
        window.location.href = "login.html";
        return;
    }

    const userId = session.user.id;

    const transactionsBody =
        document.getElementById("transactionsBody");

    // --------------------------------------------------
    // LOAD USER TRANSACTIONS
    // --------------------------------------------------
    // Admin credit transactions are excluded directly
    // from the Supabase query.
    // --------------------------------------------------

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
                    <td colspan="5">
                        Unable to load transactions.
                    </td>
                </tr>
            `;
        }

        return;
    }

    allTransactions = data || [];

    renderTransactions();
}


// ------------------------------------------------------
// RENDER TRANSACTIONS
// ------------------------------------------------------

function renderTransactions() {

    const transactionsBody =
        document.getElementById("transactionsBody");

    if (!transactionsBody) {
        return;
    }

    // --------------------------------------------------
    // EXTRA PROTECTION
    // --------------------------------------------------
    // Even if an admin_credit transaction somehow gets
    // returned from Supabase, it will not be displayed.
    // --------------------------------------------------

    const visibleTransactions =
        allTransactions.filter(
            t => String(t.type || "").toLowerCase() !== "admin_credit"
        );


    // --------------------------------------------------
    // APPLY FILTER
    // --------------------------------------------------

    const filtered =
        activeFilter === "all"
            ? visibleTransactions
            : visibleTransactions.filter(
                t =>
                    String(t.type || "").toLowerCase() ===
                    activeFilter.toLowerCase()
            );


    // --------------------------------------------------
    // NO TRANSACTIONS
    // --------------------------------------------------

    if (!filtered.length) {

        transactionsBody.innerHTML = `
            <tr>
                <td colspan="5">
                    No transactions found.
                </td>
            </tr>
        `;

        return;
    }


    // --------------------------------------------------
    // CLEAR TABLE
    // --------------------------------------------------

    transactionsBody.innerHTML = "";


    // --------------------------------------------------
    // DISPLAY TRANSACTIONS
    // --------------------------------------------------

    filtered.forEach(t => {

        const row =
            document.createElement("tr");


        // --------------------------------------------------
        // DATE
        // --------------------------------------------------

        const date =
            t.created_at
                ? new Date(t.created_at).toLocaleString(
                    "en-US",
                    {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
                : "-";


        // --------------------------------------------------
        // TYPE
        // --------------------------------------------------

        const typeLabel =
            (t.type || "transaction")
                .replace(/_/g, " ")
                .replace(/^\w/, c => c.toUpperCase());


        // --------------------------------------------------
        // STATUS
        // --------------------------------------------------

        const status =
            t.status || "pending";


        // --------------------------------------------------
        // TABLE ROW
        // --------------------------------------------------

        row.innerHTML = `
            <td>${date}</td>

            <td>${escapeHtmlLocal(typeLabel)}</td>

            <td>
                ${escapeHtmlLocal(t.description || "-")}
            </td>

            <td>
                ${formatMoney(t.amount)}
            </td>

            <td class="status status-${escapeHtmlLocal(status)}">
                ${escapeHtmlLocal(
                    status.replace(/^\w/, c => c.toUpperCase())
                )}
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
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ------------------------------------------------------
// FILTER BUTTONS
// ------------------------------------------------------

function initializeFilterButtons() {

    const filterButtons =
        document.querySelectorAll(".filter-btn");

    filterButtons.forEach(btn => {

        btn.addEventListener("click", () => {

            // Remove active class from all buttons
            filterButtons.forEach(b => {
                b.classList.remove("active");
            });

            // Activate selected button
            btn.classList.add("active");

            // Get selected filter
            activeFilter =
                btn.dataset.filter || "all";

            // Re-render transactions
            renderTransactions();
        });

    });
}


// ------------------------------------------------------
// LOGOUT
// ------------------------------------------------------

function initializeLogout() {

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", async (e) => {

        e.preventDefault();

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {

            console.error(
                "Logout error:",
                error
            );

            alert(
                "Logout failed. Please try again."
            );

            return;
        }

        window.location.href =
            "login.html";
    });
}


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeFilterButtons();

        initializeLogout();

        initTransactions();
    }
);