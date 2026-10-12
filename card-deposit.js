(() => {

const form = document.getElementById("depositForm");
const message = document.getElementById("message");
const amountInput = document.getElementById("amount");

// Your existing Supabase project
const CARD_SUPABASE_URL =
  "https://zuvthowcxloiqlgrcvqk.supabase.co";

// Must match the deployed Edge Function name
const FUNCTION_NAME = "create-pesapal-order";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const amount = Number(amountInput.value);

  if (!Number.isFinite(amount) || amount < 1) {
    message.textContent = "Enter a valid amount.";
    return;
  }

  const button = form.querySelector(
    'button[type="submit"]'
  );

  if (button) button.disabled = true;
  message.textContent = "Connecting to Pesapal...";

  try {
    const client = window.supabaseClient;

    if (!client) {
      throw new Error(
        "Supabase authentication is not initialized."
      );
    }

    const { data, error } =
      await client.auth.getSession();

    if (error || !data.session) {
      throw new Error(
        "Please log in before depositing."
      );
    }

    const response = await fetch(
      `${CARD_SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${data.session.access_token}`,
          apikey: client.supabaseKey
        },
        body: JSON.stringify({
          amount,
          currency: "USD"
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.redirect_url) {
      throw new Error(
        result.error ||
        "Unable to start payment."
      );
    }

    const paymentUrl = new URL(result.redirect_url);

    if (
      paymentUrl.protocol !== "https:" ||
      !(
        paymentUrl.hostname === "pesapal.com" ||
        paymentUrl.hostname.endsWith(".pesapal.com")
      )
    ) {
      throw new Error("Invalid Pesapal payment URL.");
    }

    message.textContent = "Redirecting to Pesapal...";
    window.location.assign(paymentUrl.href);

  } catch (error) {
    console.error("Payment error:", error);
    message.textContent = error.message;

    if (button) button.disabled = false;
  }
});

})();

