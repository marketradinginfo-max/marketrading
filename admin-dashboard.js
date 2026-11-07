
"use strict";

// ======================================================
// MARKETRADING ADMIN DASHBOARD
// PART 2 - COMPLETE JAVASCRIPT
// ======================================================

let currentAdmin = null;
let users = [];
let activeAdminSection = "dashboard";
let adminAuthorized = false;

const $ = id => document.getElementById(id);

// ======================================================
// HELPERS
// ======================================================

function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleString();
}

function showMessage(text, type = "success") {
    const box = $("messageBox");

    if (!box) {
        console.log(text);
        return;
    }

    box.textContent = text;
    box.className = "message-box " + type;
    box.style.display = "block";

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
        box.style.display = "none";
    }, 6000);
}

function userName(id) {
    const user = users.find(u => u.id === id);

    return user?.fullname ||
        user?.username ||
        user?.email ||
        id ||
        "Unknown user";
}

function getClient() {
    const client = window.supabaseClient;

    if (!client) {
        throw new Error(
            "Supabase client is unavailable. Check supabase.js."
        );
    }

    return client;
}

function setTableMessage(tbodyId, text, colspan = 6) {
    const tbody = $(tbodyId);

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}" class="loading">
                ${escapeHtml(text)}
            </td>
        </tr>
    `;
}

// ======================================================
// REQUIRE ADMIN
// ======================================================

async function requireAdmin() {
    const client = window.supabaseClient;

    if (!client) {
        location.replace("login.html");
        return false;
    }

    const { data, error } = await client.auth.getSession();

    if (error || !data?.session) {
        location.replace("login.html");
        return false;
    }

    const {
        data: profile,
        error: profileError
    } = await client
        .from("profiles")
        .select("id,fullname,username,email,avatar_url,role")
        .eq("id", data.session.user.id)
        .maybeSingle();

    if (profileError) {
        showMessage(
            "Cannot read your profile: " + profileError.message,
            "error"
        );
        return false;
    }

    if (
        !profile ||
        String(profile.role || "").toLowerCase() !== "admin"
    ) {
        location.replace("dashboard.html");
        return false;
    }

    currentAdmin = profile;
    adminAuthorized = true;

    const name =
        profile.fullname ||
        profile.username ||
        profile.email ||
        "Administrator";

    if ($("adminName")) {
        $("adminName").textContent = name;
    }

    if ($("adminAvatar") && profile.avatar_url) {
        $("adminAvatar").src = profile.avatar_url;
    }

    if ($("settingsAdminName")) {
        $("settingsAdminName").textContent = name;
    }

    if ($("settingsAdminEmail")) {
        $("settingsAdminEmail").textContent =
            profile.email || "-";
    }

    return true;
}

// ======================================================
// SIDEBAR NAVIGATION
// ======================================================

const adminSectionTitles = {
    dashboard: {
        title: "Admin Dashboard",
        description: "Manage users, virtual funds and requests"
    },
    users: {
        title: "User Management",
        description: "View and manage registered users"
    },
    deposits: {
        title: "Deposits",
        description: "View deposit transactions and requests"
    },
    withdrawals: {
        title: "Withdrawals",
        description: "View withdrawal transactions and requests"
    },
    investments: {
        title: "Investments",
        description: "View investment transactions and requests"
    },
    settings: {
        title: "Admin Settings",
        description: "Administrator profile information"
    }
};

function openAdminSection(sectionName) {
    if (!adminSectionTitles[sectionName]) {
        return;
    }

    activeAdminSection = sectionName;

    document
        .querySelectorAll("[data-admin-section]")
        .forEach(section => {
            section.hidden =
                section.dataset.adminSection !== sectionName;
        });

    document
        .querySelectorAll("[data-admin-nav]")
        .forEach(item => {
            const isActive =
                item.dataset.adminNav === sectionName;

            item.classList.toggle("active", isActive);

            if (isActive) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }
        });

    const topbarTitle = document.querySelector(".topbar h1");
    const topbarDescription =
        document.querySelector(".topbar > div:first-child p");

    if (topbarTitle) {
        topbarTitle.textContent =
            adminSectionTitles[sectionName].title;
    }

    if (topbarDescription) {
        topbarDescription.textContent =
            adminSectionTitles[sectionName].description;
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (!adminAuthorized) return;

    refreshAdminSection(sectionName).catch(error => {
        console.error("SECTION REFRESH ERROR:", error);
        showMessage(error.message, "error");
    });
}

function setupAdminNavigation() {
    const navigationItems =
        document.querySelectorAll("[data-admin-nav]");

    navigationItems.forEach(item => {
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");

        item.addEventListener("click", () => {
            openAdminSection(item.dataset.adminNav);
        });

        item.addEventListener("keydown", event => {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();
                item.click();
            }
        });
    });

    openAdminSection("dashboard");
}

// ======================================================
// LOAD USERS
// ======================================================

async function loadUsers() {
    const client = getClient();
    const tbody = $("usersTableBody");

    setTableMessage(
        "usersTableBody",
        "Loading users...",
        8
    );

    const { data, error } = await client
        .from("profiles")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error("LOAD USERS ERROR:", error);

        setTableMessage(
            "usersTableBody",
            "Unable to load users: " + error.message,
            8
        );

        showMessage(
            "Supabase refused the users query: " +
            error.message,
            "error"
        );

        return false;
    }

    users = data || [];

    const nonAdmins = users.filter(user =>
        String(user.role || "").toLowerCase() !== "admin"
    );

    // Preserve existing user count calculation.

    if ($("totalUsers")) {
        $("totalUsers").textContent = nonAdmins.length;
    }

    // Preserve existing virtual balance calculation.

    if ($("totalBalance")) {
        $("totalBalance").textContent = formatMoney(
            nonAdmins.reduce(
                (sum, user) =>
                    sum + Number(user.balance || 0),
                0
            )
        );
    }

    // Populate the credit form.

    const userSelect = $("userSelect");

    if (userSelect) {
        const previousSelection = userSelect.value;

        userSelect.innerHTML =
            '<option value="">Select a user</option>';

        nonAdmins.forEach(user => {
            const option = document.createElement("option");

            option.value = user.id;

            option.textContent = `${
                user.fullname ||
                user.username ||
                user.email ||
                "Unnamed"
            } — ${
                user.email || ""
            } — ${
                formatMoney(user.balance)
            }`;

            userSelect.appendChild(option);
        });

        if (
            nonAdmins.some(
                user => user.id === previousSelection
            )
        ) {
            userSelect.value = previousSelection;
        }
    }

    if (!tbody) return true;

    if (!users.length) {
        setTableMessage(
            "usersTableBody",
            "No users found.",
            8
        );
        return true;
    }

    tbody.innerHTML = users.map(user => {
        const isAdmin =
            String(user.role || "").toLowerCase() === "admin";

        return `
            <tr>
                <td>
                    <strong>
                        ${escapeHtml(
                            user.fullname ||
                            user.username ||
                            "Unnamed User"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(user.email || "-")}
                </td>

                <td>
                    ${escapeHtml(user.country || "-")}
                </td>

                <td>
                    ${escapeHtml(
                        user.account_type || "Standard"
                    )}
                </td>

                <td>
                    <strong>
                        ${formatMoney(user.balance)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(user.role || "user")}
                </td>

                <td>
                    ${escapeHtml(
                        formatDate(user.created_at)
                    )}
                </td>

                <td>
                    ${
                        isAdmin
                        ? '<span class="small-muted">Admin</span>'
                        : `
                            <button
                                type="button"
                                class="edit-balance-btn"
                                data-edit-user="${escapeHtml(user.id)}"
                            >
                                <i class="fa-solid fa-pen-to-square"></i>
                                Edit Balance
                            </button>
                        `
                    }
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-edit-user]")
        .forEach(button => {
            button.addEventListener("click", () => {
                editUserBalance(
                    button.dataset.editUser
                );
            });
        });

    return true;
}

