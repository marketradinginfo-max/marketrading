async function loadDashboard() {

    // ==========================================
    // CHECK IF USER IS LOGGED IN
    // ==========================================

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = "login.html";
        return;
    }

    const user = session.user;


    // ==========================================
    // GET USER PROFILE
    // ==========================================

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();


    if (profileError) {
        console.error("Profile error:", profileError);
        return;
    }


    if (!profile) {
        console.error("User profile not found.");
        return;
    }


    // ==========================================
    // SHOW FULL NAME
    // ==========================================

    const welcomeUser =
        document.getElementById("welcomeUser");

    if (welcomeUser) {

        welcomeUser.textContent =
            "Welcome, " +
            (
                profile.fullname ||
                profile.username ||
                "Investor"
            );
    }


    // ==========================================
    // SHOW ACCOUNT BALANCE
    // ==========================================

    const balanceElement =
        document.getElementById("accountBalance");

    if (balanceElement) {

        const balance =
            Number(profile.balance || 0);

        balanceElement.textContent =
            balance.toLocaleString("en-US", {
                style: "currency",
                currency: "USD"
            });
    }


    // ==========================================
    // LOAD AVATAR
    // ==========================================

    const dashboardAvatar =
        document.getElementById("dashboardAvatar");


    if (dashboardAvatar) {

        if (profile.avatar_url) {

            dashboardAvatar.src =
                profile.avatar_url;

        } else {

            dashboardAvatar.src =
                "images/default-avatar.jpg";
        }


        dashboardAvatar.onerror = function () {

            this.src =
                "images/default-avatar.jpg";
        };
    }


    // ==========================================
    // OPTIONAL ACCOUNT INFORMATION
    // ==========================================

    const usernameElement =
        document.getElementById("username");

    if (usernameElement) {

        usernameElement.textContent =
            profile.username || "User";
    }


    const emailElement =
        document.getElementById("email");

    if (emailElement) {

        emailElement.textContent =
            profile.email || user.email || "";
    }


    const accountTypeElement =
        document.getElementById("accountType");

    if (accountTypeElement) {

        accountTypeElement.textContent =
            profile.account_type || "Standard";
    }


    // ==========================================
    // LOAD TRANSACTIONS + STATS
    // ==========================================

    await loadTransactions(user.id);
}


// ==========================================
// FORMAT MONEY
// ==========================================

function formatMoney(amount) {

    const number = Number(amount || 0);

    return number.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}


// ==========================================
// LOAD TRANSACTIONS + STATS
// ==========================================

async function loadTransactions(userId) {

    const transactionTableBody =
        document.getElementById("transactionTableBody");

    const totalProfitElement =
        document.getElementById("totalProfit");

    const activeInvestmentsElement =
        document.getElementById("activeInvestments");

    const totalDepositsElement =
        document.getElementById("totalDeposits");


    const {
        data: transactions,
        error
    } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });


    if (error) {

        console.error("Error loading transactions:", error);

        if (transactionTableBody) {

            transactionTableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        Unable to load transactions.
                    </td>
                </tr>
            `;
        }

        return;
    }


    const allTransactions = transactions || [];


    // --------------------------------------------------
    // STATS
    // --------------------------------------------------

    const totalDeposits = allTransactions
        .filter(
            t =>
                t.type === "deposit" &&
                t.status === "completed"
        )
        .reduce(
            (total, t) => total + Number(t.amount || 0),
            0
        );

    const activeInvestments = allTransactions
        .filter(
            t =>
                t.type === "investment" &&
                (t.status === "active" || t.status === "pending")
        ).length;

    const totalProfit = allTransactions
        .filter(t => t.type === "profit")
        .reduce(
            (total, t) => total + Number(t.amount || 0),
            0
        );


    if (totalDepositsElement) {
        totalDepositsElement.textContent =
            formatMoney(totalDeposits);
    }

    if (activeInvestmentsElement) {
        activeInvestmentsElement.textContent =
            String(activeInvestments);
    }

    if (totalProfitElement) {
        totalProfitElement.textContent =
            formatMoney(totalProfit);
    }


    // --------------------------------------------------
    // TABLE
    // --------------------------------------------------

    if (!transactionTableBody) {
        return;
    }

    if (!allTransactions.length) {

        transactionTableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No transactions yet
                </td>
            </tr>
        `;

        return;
    }

    transactionTableBody.innerHTML = "";

    allTransactions.forEach(t => {

        const row = document.createElement("tr");

        const date =
            t.created_at
                ? new Date(t.created_at).toLocaleDateString()
                : "-";

        const typeLabel =
            (t.type || "transaction")
                .replace(/_/g, " ")
                .replace(/^\w/, c => c.toUpperCase());

        row.innerHTML = `
            <td>${date}</td>
            <td>${typeLabel}</td>
            <td>${formatMoney(t.amount)}</td>
            <td class="status ${t.status || "pending"}">
                ${(t.status || "pending")
                    .replace(/^\w/, c => c.toUpperCase())}
            </td>
        `;

        transactionTableBody.appendChild(row);
    });
}


// ==========================================
// RUN DASHBOARD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    loadDashboard
);


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const {
                error
            } = await supabaseClient.auth.signOut();


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

