// ==========================================
// MARKETRADING - DEPOSIT.JS
// PAYPAL DEPOSIT SYSTEM
// ==========================================

"use strict";

let currentUserId = null;
let selectedMethod = "PayPal";
let paymentInProgress = false;


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

    const box =
        document.getElementById("paymentMessage");

    if (!box) return;

    box.textContent = message;

    box.style.display = "block";

    box.className = type;
}


// ------------------------------------------------------
// HIDE PAYPAL UI
// ------------------------------------------------------

function hidePayPalUI() {

    const paypalCheckout =
        document.getElementById("paypalCheckout");

    if (paypalCheckout) {

        paypalCheckout.style.display = "none";
    }

    const paypalContainer =
        document.getElementById(
            "paypal-button-container"
        );

    if (paypalContainer) {

        paypalContainer.innerHTML = "";
    }
}


// ------------------------------------------------------
// GET CURRENT USER
// ------------------------------------------------------

async function getCurrentUser() {

    const {
        data: { session },
        error
    } =
        await supabaseClient.auth.getSession();

    if (error) {

        console.error(
            "Session error:",
            error
        );

        return null;
    }

    if (!session) {

        return null;
    }

    currentUserId =
        session.user.id;

    return session.user;
}


// ------------------------------------------------------
// INIT
// ------------------------------------------------------

async function initDeposit() {

    hidePayPalUI();

    const user =
        await getCurrentUser();

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


    // --------------------------------------------------
    // LOAD BALANCE
    // --------------------------------------------------

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
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


    // --------------------------------------------------
    // LOAD HISTORY
    // --------------------------------------------------

    await loadDepositHistory();


    // --------------------------------------------------
    // CHECK IF USER RETURNED FROM PAYPAL
    // --------------------------------------------------

    await handlePayPalReturn();
}


// ------------------------------------------------------
// METHOD SELECTION
// ------------------------------------------------------

function setupMethodSelection() {

    const methodCards =
        document.querySelectorAll(".method");


    methodCards.forEach(card => {

        card.addEventListener(
            "click",
            () => {

                methodCards.forEach(
                    c =>
                        c.classList.remove(
                            "active"
                        )
                );


                card.classList.add(
                    "active"
                );


                selectedMethod =
                    card.dataset.method ||
                    card
                        .querySelector("h3")
                        ?.textContent
                        .trim() ||
                    "";


                console.log(
                    "Selected payment method:",
                    selectedMethod
                );


                hidePayPalUI();
            }
        );
    });
}


// ------------------------------------------------------
// START PAYPAL PAYMENT
// ------------------------------------------------------

async function startPayPalPayment() {

    if (paymentInProgress) {

        return;
    }


    const amountInput =
        document.getElementById(
            "depositAmount"
        );


    const currencyInput =
        document.getElementById(
            "depositCurrency"
        );


    const referenceInput =
        document.getElementById(
            "depositReference"
        );


    const submitButton =
        document.getElementById(
            "depositSubmitBtn"
        );


    const amount =
        Number(
            amountInput?.value
        );


    const currency =
        currencyInput?.value ||
        "USD";


    const reference =
        referenceInput?.value.trim() ||
        "";


    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        showPaymentMessage(
            "Please enter a valid deposit amount.",
            "error"
        );

        return;
    }


    // --------------------------------------------------
    // PAYPAL USD ONLY
    // --------------------------------------------------

    if (currency !== "USD") {

        showPaymentMessage(
            "PayPal deposits are currently available in USD only.",
            "error"
        );

        return;
    }


    // --------------------------------------------------
    // LOGIN CHECK
    // --------------------------------------------------

    const user =
        await getCurrentUser();


    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


    paymentInProgress = true;


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Connecting to PayPal...";
    }


    showPaymentMessage(
        "Preparing your PayPal payment...",
        "info"
    );


    try {

        console.log(
            "Creating PayPal order..."
        );


        // ------------------------------------------------
        // CREATE PAYPAL ORDER
        // ------------------------------------------------

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "create-paypal-order",
                {
                    body: {
                        amount: amount,
                        currency: currency,
                        reference: reference
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
                "Unable to create PayPal payment."
            );
        }


        console.log(
            "PayPal order response:",
            data
        );


        if (
            !data ||
            !data.success
        ) {

            throw new Error(
                data?.error ||
                "Unable to create PayPal payment."
            );
        }


        const orderId =
            data.orderId;


        const approvalUrl =
            data.approvalUrl;


        if (!orderId) {

            throw new Error(
                "PayPal order ID was not returned."
            );
        }


        if (!approvalUrl) {

            throw new Error(
                "PayPal checkout URL was not returned."
            );
        }


        // ------------------------------------------------
        // SAVE PAYMENT INFORMATION
        // ------------------------------------------------

        sessionStorage.setItem(
            "marketrading_paypal_payment",
            JSON.stringify({
                orderId:
                    orderId,

                amount:
                    amount,

                currency:
                    currency,

                reference:
                    reference,

                createdAt:
                    Date.now()
            })
        );


        // ------------------------------------------------
        // REDIRECT TO PAYPAL
        // ------------------------------------------------

        showPaymentMessage(
            "Redirecting you to PayPal...",
            "success"
        );


        console.log(
            "Redirecting to PayPal:",
            approvalUrl
        );


        window.location.href =
            approvalUrl;

    } catch (error) {

        console.error(
            "PayPal payment error:",
            error
        );


        showPaymentMessage(
            error.message ||
            "Unable to start PayPal payment.",
            "error"
        );


        paymentInProgress = false;


        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Continue";
        }
    }
}


