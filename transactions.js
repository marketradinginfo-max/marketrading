// ==========================================
// MARKETRADING - TRANSACTIONS.JS
// ==========================================

"use strict";

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

    try {

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

        // --------------------------------------------------
        // LOAD USER TRANSACTIONS
        // ADMIN CREDIT IS EXCLUDED FROM THE DATABASE QUERY
        // --------------------------------------------------

        const { data, error } = await supabaseClient
            .from("transactions")
            .select("*")
            .eq("user_id", userId)
            .neq("type", "admin_credit")
            .order("created_at", { ascending: false });

        if (error) {

            console.error(
                "Error loading transactions:",
                error
            );

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

        // --------------------------------------------------
        // EXTRA SECURITY FILTER
        // EVEN IF ADMIN CREDIT IS RETURNED FOR ANY REASON,
        // IT WILL NEVER BE DISPLAYED TO THE USER.
        // --------------------------------------------------

        allTransactions = (data || []).filter(
            transaction =>
                String(transaction.type || "").toLowerCase()
                !== "admin_credit"
        );

        renderTransactions();

    } catch (error) {

        console.error(
            "Transactions initialization error:",
            error
        );
    }
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

    // --------------------------------------------------
    // NEVER ALLOW ADMIN CREDIT INTO THE DISPLAY
    // --------------------------------------------------

    const visibleTransactions =
        allTransactions.filter(
            transaction =>
                String(transaction.type || "").toLowerCase()
                !== "admin_credit"
        );

    const filtered =
        activeFilter === "all"
            ? visibleTransactions
            : visibleTransactions.filter(
                transaction =>
                    String(transaction.type || "").toLowerCase()
                    === activeFilter
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

    transactionsBody.innerHTML = "";

    // --------------------------------------------------
    // DISPLAY TRANSACTIONS
    // --------------------------------------------------

    filtered.forEach(transaction => {

        const row =
            document.createElement("tr");

        // DATE

        const date =
            transaction.created_at
                ? new Date(
                    transaction.created_at
                ).toLocaleString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                })
                : "-";


        // TYPE

        const typeLabel =
            (transaction.type || "transaction")
                .replace(/_/g, " ")
                .replace(
                    /^\w/,
                    character =>
                        character.toUpperCase()
                );


        // STATUS

        const status =
            transaction.status || "pending";


        // ROW

        row.innerHTML = `
            <td>${escapeHtmlLocal(date)}</td>

            <td>${escapeHtmlLocal(typeLabel)}</td>

            <td>
                ${escapeHtmlLocal(
                    transaction.description || "-"
                )}
            </td>

            <td>
                ${formatMoney(transaction.amount)}
            </td>

            <td class="status status-${escapeHtmlLocal(status)}">
                ${escapeHtmlLocal(
                    status.replace(
                        /^\w/,
                        character =>
                            character.toUpperCase()
                    )
                )}
            </td>
        `;

        transactionsBody.appendChild(row);

    });
}


// ------------------------------------------------------
// HTML ESCAPE
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

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const filterButtons =
            document.querySelectorAll(".filter-btn");

        filterButtons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    filterButtons.forEach(
                        item =>
                            item.classList.remove("active")
                    );

                    button.classList.add("active");

                    activeFilter =
                        button.dataset.filter || "all";

                    renderTransactions();
                }
            );

        });

    }
);


// ------------------------------------------------------
// LOGOUT
// ------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const logoutBtn =
            document.getElementById("logoutBtn");

        if (!logoutBtn) {
            return;
        }

        logoutBtn.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();

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
            }
        );

    }
);


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    initTransactions
);