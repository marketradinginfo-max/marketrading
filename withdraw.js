// ==========================================
// MARKETRADING - WITHDRAW.JS
// SECURE WITHDRAWAL VERSION
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

    try {

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();


        // --------------------------------------------------
        // CHECK LOGIN
        // --------------------------------------------------

        if (sessionError || !session) {

            window.location.href = "login.html";

            return;
        }


        currentUserId = session.user.id;


        // --------------------------------------------------
        // LOAD USER BALANCE
        // --------------------------------------------------

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select("balance")
            .eq("id", currentUserId)
            .maybeSingle();


        if (profileError) {

            console.error(
                "Error loading profile:",
                profileError
            );
        }


        currentBalance = profile
            ? Number(profile.balance || 0)
            : 0;


        // --------------------------------------------------
        // DISPLAY BALANCE
        // --------------------------------------------------

        const balanceElement =
            document.getElementById("currentBalance");


        if (balanceElement) {

            balanceElement.textContent =
                formatMoney(currentBalance);
        }


        // --------------------------------------------------
        // LOAD WITHDRAWAL HISTORY
        // --------------------------------------------------

        await loadWithdrawHistory();


    } catch (error) {

        console.error(
            "Withdrawal initialization error:",
            error
        );
    }
}


// ------------------------------------------------------
// SUBMIT WITHDRAWAL
// ------------------------------------------------------

const withdrawForm =
    document.getElementById("withdrawForm");


const withdrawSubmitBtn =
    document.getElementById("withdrawSubmitBtn");


if (withdrawForm) {

    withdrawForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            // --------------------------------------------------
            // CHECK USER
            // --------------------------------------------------

            if (!currentUserId) {

                alert(
                    "You must be logged in to withdraw."
                );

                return;
            }


            // --------------------------------------------------
            // GET FORM ELEMENTS
            // --------------------------------------------------

            const amountInput =
                document.getElementById(
                    "withdrawAmount"
                );


            const methodInput =
                document.getElementById(
                    "withdrawMethod"
                );


            const destinationInput =
                document.getElementById(
                    "withdrawDestination"
                );


            if (
                !amountInput ||
                !methodInput ||
                !destinationInput
            ) {

                alert(
                    "Withdrawal form is not configured correctly."
                );

                return;
            }


            // --------------------------------------------------
            // GET VALUES
            // --------------------------------------------------

            const amount =
                Number(amountInput.value);


            const method =
                methodInput.value.trim();


            const destination =
                destinationInput.value.trim();


            // --------------------------------------------------
            // VALIDATE AMOUNT
            // --------------------------------------------------

            if (!amount || amount <= 0) {

                alert(
                    "Please enter a valid withdrawal amount."
                );

                return;
            }


            // --------------------------------------------------
            // VALIDATE BALANCE
            // --------------------------------------------------

            if (amount > currentBalance) {

                alert(
                    "Insufficient balance for this withdrawal."
                );

                return;
            }


            // --------------------------------------------------
            // VALIDATE METHOD
            // --------------------------------------------------

            if (!method) {

                alert(
                    "Please select a withdrawal method."
                );

                return;
            }


            // --------------------------------------------------
            // VALIDATE DESTINATION
            // --------------------------------------------------

            if (!destination) {

                alert(
                    "Please provide your account or wallet details."
                );

                return;
            }


            // --------------------------------------------------
            // DISABLE BUTTON
            // --------------------------------------------------

            if (withdrawSubmitBtn) {

                withdrawSubmitBtn.disabled = true;

                withdrawSubmitBtn.textContent =
                    "Processing...";

                withdrawSubmitBtn.style.opacity =
                    "0.8";

                withdrawSubmitBtn.style.cursor =
                    "not-allowed";

                // Make processing button green
                withdrawSubmitBtn.style.background =
                    "#16a34a";

                withdrawSubmitBtn.style.color =
                    "#ffffff";
            }


            try {


                // --------------------------------------------------
                // SECURE WITHDRAWAL RPC
                // --------------------------------------------------
                //
                // IMPORTANT:
                // We do NOT directly insert into transactions.
                //
                // The Supabase function:
                //
                // submit_withdrawal()
                //
                // checks the authenticated user,
                // validates the amount,
                // checks available balance,
                // and creates the withdrawal.
                //
                // --------------------------------------------------

                const {
                    data,
                    error
                } = await supabaseClient.rpc(
                    "submit_withdrawal",
                    {
                        p_amount: amount,
                        p_method: method,
                        p_destination: destination
                    }
                );


                // --------------------------------------------------
                // HANDLE ERROR
                // --------------------------------------------------

                if (error) {

                    console.error(
                        "Withdrawal RPC error:",
                        error
                    );


                    let errorMessage =
                        error.message ||
                        "Unable to submit withdrawal.";


                    // Remove PostgreSQL function formatting
                    errorMessage =
                        errorMessage
                            .replace(
                                /^.*ERROR:\s*/i,
                                ""
                            );


                    alert(errorMessage);

                    return;
                }


                // --------------------------------------------------
                // SUCCESS
                // --------------------------------------------------

                console.log(
                    "Withdrawal created successfully:",
                    data
                );


                alert(
                    "Withdrawal request submitted successfully.\n\n" +
                    "Your withdrawal is now being processed."
                );


                // --------------------------------------------------
                // CLEAR FORM
                // --------------------------------------------------

                withdrawForm.reset();


                // --------------------------------------------------
                // RELOAD HISTORY
                // --------------------------------------------------

                await loadWithdrawHistory();


            } catch (error) {

                console.error(
                    "Unexpected withdrawal error:",
                    error
                );


                alert(
                    error.message ||
                    "An unexpected error occurred."
                );


            } finally {


                // --------------------------------------------------
                // RESTORE BUTTON
                // --------------------------------------------------

                if (withdrawSubmitBtn) {

                    withdrawSubmitBtn.disabled =
                        false;

                    withdrawSubmitBtn.textContent =
                        "Request Withdrawal";

                    withdrawSubmitBtn.style.opacity =
                        "1";

                    withdrawSubmitBtn.style.cursor =
                        "pointer";

                    // Return to your original CSS
                    withdrawSubmitBtn.style.background =
                        "";

                    withdrawSubmitBtn.style.color =
                        "";
                }
            }
        }
    );
}