// ======================================================
// EDIT USER BALANCE
// PRESERVES EXISTING RPC
// ======================================================

async function editUserBalance(userId) {
    if (!adminAuthorized) return;

    const user = users.find(u => u.id === userId);

    if (!user) {
        return showMessage(
            "User was not found.",
            "error"
        );
    }

    if (
        String(user.role || "").toLowerCase() === "admin"
    ) {
        return showMessage(
            "Admin balances cannot be edited here.",
            "error"
        );
    }

    const name =
        user.fullname ||
        user.username ||
        user.email ||
        "this user";

    const currentBalance = Number(user.balance || 0);

    const entered = prompt(
        `Current balance for ${name}: ${
            formatMoney(currentBalance)
        }\n\nEnter the new balance:`,
        currentBalance.toFixed(2)
    );

    if (entered === null) return;

    const newBalance = Number(entered);

    if (
        !entered.trim() ||
        !Number.isFinite(newBalance) ||
        newBalance < 0
    ) {
        return showMessage(
            "Enter a valid balance of zero or greater.",
            "error"
        );
    }

    if (newBalance === currentBalance) {
        return showMessage(
            "The new balance is the same as the current balance.",
            "error"
        );
    }

    const difference = newBalance - currentBalance;

    const actionText = difference > 0
        ? `increase by ${formatMoney(difference)}`
        : `decrease by ${
            formatMoney(Math.abs(difference))
        }`;

    if (!confirm(
        `Change ${name}'s balance from ${
            formatMoney(currentBalance)
        } to ${
            formatMoney(newBalance)
        }?\n\nThis will ${actionText}.`
    )) {
        return;
    }

    try {
        showMessage(
            "Updating balance...",
            "success"
        );

        const { data, error } = await getClient()
            .rpc("admin_set_balance", {
                p_user_id: userId,
                p_new_balance: newBalance,
                p_description: "Admin balance adjustment"
            });

        if (error) throw error;

        console.log("ADMIN SET BALANCE RESULT:", data);

        showMessage(
            `${name}'s balance is now ${
                formatMoney(newBalance)
            }.`,
            "success"
        );

        $("creditForm")?.reset();

        await refreshAllAdminData();

    } catch (error) {
        console.error("EDIT BALANCE ERROR:", error);

        showMessage(
            error.message ||
            "Unable to edit user balance.",
            "error"
        );
    }
}

