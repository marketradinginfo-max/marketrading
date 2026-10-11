
const form = document.getElementById("depositForm");
const message = document.getElementById("message");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number(
    document.getElementById("amount").value
  );

  if (!Number.isFinite(amount) || amount < 1) {
    message.textContent = "Enter a valid deposit amount.";
    return;
  }

  message.textContent =
    "Payment setup is not connected yet. " +
    "No payment has been initiated.";
});