// ------------------------------------------------------
// LOAD WITHDRAWAL HISTORY
// ------------------------------------------------------

async function loadWithdrawHistory() {

    const withdrawHistoryBody =
        document.getElementById(
            "withdrawHistoryBody"
        );


    if (
        !withdrawHistoryBody ||
        !currentUserId
    ) {

        return;
    }


    // --------------------------------------------------
    // SHOW LOADING
    // --------------------------------------------------

    withdrawHistoryBody.innerHTML = `
        <tr>
            <td colspan="4" class="loading">
                Loading withdrawals...
            </td>
        </tr>
    `;


    // --------------------------------------------------
    // GET WITHDRAWALS
    // --------------------------------------------------

    const {
        data,
        error
    } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("type", "withdrawal")
        .order(
            "created_at",
            {
                ascending: false
            }
        )
        .limit(10);


    // --------------------------------------------------
    // ERROR
    // --------------------------------------------------

    if (error) {

        console.error(
            "Error loading withdrawal history:",
            error
        );


        withdrawHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">
                    Unable to load withdrawals.
                </td>
            </tr>
        `;

        return;
    }


    // --------------------------------------------------
    // NO WITHDRAWALS
    // --------------------------------------------------

    if (!data || data.length === 0) {

        withdrawHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No withdrawals yet.
                </td>
            </tr>
        `;

        return;
    }


    // --------------------------------------------------
    // CLEAR TABLE
    // --------------------------------------------------

    withdrawHistoryBody.innerHTML = "";


    // --------------------------------------------------
    // DISPLAY WITHDRAWALS
    // --------------------------------------------------

    data.forEach(withdrawal => {

        const row =
            document.createElement("tr");


        // --------------------------------------------------
        // DATE
        // --------------------------------------------------

        const date =
            withdrawal.created_at
                ? new Date(
                    withdrawal.created_at
                ).toLocaleDateString(
                    "en-US",
                    {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                )
                : "-";


        // --------------------------------------------------
        // AMOUNT
        // --------------------------------------------------

        const amount =
            formatMoney(
                withdrawal.amount
            );


        // --------------------------------------------------
        // METHOD
        // --------------------------------------------------

        const description =
            withdrawal.description || "";


        let method =
            "Withdrawal";


        if (
            description.includes(
                " withdrawal to"
            )
        ) {

            method =
                description.split(
                    " withdrawal to"
                )[0];
        }


        // --------------------------------------------------
        // STATUS
        // --------------------------------------------------

        const status =
            (
                withdrawal.status ||
                "processing"
            ).toLowerCase();


        let statusText =
            "Processing";


        let statusClass =
            "processing";


        // --------------------------------------------------
        // COMPLETED
        // --------------------------------------------------

        if (
            status === "completed"
        ) {

            statusText =
                "Completed";

            statusClass =
                "completed";
        }


        // --------------------------------------------------
        // APPROVED
        // --------------------------------------------------

        else if (
            status === "approved"
        ) {

            statusText =
                "Approved";

            statusClass =
                "approved";
        }


        // --------------------------------------------------
        // REJECTED
        // --------------------------------------------------

        else if (
            status === "rejected"
        ) {

            statusText =
                "Rejected";

            statusClass =
                "rejected";
        }


        // --------------------------------------------------
        // CANCELLED
        // --------------------------------------------------

        else if (
            status === "cancelled"
        ) {

            statusText =
                "Cancelled";

            statusClass =
                "cancelled";
        }


        // --------------------------------------------------
        // PROCESSING / PENDING
        // --------------------------------------------------

        else {

            statusText =
                "Processing";

            statusClass =
                "processing";
        }


        // --------------------------------------------------
        // CREATE CELLS
        // --------------------------------------------------

        const dateCell =
            document.createElement("td");

        dateCell.textContent =
            date;


        const amountCell =
            document.createElement("td");

        amountCell.textContent =
            amount;


        const methodCell =
            document.createElement("td");

        methodCell.textContent =
            method;


        const statusCell =
            document.createElement("td");


        // --------------------------------------------------
        // STATUS BADGE
        // --------------------------------------------------

        const statusBadge =
            document.createElement("span");


        statusBadge.className =
            `withdraw-status ${statusClass}`;


        statusBadge.textContent =
            statusText;


        statusCell.appendChild(
            statusBadge
        );


        // --------------------------------------------------
        // ADD CELLS TO ROW
        // --------------------------------------------------

        row.appendChild(
            dateCell
        );

        row.appendChild(
            amountCell
        );

        row.appendChild(
            methodCell
        );

        row.appendChild(
            statusCell
        );


        // --------------------------------------------------
        // ADD ROW TO TABLE
        // --------------------------------------------------

        withdrawHistoryBody.appendChild(
            row
        );
    });
}


// ------------------------------------------------------
// LOGOUT
// ------------------------------------------------------

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async (e) => {

            e.preventDefault();


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


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    initWithdraw
);