window.editUserBalance = editUserBalance;

// ======================================================
// LOAD ADMIN CREDITS
// ======================================================

async function loadAdminCredits() {
    const tbody = $("transactionsTableBody");

    if (!tbody) return;

    const { data, error } = await getClient()
        .from("transactions")
        .select(
            "id,user_id,amount,balance_after,description,type,status,source,created_at"
        )
        .eq("type", "admin_credit")
        .order("created_at", {
            ascending: false
        })
        .limit(50);

    if (error) {
        setTableMessage(
            "transactionsTableBody",
            error.message,
            5
        );
        return;
    }

    const rows = data || [];

    // Preserve existing total admin credits calculation.

    if ($("totalCredits")) {
        $("totalCredits").textContent = formatMoney(
            rows.reduce(
                (sum, row) =>
                    sum + Number(row.amount || 0),
                0
            )
        );
    }

    if (!rows.length) {
        setTableMessage(
            "transactionsTableBody",
            "No admin credits yet.",
            5
        );
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>
                ${escapeHtml(userName(row.user_id))}
            </td>

            <td>
                <strong>
                    ${formatMoney(row.amount)}
                </strong>
            </td>

            <td>
                ${formatMoney(row.balance_after)}
            </td>

            <td>
                ${escapeHtml(
                    row.description || "Admin credit"
                )}
            </td>

            <td>
                ${escapeHtml(
                    formatDate(row.created_at)
                )}
            </td>
        </tr>
    `).join("");
}

// ======================================================
// TRANSACTION STATUS
// ======================================================

function statusBadge(status) {
    const value = String(status || "pending").toLowerCase();

    const label = value.charAt(0).toUpperCase() +
        value.slice(1);

    return `
        <span class="status-badge status-${escapeHtml(value)}">
            ${escapeHtml(label)}
        </span>
    `;
}

// ======================================================
// APPROVE / REJECT BUTTONS
// ======================================================

function actionButtons(id, type) {
    return `
        <div class="admin-actions">
            <button
                type="button"
                class="approve-btn"
                data-request-id="${escapeHtml(id)}"
                data-request-type="${escapeHtml(type)}"
                data-request-action="approve"
            >
                Approve
            </button>

            <button
                type="button"
                class="reject-btn"
                data-request-id="${escapeHtml(id)}"
                data-request-type="${escapeHtml(type)}"
                data-request-action="reject"
            >
                Reject
            </button>
        </div>
    `;
}

function setupTransactionActions(tbody) {
    if (!tbody) return;

    tbody.querySelectorAll("[data-request-action]")
        .forEach(button => {
            button.addEventListener("click", async () => {
                await processRequest(
                    button.dataset.requestId,
                    button.dataset.requestType,
                    button.dataset.requestAction
                );
            });
        });
}

// ======================================================
// RENDER TRANSACTION ROWS
// ======================================================

function renderTransactionRows(rows, type, tbodyId) {
    const tbody = $(tbodyId);

    if (!tbody) return;

    if (!rows.length) {
        setTableMessage(
            tbodyId,
            `No ${type} transactions found.`
        );
        return;
    }

    tbody.innerHTML = rows.map(row => {
        const status = String(
            row.status || "pending"
        ).toLowerCase();

        const isPending = status === "pending";

        return `
            <tr>
                <td>
                    <strong>
                        ${escapeHtml(
                            userName(row.user_id)
                        )}
                    </strong>

                    <div class="small-muted">
                        ${escapeHtml(row.user_id || "")}
                    </div>
                </td>

                <td>
                    <strong>
                        ${formatMoney(row.amount)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        row.description || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDate(row.created_at)
                    )}
                </td>

                <td>
                    ${statusBadge(status)}
                </td>

                <td>
                    ${
                        isPending
                        ? actionButtons(row.id, type)
                        : `
                            <span class="small-muted">
                                Processed
                            </span>
                        `
                    }
                </td>
            </tr>
        `;
    }).join("");

    setupTransactionActions(tbody);
}

// ======================================================
// LOAD DEPOSITS
// ======================================================

async function loadDeposits() {
    const tbodyId = "depositsTableBody";

    setTableMessage(
        tbodyId,
        "Loading deposits..."
    );

    try {
        const { data, error } = await getClient()
            .from("transactions")
            .select(
                "id,user_id,amount,description,type,status,created_at"
            )
            .eq("type", "deposit")
            .order("created_at", {
                ascending: false
            })
            .limit(1000);

        if (error) throw error;

        renderTransactionRows(
            data || [],
            "deposit",
            tbodyId
        );

    } catch (error) {
        console.error("LOAD DEPOSITS ERROR:", error);

        setTableMessage(
            tbodyId,
            "Unable to load deposits: " + error.message
        );
    }
}

// ======================================================
// LOAD WITHDRAWALS
// ======================================================

async function loadWithdrawals() {
    const tbodyId = "withdrawalsTableBody";

    setTableMessage(
        tbodyId,
        "Loading withdrawals..."
    );

    try {
        // Load recorded withdrawal history.
        // Some existing installations use "withdraw"
        // while others use "withdrawal".

        const { data, error } = await getClient()
            .from("transactions")
            .select(
                "id,user_id,amount,description,type,status,created_at"
            )
            .in("type", [
                "withdrawal",
                "withdraw"
            ])
            .order("created_at", {
                ascending: false
            })
            .limit(1000);

        if (error) throw error;

        const rows = data || [];

        // Preserve the existing secure RPC used to
        // retrieve pending withdrawal requests.

        const {
            data: pendingData,
            error: pendingError
        } = await getClient()
            .rpc("admin_get_pending_withdrawals");

        if (pendingError) {
            console.warn(
                "PENDING WITHDRAWALS RPC:",
                pendingError.message
            );
        } else {
            const pendingRows = pendingData || [];

            pendingRows.forEach(row => {
                if (!rows.some(
                    existing => existing.id === row.id
                )) {
                    rows.push({
                        ...row,
                        status: "pending"
                    });
                }
            });
        }

        rows.sort((a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );

        renderTransactionRows(
            rows,
            "withdrawal",
            tbodyId
        );

    } catch (error) {
        console.error(
            "LOAD WITHDRAWALS ERROR:",
            error
        );

        setTableMessage(
            tbodyId,
            "Unable to load withdrawals: " +
            error.message
        );
    }
}

// ======================================================
// LOAD INVESTMENTS
// ======================================================

async function loadInvestments() {
    const tbodyId = "investmentsTableBody";

    setTableMessage(
        tbodyId,
        "Loading investments..."
    );

    try {
        const { data, error } = await getClient()
            .from("transactions")
            .select(
                "id,user_id,amount,description,type,status,created_at"
            )
            .eq("type", "investment")
            .order("created_at", {
                ascending: false
            })
            .limit(1000);

        if (error) throw error;

        renderTransactionRows(
            data || [],
            "investment",
            tbodyId
        );

    } catch (error) {
        console.error(
            "LOAD INVESTMENTS ERROR:",
            error
        );

        setTableMessage(
            tbodyId,
            "Unable to load investments: " +
            error.message
        );
    }
}

// ======================================================
// LOAD PENDING REQUESTS
// COMPATIBILITY WITH ORIGINAL DASHBOARD
// ======================================================

async function loadPending(type, tbodyId) {
    if (type === "deposit") {
        return loadDeposits();
    }

    if (type === "withdrawal") {
        return loadWithdrawals();
    }

    if (type === "investment") {
        return loadInvestments();
    }

    setTableMessage(
        tbodyId,
        "Unsupported transaction type."
    );
}

async function loadPendingAll() {
    await Promise.all([
        loadDeposits(),
        loadWithdrawals(),
        loadInvestments()
    ]);
}

// ======================================================
// PROCESS REQUEST
// PRESERVES EXISTING ADMIN RPC
// ======================================================

async function processRequest(
    transactionId,
    type,
    action
) {
    if (!adminAuthorized) return;

    if (
        action !== "approve" &&
        action !== "reject"
    ) {
        return showMessage(
            "Invalid transaction action.",
            "error"
        );
    }

    if (!confirm(
        `Are you sure you want to ${
            action
        } this ${type} request?`
    )) {
        return;
    }

    try {
        const { data, error } = await getClient()
            .rpc("admin_process_transaction", {
                transaction_id: transactionId,
                decision: action
            });

        if (error) throw error;

        console.log(
            "ADMIN PROCESS RESULT:",
            data
        );

        const resultWord =
            action === "approve"
            ? "approved"
            : "rejected";

        showMessage(
            `${type} request ${resultWord} successfully.`,
            "success"
        );

        await refreshAllAdminData();

    } catch (error) {
        console.error(
            "PROCESS REQUEST ERROR:",
            error
        );

        console.error(
            "Error code:",
            error?.code
        );

        console.error(
            "Error details:",
            error?.details
        );

        console.error(
            "Error hint:",
            error?.hint
        );

        showMessage(
            error.message ||
            "Unable to process request.",
            "error"
        );
    }
}

window.processRequest = processRequest;

// ======================================================
// CREDIT VIRTUAL MONEY
// PRESERVES EXISTING ADMIN RPC
// ======================================================

async function creditVirtualMoney(event) {
    event.preventDefault();

    if (!adminAuthorized) return;

    const userId = $("userSelect")?.value;

    const amount = Number(
        $("creditAmount")?.value
    );

    const description =
        $("creditDescription")?.value.trim() ||
        "Admin credit";

    if (!userId) {
        return showMessage(
            "Please select a user.",
            "error"
        );
    }

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return showMessage(
            "Enter a valid amount greater than zero.",
            "error"
        );
    }

    const user = users.find(
        u => u.id === userId
    );

    if (!user) {
        return showMessage(
            "Selected user was not found.",
            "error"
        );
    }

    const name =
        user.fullname ||
        user.username ||
        user.email ||
        "this user";

    if (!confirm(
        `Credit ${
            formatMoney(amount)
        } to ${name}?`
    )) {
        return;
    }

    const button = $("creditBtn");

    if (button) {
        button.disabled = true;
        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Processing...
        `;
    }

    try {
        const { error } = await getClient()
            .rpc("admin_credit", {
                target_user_id: userId,
                credit_amount: amount,
                credit_description: description
            });

        if (error) throw error;

        showMessage(
            `${
                formatMoney(amount)
            } credited to ${name}.`,
            "success"
        );

        $("creditForm")?.reset();

        await refreshAllAdminData();

    } catch (error) {
        console.error(
            "CREDIT ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Credit failed.",
            "error"
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = `
                <i class="fa-solid fa-plus"></i>
                Credit Balance
            `;
        }
    }
}

