const form = document.getElementById("addShopForm");
const modal = document.getElementById("confirmationModal");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");

// Intercept form submit
form.addEventListener("submit", function (event) {
    event.preventDefault(); // stop default submission
    modal.style.display = "flex"; // show modal
});

// Confirm button -> submit form
confirmBtn.addEventListener("click", function () {
    modal.style.display = "none";
    form.submit();
});

// Cancel button -> close modal
cancelBtn.addEventListener("click", function () {
    modal.style.display = "none";
});

// Close modal if clicked outside content
window.addEventListener("click", function (event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});