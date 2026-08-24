// ==========================================
// MARKETRADING - DEPOSIT.JS
// PAYPAL + DEPOSIT HISTORY
// ==========================================

"use strict";

let currentUserId = null;
let selectedMethod = "PayPal";
let paypalRendered = false;


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

function showPaymentMessage(message, type = "info") {

    const box = document.getElementById("paymentMessage");

    if (!box) return;

    box.textContent = message;
    box.style.display = "block";

    box.className = type;
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


    // --------------------------------------------------
    // LOAD BALANCE
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


    const balanceElement =
        document.getElementById("currentBalance");


    if (balanceElement) {

        balanceElement.textContent =
            formatMoney(
                profile ? profile.balance : 0
            );
    }


    // --------------------------------------------------
    // LOAD HISTORY
    // --------------------------------------------------

    await loadDepositHistory();


    // --------------------------------------------------
    // WAIT FOR PAYPAL SDK
    // --------------------------------------------------

    waitForPayPal();
}


// ------------------------------------------------------
// METHOD SELECTION
// ------------------------------------------------------

function setupMethodSelection() {

    const methodCards =
        document.querySelectorAll(".method");


    methodCards.forEach(card => {

        card.addEventListener("click", () => {

            methodCards.forEach(c =>
                c.classList.remove("active")
            );


            card.classList.add("active");


            selectedMethod =
                card.dataset.method ||
                card.querySelector("h3")
                    .textContent
                    .trim();


            const paypalCheckout =
                document.getElementById(
                    "paypalCheckout"
                );


            const depositSubmitBtn =
                document.getElementById(
                    "depositSubmitBtn"
                );


            // ------------------------------------------
            // PAYPAL
            // ------------------------------------------

            if (selectedMethod === "PayPal") {

                if (paypalCheckout) {

                    paypalCheckout.style.display =
                        "block";
                }


                if (depositSubmitBtn) {

                    depositSubmitBtn.style.display =
                        "none";
                }


                waitForPayPal();

                return;
            }


            // ------------------------------------------
            // OTHER PAYMENT METHODS
            // ------------------------------------------

            if (paypalCheckout) {

                paypalCheckout.style.display =
                    "none";
            }


            if (depositSubmitBtn) {

                depositSubmitBtn.style.display =
                    "block";

                depositSubmitBtn.textContent =
                    "Continue";
            }
        });
    });
}


// ------------------------------------------------------
// WAIT FOR PAYPAL SDK
// ------------------------------------------------------

function waitForPayPal() {

    if (selectedMethod !== "PayPal") {
        return;
    }


    if (
        typeof window.paypal !==
        "undefined"
    ) {

        renderPayPalButtons();

        return;
    }


    setTimeout(
        waitForPayPal,
        300
    );
}


// ------------------------------------------------------
// RENDER PAYPAL BUTTONS
// ------------------------------------------------------

function renderPayPalButtons() {

    if (paypalRendered) {
        return;
    }


    const container =
        document.getElementById(
            "paypal-button-container"
        );


    if (!container) {
        return;
    }


    if (
        typeof window.paypal ===
        "undefined"
    ) {
        return;
    }


    paypalRendered = true;


    window.paypal.Buttons({

        // ----------------------------------------------
        // CREATE ORDER
        // ----------------------------------------------

        createOrder: async function () {

            const amountInput =
                document.getElementById(
                    "depositAmount"
                );


            const currencyInput =
                document.getElementById(
                    "depositCurrency"
                );


            const amount =
                Number(
                    amountInput?.value
                );


            const currency =
                currencyInput?.value ||
                "USD";


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                showPaymentMessage(
                    "Please enter a valid deposit amount.",
                    "error"
                );

                throw new Error(
                    "Invalid deposit amount."
                );
            }


            // ------------------------------------------
            // PAYPAL FUNCTION ONLY ACCEPTS USD
            // ------------------------------------------

            if (currency !== "USD") {

                showPaymentMessage(
                    "PayPal deposits are currently available in USD only.",
                    "error"
                );

                throw new Error(
                    "PayPal currently supports USD only."
                );
            }


            showPaymentMessage(
                "Creating your PayPal payment...",
                "info"
            );


            // ------------------------------------------
            // GET CURRENT SESSION
            // ------------------------------------------

            const {
                data: {
                    session
                }
            } =
                await supabaseClient
                    .auth
                    .getSession();


            if (!session) {

                window.location.href =
                    "login.html";

                throw new Error(
                    "You must be logged in."
                );
            }


            // ------------------------------------------
            // CALL SUPABASE EDGE FUNCTION
            // ------------------------------------------

            const {
                data,
                error
            } =
                await supabaseClient.functions.invoke(
                    "create-paypal-order",
                    {
                        body: {
                            amount: amount
                        }
                    }
                );


            if (error) {

                console.error(
                    "Create PayPal order error:",
                    error
                );

                throw new Error(
                    error.message ||
                    "Unable to create PayPal order."
                );
            }


            if (
                !data ||
                !data.success ||
                !data.orderId
            ) {

                console.error(
                    "Invalid PayPal response:",
                    data
                );

                throw new Error(
                    data?.error ||
                    "PayPal order could not be created."
                );
            }


            showPaymentMessage(
                "PayPal order created. Complete your payment.",
                "info"
            );


            return data.orderId;
        },


        // ----------------------------------------------
        // APPROVE
        // ----------------------------------------------

        onApprove: async function (
            data
        ) {

            showPaymentMessage(
                "Payment approved. Confirming payment...",
                "info"
            );


            try {

                const {
                    data: result,
                    error
                } =
                    await supabaseClient
                        .functions
                        .invoke(
                            "capture-paypal-order",
                            {
                                body: {
                                    orderId:
                                        data.orderID
                                }
                            }
                        );


                if (error) {

                    console.error(
                        "Capture PayPal error:",
                        error
                    );

                    throw new Error(
                        error.message ||
                        "Unable to confirm PayPal payment."
                    );
                }


                if (
                    !result ||
                    !result.success
                ) {

                    throw new Error(
                        result?.error ||
                        "PayPal payment could not be confirmed."
                    );
                }


                // --------------------------------------
                // SUCCESS
                // --------------------------------------

                showPaymentMessage(
                    `Payment successful! ${formatMoney(result.amount)} has been added to your account.`,
                    "success"
                );


                alert(
                    `Payment successful!\n\n${formatMoney(result.amount)} has been added to your Marketrading balance.`
                );


                // --------------------------------------
                // REFRESH BALANCE
                // --------------------------------------

                await refreshBalance();


                // --------------------------------------
                // REFRESH HISTORY
                // --------------------------------------

                await loadDepositHistory();

            } catch (error) {

                console.error(
                    "PayPal capture error:",
                    error
                );


                showPaymentMessage(
                    error.message ||
                    "Payment could not be completed.",
                    "error"
                );
            }
        },


        // ----------------------------------------------
        // CANCEL
        // ----------------------------------------------

        onCancel: function () {

            showPaymentMessage(
                "PayPal payment was cancelled.",
                "error"
            );
        },


        // ----------------------------------------------
        // ERROR
        // ----------------------------------------------

        onError: function (
            error
        ) {

            console.error(
                "PayPal button error:",
                error
            );


            showPaymentMessage(
                "PayPal encountered an error. Please try again.",
                "error"
            );
        }

    }).render(
        "#paypal-button-container"
    );
}