// ======================================================
// REFRESH SELECTED SECTION
// ======================================================

async function refreshAdminSection(sectionName) {
    if (!adminAuthorized) return;

    switch (sectionName) {
        case "dashboard":
            await loadUsers();
            await loadAdminCredits();
            break;

        case "users":
            await loadUsers();
            break;

        case "deposits":
            await loadDeposits();
            break;

        case "withdrawals":
            await loadWithdrawals();
            break;

        case "investments":
            await loadInvestments();
            break;

        case "settings":
            if (currentAdmin) {
                if ($("settingsAdminName")) {
                    $("settingsAdminName").textContent =
                        currentAdmin.fullname ||
                        currentAdmin.username ||
                        currentAdmin.email ||
                        "Administrator";
                }

                if ($("settingsAdminEmail")) {
                    $("settingsAdminEmail").textContent =
                        currentAdmin.email || "-";
                }
            }
            break;
    }
}

// ======================================================
// REFRESH ALL ADMIN DATA
// ======================================================

async function refreshAllAdminData() {
    if (!adminAuthorized) return;

    // Load users first so transaction records can
    // display the correct customer names.

    await loadUsers();

    await Promise.all([
        loadAdminCredits(),
        loadPendingAll()
    ]);
}

// ======================================================
// LOGOUT
// ======================================================