// ------------------------------------------------------
// HANDLE RETURN FROM PAYPAL
// ------------------------------------------------------

async function handlePayPalReturn() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const paypalStatus =
        params.get("paypal");


    // --------------------------------------------------
    // NOTHING TO PROCESS
    // --------------------------------------------------

    if (!paypalStatus) {

        return;
    }


    // --------------------------------------------------
    // PAYMENT CANCELLED
    // --------------------------------------------------

    if (
        paypalStatus ===
        "cancel"
    ) {

        showPaymentMessage(
            "PayPal payment was cancelled.",
            "error"
        );


        // Remove URL parameters

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );


        return;
    }


    // --------------------------------------------------
    // PAYMENT SUCCESS
    // --------------------------------------------------

    if (
        paypalStatus !==
        "success"
    ) {

        return;
    }


    // --------------------------------------------------
    // GET PAYPAL ORDER ID
    // --------------------------------------------------

    let orderId =
        params.get("token");


    // --------------------------------------------------
    // FALLBACK TO SESSION STORAGE
    // --------------------------------------------------

    if (!orderId) {

        try {

            const saved =
                sessionStorage.getItem(
                    "marketrading_paypal_payment"
                );


            if (saved) {

                const payment =
                    JSON.parse(saved);


                orderId =
                    payment.orderId;
            }

        } catch (error) {

            console.error(
                "Unable to read saved PayPal payment:",
                error
            );
        }
    }


    if (!orderId) {

        showPaymentMessage(
            "Payment returned from PayPal, but the order ID could not be found.",
            "error"
        );

        return;
    }


    // --------------------------------------------------
    // SHOW PROCESSING
    // --------------------------------------------------

    showPaymentMessage(
        "Payment received from PayPal. Confirming your payment...",
        "info"
    );


    try {

        // ------------------------------------------------
        // CAPTURE PAYMENT
        // ------------------------------------------------

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "capture-paypal-order",
                {
                    body: {
                        orderId:
                            orderId
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


        console.log(
            "PayPal capture response:",
            data
        );


        if (
            !data ||
            !data.success
        ) {

            throw new Error(
                data?.error ||
                "PayPal payment could not be confirmed."
            );
        }


        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        showPaymentMessage(
            `Payment successful! ${formatMoney(data.amount)} has been added to your account.`,
            "success"
        );


        // ------------------------------------------------
        // REMOVE SAVED PAYMENT
        // ------------------------------------------------

        sessionStorage.removeItem(
            "marketrading_paypal_payment"
        );


        // ------------------------------------------------
        // CLEAN URL
        // ------------------------------------------------

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );


        // ------------------------------------------------
        // REFRESH BALANCE
        // ------------------------------------------------

        await refreshBalance();


        // ------------------------------------------------
        // REFRESH HISTORY
        // ------------------------------------------------

        await loadDepositHistory();


        alert(
            `Payment successful!\n\n${formatMoney(data.amount)} has been added to your Marketrading balance.`
        );

    } catch (error) {

        console.error(
            "PayPal return/capture error:",
            error
        );


        showPaymentMessage(
            error.message ||
            "We could not confirm your PayPal payment.",
            "error"
        );
    }
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
// DEPOSIT FORM
// ------------------------------------------------------

function setupDepositForm() {

    const depositForm =
        document.getElementById(
            "depositForm"
        );


    if (!depositForm) {

        console.error(
            "depositForm not found."
        );

        return;
    }


    depositForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            // --------------------------------------------
            // PAYPAL
            // --------------------------------------------

            if (
                selectedMethod ===
                "PayPal"
            ) {

                await startPayPalPayment();

                return;
            }


            // --------------------------------------------
            // OTHER METHODS
            // --------------------------------------------

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


            alert(
                `${selectedMethod} is not connected yet. We will connect it to PesaPal later.`
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
                            day: "numeric",
                            month: "long",
                            year: "numeric"
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
                    ${status.replace(
                        /^\w/,
                        c => c.toUpperCase()
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

        console.log(
            "MARKETRADING DEPOSIT.JS LOADED"
        );


        setupMethodSelection();

        setupDepositForm();

        initDeposit();

    }
);