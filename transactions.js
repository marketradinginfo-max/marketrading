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
// NORMALIZE TEXT
// ------------------------------------------------------

function normalizeTransactionType(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}


// ------------------------------------------------------
// CHECK IF TRANSACTION IS ADMIN CREDIT
// ------------------------------------------------------

function isAdminCredit(transaction) {

    if (!transaction) {
        return false;
    }

    const type = normalizeTransactionType(
        transaction.type
    );

    const description = normalizeTransactionType(
        transaction.description
    );

    const adminCreditTypes = [
        "admin credit",
        "admincredit",
        "administrator credit",
        "admin balance credit",
        "admin credited",
        "manual credit",
        "manual admin credit"
    ];

    if (adminCreditTypes.includes(type)) {
        return true;
    }

    const adminCreditDescriptionWords = [
        "admin credit",
        "admin credited",
        "credited by admin",
        "manual credit",
        "administrator credit",
        "balance credited by admin"
    ];

    return adminCreditDescriptionWords.some(
        phrase =>
            description.includes(phrase)
    );
}


// ------------------------------------------------------
// USER-FACING TRANSACTION TYPE
// ------------------------------------------------------

function getUserTransactionType(transaction) {

    if (isAdminCredit(transaction)) {

        // IMPORTANT:
        // Admin credit is displayed to the user
        // as a normal Deposit.

        return "deposit";
    }

    return normalizeTransactionType(
        transaction?.type || "transaction"
    );
}


// ------------------------------------------------------
// USER-FACING DESCRIPTION
// ------------------------------------------------------

function getUserTransactionDescription(transaction) {

    if (!transaction) {
        return "-";
    }

    if (isAdminCredit(transaction)) {

        // Never expose the admin-credit wording.

        return "Deposit";
    }

    return transaction.description || "-";
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
            document.getElementById(
                "transactionsBody"
            );


        // --------------------------------------------------
        // LOAD ONLY CURRENT USER TRANSACTIONS
        // --------------------------------------------------

        const {
            data,
            error
        } = await supabaseClient
            .from("transactions")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", {
                ascending: false
            });


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
        // KEEP ADMIN CREDITS
        // --------------------------------------------------
        //
        // We DO NOT remove admin credits anymore.
        //
        // They will be converted to "Deposit"
        // when displayed to the user.
        // --------------------------------------------------

        allTransactions = data || [];


        console.log(
            "User transactions loaded:",
            allTransactions
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
        document.getElementById(
            "transactionsBody"
        );


    if (!transactionsBody) {
        return;
    }


    // --------------------------------------------------
    // APPLY FILTER
    // --------------------------------------------------

    const filtered =
        activeFilter === "all"

            ? allTransactions

            : allTransactions.filter(
                transaction => {

                    const userType =
                        getUserTransactionType(
                            transaction
                        );

                    return (
                        userType ===
                        normalizeTransactionType(
                            activeFilter
                        )
                    );
                }
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


        // --------------------------------------------------
        // DATE
        // --------------------------------------------------

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


        // --------------------------------------------------
        // TYPE
        // --------------------------------------------------

        let typeLabel =
            getUserTransactionType(
                transaction
            );


        typeLabel =
            typeLabel.replace(
                /^\w/,
                character =>
                    character.toUpperCase()
            );


        // --------------------------------------------------
        // DESCRIPTION
        // --------------------------------------------------

        const description =
            getUserTransactionDescription(
                transaction
            );


        // --------------------------------------------------
        // STATUS
        // --------------------------------------------------

        const status =
            transaction.status ||
            "pending";


        // --------------------------------------------------
        // ROW
        // --------------------------------------------------

        row.innerHTML = `

            <td>
                ${escapeHtmlLocal(date)}
            </td>

            <td>
                ${escapeHtmlLocal(typeLabel)}
            </td>

            <td>
                ${escapeHtmlLocal(description)}
            </td>

            <td>
                ${formatMoney(
                    transaction.amount
                )}
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
            document.querySelectorAll(
                ".filter-btn"
            );


        filterButtons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    filterButtons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    activeFilter =
                        button.dataset.filter ||
                        "all";


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
            document.getElementById(
                "logoutBtn"
            );


        if (!logoutBtn) {
            return;
        }


        logoutBtn.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                const {
                    error
                } =
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