async function logout() {
    try {
        await getClient()
            .auth
            .signOut();

    } finally {
        adminAuthorized = false;

        localStorage.removeItem(
            "user_id"
        );

        location.replace(
            "login.html"
        );
    }
}

// ======================================================
// MOBILE ADMIN MENU
// ======================================================

function setupMobileAdminMenu() {
    const sidebar = $("adminSidebar");
    const menuButton = $("mobileMenuBtn");
    const closeButton = $("mobileCloseBtn");
    const overlay = $("mobileOverlay");

    if (
        !sidebar ||
        !menuButton ||
        !overlay
    ) {
        return;
    }

    function openMenu() {
        sidebar.classList.add("mobile-open");
        overlay.classList.add("show");

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

        document.body.classList.add(
            "menu-open"
        );
    }

    function closeMenu() {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("show");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        document.body.classList.remove(
            "menu-open"
        );
    }

    menuButton.addEventListener(
        "click",
        openMenu
    );

    closeButton?.addEventListener(
        "click",
        closeMenu
    );

    overlay.addEventListener(
        "click",
        closeMenu
    );

    sidebar.querySelectorAll(
        ".sidebar-menu li:not(#logoutBtn)"
    ).forEach(item => {
        item.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });

    window.addEventListener(
        "resize",
        () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeMenu();
            }
        }
    );
}