// ------------------------------------------------------
// REFRESH BALANCE
// ------------------------------------------------------

async function refreshBalance() {

    if (!currentUserId) {
        return;
    }


    const {
        data: profile,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("balance")
            .eq("id", currentUserId)
            .maybeSingle();


    if (error) {

        console.error(
            "Unable to refresh balance:",
            error
        );

        return;
    }


    const balanceElement =
        document.getElementById(
            "currentBalance"
        );


    if (balanceElement) {

        balanceElement.textContent =
            formatMoney(
                profile
                    ? profile.balance
                    : 0
            );
    }
}


// ------------------------------------------------------
// NORMAL DEPOSIT FORM
// ------------------------------------------------------

function setupDepositForm() {

    const depositForm =
        document.getElementById(
            "depositForm"
        );


    if (!depositForm) {
        return;
    }


    depositForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            // ------------------------------------------
            // PAYPAL IS HANDLED BY PAYPAL BUTTON
            // ------------------------------------------

            if (
                selectedMethod ===
                "PayPal"
            ) {

                return;
            }


            if (!currentUserId) {

                alert(
                    "You must be logged in to deposit."
                );

                return;
            }


            const amount =
                Number(
                    document.getElementById(
                        "depositAmount"
                    )?.value
                );


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                alert(
                    "Please enter a valid deposit amount."
                );

                return;
            }


            /*
             * Mobile Money and Card Payment
             *
             * We are NOT automatically crediting
             * the account here.
             *
             * Those payment methods will be connected
             * to PesaPal separately.
             */

            alert(
                `${selectedMethod} is not connected yet. We will connect it to PesaPal next.`
            );
        }
    );
}


// ------------------------------------------------------
// LOAD DEPOSIT HISTORY
// ------------------------------------------------------

async function loadDepositHistory() {

    const depositHistoryBody =
        document.getElementById(
            "depositHistoryBody"
        );


    if (
        !depositHistoryBody ||
        !currentUserId
    ) {

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("transactions")
            .select("*")
            .eq("user_id", currentUserId)
            .eq("type", "deposit")
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(10);


    if (error) {

        console.error(
            "Error loading deposit history:",
            error
        );


        depositHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">
                    Unable to load deposits.
                </td>
            </tr>
        `;

        return;
    }


    if (
        !data ||
        !data.length
    ) {

        depositHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No deposits yet.
                </td>
            </tr>
        `;

        return;
    }


    depositHistoryBody.innerHTML =
        "";


    data.forEach(
        deposit => {

            const row =
                document.createElement(
                    "tr"
                );


            const date =
                deposit.created_at
                    ? new Date(
                        deposit.created_at
                    ).toLocaleDateString(
                        "en-US",
                        {
                            day:
                                "numeric",

                            month:
                                "long",

                            year:
                                "numeric"
                        }
                    )
                    : "-";


            const method =
                (
                    deposit.description ||
                    ""
                )
                    .split(
                        " (ref:"
                    )[0] ||
                "Deposit";


            const status =
                deposit.status ||
                "pending";


            row.innerHTML = `
                <td>${date}</td>

                <td>
                    ${formatMoney(
                        deposit.amount
                    )}
                </td>

                <td>
                    ${method}
                </td>

                <td class="${status}">
                    ${status
                        .replace(
                            /^\w/,
                            c =>
                                c.toUpperCase()
                        )}
                </td>
            `;


            depositHistoryBody.appendChild(
                row
            );
        }
    );
}


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupMethodSelection();

        setupDepositForm();

        initDeposit();

    }
);