// ======================================================
// PAGE INITIALIZATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // Initialize navigation.

        setupAdminNavigation();

        // Initialize mobile sidebar.

        setupMobileAdminMenu();

        // Credit virtual-money form.

        $("creditForm")?.addEventListener(
            "submit",
            creditVirtualMoney
        );

        // Refresh users and related data.

        $("refreshUsersBtn")?.addEventListener(
            "click",
            async () => {
                const button = $("refreshUsersBtn");

                if (button) {
                    button.disabled = true;
                }

                try {
                    await refreshAllAdminData();

                    showMessage(
                        "Admin data refreshed.",
                        "success"
                    );

                } catch (error) {
                    console.error(
                        "REFRESH ERROR:",
                        error
                    );

                    showMessage(
                        error.message ||
                        "Unable to refresh data.",
                        "error"
                    );

                } finally {
                    if (button) {
                        button.disabled = false;
                    }
                }
            }
        );

        // Logout button.

        $("logoutBtn")?.addEventListener(
            "click",
            logout
        );

        // Admin authentication.

        try {
            const authorized = await requireAdmin();

            if (!authorized) return;

            // Load existing Supabase information.

            await refreshAllAdminData();

            // Open the dashboard by default.

            openAdminSection("dashboard");

        } catch (error) {
            console.error(
                "ADMIN DASHBOARD ERROR:",
                error
            );

            showMessage(
                error.message ||
                "Admin dashboard failed.",
                "error"
            );
        }
    }
);

// ======================================================
// END OF ADMIN DASHBOARD JAVASCRIPT
// ======================================================
